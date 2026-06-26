---
title: "ARD File Format"
description: "Operational reference for Axiom replay data files."
section: reference
category: "LQ-3"
order: 302
last_updated: "2026-05-30"
---

# ARD File Format

An `.ard` file stores enough schedule information to replay a verification failure. Treat it as an evidence artifact: keep it with the command, commit SHA, and dependency versions that produced it.

## Logical Sections

| Section | Contents |
|---|---|
| `metadata` | Tool version, target, seed, max depth, timestamp. |
| `harness` | Harness name, manifest path, selected BYOC pattern. |
| `schedule` | Deterministic task choices and synchronization events. |
| `resources` | Tracked lock and wait resources named by instrumentation. |
| `verdict` | Failure class and final state. |

## Minimal JSON Shape

The on-disk encoding may be binary or framed, but exported diagnostics should preserve this logical shape.

```json
{
  "metadata": {
    "version": "0.1.0-alpha-1-rc.2",
    "seed": "0xA1100ACE",
    "max_depth": 128
  },
  "harness": {
    "name": "hyper_pool_idle_reuse_abba",
    "manifest_path": "crates/external/hyper-byoc/Cargo.toml"
  },
  "resources": [
    "hyper.idle_pool",
    "hyper.conn_state"
  ],
  "verdict": {
    "status": "BugFound",
    "class": "Deadlock"
  }
}
```

## Handling Rules

- Do not paste secrets or customer payloads into replay metadata.
- Archive `.ard` files from CI with restricted retention.
- Prefer stable resource names over memory addresses.
- Re-run `forensic replay` after changing a harness to confirm the failure is no longer reachable.

