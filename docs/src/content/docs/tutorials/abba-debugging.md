---
title: "Debug an ABBA Deadlock"
description: "Use a replay file to reduce an ABBA lock-order failure to one deterministic fix."
section: tutorials
category: "LQ-3"
order: 103
last_updated: "2026-05-30"
---

# Debug an ABBA Deadlock

ABBA means one path acquires `A` then `B`, while another path acquires `B` then `A`. Laplace reports the conflicting resource order and writes an `.ard` replay for the failing schedule.

## 1. Start from the Report

```text
verdict: BugFound
class: Deadlock
resources:
  request_state -> extension_map
  extension_map -> request_state
replay: target/laplace/axum_state_extractor_extension_abba.ard
```

The resource names should map to code-level locks. If they do not, rename the TrackedMutex resources before investigating behavior.

## 2. Reduce the Failing Pattern

```rust
use std::sync::{Arc, Mutex};

#[derive(Clone)]
struct Shared {
    request_state: Arc<Mutex<u64>>,
    extension_map: Arc<Mutex<u64>>,
}

fn path_a(shared: &Shared) {
    let _request = shared.request_state.lock().expect("request_state");
    let _extensions = shared.extension_map.lock().expect("extension_map");
}

fn path_b(shared: &Shared) {
    let _extensions = shared.extension_map.lock().expect("extension_map");
    let _request = shared.request_state.lock().expect("request_state");
}
```

## 3. Pick One Canonical Order

Prefer the order with the narrowest outer critical section. Then update every path to match it.

```rust
fn path_b_fixed(shared: &Shared) {
    let _request = shared.request_state.lock().expect("request_state");
    let _extensions = shared.extension_map.lock().expect("extension_map");
}
```

## 4. Replay Before Closing

```bash
laplace axiom forensic replay \
  --ard target/laplace/axum_state_extractor_extension_abba.ard
```

Close the bug only when the replay no longer reaches a deadlock and a fresh bounded run also verifies the changed harness.

