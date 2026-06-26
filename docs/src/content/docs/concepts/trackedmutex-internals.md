---
title: "TrackedMutex Internals"
description: "The resource naming and event boundaries expected from tracked synchronization primitives."
section: concepts
category: "LQ-3"
order: 402
last_updated: "2026-05-30"
---

# TrackedMutex Internals

Tracked synchronization primitives exist to make schedules explainable. A normal mutex can tell the verifier that a lock was acquired. A tracked mutex also gives the resource a stable name that appears in reports and replay files.

## Minimum State

```rust
#[derive(Debug, Clone, Eq, PartialEq)]
struct TrackedMutexMeta {
    resource_name: &'static str,
}
```

The LQ-1 vendor scaffolds expose `TrackedMutexShim` and `TrackedRwLockShim` with `resource_name` fields. They are intentionally small because the current deliverable records the shim boundary before full upstream instrumentation.

## Event Boundaries

A tracked lock should emit these logical events:

- wait started
- lock acquired
- lock released
- wait cancelled

The verifier can then build a wait-for graph and report cycles using resource names instead of addresses.

## Naming Rules

Use names that include the crate and semantic resource:

```rust
let resource_name = "sqlx.statement_cache";
```

Avoid per-request identifiers in the resource name. Put high-cardinality values in metadata only when they are redacted and bounded.

