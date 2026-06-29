---
title: "qdrant: ProxySegment recursive read-lock & snapshot unproxify lock order"
description: "A composition audit of qdrant's ProxySegment lock-order discipline. The shipped v1.18.2 design is deadlock-free, and the two historical defects it prevents (#724 recursive read-lock, #7178 unproxify inversion) are proven reachable as counterfactuals — both already fixed and documented upstream."
slug: "qdrant-proxy-segment-lock-order"
scenario: "qdrant_lock_order"
library: "qdrant (vector database)"
author: "Laplace Labs"
publishedAt: 2026-06-27
updatedAt: 2026-06-29
tags: ["case-study", "qdrant", "ProxySegment", "rwlock", "lock-order", "recursive-read-lock", "Axiom", "DPOR"]
cover:
  image: "/assets/case-studies/qdrant-proxy-segment-lock-order.svg"
  alt: "AB-BA wait-for cycle for qdrant's recursive read-lock under a queued writer"
  license: "CC-BY-4.0"
seo:
  ogImage: "/assets/case-studies/qdrant-proxy-segment-lock-order.svg"
  twitterCard: "summary_large_image"
  jsonLd:
    "@context": "https://schema.org"
    "@type": "Article"
    headline: "qdrant: ProxySegment recursive read-lock & snapshot unproxify lock order"
    datePublished: "2026-06-27"
    author:
      "@type": "Organization"
      name: "Laplace Labs"
reproRepository: "https://github.com/qdrant/qdrant/pull/7178"
reproRepositoryStatus: "upstream-fixes-closed (#724, #7178)"
disclosure:
  status: "resolved-upstream"
  notifiedOn: null
  publicAfter: null
  notes: "Published as regression sentinels, not a vulnerability report. qdrant v1.18.2's ProxySegment lock discipline is deadlock-safe. Both historical hazards (#724, #7178) are already fixed and documented upstream — all referenced issues are CLOSED. The 'bug' artifacts are explicit counterfactuals, not the shipped code."
license: "CC-BY-4.0"
---

# qdrant: ProxySegment recursive read-lock & snapshot unproxify lock order

## 0. TL;DR (honesty first)

This is a **composition audit** — not a library hunt, but a *lock-order
discipline audit of a real application*. We pinned **qdrant v1.18.2**
(`44ad62f8cd69642be5afa6441612525e24a0d063`), read the actual `ProxySegment`
lock code, and modelled two historical deadlock surfaces with Axiom. **No open
defect was found.** The shipped discipline is deadlock-free under exhaustive
interleaving, and an 8-thread × 20,000-round real-thread stress test of the
shipped model never deadlocks.

What Axiom *did* produce is precise, reproducible AB-BA deadlocks for the
**historical/counterfactual** implementations — the exact failures qdrant's
current code prevents. Both are **already fixed and documented upstream** (every
referenced issue is CLOSED), so per the novelty gate they are *regression
sentinels*, not trophies.

Classification: **open library-bug = NO**. Manufacturing a "trophy" here would be
dishonest.

## 1. Discovery context

qdrant is a widely deployed vector database, so a real lock-order deadlock in its
segment machinery would have a large blast radius. Its concurrency hot spot is
`ProxySegment` (`lib/shard/src/proxy_segment/`): when a snapshot or optimization
runs, each live segment is wrapped in a proxy that buffers writes into a temporary
segment and tracks `deleted_points`. Two historically-real surfaces:

- **#724 — ProxySegment double (recursive) read-lock** (CLOSED 2022-06-25).
- **#7178 — snapshot unproxify lock inversion** (MERGED 2025-09-01).

## 2. Surface 1 — #724 recursive read-lock

Historically `ProxySegment::deleted_points` was an `Arc<RwLock<..>>`, and
`search()` took `deleted_points.read()` and then called
`add_deleted_points_condition_to_filter()`, which took `deleted_points.read()` a
**second** time:

```text
search()                                  -> deleted_points.read()   // guard #1 held
  add_deleted_points_condition_to_filter()-> deleted_points.read()   // guard #2 (nested)
```

The report's key observation: *"Cause deadlock if interleaved by a writelock. This
is true for both std::sync::RwLock and parking_lot::RwLock."* A writer-preferring
`RwLock` blocks a **new** reader while a writer is queued (to avoid writer
starvation). So if a writer arrives between guard #1 and guard #2, guard #2 blocks
behind the queued writer, and the writer blocks on guard #1 — a wait-for cycle.

### Why the current code is safe (the load-bearing change)

In v1.18.2, `deleted_points` is a **plain field**
(`type DeletedPoints = AHashMap<PointIdType, ProxyDeletedPoint>`), not a lock, and
the filter helper takes the points **by value** — exactly solution #2 the issue
proposed:

```rust
fn add_deleted_points_condition_to_filter(
    filter: Option<Cow<'_, Filter>>,
    deleted_points: impl IntoIterator<Item = PointIdType>,   // passed in by value
) -> Filter { /* ... */ }

// search_batch(): one read of the wrapped segment; deleted_points read directly.
let wrapped_filter = Self::add_deleted_points_condition_to_filter(
    filter, self.deleted_points.keys().copied(),
);
```

The recursive lock is structurally gone: there is no inner per-field `RwLock` to
double-lock, and the whole proxy is read under a single `LockedSegment` lock.

## 3. Surface 2 — #7178 snapshot unproxify lock order

During `proxy_all_segments_and_apply`, all segments are proxified, a function is
applied, then the proxies are removed (unproxified). The fix is a one-liner:

```rust
// Release proxies in reverse order
proxies.reverse();
```

Releasing proxies in **reverse (LIFO) order** makes the unproxify path acquire the
segment/proxy locks in the same global order every other path uses; removing them
forward while a concurrent path walks the segments the other way is a classic
AB-BA inversion across two segment locks. The v1.18.2 refactor keeps the
discipline structurally.

## 4. Modelling it in Axiom

To stay faithful to a writer-preferring `RwLock`, Surface 1 renders the lock as
two resources: `R0` = the data, `R1` = the writer-pending gate the writer reserves
first and a *new* reader must pass. This makes the #724 recursive-read cycle a
true, detectable wait-for cycle exactly as it occurs in a writer-preferring lock.

| Harness | Models | Expected |
|---|---|---|
| shipped (no recursive read-lock) | single lock; deleted_points by value; reader vs writer | clean |
| concurrent readers | two concurrent read locks (reads don't conflict) | clean |
| unproxify reverse order | both paths lock A→B (consistent/LIFO order) | clean |
| counterfactual #724 | read held + nested read vs queued writer | bug |
| counterfactual #7178 | unproxify A→B vs concurrent B→A | bug |

## 5. Axiom verdicts

```text
qdrant_proxy_shipped_no_recursive_readlock      => Clean
qdrant_proxy_concurrent_readers                 => Clean
qdrant_unproxify_reverse_order                  => Clean
qdrant_proxy_recursive_readlock_abba            => BugFound  Deadlock { cycle: [ThreadId(0), ThreadId(1)] }
qdrant_unproxify_forward_order_abba             => BugFound  Deadlock { cycle: [ThreadId(0), ThreadId(1)] }
```

The witness for the #724 counterfactual is the textbook four-step AB-BA:

```text
t0  SharedRequest r0   ok            (search() takes deleted_points.read())
t1  Request       r1   ok            (writer reserves the writer-gate = writer-pending)
t0  Request       r1   ok→blocked    (nested second read must pass the gate)
t1  Request       r0   Deadlock { cycle: [ThreadId(0), ThreadId(1)] }
```

The #7178 counterfactual is the same shape over two segment locks (`t0` A→B, `t1`
B→A). The three clean harnesses are the regression guard: under exhaustive search,
the shipped discipline has no such cycle.

## 6. Standalone reproduction (real lock, real threads)

A repro crate using `parking_lot` — the lock qdrant actually uses — proves both
directions with std threads:

```text
[PART A] shipped ProxySegment (single lock, deleted_points by value): 8 threads x 20000
         search/delete rounds completed in ~43ms — NO DEADLOCK
[PART B] naive recursive read-lock + interleaved writer: WATCHDOG TIMEOUT after 3s — AB-BA DEADLOCK reproduced.
         Matches Axiom Deadlock { cycle: [ThreadId(0), ThreadId(1)] } (qdrant issue #724).
```

## 7. Takeaway

The remediation these encode is for *anyone hand-rolling a proxy / segment /
layered-state structure*:

- Never hold a read guard across a nested call that re-locks the **same** `RwLock`.
  Under a writer-preferring lock a queued writer turns a recursive read into a
  deadlock. Drop the guard first, or pass the data by value (exactly what qdrant
  does now).
- Define a global lock order for multi-lock acquire/release (here: reverse/LIFO
  unproxify) and prove every path obeys it.
