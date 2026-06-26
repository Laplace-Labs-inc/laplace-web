---
title: "Case Study 04: RwLock upgrade"
description: "A disclosure-pending case study on a lock upgrade pattern that closes a wait-for cycle through a shared invalidation mutex."
slug: "rwlock-upgrade"
scenario: "rwlock_upgrade"
library: "parking_lot::RwLock"
author: "Laplace Labs"
publishedAt: 2026-07-11
updatedAt: 2026-05-28
tags: ["case-study", "parking_lot", "RwLock", "upgrade", "DPOR+POR"]
cover:
  image: "/assets/case-studies/rwlock-upgrade.svg"
  alt: "RwLock upgrade search tree cover"
  license: "CC-BY-4.0"
seo:
  ogImage: "/assets/case-studies/rwlock-upgrade.svg"
  twitterCard: "summary_large_image"
  jsonLd:
    "@context": "https://schema.org"
    "@type": "Article"
    headline: "Case Study 04: RwLock upgrade"
    datePublished: "2026-07-11"
    author:
      "@type": "Organization"
      name: "Laplace Labs"
reproRepository: "https://github.com/laplace-labs/case-study-04"
reproRepositoryStatus: "placeholder-only-local-task"
disclosure:
  status: "blocked-on-maintainer-notification"
  notifiedOn: null
  publicAfter: null
  notes: "Local draft only. Do not publish until upstream notification and the 30-day waiting period are complete."
license: "CC-BY-4.0"
---

# Case Study 04: RwLock upgrade

## 1. Discovery Context

This case came from an audit pattern rather than a single upstream issue: read-mostly caches that occasionally need to upgrade from observation to mutation. The sample uses `parking_lot::RwLock` and a separate invalidation mutex. The upgrade path looks reasonable when read in isolation. A worker reads the cache, decides the entry is stale, takes the invalidation mutex, and then upgrades to write access. A second worker takes the same steps in the opposite order around a neighboring cache.

The failure is not that upgrades are always bad. The failure is that an upgrade is still a lock acquisition, and it participates in the same ordering rules as any other acquisition. The invalidation mutex made the graph cyclic.

The BYOC harness modelled two cache shards and one invalidation path. DPOR+POR reduced the search to the schedules where both workers hold read access before either performs the write upgrade. That is the narrow danger zone. If one worker upgrades early, the other waits safely. If both hold read guards and each also owns the other's invalidation dependency, the cycle appears.

The external placeholder is `https://github.com/laplace-labs/case-study-04`. No remote repository was created.

## 2. Code Reproduction

This minimized example uses two `RwLock` values and one `Mutex` to represent an invalidation lane. The shape is intentionally small enough to fit on a slide and in an ARD trace.

```rust
use parking_lot::{Mutex, RwLock};
use std::sync::Arc;
use std::thread;

fn main() {
    let shard_a = Arc::new(RwLock::new(0_u64));
    let shard_b = Arc::new(RwLock::new(0_u64));
    let invalidation = Arc::new(Mutex::new(()));

    let a1 = Arc::clone(&shard_a);
    let b1 = Arc::clone(&shard_b);
    let i1 = Arc::clone(&invalidation);
    let left = thread::spawn(move || {
        let _read_a = a1.read();
        let _inv = i1.lock();
        let mut write_b = b1.write();
        *write_b += 1;
    });

    let a2 = Arc::clone(&shard_a);
    let b2 = Arc::clone(&shard_b);
    let i2 = Arc::clone(&invalidation);
    let right = thread::spawn(move || {
        let _read_b = b2.read();
        let mut write_a = a2.write();
        let _inv = i2.lock();
        *write_a += 1;
    });

    left.join().unwrap();
    right.join().unwrap();
}
```

The code uses write acquisition rather than the `upgradable_read` API because the point is upgrade behavior as a pattern: a read observation is followed by a write need while another resource is held. A final repro repo can include a second file using `RwLockUpgradableReadGuard` to show the same ordering rule with the explicit upgrade API.

Expected placeholder repo layout:

```text
case-study-04/
  Cargo.toml
  README.md
  src/main.rs
```

## 3. DPOR+POR Search Tree

The ARD search tree is built around the two reads:

```text
root
|-- L0 read(shard_a)
|   |-- R0 read(shard_b)
|   |   |-- L1 lock(invalidation)
|   |   |   `-- L2 write(shard_b) => waits on R
|   |   `-- R1 write(shard_a) => waits on L
|   `-- L1 lock(invalidation)
`-- R0 read(shard_b)
    `-- R1 write(shard_a)
```

The failing branch requires both read guards to exist before either write lock completes. The invalidation mutex changes which worker can move next, but the cycle is ultimately between read guards and write acquisition.

DPOR+POR prunes schedules where only one read is present because the first writer can proceed after the other reader is absent. It retains the branch where the two reads are concurrent because `write(shard_a)` and `write(shard_b)` no longer commute with the held reads.

## 4. Equivalence, Sleep Set, Wait-For Graph

The equivalence classification is "two-reader upgrade cycle with side mutex." The side mutex is not always part of the final blocked graph, but it changes reachability. Manual deadlock diagrams often start too late and miss this.

The sleep set keeps both read-first schedules because `read(shard_a)` and `read(shard_b)` can commute until a write edge appears. Once a write edge appears, the schedules diverge. One leads to a safe serialization; the other leads to a cycle.

At the failure point, the wait-for graph can be rendered as:

```text
left worker -> write(shard_b) -> right read guard
right worker -> write(shard_a) -> left read guard
```

If the invalidation mutex is held by the left worker, the graph also contains a pending `right -> invalidation -> left` edge after the right worker obtains write access. That edge is not needed for the minimal cycle, but it makes the production pattern worse because retry logic often holds the invalidation lane longer than the simplified example.

This case belongs in the Bug DB as a lock upgrade ordering pattern, not as a generic RwLock warning.

## 5. Fix Pattern / Avoidance Guide

The safe fix is to make upgrade intent explicit before taking unrelated resources. If mutation may be required, acquire the write lock first or release the read guard before entering the invalidation path.

An early-release patch looks like this:

```rust
let stale = {
    let read = shard_a.read();
    *read == 0
};
if stale {
    let _inv = invalidation.lock();
    let mut write = shard_a.write();
    *write += 1;
}
```

A stricter ordering patch assigns a global order to shards and invalidation resources. Every worker must acquire resources in that order, even when it starts from a different shard.

The final public repo should include a small table:

| Pattern | Status |
|---|---|
| Read guard held while acquiring side mutex | Risky |
| Read guard dropped before side mutex | Preferred |
| Write intent acquired before side mutex | Acceptable when documented |

The article should avoid implying that `parking_lot` is defective. `parking_lot` gives fast locks and useful APIs; it does not remove lock ordering obligations from application code. Publication remains blocked on disclosure steps.

### Publication-Ready Analysis Addendum

The final case study should explain why upgrade-style bugs feel different from ordinary AB-BA deadlocks. In a simple AB-BA case, each thread takes one mutex and then asks for the other. The shape is visible in the code if both functions are reviewed together. In an upgrade case, each worker begins with a read operation that appears compatible with the other worker's read operation. The danger only appears when read observation turns into write intent while another resource is already involved. The code starts in a shared mode and later wants exclusive mode, so the ordering contract is partly implicit.

This makes the pattern common in cache invalidation paths. A worker reads a shard, decides an entry is stale, takes an invalidation lane, and then tries to write a different shard or upgrade the current shard. Another worker does the mirrored operation. The first read guards do not block each other. That successful beginning makes the later failure surprising. The system feels concurrent right until both workers attempt exclusive access. DPOR+POR is valuable because it keeps the branch where both readers coexist before either writer wins, instead of letting a lucky serialization hide the cycle.

The article should not overfit to the simplified code. The repro uses direct read and write calls because they make the resource states obvious. A real implementation may use `upgradable_read`, a memoization table, a two-phase cache refresh, or a shard map with separate invalidation metadata. Those are variations on the same rule: if a read may become a write, the code must define when upgrade intent is declared and which other resources may be held at that time. Without that rule, the read phase is effectively borrowing a place in a future write queue without telling the rest of the program.

The ARD visualization should show two layers. The first layer is the read compatibility layer, where `read(shard_a)` and `read(shard_b)` can both succeed. The second layer is the write intent layer, where each worker's future write conflicts with the other worker's existing read. A side mutex, such as an invalidation lock, should be drawn as a reachability edge rather than necessarily as the core cycle. That helps readers understand why removing the side mutex from a minimal example does not remove the need for ordering. The side mutex often decides which branch is reachable; the read-to-write conflict decides whether the branch can complete.

The Sleep Set discussion can teach a subtle point about commutativity. Two read acquisitions commute while they remain reads. They stop commuting once either read is followed by write intent that depends on the other reader. The model checker cannot globally treat read operations as harmless; it must carry enough context to know whether a read guard is live when a future write edge appears. This is exactly the kind of context that a manual lock-order spreadsheet tends to lose. Teams list mutexes and write locks, but they forget read guards that are later used as a basis for mutation.

For remediation, the public article should compare early release, explicit write intent, and global shard ordering. Early release is usually easiest: read the stale bit, drop the read guard, then enter the invalidation path. Explicit write intent is stronger: if mutation is likely, acquire a write guard or upgradable guard before taking unrelated resources. Global shard ordering is necessary for systems that genuinely need multiple shards at once. The key is that every path must pick the same rule. A mixture of early release in one module and implicit upgrade in another can recreate the bug months later.

The article should include a short "review smell" list. A function that reads a shard and then calls into invalidation code is a smell. A read guard stored in a struct that outlives a helper call is a smell. A retry loop that reacquires write access while holding a side mutex is a smell. A code comment that says "upgrade later if stale" without naming the global order is a smell. These smells do not prove a bug, but they identify where deterministic exploration should be added.

For the Bug DB, the pattern should be indexed as `rwlock_upgrade` with a note that "upgrade" includes implicit upgrades, not only a specific API. This matters for search. A project may never call `RwLockUpgradableReadGuard`, yet still follow a read-then-write pattern that behaves like an upgrade. The `lock_order_seq` should preserve the read mode and write mode separately. A plain `r0->r1` string loses the fact that `r0(R)` is compatible until a later `r0(W)` or `r1(W)` appears.

The publication ethics paragraph should be direct. This case does not accuse `parking_lot` of violating its contract. Fast locks expose application-level ordering mistakes quickly because they make it cheap to build complex synchronization topologies. The responsibility of the article is to show a reproducible composition hazard and a repair pattern. If maintainers identify a documentation improvement or an API-specific caveat during disclosure, the public text should include that context. Until then, the article should classify the failure as an application-level upgrade ordering bug.

The closing guidance should leave readers with one operational rule: decide upgrade intent before entering shared infrastructure. If code might mutate shard B because of a read from shard A, it should either release A first or acquire all resources in a documented order that includes both shards and side lanes. Anything else relies on scheduler luck. Laplace's role is to remove that luck from the test environment and make the problematic branch visible while the repro is still small.

The public article should add a design review checklist for cache and shard owners. List every shard that can be read, every shard that can later be written, and every side resource used during invalidation. Then write a single acquisition order that includes read mode, write mode, and upgrade intent. If a path begins with a read from a high-numbered shard and may write a low-numbered shard, the path needs either early release or a documented exception that is tested. This checklist is intentionally mechanical. Upgrade bugs survive because people reason about the semantic object, such as "the cache entry," while the scheduler only sees guards and waits.

The operational symptom can be misleading. A system may report high cache miss latency, invalidation lag, or retry storms rather than a clean deadlock. Workers may keep serving unrelated shards, so the service looks partially healthy. The minimal repro is therefore not just a debugging artifact; it is a way to extract one shard pair and prove whether the ordering rule is sound. The published repo should encourage teams to reduce a production shard graph into two shards and one side lane before attempting larger load tests.

For disclosure, the article should note that documentation improvements can still be valuable even when no upstream bug exists. If maintainers suggest stronger wording around upgrade ordering, the public version should link to that discussion after the embargo period. If they decline changes, the article can still publish as an application-level case. The ethical boundary is clear: do not attach vulnerability language to a primitive that is behaving correctly.

The final page should also include a regression-test recommendation. Every cache or shard layer that supports invalidation should have one deterministic test where two workers read different shards and then both decide to mutate. The test does not need the full cache implementation. It can use two small integers, two locks, and the real invalidation helper. If that tiny test is hard to write, the production code probably does not expose its ordering contract clearly enough. This recommendation turns the case study from a one-off story into a maintainable engineering practice.

When adding screenshots, prefer a diagram that distinguishes read ownership from write intent. Many readers will otherwise see two read locks and assume the branch is harmless. The visual should make the transition explicit: shared read access is safe, but shared read access plus mirrored write intent is not. That is the core lesson.

A final implementation note should cover retries. Many cache systems respond to failed upgrades by backing off and trying again. Backoff can improve liveness under benign contention, but it is not a substitute for ordering. If every retry repeats the same read-while-holding-side-resource shape, the bad schedule remains in the state space. The fixed example should therefore remove the ordering violation before adding retries. Retries are resilience polish; they are not the correctness proof.

The article should end by encouraging teams to put the shard order in code, not only in a design doc. A small helper that sorts shard IDs before acquisition is harder to bypass than a paragraph in a wiki. The deterministic test then verifies the helper and gives reviewers a concrete place to look when new invalidation paths are added during later cache maintenance work, including emergency fixes made under production pressure by rotating on-call engineers responsible for cache correctness later.
