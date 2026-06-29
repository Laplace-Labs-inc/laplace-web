---
title: "zellij: a read guard held across a blocking wait froze the server"
description: "An Axiom audit of zellij's per-client route thread. Holding the session_data RwLock read guard across a blocking action-completion wait freezes the server — a real zellij 0.44.2 regression (#5141). The shipped code (post-PR #5152) drops the guard first and is deadlock-free; the counterfactual that breaks it is proven reachable."
slug: "zellij-route-action-session-data-guard"
scenario: "zellij_route_action"
library: "zellij (terminal multiplexer)"
author: "Laplace Labs"
publishedAt: 2026-06-27
updatedAt: 2026-06-29
tags: ["case-study", "zellij", "rwlock", "lock-order", "blocking-wait", "Axiom", "DPOR"]
cover:
  image: "/assets/case-studies/zellij-route-action-session-data-guard.svg"
  alt: "AB-BA wait-for cycle between zellij's route thread and server loop over session_data and the action completion"
  license: "CC-BY-4.0"
seo:
  ogImage: "/assets/case-studies/zellij-route-action-session-data-guard.svg"
  twitterCard: "summary_large_image"
  jsonLd:
    "@context": "https://schema.org"
    "@type": "Article"
    headline: "zellij: a read guard held across a blocking wait froze the server"
    datePublished: "2026-06-27"
    author:
      "@type": "Organization"
      name: "Laplace Labs"
reproRepository: "https://github.com/zellij-org/zellij/pull/5152"
reproRepositoryStatus: "upstream-fix-merged (PR #5152, 2026-05-08)"
disclosure:
  status: "resolved-upstream"
  notifiedOn: null
  publicAfter: null
  notes: "Published as a regression sentinel, not a vulnerability report. The deadlock was a real zellij 0.44.2 regression (issue #5141) and is already FIXED at our pinned commit by PR #5152 (merged 2026-05-08). The shipped discipline is documented in zellij's own source. The 'bug' artifact is the pre-#5152 counterfactual, not the shipped code — nothing to disclose to maintainers."
license: "CC-BY-4.0"
---

# zellij: a read guard held across a blocking wait froze the server

## 0. TL;DR (honesty first)

This is a **composition audit** — the concurrency *composition* of a real
application (zellij, the Rust terminal multiplexer), not a library hunt. We
pinned zellij at `eabb3f5b611b1069fcf27bec3c5a619519f80c54` (main, 2026-06-26)
and modelled the interaction between the per-client **route thread**, the global
`session_data: Arc<RwLock<Option<SessionMetaData>>>`, and a **blocking CLI
action** that parks on an action-completion oneshot.

**No open bug was found.** The hazard — a route thread holding the `session_data`
read guard *across* a blocking action-completion wait while the server loop needs
`session_data.write()` — was a **real zellij regression in 0.44.2** (issue
**#5141**, freeze on `Ctrl-G` with a `--block-until-exit` floating pane) and is
**already fixed** at the pinned commit by **PR #5152** (merged 2026-05-08). The
fix is encoded directly in zellij's source as load-bearing comments.

What Axiom *did* produce is a precise, reproducible AB-BA deadlock for the
**pre-#5152 counterfactual**, plus a `Clean` verdict for the shipped discipline.
A 50,000-round real-thread stress test of the shipped pattern never deadlocks; the
counterfactual hangs under a watchdog. The trace is valuable as a regression
sentinel and as a teaching artifact for *anyone routing UI events through a shared
`RwLock` while parking on a cross-thread completion*.

Classification: **open app-bug = NO**. Manufacturing a "trophy" here would be
dishonest.

## 1. Discovery context

zellij's server (`zellij-server`) is a multi-threaded actor system: dedicated
`screen`, `pty`, `plugin`, `pty_writer`, `background_jobs` and `server` threads
communicate over `crossbeam` MPSC channels, while shared session state lives
behind `Arc<RwLock<...>>`. That is a textbook composition surface: safe
primitives (`RwLock`, channels, a tokio oneshot) glued by application code, where
the *discipline* — not any single primitive — is what keeps it live.

The specific surface is the input path in `zellij-server/src/route.rs`. For each
client keystroke/action the route thread:

1. reads `session_data` to resolve keybinds → a list of `Action`s, and
2. dispatches each `Action` through `route_action`.

`route_action` uses a oneshot completion channel so the client doesn't race ahead
of an in-flight action:

```rust
// route.rs (paraphrased)
let (completion_tx, completion_rx) = oneshot::channel();
let mut wait_forever = false;
match action { /* ... some actions set wait_forever = true ... */ }
// ... dispatch ScreenInstruction/PtyInstruction carrying NotificationEnd(completion_tx) ...
let result = wait_for_action_completion(completion_rx, &action_name, wait_forever);
```

For a **blocking** action (`--block-until-exit`, `wait_forever = true`),
`wait_for_action_completion` does `runtime.block_on(receiver.await)` — it **parks
the route thread forever** until another thread drops the matching
`NotificationEnd`, signalling completion.

Meanwhile the server main loop repeatedly takes `session_data.write()` to apply
instructions, and new clients / layout changes also write it.

## 2. The hazard (and why it was a real bug)

If the route thread parks on the completion wait **while still holding
`session_data.read()`**, you get the classic lock-held-across-a-blocking-wait
shape:

- The route thread holds `session_data` (shared/read) and blocks on the
  completion oneshot.
- A concurrent `session_data.write()` blocks on that read guard. Rust's `RwLock`
  is write-preferring, so the queued writer then **starves all new readers** —
  including the very route reads that would let a user issue the keystroke that
  closes the blocking pane and produces the completion.
- The completion the route thread is waiting for can therefore never be produced.
  Wait-for cycle → permanent freeze.

This is not hypothetical: it shipped in **zellij 0.44.2** as issue **#5141**
("Pressing Ctrl-G while a floating pane is open with `--block-until-exit` freezes
the session"). PR **#5152** (merged 2026-05-08) fixed it by removing the extra
state the route thread kept under `session_data`, so `route_action` no longer
holds any `session_data` guard across the wait.

## 3. Why the shipped code is safe (the load-bearing invariant)

At the pinned commit the discipline is stated **in zellij's own source**:

```text
// route.rs:192-195
// `route_action` must not borrow from the `session_data` read guard.
// otherwise blocking-CLI actions (`wait_forever=true`) park this function
// while still holding the guard, deadlocking concurrent `session_data.write()`s.
```

and at every call site the read guard is deliberately ended as a temporary
*before* `route_action` runs:

```rust
// route.rs (Key / Action dispatch)
// The read guard ends as a temporary in this expression so
// `route_action` runs without holding `session_data.read()`.
let dispatch_inputs = session_data.read().unwrap().as_ref().and_then(|s| {
    // ... copy out senders, default_shell, input mode, resolved actions ...
    Some((s.senders.clone(), s.default_shell.clone(), /* ... */, actions))
}); // <- read guard dropped here
if let Some((senders, default_shell, client_input_mode, actions)) = dispatch_inputs {
    for action in actions {
        route_action(action, /* ... */ senders.clone(), /* ... */)?; // no guard held
    }
}
```

Net effect: every blocking acquisition of the completion oneshot happens with
**no `session_data` guard held**, so a concurrent `session_data.write()` always
makes progress and the completion is always producible. The wait-for graph is
acyclic for every interleaving.

## 4. Modelling it in Axiom

We read the real lock-order discipline and mapped it to a deterministic resource
model (2 threads, 2 resources):

- `R0` = `session_data` `RwLock` — route thread **reads**; server loop **writes**.
- `R1` = action-completion / server-loop progress — the route thread blocks
  acquiring it; only the server loop (which needs `R0`) can produce it.

| Harness | Models | Expected |
|---|---|---|
| shipped discipline | route: read R0 → release R0 → wait R1; server: hold R1 → write R0 | clean |
| counterfactual (pre-#5152) | route: read R0 held → wait R1; server: hold R1 → write R0 | bug |

The shared-read / exclusive-write split is what makes the model faithful to an
`RwLock`: a held read blocks a concurrent write.

## 5. Axiom verdicts

```text
zellij_route_action_shipped_discipline   => Clean
zellij_route_action_held_guard_abba      => BugFound
                                            Deadlock { cycle: [ThreadId(0), ThreadId(1)] }
```

The witness is the textbook four-step AB-BA:

```text
t0  SharedRequest r0   ok            (route takes session_data.read())
t1  Request r1         ok            (server loop holds in-flight completion)
t0  Request r1         ok→blocked    (route wants completion, held by t1)
t1  Request r0         Deadlock { cycle: [ThreadId(0), ThreadId(1)] }
```

Wait-for graph at the failure point:

```text
t0 (route, holds session_data.read) -> r1 (completion) -> t1
t1 (server, holds completion)        -> r0 (session_data.write) -> t0
```

The clean harness is the regression guard: under exhaustive search, the shipped
"drop the read guard before blocking" discipline (PR #5152) has no such cycle.

## 6. Standalone reproduction (real std threads)

A std-only repro crate proves both directions with real threads, faithfully
mirroring the zellij mechanism (`Arc<RwLock<SessionData>>` + an `mpsc`
completion oneshot):

```text
[PART A] shipped discipline (drop session_data read guard before blocking): 50000 rounds completed in ~4.4s — NO DEADLOCK
[PART B] held-guard counterfactual: WATCHDOG TIMEOUT after 3s — AB-BA DEADLOCK reproduced (route holds session_data.read() across the completion wait; server blocks on session_data.write() and can never signal completion).
         Matches Axiom Deadlock { cycle: [ThreadId(0), ThreadId(1)] }.
```

## 7. Takeaway

The remediation this encodes is for *anyone routing events through a shared
`RwLock` while parking on a cross-thread completion / bounded channel*:

- Never hold a read (or write) guard on shared state across a blocking wait whose
  unblocker needs that same lock. **Copy what you need out of the guard, drop it,
  then block** — exactly what zellij does.
- A write-preferring `RwLock` turns "one reader parked forever" into "all readers
  and the writer parked forever": a single long-lived read guard is enough to
  wedge the whole system.
