---
title: "Case Study 01: Tokio watch mutex race"
description: "A disclosure-pending case study showing how a watch notification can expose a synchronous mutex held across an async yield."
slug: "tokio-watch-mutex-race"
scenario: "tokio_watch_mutex_race"
library: "tokio"
author: "Laplace Labs"
publishedAt: 2026-07-11
updatedAt: 2026-05-28
tags: ["case-study", "tokio", "watch", "mutex", "Ki-DPOR"]
cover:
  image: "/assets/case-studies/tokio-watch-mutex-race.svg"
  alt: "Ki-DPOR search tree for the Tokio watch mutex race case study"
  license: "CC-BY-4.0"
seo:
  ogImage: "/assets/case-studies/tokio-watch-mutex-race.svg"
  twitterCard: "summary_large_image"
  jsonLd:
    "@context": "https://schema.org"
    "@type": "Article"
    headline: "Case Study 01: Tokio watch mutex race"
    datePublished: "2026-07-11"
    author:
      "@type": "Organization"
      name: "Laplace Labs"
reproRepository: "https://github.com/laplace-labs/case-study-01"
reproRepositoryStatus: "placeholder-only-local-task"
disclosure:
  status: "blocked-on-maintainer-notification"
  notifiedOn: null
  publicAfter: null
  notes: "Local draft only. Do not publish until upstream notification and the 30-day waiting period are complete."
license: "CC-BY-4.0"
---

# Case Study 01: Tokio watch mutex race

## 1. Discovery Context

The first version of this scenario came from the L-2 Bug DB work, not from a production incident. The harness was intentionally small: a current-thread Tokio runtime, one `watch` channel, and one synchronous mutex used as if it were a harmless critical-section guard. The interesting part was not that the code was exotic. It was that the code looked like the kind of adapter glue teams write when they bridge an async signal with an old synchronous cache.

The experiment used the BYOC test macro introduced before LQ-6. The macro wrapped the scenario in a Laplace verification session, replaced the ordinary scheduler with a deterministic scheduler, and recorded an ARD trace whenever a wait-for edge stayed live after the schedule budget was exhausted. That gave the team a compact artifact: the runtime did not need millions of random runs, because Ki-DPOR kept forcing the two relevant operations next to each other.

The failing schedule had only three actors. The sender acquired the mutex, sent a watch update, and then yielded while still holding the guard. The receiver woke on `changed()`, observed that a value was ready, and tried to acquire the same mutex before borrowing the new value. A third maintenance future was not needed. The cycle was between the sender's suspended continuation and the receiver's blocking lock attempt on the same single-thread executor.

This is a draft case study, not a vulnerability disclosure. The external minimal repro repository is represented as a placeholder at `https://github.com/laplace-labs/case-study-01`. The repo must contain a `Cargo.toml`, `src/main.rs`, and a short README before publication. Maintainer notification is also still pending. The public article must stay embargoed until that notice exists and the 30-day waiting period has elapsed.

## 2. Code Reproduction

The minimal repro keeps every moving part visible. It uses `std::sync::Mutex` on purpose. Replacing it with `tokio::sync::Mutex` changes the failure mode because the lock attempt becomes cooperative instead of blocking the executor thread.

```rust
use std::sync::{Arc, Mutex};
use tokio::sync::watch;

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let (tx, mut rx) = watch::channel(0_u64);
    let shared = Arc::new(Mutex::new(()));

    let sender_lock = Arc::clone(&shared);
    let sender = async move {
        let _guard = sender_lock.lock().unwrap();
        tx.send(1).unwrap();
        tokio::task::yield_now().await;
        println!("sender releases after yield");
    };

    let receiver_lock = Arc::clone(&shared);
    let receiver = async move {
        rx.changed().await.unwrap();
        let _guard = receiver_lock.lock().unwrap();
        println!("receiver saw {}", *rx.borrow());
    };

    let _ = tokio::join!(sender, receiver);
}
```

The repro is under 60 lines because the point is the interleaving, not framework setup. On an ordinary run the schedule may complete if the sender resumes and drops the guard before the receiver's blocking lock call. Under deterministic exploration, the receiver is scheduled immediately after the watch notification and before the sender continuation. That is the schedule worth preserving.

Expected placeholder repo layout:

```text
case-study-01/
  Cargo.toml
  README.md
  src/main.rs
```

The README should include two commands: `cargo run` for the direct demonstration and `laplace verify --scenario tokio_watch_mutex_race` once the repro is wired to the BYOC harness.

## 3. Ki-DPOR Search Tree

The ARD trace collapsed a larger set of equivalent schedules into four decision points. The tree below is a text rendering of the cover SVG, not a substitute for the final ARD export.

```text
root
|-- S0 sender: lock(shared)
|   |-- S1 sender: watch::send(1)
|   |   |-- S2 sender: yield_now()
|   |   |   `-- receiver: changed() wakes
|   |   `-- R2 receiver: changed() wakes
|   |       `-- R3 receiver: lock(shared) => blocks executor
|   `-- R1 receiver: changed() pending
`-- R0 receiver: changed() pending
```

The decisive edge is `sender guard -> receiver lock(shared)`. Ki-DPOR prioritizes the `watch::send` wake edge because it creates a new runnable actor. Once the receiver runs, the synchronous mutex turns an ordinary resource wait into an executor-level block. There is no future polling progress left on the only runtime thread.

The useful property of the trace is that it explains why naive stress tests are weak here. A stress test needs luck to run the receiver in the tiny window after the send and before the guard drop. Ki-DPOR makes that window an explicit branch.

## 4. Equivalence, Sleep Set, Wait-For Graph

Most schedules in this repro are equivalent. If the receiver polls before the send, it parks on `changed()`. If the sender sends and then immediately resumes, the guard drops before the receiver locks. Both schedules are safe and can be grouped away. The non-equivalent schedule is the one where the send creates a runnable receiver and the scheduler explores that receiver before the sender's continuation.

The sleep set removes branches where the receiver's pending poll commutes with the sender's initial lock. It does not remove the branch after `watch::send`, because wake delivery changes the receiver's enabled state. That distinction is why the trace stays small.

The wait-for graph has two live nodes at the failure point:

```text
receiver task -> shared mutex -> sender task
sender task -> executor turn -> receiver task
```

The second edge is easy to miss in manual reviews. It is not a lock in the source code. It is a scheduler dependency created by holding a synchronous guard across an await boundary on a current-thread executor. Laplace records it as a runtime progress dependency, which makes the cycle visible.

The classification is therefore not "data race" and not a watch-channel bug. It is a cooperative scheduling deadlock caused by a blocking primitive inside an async critical path.

## 5. Fix Pattern / Avoidance Guide

The narrow fix is to drop the synchronous guard before calling `send()` or before any await. The stronger fix is to remove `std::sync::Mutex` from async paths unless the guard lifetime is proven to be shorter than a single poll. If the shared state must be protected across async work, use `tokio::sync::Mutex` and still keep the critical section small.

The watch-specific guideline is simple: treat `send()` as a wake boundary. After a send, any receiver may run before the sender's next line of code. Code that relies on "I will drop this guard immediately after notifying" is already depending on a schedule that the runtime does not promise.

For the final public repro, the README should show two patches. First, an early-drop patch:

```rust
{
    let _guard = shared.lock().unwrap();
    update_cache();
}
tx.send(1).unwrap();
tokio::task::yield_now().await;
```

Second, an async-aware patch:

```rust
let shared = Arc::new(tokio::sync::Mutex::new(()));
let _guard = shared.lock().await;
```

This case should not be published as an upstream defect unless a real upstream API contract is implicated. As written, it is a teaching case for application authors and for the Bug DB search corpus. Publication remains blocked on maintainer notification and the required waiting period.

### Publication-Ready Analysis Addendum

The production version of this case study should spend time on why this pattern survives ordinary review. The source code has a reassuring shape: the sender takes a guard, performs a small update, sends a notification, yields, and then lets the guard drop. In a synchronous program that would be suspicious but usually easy to reason about, because the next line after `send` is still in the same call stack. In an async program, the notification is a scheduling boundary. The receiver is not a passive observer of a value. It is a future that may become runnable before the sender's continuation is polled again. That distinction is the entire bug. The code is short, but the mental model has to include the executor queue.

The final article should also separate three concepts that often get blurred together. First, `watch` is a last-value broadcast primitive. It lets receivers observe the latest value, and it deliberately wakes them when a new value is sent. Second, `std::sync::Mutex` blocks the operating-system thread when contended. It has no knowledge of the cooperative executor above it. Third, `yield_now` is only a compact way to make the scheduling boundary obvious in the repro. Real programs create the same boundary through network writes, file I/O, timer waits, queue sends, tracing flushes, or any other await that may hand control back to the runtime. The repro uses `yield_now` because it makes the failure deterministic enough for a short article, not because the pattern depends on that exact function.

One useful review rule is to treat every notification as a handoff. If a task calls `send`, `notify_one`, `broadcast`, or a similar wake operation while holding a blocking guard, reviewers should ask which newly enabled task can run before the guard is dropped. That question is sharper than the generic rule "do not hold locks across await." In this repro, the sender technically sends before the explicit await, but the send itself wakes the receiver. A reviewer who only searches for `await` inside the lexical guard may miss the hazard. Laplace catches it because the schedule model includes wake edges, not just syntactic await points.

The Ki-DPOR trace is especially helpful when explaining the difference between a rare bug and an impossible bug. A stress test can run this sample thousands of times without observing the hang if the sender usually resumes first. That result does not prove safety; it only proves that the default scheduler had a bias. Ki-DPOR treats the post-send receiver run as a branch that must be explored because it is not equivalent to resuming the sender. Once the receiver blocks the executor thread, the sender cannot reach the guard drop. The trace turns a timing story into a small graph with a stable cycle.

For a published reproduction repository, the README should include a "why this hangs" timeline with exact ownership states. Step one: sender owns `shared`. Step two: sender updates the watch channel and receiver becomes runnable. Step three: scheduler polls receiver. Step four: receiver calls the blocking mutex and parks the only executor thread. Step five: sender's future is ready in principle but cannot be polled. That timeline is more useful than saying "deadlock" alone, because it shows developers where to place the fix. The fix is not to make the receiver sleep longer or to increase a timeout. The fix is to stop notifying while a blocking guard can make the awakened task block the executor.

The article should be careful about the phrase "mutex held across async yield." The direct repro does hold the guard across `yield_now`, but the stricter invariant is "blocking guard held across a point that can make another task runnable." The latter includes pre-await handoffs. This is why the early-drop patch is preferable to merely moving the explicit await. A patch that sends while holding the guard and awaits after dropping it may still be fragile if the receiver can run synchronously through a callback or if a future runtime optimization changes poll ordering. The safest shape is to finish all guarded state mutation, drop the guard, then notify.

The Bug DB entry should classify the pattern as a composition bug with two resource classes: a synchronous lock and an async wake edge. That classification helps search. Teams can query for similar traces even when the exact library is not `tokio::sync::watch`. A `Notify`, a `broadcast` channel, or a custom waiter list can produce the same structure. The important fingerprint is a wake edge emitted while a blocking guard is still live, followed by an awakened task that wants that guard before the original task can release it.

There is also a testing lesson. Unit tests that run under the default multi-threaded Tokio runtime may hide the issue because another worker thread can keep polling. That does not make the code safe in deployment. A service may run current-thread runtimes in tests, in embedded contexts, in WASM-adjacent shells, or inside single-threaded actors. Even on a multi-threaded runtime, blocking mutex contention can starve unrelated work and make latency cliffs appear. The deterministic repro intentionally uses `current_thread` to reveal the contract violation in its smallest form.

The public version should close with a practical checklist. Do not hold `std::sync` guards across notifications or awaits in async code. Prefer owned snapshots for values that must be observed after a wake. Use `tokio::sync` primitives only when the critical section is truly async, and still keep those sections small. Treat `watch::send` as a point where receiver code may execute immediately from the perspective of correctness. Add a deterministic schedule test for any adapter that bridges legacy synchronous state into async notification paths.

The final editorial pass should include a small "how to verify your own code" box. A reader can search their project for `watch::Sender::send`, `send_replace`, and `borrow_and_update`, then inspect the surrounding scope for blocking guards. If a guard exists, they should ask whether the receiver can call back into the same state or into a state protected by the same ordering group. If the answer is unknown, the team should add a tiny harness before shipping a refactor. The harness does not need production traffic or real I/O. It only needs the sender operation, the receiver operation, and a scheduler that can put the receiver immediately after the wake.

The article should also describe the failure symptom in operational language. In production, this kind of bug may not appear as a clean deadlock report. It can look like a request handler that never returns, a background configuration watcher that stops applying updates, or a control-plane endpoint that keeps accepting connections while one subsystem stops making progress. Logs may show the sender's pre-notification line and never show its post-yield line. Metrics may show a single-thread runtime at zero useful throughput rather than high CPU. These symptoms help readers map the minimal repro back to real incidents.

One final note belongs near the disclosure block: this draft intentionally avoids publishing a live upstream issue link. Once notification happens, the public article should add either the maintainer response or a neutral statement that no upstream API change was requested. That keeps the case study ethically narrow and technically strong. The point is to teach a schedule class, not to inflate a composition mistake into a dependency vulnerability.

Before publication, add a short comparison with ordinary logging-based debugging. Logs can show that the sender emitted a value and that the receiver started, but they rarely capture the negative fact that the sender continuation never became runnable again on the only executor thread. A deterministic ARD file can show that missing continuation directly. That is the difference between observing symptoms and preserving a proof-shaped explanation. The article should encourage teams to attach the ARD trace to incident reviews because it records the runnable set, the blocked resource, and the chosen branch in one artifact.
