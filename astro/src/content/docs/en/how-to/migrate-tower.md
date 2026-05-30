---
title: "Migrate Tower Code to Laplace BYOC"
description: "Map Tower service, layer, retry, and timeout state into local BYOC patterns."
category: "how-to"
order: 202
last_updated: "2026-05-30"
---

# Migrate Tower Code to Laplace BYOC

This guide cites `laplace-cloud/vendor/tower-0.5.0-patched` and `laplace-cloud/crates/external/tower-byoc`. The local scaffold lists six patterns: `tower_layer_ready_call_abba`, `tower_buffer_worker_shutdown`, `tower_limit_permit_starvation`, `tower_retry_policy_state_race`, `tower_timeout_cancel_drop_race`, and `tower_balance_discover_lock_cycle`.

## 1. Isolate the Audit Crate

Use the patched Tower path only in the detached audit crate.

```toml
[dependencies]
tower = { path = "../../vendor/tower-0.5.0-patched" }
```

The application should keep its normal dependency graph. The audit crate imports the local manifest and proves the scenarios are visible.

## 2. Transform Service Readiness State

Before:

```rust
struct ServiceState {
    ready: std::sync::Mutex<bool>,
    call_count: std::sync::Mutex<u64>,
}
```

After:

```rust
struct ServiceState {
    service_ready: std::sync::Mutex<bool>,
    inner_call: std::sync::Mutex<u64>,
}

fn call_when_ready(state: &ServiceState) {
    let _service_ready = state.service_ready.lock().expect("tower.service_ready");
    let mut inner_call = state.inner_call.lock().expect("tower.inner_call");
    *inner_call += 1;
}
```

The names match `tower_layer_ready_call_abba`.

## 3. Transform Buffer Shutdown

Before:

```rust
struct Buffer {
    tx_closed: std::sync::Mutex<bool>,
    worker_done: std::sync::Mutex<bool>,
}
```

After:

```rust
struct Buffer {
    buffer_tx: std::sync::Mutex<bool>,
    worker_state: std::sync::Mutex<bool>,
}

fn close_buffer(buffer: &Buffer) {
    let _buffer_tx = buffer.buffer_tx.lock().expect("tower.buffer_tx");
    let mut worker_state = buffer.worker_state.lock().expect("tower.worker_state");
    *worker_state = true;
}
```

This gives the replay the same resource terms as the vendor manifest.

## 4. Transform Retry Policy Mutation

Before:

```rust
fn retry(policy: &std::sync::Mutex<u32>, request: &std::sync::Mutex<u32>) {
    *policy.lock().expect("policy") += 1;
    *request.lock().expect("request") += 1;
}
```

After:

```rust
fn retry(policy_state: &std::sync::Mutex<u32>, request_clone: &std::sync::Mutex<u32>) {
    let mut policy_state = policy_state.lock().expect("tower.policy_state");
    let mut request_clone = request_clone.lock().expect("tower.request_clone");
    *policy_state += 1;
    *request_clone += 1;
}
```

This maps to `tower_retry_policy_state_race`.

## 5. Run and Record

```bash
cd laplace-cloud
cargo test --manifest-path crates/external/tower-byoc/Cargo.toml
laplace axiom verify \
  --manifest-path crates/external/tower-byoc/Cargo.toml \
  --pattern tower_layer_ready_call_abba \
  --seed 0xA1100ACE \
  --max-depth 128
```

Keep the generated replay with the audit result. If a pattern is expected `Verified`, do not downgrade it to an expected failure without updating the local manifest and test evidence together.

## 6. Keep Tower Traits Out of the First Harness

Tower services often involve generic trait bounds, boxed futures, and layers that obscure the shared state you want to verify. The first BYOC harness should model the state transition directly. Add full `Service` and `Layer` integration only after the resource names and expected verdict are stable.

For `tower_layer_ready_call_abba`, the important state is readiness and call execution. For `tower_buffer_worker_shutdown`, it is the sender side and worker state. For `tower_balance_discover_lock_cycle`, it is endpoint discovery and endpoint set mutation. Each of those can be modeled without constructing a complete networking stack.

## 7. Use One Lock Order Per Service Path

When the verifier reports an ABBA pattern, fix the service path by making the ordering visible in one helper. Do not duplicate lock acquisition order across many call sites.

```rust
struct ReadyCallGuards<'a> {
    _service_ready: std::sync::MutexGuard<'a, bool>,
    _inner_call: std::sync::MutexGuard<'a, u64>,
}

fn lock_ready_then_call(state: &ServiceState) -> ReadyCallGuards<'_> {
    ReadyCallGuards {
        _service_ready: state.service_ready.lock().expect("tower.service_ready"),
        _inner_call: state.inner_call.lock().expect("tower.inner_call"),
    }
}
```

This helper makes reviews simpler. If a later path needs the inverse order, it should be treated as a design decision and verified explicitly.

## 8. Separate Starvation from Deadlock

The manifest marks `tower_limit_permit_starvation` as `Verified`. That does not mean permits cannot be exhausted in production. It means the current bounded pattern is expected not to produce the modeled starvation failure. Keep deadlock, race, and starvation reports separate in issue trackers because the remediation work differs.

Deadlocks usually require one canonical lock order. Races usually require ownership or atomicity changes. Starvation often requires fairness limits, cancellation rules, or backpressure. Mixing those classes makes the audit harder to close.

## 9. CI Scope

Run Tower BYOC checks at two levels. Pull requests should run the changed pattern or the smallest affected manifest set. Nightly jobs can run the full detached crate and deeper verification bounds.

```bash
cargo test --manifest-path crates/external/tower-byoc/Cargo.toml
cargo laplace verify \
  --manifest-path crates/external/tower-byoc/Cargo.toml \
  --pattern tower_buffer_worker_shutdown \
  --max-depth 256
```

Archive `.ard` files from failing runs. A text log without the replay is usually not enough to debug a schedule-sensitive Tower issue.

## 10. Acceptance Checklist

Before review, the detached crate should pass `cargo test --manifest-path crates/external/tower-byoc/Cargo.toml`. The verification command should select a pattern from the manifest and use a bounded depth. Each replay resource should use a `tower.` prefix and should identify a service, layer, buffer, retry, timeout, limit, or balancing resource. If a report names only `state` or `lock`, improve instrumentation before treating the result as evidence.

Reviewers should check that the migration preserves Tower semantics. Instrumentation must not call the inner service early, hold readiness guards across unrelated awaits, or change cancellation behavior. If the fix introduces one canonical lock order, keep that order in a helper and use it consistently. If the fix changes fairness or backpressure, document why the selected pattern is starvation rather than deadlock.

The migration is complete when the pattern command, expected verdict, and replay policy are documented. Keep full manifest sweeps in scheduled CI and keep pull request checks focused on changed paths.
