---
title: "Coverage Boundaries"
description: "What Laplace catches and what it does not catch."
section: "reference"
order: 2
---

# Coverage Boundaries

## What Laplace catches

Laplace catches these classes for blocking and Tokio synchronization primitives within the explored bound:

- N-way deadlock, including circular wait
- Lost wakeup with condition variables
- AB-BA lock-order inversion
- Double-lock
- Dependency contract violations such as `tokio-mutex-across-await`

## What Laplace does not catch

Laplace does not catch these classes:

- Fairness/liveness progress failures: these require fairness assumptions that are outside bounded exploration verdicts.
- Atomics or lock-free algorithms: these are not modeled as synchronization resources by the current engine.
- Data races: these belong to compiler and Miri-style memory-safety analysis, not Laplace's DPOR verdict.
- Performance problems: throughput and latency are measurement concerns, not correctness verdicts.
