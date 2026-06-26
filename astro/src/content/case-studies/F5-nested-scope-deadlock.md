---
title: "Case Study 05: Nested scope deadlock"
description: "A disclosure-pending case study showing how nested rayon scopes can preserve a mutex dependency the parent cannot release."
slug: "nested-scope-deadlock"
scenario: "nested_scope_deadlock"
library: "rayon"
author: "Laplace Labs"
publishedAt: 2026-07-11
updatedAt: 2026-05-28
tags: ["case-study", "rayon", "scope", "mutex", "DPOR"]
cover:
  image: "/assets/case-studies/nested-scope-deadlock.svg"
  alt: "Nested scope wait-for graph cover"
  license: "CC-BY-4.0"
seo:
  ogImage: "/assets/case-studies/nested-scope-deadlock.svg"
  twitterCard: "summary_large_image"
  jsonLd:
    "@context": "https://schema.org"
    "@type": "Article"
    headline: "Case Study 05: Nested scope deadlock"
    datePublished: "2026-07-11"
    author:
      "@type": "Organization"
      name: "Laplace Labs"
reproRepository: "https://github.com/laplace-labs/case-study-05"
reproRepositoryStatus: "placeholder-only-local-task"
disclosure:
  status: "blocked-on-maintainer-notification"
  notifiedOn: null
  publicAfter: null
  notes: "Local draft only. Do not publish until upstream notification and the 30-day waiting period are complete."
license: "CC-BY-4.0"
---

# Case Study 05: Nested scope deadlock

## 1. Discovery Context

This scenario targets a mistake that looks like ordinary structured concurrency: a parent task opens a scope, holds a mutex while preparing shared state, and spawns nested work that also needs the mutex. In Rayon, scopes are useful because they let child tasks borrow stack data safely. That safety does not mean the child can make progress through a lock held by the parent while the parent waits for the scope to finish.

The L-2 audit corpus already had simple mutex cycles. LQ-6 needed one case where the cycle is not written as two obvious threads calling `lock()` in opposite order. Nested scopes provide that. The parent is waiting for scoped children. A child is waiting for the parent's mutex. The parent cannot drop the mutex because it is inside the lexical block that waits for the child.

DPOR found the failure by modelling `scope` completion as a wait edge. That is the important part. If the model only tracks mutexes, the child waits on the parent, but the parent's wait on the child remains implicit. Once scope completion is represented as a resource, the cycle is direct.

The external placeholder is `https://github.com/laplace-labs/case-study-05`. It must be created later with the minimized repro and fixed variants.

## 2. Code Reproduction

The repro uses a two-thread Rayon pool so the child task can start while the parent still owns the mutex. It is short enough to run as `src/main.rs`.

```rust
use rayon::ThreadPoolBuilder;
use std::sync::{Arc, Mutex};

fn main() {
    let pool = ThreadPoolBuilder::new().num_threads(2).build().unwrap();
    let shared = Arc::new(Mutex::new(Vec::<u8>::new()));

    pool.scope(|outer| {
        let shared_outer = Arc::clone(&shared);
        outer.spawn(move |_| {
            let mut guard = shared_outer.lock().unwrap();
            guard.push(1);

            rayon::scope(|inner| {
                let shared_inner = Arc::clone(&shared_outer);
                inner.spawn(move |_| {
                    let mut nested = shared_inner.lock().unwrap();
                    nested.push(2);
                });
            });

            println!("parent releases after nested scope");
        });
    });
}
```

The nested child needs `shared`. The parent cannot leave the nested `scope` until the child finishes. The parent cannot release `shared` until it leaves the lexical block after the nested scope. That is enough for a deadlock.

Expected placeholder repo layout:

```text
case-study-05/
  Cargo.toml
  README.md
  src/main.rs
```

The README should include a note that this is not a Rayon scheduler bug. The scope API is doing what it promises: it waits for nested work before returning.

## 3. DPOR Search Tree

The search tree labels scope completion as a wait:

```text
root
|-- P0 outer child starts
|   |-- P1 lock(shared)
|   |   |-- P2 enter nested scope
|   |   |   `-- C0 nested child starts
|   |   |       `-- C1 lock(shared) => waits on P
|   |   `-- P3 nested scope waits on C
|   `-- C0 not spawned
`-- main waits on outer scope
```

The cycle is between `P3` and `C1`. The parent waits for the nested child because of scope semantics. The child waits for the parent because of mutex ownership. The parent only drops the mutex after the nested scope returns, so neither edge can clear.

DPOR prunes schedules where the parent drops the guard before spawning nested work because the child can then acquire the mutex. It also prunes schedules where the nested child never starts before timeout because they do not prove the cycle. The retained schedule is minimal and stable.

## 4. Equivalence, Sleep Set, Wait-For Graph

The equivalence class is governed by lexical ownership. Many instruction interleavings commute while the parent owns `shared`. They stop commuting when nested scope completion becomes pending. From that point, the child lock attempt and the parent scope wait are dependent.

The sleep set can ignore parent-only work before `inner.spawn`, because it does not change the child state. It cannot ignore `inner.spawn`, because it creates a child that may contend for `shared`. That is the branch the final ARD should highlight.

The wait-for graph is:

```text
nested child -> shared mutex -> parent task
parent task -> nested scope completion -> nested child
main task -> outer scope completion -> parent task
```

The main task is not part of the minimal cycle, but it explains the symptom: the whole program waits forever even though only one child and one parent are involved.

The classification is "structured-concurrency ownership cycle." It is a useful addition to the Bug DB because it broadens the corpus beyond plain thread pairs.

## 5. Fix Pattern / Avoidance Guide

The fix is to keep scoped waits outside mutex ownership. Prepare the data under the lock, drop the guard, and then spawn nested work:

```rust
{
    let mut guard = shared.lock().unwrap();
    guard.push(1);
}
rayon::scope(|inner| {
    let shared_inner = Arc::clone(&shared);
    inner.spawn(move |_| {
        shared_inner.lock().unwrap().push(2);
    });
});
```

If nested work must receive prepared data, pass owned data instead of a locked reference. Another good option is to split the shared vector into independent shards so parent and child do not contend on the same mutex.

The final public repo should include three examples: the failing nested scope, an early-drop fix, and an ownership-transfer fix. That keeps the article practical and avoids turning the case into a generic warning against Rayon scopes.

Publication remains blocked on the external repo, maintainer notification, and the 30-day waiting period.

### Publication-Ready Analysis Addendum

The finished case study should frame this bug as a structured-concurrency ownership cycle. Rayon scopes are designed to make lifetimes safer: spawned work cannot outlive the scope that owns its borrowed data. That guarantee is valuable, but it also creates a wait edge. The parent cannot leave the nested scope until the child finishes. If the parent holds a mutex while entering that nested scope, and the child needs the same mutex, the safety guarantee becomes part of the deadlock cycle. The scope API is not broken. The ownership boundary is too wide.

This shape is worth including in the LQ-6 series because it broadens the Bug DB beyond async examples. Many concurrency bugs are taught as thread pairs or async executor stalls. Rayon adds a different mental model: lexical parallelism. Developers see a block, spawn work inside it, and expect the block to organize cleanup. That expectation is correct, but it can hide the fact that cleanup is a synchronization point. A parent that waits for children while holding shared state is no different from a thread that joins another thread while holding a lock. The syntax is friendlier; the wait-for graph is still real.

The article should walk readers through the scope semantics before discussing the lock. In an outer scope, the parent task spawns child work. Inside that child work, a nested scope spawns more work. The nested scope cannot return until the nested child completes. The parent cannot drop variables that live after the nested scope until the nested scope returns. If one of those variables is a mutex guard, the guard remains live while the nested child is running. That is the precise invariant the repro exploits. The child is not competing with an arbitrary long-lived lock; it is competing with a lock whose release is structurally after the child's completion.

The ARD visualization should make the lexical wait visible. A plain lock graph with `child -> shared -> parent` is incomplete. The missing edge is `parent -> nested scope completion -> child`. That edge is not written as a function call named `wait`, but it is part of the semantics of the scope. The article should label it as a structured wait edge. Doing so teaches readers to include joins, scope exits, task groups, and nursery completion in their wait-for graphs.

This case also has a useful performance angle. Even when a program does not fully deadlock, holding a mutex across nested parallel work can destroy parallelism. Other workers may sit idle because the only available work needs a guard held by the parent. The deterministic deadlock repro is the sharpest version of the problem, but the same pattern can appear as a throughput collapse. That makes the fix valuable even for teams that have not seen a hard hang in production.

The remediation section should compare two design styles. In the early-drop style, the parent computes or mutates the shared value, drops the guard, and then enters the nested scope. This is the best local fix when the child can reacquire shared state later. In the ownership-transfer style, the parent extracts owned data under the lock and moves that data into the nested child. This is often better for Rayon because it lets the child perform CPU-heavy work without contending on shared state. Both styles keep scoped waits outside mutex ownership.

The final repro repository should include a "bad", "early-drop", and "owned-data" directory. Each should be runnable with `cargo run`. The bad example should hang or be detectable by the Laplace scenario. The early-drop example should preserve shared-state mutation while avoiding the cycle. The owned-data example should show a more idiomatic parallel design, where the parent prepares a vector or work item and the nested child processes it without touching the original mutex. That layout makes the case study practical instead of merely diagnostic.

For partial-order reduction, this case demonstrates that not all important dependencies are lock operations. The sleep set can prune parent-only work before the nested spawn because it does not enable the child. It cannot prune the nested spawn because that operation creates a new actor that may contend on `shared`. Once the child attempts the lock, the parent scope wait and child lock wait are dependent. The tree is small because the bug is structural, not because the program is trivial. Larger Rayon programs can contain the same cycle with many unrelated tasks around it.

The Bug DB metadata should classify this as `nested_scope_deadlock` with resource classes for `mutex` and `scope_completion`. That second class matters for future matching. A similar bug could happen with `std::thread::scope`, a custom task group, or an async nursery. The shared feature is not Rayon specifically; it is a parent that waits for child completion while holding a resource the child needs. Indexing the pattern this way will make the corpus more useful than a library-specific label alone.

The article should be explicit about what reviewers should look for. A `scope` call inside a mutex guard is a high-risk shape. A nested `scope` inside worker code that already owns shared state is also high risk. Passing `Arc<Mutex<_>>` into nested spawned work is not wrong by itself, but it should trigger a question: does the parent hold the same mutex until after the child completes? If yes, the code needs restructuring before it needs benchmarking.

The publication note should avoid blaming Rayon. Rayon gives a clear contract: scoped tasks complete before the scope exits. The repro uses that contract to show an application-level ownership mistake. If maintainers are notified, the most likely useful outcome is documentation language or an example warning against locks held across nested scopes. The public article should present the case as a design pattern to avoid, not as a defect in scoped parallelism.

The closing rule can be concise: never wait for child work while holding a resource that child work may need. That rule applies to joins, scopes, task groups, and async nurseries. For Rayon specifically, keep mutex guards inside small preparation blocks and move owned work into parallel closures. If shared state must be updated after child work completes, reacquire the lock after the scope returns. Laplace's deterministic trace gives teams a way to verify that the intended ownership boundary is actually present in the code.

The final article should add a review checklist for scoped parallelism. Look for `scope` calls inside a lexical block that owns a guard. Look for parent closures that mutate shared state and then spawn nested child closures. Look for comments that say "child will finish before return" near a lock. Each signal means the reviewer should draw a wait edge from parent to child and a resource edge from child back to parent. If those two edges point at each other, the code needs to move the guard boundary before the nested scope.

The production symptom may not always be a permanent hang. In a large Rayon pool, unrelated work can continue while one nested scope is stuck. Operators may see a batch job that reaches 99 percent completion and never drains the final unit, or a CPU profile where workers are mostly idle while one task waits. That is why the article should include both deadlock and throughput language. A structured wait inside a lock can be catastrophic even when the whole process is not frozen.

For disclosure, the case should stay clear that Rayon is honoring scoped lifetimes. The issue is the user's ownership shape. Maintainer feedback may still improve docs or examples, especially around nested scopes and locks, but the public story should be educational rather than accusatory. The more useful takeaway is portable: any structured-concurrency API that waits for children before returning can participate in a wait-for cycle if the parent keeps a child-needed resource alive across that wait.

The final page should include a portability note. The same ownership cycle can appear with `std::thread::scope`, scoped task groups in other languages, and async nurseries that wait for children before returning. Rayon is the concrete Rust example, but the rule is broader than one scheduler. A parent wait edge is a resource edge for correctness purposes. If a child needs a mutex, file handle, permit, or bounded-capacity slot held by the parent until after the wait, the structure is unsafe. Naming that broader rule makes the article useful to teams that use multiple concurrency runtimes.

The regression-test guidance should be similarly portable. Build a minimal parent-child-child schedule, force the nested child to request the parent-owned resource, and assert that the fixed version terminates under deterministic exploration. That test belongs near the abstraction that creates nested work, not only near the final application job. The earlier the test sits, the more future users benefit from the documented ownership boundary.

The article should also warn against a common cosmetic fix: moving the nested `scope` call into a helper without changing guard lifetime. That can make the parent function look cleaner while preserving the same wait edge. The review should follow the guard, not the helper boundary. If the guard is live when the helper waits for child work, the cycle is still present. The fixed code must make the drop point visible before the structured wait begins.
