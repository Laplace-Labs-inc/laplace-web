---
title: "Case Study 03: Async ref deadlock"
description: "A disclosure-pending case study showing how a synchronous RwLock read guard can freeze a single-thread async runtime."
slug: "async-ref-deadlock"
scenario: "async_ref_deadlock"
library: "std::sync::RwLock + async runtime"
author: "Laplace Labs"
publishedAt: 2026-07-11
updatedAt: 2026-05-28
tags: ["case-study", "async", "RwLock", "deadlock", "DPOR+POR"]
cover:
  image: "/assets/case-studies/async-ref-deadlock.svg"
  alt: "Async read guard wait-for graph cover"
  license: "CC-BY-4.0"
seo:
  ogImage: "/assets/case-studies/async-ref-deadlock.svg"
  twitterCard: "summary_large_image"
  jsonLd:
    "@context": "https://schema.org"
    "@type": "Article"
    headline: "Case Study 03: Async ref deadlock"
    datePublished: "2026-07-11"
    author:
      "@type": "Organization"
      name: "Laplace Labs"
reproRepository: "https://github.com/laplace-labs/case-study-03"
reproRepositoryStatus: "placeholder-only-local-task"
disclosure:
  status: "blocked-on-maintainer-notification"
  notifiedOn: null
  publicAfter: null
  notes: "Local draft only. Do not publish until upstream notification and the 30-day waiting period are complete."
license: "CC-BY-4.0"
---

# Case Study 03: Async ref deadlock

## 1. Discovery Context

This case is about a reference lifetime that looks harmless in synchronous code and becomes fatal in async code. The setup uses `std::sync::RwLock`, a single-thread Tokio runtime, one reader future, and one writer future. The reader takes a read guard and then awaits. The writer tries to acquire a write guard while the reader is asleep. Because the write lock call is blocking, it stops the executor thread that would otherwise wake the reader and let it drop the read guard.

The scenario was selected for LQ-6 because it is small enough to teach and common enough to matter. Teams often start with `std::sync::RwLock` around a configuration map. Later, an async refresh path grows around it. The compiler may reject some variants when a non-Send guard crosses a spawned task boundary, but not every program shape goes through `tokio::spawn`. A local current-thread runtime and `join!` can still produce the deadlock.

Laplace found the schedule by treating the synchronous write lock as a blocking resource edge and the sleeping reader as a runtime progress dependency. Without that second edge, a wait-for graph would only say "writer waits on reader." The useful diagnosis is stronger: the writer also prevents the reader from reaching the point where it can release.

The external repo placeholder is `https://github.com/laplace-labs/case-study-03`. It remains uncreated under the local-only constraint.

## 2. Code Reproduction

The repro uses one read guard, one sleep, and one write attempt. The sleep stands in for any await boundary: I/O, timer, channel receive, or child future.

```rust
use std::sync::{Arc, RwLock};
use std::time::Duration;

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let state = Arc::new(RwLock::new(vec![1_u8]));

    let reader_state = Arc::clone(&state);
    let reader = async move {
        let guard = reader_state.read().unwrap();
        tokio::time::sleep(Duration::from_millis(10)).await;
        println!("reader saw {}", guard.len());
        drop(guard);
    };

    let writer_state = Arc::clone(&state);
    let writer = async move {
        tokio::task::yield_now().await;
        let mut guard = writer_state.write().unwrap();
        guard.push(2);
        println!("writer updated");
    };

    let _ = tokio::join!(reader, writer);
}
```

The direct repro can hang because the writer blocks the only runtime thread while the reader's timer is pending. The deterministic repro should force the reader to take the read guard, force the writer to yield once, then let the writer call `write()` before the timer completes.

Expected placeholder repo layout:

```text
case-study-03/
  Cargo.toml
  README.md
  src/main.rs
```

The README should include a fixed async-lock version and a fixed early-clone version so readers can choose between changing the primitive and changing the ownership boundary.

## 3. DPOR+POR Search Tree

The DPOR+POR tree is short because only one branch matters: does the writer block the thread before or after the reader drops the guard?

```text
root
|-- R0 reader: read_lock acquired
|   |-- R1 reader: sleep pending
|   |   |-- W0 writer: yield
|   |   |   `-- W1 writer: write_lock => blocks executor
|   |   `-- timer wakes reader
|   |       `-- R2 drop read guard
|   `-- W0 writer: yield
`-- W0 writer: yield
    `-- W1 writer: write_lock acquired
```

The unsafe branch is not "reader before writer." That ordering is normal. The unsafe branch is "reader sleeps with guard, writer performs a blocking write wait on the only executor thread." The search tree labels the timer as a runnable event that cannot be serviced once the writer blocks.

The final ARD SVG should include the timer edge because it helps explain why the program is not merely slow. The timer is ready to make progress later, but the runtime is no longer able to poll it.

## 4. Equivalence, Sleep Set, Wait-For Graph

The sleep set removes schedules where the writer runs before the reader takes the read guard. Those schedules are safe because the writer can acquire and drop the write guard without waiting. It also removes reader-only schedules where the reader reaches the drop point before writer lock acquisition. The only retained branch is the interleaving that creates a pending timer and a blocking writer.

The wait-for graph has a resource edge and a progress edge:

```text
writer future -> RwLock write access -> reader future
reader future -> runtime timer poll -> executor thread
executor thread -> blocked in writer future
```

This is why the case is different from ordinary writer starvation. A fair RwLock cannot help if the thread responsible for releasing the read guard is blocked waiting for the write guard. The fairness policy never gets a chance to run.

The classification is "sync primitive held across await in a local async executor." The bug is independent of the exact timer duration. Replacing the timer with a socket read or channel receive preserves the same shape.

## 5. Fix Pattern / Avoidance Guide

The first fix is to avoid carrying a synchronous guard across an await. Clone or copy the data needed by the async section, then drop the guard before suspension:

```rust
let len = {
    let guard = state.read().unwrap();
    guard.len()
};
tokio::time::sleep(Duration::from_millis(10)).await;
println!("reader saw {len}");
```

The second fix is to use an async-aware lock when the critical section is truly async:

```rust
let state = Arc::new(tokio::sync::RwLock::new(vec![1_u8]));
let guard = state.read().await;
```

The first fix is often better because it shrinks the critical section and keeps lock ownership obvious. The second fix is necessary when the protected value must be mutated or observed as part of an async protocol.

The published article should be explicit that `std::sync::RwLock` is not broken. The problem is the boundary: blocking lock acquisition inside a future that runs on a cooperative executor. That boundary is exactly where Laplace should add value, because the schedule is tiny but easy to miss in review.

Publication remains blocked on the external repo and maintainer disclosure steps.

### Publication-Ready Analysis Addendum

The longer version of this case should begin by naming the false sense of safety: a read guard sounds harmless. Many developers associate read locks with concurrency because multiple readers can coexist, and the example does not mutate the protected data inside the reader. The bug appears only when the reader carries that guard across an async suspension and a writer later tries to acquire exclusive access on the same executor thread. The writer is not merely waiting for fairness. It is blocking the thread that must poll the reader to completion. A fair lock cannot release a guard for a future that is no longer being polled.

The article should distinguish three lifetimes. The lexical lifetime is the Rust scope where the guard variable exists. The async lifetime is the span across which the future may be suspended and later resumed. The executor lifetime is the availability of a thread to poll runnable futures. The source code makes the lexical lifetime visible, but the failure is caused by the async and executor lifetimes. Laplace adds value because the ARD trace records the point where the writer's blocking call consumes executor progress while the reader's guard is still live.

This is a good place to explain why "it works on the multi-threaded runtime" is not a proof. A multi-threaded Tokio runtime may have another worker available to poll the sleeping reader and eventually drop the guard. That can hide the problem in local tests. It does not make the program robust. Worker starvation, `spawn_blocking` saturation, CPU limits in containers, test harnesses that use current-thread runtimes, and embedded deployments can all collapse the available polling capacity. The smallest deterministic repro uses a current-thread runtime because it makes the missing contract obvious, but the design smell is broader.

The reproduction repository should include a variant with a socket-like wait or channel receive instead of a timer. The timer is easy to understand, but some readers may dismiss it as artificial. A channel receive makes the same point in a shape closer to production: the reader takes a snapshot, waits for an event while still holding the read guard, and the writer blocks trying to update the state that would allow the event path to finish. The exact await is replaceable. The invariant is not.

The DPOR+POR section should highlight the timer edge as a progress dependency. Traditional wait-for graphs often show only locks. That is not enough here. The writer waits for the reader's guard, the reader waits for a timer, and the timer waits for executor polling. Once the writer blocks the executor thread, the timer cannot complete from the program's perspective. Representing that as a graph teaches readers to reason about async deadlocks as resource cycles that include scheduler progress, not just mutexes.

The Sleep Set explanation can be tied to concrete review questions. If the writer runs before the reader acquires the read guard, the write is safe and the branch can be pruned. If the reader acquires and drops the guard before the writer attempts the write, the branch is also safe. The retained branch is the one where the reader has a live guard and a pending await, and the writer then performs a blocking write acquisition. That branch is small enough that a human can understand it, yet specific enough that random testing is unlikely to guarantee it.

The remediation section should avoid presenting async locks as a blanket replacement. `tokio::sync::RwLock` prevents blocking the executor thread, but it can still create long critical sections, convoying, and cancellation complexity if guards are held across unrelated awaits. The better first question is whether the async section really needs a guard. Often the code only needs a copied length, an ID, a clone of an `Arc`, or a snapshot of a configuration value. Dropping the guard before suspension preserves both correctness and throughput.

For code review, the article should propose a guard-lifetime audit. Search for `std::sync::{Mutex,RwLock}` guards in async functions. For each guard, mark the next await, callback registration, channel operation, and blocking call. If any of those appears before the guard drops, the code needs a specific justification. This is more actionable than banning synchronous locks in async code entirely. There are valid short-lived uses of synchronous locks in async programs, especially for tiny in-memory counters or caches. The forbidden shape is a guard lifetime that crosses a suspension or wake boundary.

The Bug DB metadata should include `async_ref_deadlock` as a composition between a blocking RwLock and a cooperative runtime. The `lock_order_seq` alone can describe read-to-write contention, but the description should mention the executor progress edge. That makes future matches more accurate. A later trace involving a different lock implementation or a custom executor can still map to the same pattern if the scheduler dependency is present.

The public article should end by reframing the lesson: Rust's type system prevents many memory bugs, but it does not make a blocking primitive cooperative. When synchronous and asynchronous worlds meet, the ownership lifetime that matters is not always the one the compiler displays. Deterministic schedule exploration is valuable precisely because it turns that hidden lifetime into a concrete branch. The reader should leave with a simple rule: snapshot under the lock, drop the guard, then await; if that is impossible, use an async-aware primitive and keep the guarded async section intentionally small.

The final article should add a short migration checklist for teams that already have synchronous locks in async code. First, classify each guard as "single poll" or "cross poll." A single-poll guard is acquired and dropped before any await, callback registration, channel wake, or blocking operation. A cross-poll guard survives one of those boundaries and needs redesign. Second, identify whether the protected data can be cloned, copied, or summarized. If yes, use a snapshot. Third, if the data truly must stay live across async work, move to an async lock and document cancellation behavior. Fourth, add a deterministic test that forces the writer to run while the reader is suspended.

The operational section should explain that this failure may look like writer starvation even when the root cause is executor blocking. A dashboard may show growing write latency, but the lock implementation is not necessarily unfair. The writer is waiting for readers, and one reader cannot resume because the writer blocked the thread. That circular explanation is hard to see from aggregate metrics. A trace with executor progress edges makes it visible. The public article should encourage teams to capture both lock waits and runtime task states when debugging async stalls.

For disclosure, this case should stay framed as an application composition hazard. The standard library lock is working as a blocking lock. Tokio is working as a cooperative runtime. The bug appears when a program asks both contracts to cover the same critical section. If maintainers are notified, the request should be for feedback on wording and teaching value, not for a security advisory unless new evidence shows a library-specific contract breach.

The article should also include a paragraph for library authors. Public async APIs should avoid returning guard-like values that can be accidentally carried across awaits unless that lifetime is central to the API and heavily documented. When a synchronous guard is unavoidable, examples should show the snapshot pattern by default. Users copy examples more often than they read caveats. A case study that pairs the failing shape with a clean example can improve downstream code without asking every team to become an expert in executor internals.

Finally, the published repro should store the ARD trace next to the source, not as a screenshot only. Screenshots are good for the article, but the raw trace lets another developer replay the schedule, inspect the wait-for graph, and confirm that a proposed fix removes the same branch. That replayability is the bridge between a blog post and a regression test.

The final checklist should include one negative example as well: replacing the read lock with a write lock earlier is not automatically a fix if the write guard is still held across the await. It may reduce contention shapes while preserving the executor-blocking problem. The invariant is guard lifetime, not guard flavor. A patch is complete only when the blocking guard is gone before suspension, or when the primitive and runtime are both cooperative and the critical section is intentionally bounded.

The case should also remind readers to test the smallest runtime configuration they support. If a library says it works on current-thread runtimes, a current-thread deterministic repro is fair. Multi-thread success can be a useful confidence signal, but it should not be the only correctness gate for code that advertises cooperative async compatibility.
