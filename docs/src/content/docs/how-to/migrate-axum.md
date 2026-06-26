---
title: "Migrate Axum Code to Laplace BYOC"
description: "Instrument Axum state, extensions, middleware, and shutdown paths for BYOC verification."
category: "how-to"
order: 203
last_updated: "2026-05-30"
---

# Migrate Axum Code to Laplace BYOC

This guide cites `laplace-cloud/vendor/axum-0.7.9-patched` and `laplace-cloud/crates/external/axum-byoc`. The local manifest includes state extractor, body limit, middleware, websocket, router layer, and request parts patterns. The vendor crate is a scaffold, not a published upstream fork.

## 1. Pin the BYOC Audit Dependency

```toml
[dependencies]
axum = { path = "../../vendor/axum-0.7.9-patched" }
```

Keep this inside `crates/external/axum-byoc` or a temporary audit crate. Do not replace the application dependency until the full upstream snapshot and instrumentation are synced.

## 2. Transform State and Extensions

Before:

```rust
struct AppState {
    state: std::sync::Mutex<u64>,
    extensions: std::sync::Mutex<u64>,
}
```

After:

```rust
struct AppState {
    state_lock: std::sync::Mutex<u64>,
    extension_map: std::sync::Mutex<u64>,
}

fn read_state_then_extensions(app: &AppState) {
    let _state_lock = app.state_lock.lock().expect("axum.state_lock");
    let _extension_map = app.extension_map.lock().expect("axum.extension_map");
}
```

This matches `axum_state_extractor_extension_abba`.

## 3. Transform Middleware Next State

Before:

```rust
struct MiddlewareState {
    state: std::sync::Mutex<bool>,
    next: std::sync::Mutex<bool>,
}
```

After:

```rust
struct MiddlewareState {
    middleware_state: std::sync::Mutex<bool>,
    next_future: std::sync::Mutex<bool>,
}

fn run_middleware(state: &MiddlewareState) {
    let _middleware_state = state.middleware_state.lock().expect("axum.middleware_state");
    let mut next_future = state.next_future.lock().expect("axum.next_future");
    *next_future = true;
}
```

This maps to `axum_middleware_next_deadlock`.

## 4. Transform WebSocket Shutdown

Before:

```rust
struct SocketLifecycle {
    task: std::sync::Mutex<bool>,
    shutdown: std::sync::Mutex<bool>,
}
```

After:

```rust
struct SocketLifecycle {
    upgrade_task: std::sync::Mutex<bool>,
    shutdown_signal: std::sync::Mutex<bool>,
}

fn request_shutdown(lifecycle: &SocketLifecycle) {
    let _shutdown_signal = lifecycle.shutdown_signal.lock().expect("axum.shutdown_signal");
    let mut upgrade_task = lifecycle.upgrade_task.lock().expect("axum.upgrade_task");
    *upgrade_task = false;
}
```

The inverse order is the condition modeled by `axum_websocket_upgrade_shutdown`.

## 5. Verify the Manifest

```bash
cd laplace-cloud
cargo test --manifest-path crates/external/axum-byoc/Cargo.toml
laplace axiom verify \
  --manifest-path crates/external/axum-byoc/Cargo.toml \
  --pattern axum_state_extractor_extension_abba \
  --max-depth 128
```

Use the manifest's expected verdicts as the source of truth while the patched crate remains a scaffold.

## 6. Choose the Smallest Axum Boundary

Axum applications tend to hide shared state behind extractors, extensions, middleware, and router layers. A useful BYOC harness isolates one boundary at a time. Do not start with a complete HTTP server if the target pattern only needs state and extensions. Do not start with a websocket runtime if the target pattern only needs the shutdown and upgrade resources.

For `axum_state_extractor_extension_abba`, include state storage, extension storage, and two request paths that can touch them in different orders. For `axum_middleware_next_deadlock`, include middleware state and the next future. For `axum_router_layer_starvation`, include route table and layer readiness, then keep the routing input deterministic.

## 7. Make Extractor Names Stable

Extractor code often uses generic type names or request-local values. Those names are poor replay labels. Normalize them before running the verifier.

```rust
#[derive(Debug, Clone, Eq, PartialEq)]
struct AxumResource {
    name: &'static str,
}

fn resource_for_extension_map() -> AxumResource {
    AxumResource {
        name: "axum.extension_map",
    }
}
```

If a replay says `Mutex<usize>` or `Extensions`, update the instrumentation to say `axum.extension_map` or `axum.request_parts`. The person debugging the report should not need to infer which internal lock was involved.

## 8. Preserve Request Semantics

Instrumentation must not change extraction behavior. Keep lock naming and event emission outside response construction. If adding a tracked wrapper changes when a response body is polled, the harness may report a bug introduced by the audit rather than the application.

Use tests to keep the behavior stable:

```rust
#[test]
fn extension_resource_name_is_stable() {
    assert_eq!(resource_for_extension_map().name, "axum.extension_map");
}
```

The test is simple, but it prevents accidental renames from invalidating stored `.ard` files and documentation.

## 9. Close the Loop

A complete Axum migration has four artifacts: the selected manifest pattern, the exact command, the `.ard` replay if a bug is found, and the patch that fixes or documents the ordering. Keep those artifacts together. If the result is `Verified`, still record the command and depth so future audits know the bound that was checked.

The local vendor README states that a full upstream snapshot remains a sync task. Until that sync lands, phrase findings as local BYOC audit results rather than upstream Axum claims.

## 10. Acceptance Checklist

The Axum BYOC crate should compile with `cargo test --manifest-path crates/external/axum-byoc/Cargo.toml`. The selected verification command should name one manifest pattern and should not require a live HTTP listener. Resource names should use the `axum.` prefix and identify the semantic boundary: state lock, extension map, body limit, rejection state, middleware state, next future, route table, layer readiness, upgrade task, or shutdown signal.

Reviewers should confirm that extractor behavior did not change. A tracked wrapper must not consume a request body earlier than before, insert extensions in a new order, or hold a lock while constructing an unrelated response. If a full router appears in the harness, check that it is necessary for the selected pattern. Most first-pass Axum audits need only the shared state and two deterministic paths.

Close the migration when the command, expected verdict, resource names, and any replay file are all recorded. If the result is meant for upstream discussion, wait until the full upstream source snapshot is synced instead of citing the scaffold as a complete fork.
