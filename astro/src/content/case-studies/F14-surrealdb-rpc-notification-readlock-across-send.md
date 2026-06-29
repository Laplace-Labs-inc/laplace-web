---
title: "surrealdb: a live-query notification read guard held across the client send"
description: "An Axiom audit of surrealdb's RPC live-query notification fan-out. The shipped HEAD discipline is deadlock-free; the historical #3987 'read-held-across-send' shape is proven reachable as an AB-BA deadlock. All three investigated issues (#3987, #5068, #5594) are closed at our pin."
slug: "surrealdb-rpc-notification-readlock-across-send"
scenario: "surrealdb_rpc_notification_lock"
library: "surrealdb (multi-model database)"
author: "Laplace Labs"
publishedAt: 2026-06-27
updatedAt: 2026-06-29
tags: ["case-study", "surrealdb", "database", "live-query", "rwlock", "writer-preference", "Axiom", "DPOR"]
cover:
  image: "/assets/case-studies/surrealdb-rpc-notification-readlock-across-send.svg"
  alt: "AB-BA wait-for cycle between surrealdb's notification dispatch and connection lifecycle over WEBSOCKETS and the client send"
  license: "CC-BY-4.0"
seo:
  ogImage: "/assets/case-studies/surrealdb-rpc-notification-readlock-across-send.svg"
  twitterCard: "summary_large_image"
  jsonLd:
    "@context": "https://schema.org"
    "@type": "Article"
    headline: "surrealdb: a live-query notification read guard held across the client send"
    datePublished: "2026-06-27"
    author:
      "@type": "Organization"
      name: "Laplace Labs"
reproRepository: "https://github.com/surrealdb/surrealdb/pull/4328"
reproRepositoryStatus: "upstream-fix-merged (PR #4328)"
disclosure:
  status: "resolved-upstream"
  notifiedOn: null
  publicAfter: null
  notes: "Published as a regression sentinel, not a vulnerability report. No currently-open defect found; all three investigated issues (#3987, #5068, #5594) are CLOSED/completed at the pinned commit. The historical #3987 deadlock is already fixed (PR #4328) and further hardened at HEAD. The 'bug' artifact is an explicit counterfactual of the pre-fix code, not the shipped code."
license: "CC-BY-4.0"
---

# surrealdb: a live-query notification read guard held across the client send

## 0. TL;DR (honesty first)

The brief pointed us at surrealdb with three OPEN-looking concurrency candidates —
**#5068** (live-query events hang/lock up), **#3987** ("Deadlock encountered"
under intensive live query), and **#5594** (affinitypool thread leak). The
primary goal was a currently-open, reproducible defect.

The novelty gate settled it before any modelling: **all three are CLOSED /
completed** at our pinned commit (verified via the GitHub API). #3987 was fixed
by **PR #4328 "Reduce read lock duration"**, #5068 by **PR #5383 "Improve live
query stability over WebSockets"**, and #5594 (a resource-leak issue, outside
Axiom's deadlock/lost-wakeup lane) closed in 2025. **There is no open trophy
here.**

What Axiom *did* do is validate the surface and reproduce the **historical**
#3987 deadlock as a counterfactual. The shipped HEAD discipline is deadlock-free
under exhaustive interleaving; the pre-fix shape — a notification dispatch holding
the global `WEBSOCKETS` read guard *across the client send* — is a reachable
AB-BA deadlock. A real-thread repro confirms both directions.

Classification: **open app-bug = NO**. Manufacturing a "trophy" here would be
dishonest.

## 1. Discovery context

surrealdb is a popular multi-model database; its live-query feature pushes change
notifications to subscribed WebSocket clients. The coordination lane Axiom cares
about is the **notification fan-out**: a single task drains the datastore's
notification channel and forwards each event to the right WebSocket, against a
backdrop of connection register/deregister churn. Two global maps guard that lane
(`src/rpc/mod.rs`):

- **`WEBSOCKETS`** — `RwLock<HashMap<Uuid, Arc<Websocket>>>`, the connected
  sockets. Read by the notification dispatch; written by connection lifecycle.
- **`LIVE_QUERIES`** — `RwLock<HashMap<Uuid, …>>`, registered live queries.

The send to a client goes through a per-connection outbound channel that can exert
**backpressure** when the client is slow or dead — exactly the condition the issue
reporter hit ("refreshed the page, the connection wasn't cleared … wait ~5 mins …
the websocket will be in pending state").

## 2. Why the real (HEAD) code is safe (the load-bearing invariant)

surrealdb **drops the map read guard before the send.** HEAD's
`dispatch_live_notification` clones the lookup result out of each read guard
immediately, with a source comment naming the hazard:

```rust
// Copy the lookup result out and drop the `live_queries` read guard BEFORE acquiring
// `web_sockets`. Keeping those locks independent prevents cleanup paths from being blocked
// by a client send on the hot notification path.
let live_query = state.live_queries.read().await.get(&notification.id).cloned();
if let Some(entry) = live_query
    && let Some(rpc) = state.web_sockets.read().await.get(&entry.websocket_id).cloned()
{
    // ... rpc is an Arc; both read guards are already dropped here ...
    crate::rpc::response::send(message, format, sender).await;   // send holds NO map lock
}
```

Net effect: the blocking send never runs under a `WEBSOCKETS` (or `LIVE_QUERIES`)
read guard, so a connection-lifecycle `write()` is never blocked by a slow client,
and the writer-preference reader-starvation cascade cannot start. The wait-for
graph is acyclic for every interleaving.

## 3. The historical defect (#3987, pre-PR #4328)

The pre-fix `notifications` loop held the guards *across* the send:

```rust
if let Some(id) = LIVE_QUERIES.read().await.get(&notification.id) {  // read guard held
    if let Some(rpc) = WEBSOCKETS.read().await.get(id) {             // read guard held (nested)
        let message = success(None, notification);
        let format  = rpc.read().await.format;                      // inner read held
        let sender  = rpc.read().await.channels.0.clone();
        message.send(cx, format, &sender).await                     // SEND under both read guards
    }
}
```

`tokio::sync::RwLock` is **writer-preferring** (readers are not granted while a
writer is queued, to prevent writer starvation). So:

1. Dispatch holds `WEBSOCKETS` read, blocks on the send to a dead client's full
   channel (never drains).
2. A connection-lifecycle path requests `WEBSOCKETS.write()` to deregister →
   queued behind the held read.
3. Every *new* `WEBSOCKETS.read()` (the reporter's connect-time `contains_key`)
   now blocks behind the queued writer.

The held read never releases → the whole RPC surface stalls. PR #4328's one-liner
— clone the Arc and copy the id, drop the guard before the send — is precisely the
fix.

## 4. Modelling it in Axiom

Resource map: `R0` = `WEBSOCKETS` map lock, `R1` = the per-connection send (the
inner connection guard / outbound channel the send blocks on).

| Harness | Models | Expected |
|---|---|---|
| shipped (drop read before send) | dispatch releases WS read before the send; lifecycle holds send then takes WS write | clean |
| concurrent dispatch readers | two concurrent dispatch reads (no writer) | clean |
| counterfactual (#3987) | dispatch holds WS read then blocks on send; lifecycle holds send then blocks on WS write | bug |

The Axiom oracle grants a shared read whenever the resource is not held
*exclusively*; the core deadlock is rendered as an AB-BA over `R0`/`R1`, where an
exclusive `Request` on `R0` blocks on the held shared read — equivalent to the
writer-preference amplification.

## 5. Axiom verdicts

```text
surrealdb_notif_shipped_drops_read_before_send   => Clean
surrealdb_notif_concurrent_dispatch              => Clean
surrealdb_notif_read_held_across_send_abba       => BugFound
                                                    Deadlock { cycle: [ThreadId(0), ThreadId(1)] }
```

The textbook four-step AB-BA witness:

```text
t0  SharedRequest r0   ok            (dispatch holds WEBSOCKETS read)
t1  Request       r1   ok            (lifecycle holds the per-connection send)
t0  Request       r1   ok→blocked    (dispatch wants the send, held by t1)
t1  Request       r0   Deadlock { cycle: [ThreadId(0), ThreadId(1)] }
```

Wait-for graph at the failure point:

```text
t0 (dispatch,  holds WS read) -> r1 (send)        -> t1
t1 (lifecycle, holds send)    -> r0 (WS write)    -> t0
```

## 6. Standalone reproduction (real shape, real threads)

A std-threads repro crate with a progress-stall watchdog proves both directions:

```text
== surrealdb #3987 live-query notification lock-hold repro ==
[PART A] shipped discipline (drop WS read before send): 200000 dispatch + 200000 lifecycle rounds completed — NO DEADLOCK
[PART B] naive read-held-across-send path: WATCHDOG TIMEOUT — no progress for 3000ms after BOTH threads passed the barrier — AB-BA DEADLOCK reproduced.
         Matches Axiom Deadlock { cycle: [ThreadId(0), ThreadId(1)] }: dispatcher holds WEBSOCKETS read + waits on send; lifecycle holds send + waits on WEBSOCKETS write.
RESULT: Part A safe, Part B deadlocked — faithful repro of the historical defect.
```

## 7. Takeaway

The remediation generalises to *anyone fanning out I/O behind a read/write lock*:

- Never hold a fine-grained read guard across a send / I/O / blocking await whose
  completion you do not control. Clone or copy what you need, drop the guard, then
  do the blocking work — exactly as surrealdb does at HEAD.
- Writer-preferring locks (`tokio::sync::RwLock`, `std`/`parking_lot::RwLock`)
  turn a single read held too long into *process-wide* reader starvation once any
  writer queues behind it.
