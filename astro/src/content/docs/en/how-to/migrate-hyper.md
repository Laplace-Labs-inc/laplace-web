---
title: "Migrate Hyper Code to Laplace BYOC"
description: "Instrument Hyper concurrency boundaries using the local hyper 1.5.0 patched scaffold."
category: "how-to"
order: 201
last_updated: "2026-05-30"
---

# Migrate Hyper Code to Laplace BYOC

This guide cites `laplace-cloud/vendor/hyper-1.5.0-patched` and `laplace-cloud/crates/external/hyper-byoc`. The local vendor scaffold records six patterns, including `hyper_pool_idle_reuse_abba`, `hyper_h2_window_waker_deadlock`, and `hyper_graceful_shutdown_starvation`. The scaffold is intentionally minimal; it exposes `hyper::laplace_patch::patterns()` and Tracked* shim types before the full upstream snapshot is synced.

## 1. Pin the Local Vendor Source

Use a path override in the audit crate rather than changing application dependencies globally.

```toml
[dependencies]
hyper = { path = "../../vendor/hyper-1.5.0-patched" }
```

Keep the application crate on its normal Hyper version until the audit branch is ready. The BYOC crate should be the only crate that imports the local patched package.

## 2. Transform Connection Pool State

Before:

```rust
use std::sync::Mutex;

struct Pool {
    idle: Mutex<Vec<String>>,
}
```

After:

```rust
use std::sync::Mutex;

struct TrackedPool {
    idle: Mutex<Vec<String>>,
    resource_name: &'static str,
}

impl TrackedPool {
    fn new() -> Self {
        Self {
            idle: Mutex::new(Vec::new()),
            resource_name: "hyper.idle_pool",
        }
    }
}
```

The resource name should match the pattern vocabulary in `vendor/hyper-1.5.0-patched/src/lib.rs`.

## 3. Transform Waker Registration

Before:

```rust
fn register_waker(wakers: &std::sync::Mutex<Vec<u64>>, id: u64) {
    wakers.lock().expect("wakers").push(id);
}
```

After:

```rust
fn register_waker(wakers: &std::sync::Mutex<Vec<u64>>, id: u64) {
    let mut stream_waker = wakers.lock().expect("hyper.stream_waker");
    stream_waker.push(id);
}
```

Use stable names like `hyper.stream_waker` and `hyper.conn_window`. A replay is useful only if resource names lead an engineer to the conflicting critical section.

## 4. Transform Graceful Shutdown Tracking

Before:

```rust
struct Shutdown {
    inflight: std::sync::Mutex<usize>,
    draining: std::sync::Mutex<bool>,
}
```

After:

```rust
struct Shutdown {
    inflight_set: std::sync::Mutex<usize>,
    drain_signal: std::sync::Mutex<bool>,
}

fn begin_drain(shutdown: &Shutdown) {
    let _drain_signal = shutdown.drain_signal.lock().expect("hyper.drain_signal");
    let _inflight_set = shutdown.inflight_set.lock().expect("hyper.inflight_set");
}
```

This maps directly to `hyper_graceful_shutdown_starvation`, which is currently marked `Verified` in the local scaffold.

## 5. Run the BYOC Manifest

```bash
cd laplace-cloud
cargo test --manifest-path crates/external/hyper-byoc/Cargo.toml
laplace axiom verify \
  --manifest-path crates/external/hyper-byoc/Cargo.toml \
  --pattern hyper_pool_idle_reuse_abba \
  --max-depth 128
```

Do not treat the local scaffold as an upstream Hyper fork. It is an audit boundary used to prove instrumentation and repro quality before publication.

## 6. Decide What Belongs in the Harness

Keep the harness smaller than the production server. A good Hyper BYOC harness should include the state machine that owns the resource, the operation that changes that state, and the shutdown or cancellation path that can interleave with it. It should not include TLS setup, real sockets, DNS, or request parsing unless the pattern being tested depends on those details.

For `hyper_pool_idle_reuse_abba`, the harness needs the idle pool, one connection state value, and two paths that can acquire them in different orders. For `hyper_h2_window_waker_deadlock`, the harness needs the connection window and stream waker resources. For `hyper_header_map_extension_race`, the harness needs headers and extensions, but not a full HTTP server.

## 7. Name Resources Before You Search

Resource names are part of the debugging interface. Prefer `hyper.idle_pool` over `pool`, and prefer `hyper.conn_window` over `window`. Names should remain stable across test runs so `.ard` replays stay readable after refactors. If the first verifier result uses vague resource names, fix the instrumentation and rerun before filing the result.

```rust
#[derive(Debug, Clone, Eq, PartialEq)]
struct ResourceName(&'static str);

fn hyper_resource(name: &'static str) -> ResourceName {
    ResourceName(name)
}

fn pool_resource_names() -> (ResourceName, ResourceName) {
    (
        hyper_resource("hyper.idle_pool"),
        hyper_resource("hyper.conn_state"),
    )
}
```

## 8. Review the Expected Verdict

The local manifest marks five Hyper patterns as `BugFound` and `hyper_graceful_shutdown_starvation` as `Verified`. Treat that verdict as the audit contract. If your run disagrees, investigate in this order:

1. Confirm the BYOC crate is using `vendor/hyper-1.5.0-patched`.
2. Confirm the selected pattern name is spelled exactly as the manifest.
3. Confirm the harness still contains both resources in the manifest lock-order sequence.
4. Confirm `--max-depth` is high enough to reach the second conflicting path.

Do not change the expected verdict to make CI pass. A verdict change needs a matching explanation and replay evidence.

## 9. Keep Production Code Separate

The production migration is usually a naming and harness extraction exercise, not a dependency replacement. Keep application code compiling against normal Hyper while the BYOC crate imports the patched path. After the full upstream snapshot is synced, the audit branch can decide whether the instrumentation belongs in a fork, a feature flag, or an external wrapper.

The safest first PR only adds the detached audit crate, the manifest path override, and the verification command. A later PR can move proven instrumentation closer to application code.

## 10. Acceptance Checklist

Use this checklist before asking for review. The BYOC crate compiles with `cargo test --manifest-path crates/external/hyper-byoc/Cargo.toml`. The verification command names one pattern from the local manifest. Every tracked resource in the replay uses the `hyper.` prefix and maps to a real critical section. The expected verdict in the report matches the manifest unless the pull request explicitly changes the manifest with evidence. Any generated `.ard` file is attached to the audit result and does not include request payloads, credentials, or customer hostnames.

Reviewers should check that the application dependency graph was not changed accidentally. A path override belongs in the audit crate, not in the production service. They should also confirm that the harness models concurrency state rather than network behavior. If the patch adds sleeps, wall-clock timeouts, or live sockets, ask for a smaller deterministic harness first.

Close the migration when the pattern has a stable command, stable resource names, and either a replay-backed bug report or a recorded `Verified` result at the documented depth.
