---
title: "Ki-DPOR vs DPOR"
description: "How Laplace uses knowledge-informed reduction differently from classic dynamic partial-order reduction."
section: concepts
category: "LQ-3"
order: 401
last_updated: "2026-05-30"
---

# Ki-DPOR vs DPOR

Classic DPOR reduces schedule exploration by avoiding equivalent interleavings. It tracks conflicts between operations and backtracks only where a different ordering can change the result.

Ki-DPOR adds domain knowledge to that reduction. The verifier still preserves conflicting schedules, but it prioritizes paths that match known bug shapes: ABBA lock order, cancellation races, starvation, shutdown cycles, and shared-buffer mutation.

## Practical Difference

| Area | DPOR | Ki-DPOR |
|---|---|---|
| Search input | Runtime conflicts. | Runtime conflicts plus named concurrency patterns. |
| Prioritization | Conflict equivalence. | Conflict equivalence weighted by bug likelihood. |
| Output | Counterexample schedule. | Counterexample plus pattern vocabulary and resource names. |
| BYOC use | Requires harness design. | Starts from local pattern manifests. |

## Why It Matters

BYOC manifests under `laplace-cloud/vendor/*-patched` encode the pattern vocabulary. For example, `hyper_pool_idle_reuse_abba` names the resources `idle_pool` and `conn_state`. That gives Ki-DPOR a useful first frontier without claiming the search is complete.

Ki-DPOR should not be described as a replacement for exhaustive model checking. It is a practical reduction strategy for production Rust audits where bounded search must find high-value schedules quickly.

