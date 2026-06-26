---
title: "Migrate SQLx Code to Laplace BYOC"
description: "Trace SQLx pool, transaction, statement cache, and listener concurrency patterns."
category: "how-to"
order: 204
last_updated: "2026-05-30"
---

# Migrate SQLx Code to Laplace BYOC

This guide cites `laplace-cloud/vendor/sqlx-0.8.6-patched` and `laplace-cloud/crates/external/sqlx-byoc`. The local manifest records six SQLx patterns, including pool close ABBA, transaction rollback race, statement cache deadlock, migration advisory lock starvation, listener shutdown cycle, and row decode buffer race.

## 1. Keep the Patch Local to the Audit

```toml
[dependencies]
sqlx = { path = "../../vendor/sqlx-0.8.6-patched" }
```

The patched source currently exposes pattern metadata and Tracked* shim boundaries. It is not a replacement for a production SQLx dependency.

## 2. Transform Pool Close State

Before:

```rust
struct PoolState {
    state: std::sync::Mutex<u64>,
    close: std::sync::Mutex<bool>,
}
```

After:

```rust
struct PoolState {
    pool_state: std::sync::Mutex<u64>,
    close_event: std::sync::Mutex<bool>,
}

fn close_pool(pool: &PoolState) {
    let _pool_state = pool.pool_state.lock().expect("sqlx.pool_state");
    let mut close_event = pool.close_event.lock().expect("sqlx.close_event");
    *close_event = true;
}
```

This maps to `sqlx_pool_acquire_close_abba`.

## 3. Transform Statement Cache Access

Before:

```rust
struct StatementStore {
    cache: std::sync::Mutex<Vec<String>>,
    conn: std::sync::Mutex<u64>,
}
```

After:

```rust
struct StatementStore {
    statement_cache: std::sync::Mutex<Vec<String>>,
    connection_lock: std::sync::Mutex<u64>,
}

fn evict_statement(store: &StatementStore) {
    let mut statement_cache = store
        .statement_cache
        .lock()
        .expect("sqlx.statement_cache");
    let _connection_lock = store.connection_lock.lock().expect("sqlx.connection_lock");
    statement_cache.clear();
}
```

Use the same order everywhere or the verifier can find `sqlx_statement_cache_eviction_deadlock`.

## 4. Transform Listener Shutdown

Before:

```rust
struct Listener {
    listener: std::sync::Mutex<bool>,
    shutdown: std::sync::Mutex<bool>,
}
```

After:

```rust
struct Listener {
    listener_state: std::sync::Mutex<bool>,
    shutdown_token: std::sync::Mutex<bool>,
}

fn stop_listener(listener: &Listener) {
    let _listener_state = listener.listener_state.lock().expect("sqlx.listener_state");
    let mut shutdown_token = listener.shutdown_token.lock().expect("sqlx.shutdown_token");
    *shutdown_token = true;
}
```

This maps to `sqlx_notify_listener_shutdown_cycle`.

## 5. Verify

```bash
cd laplace-cloud
cargo test --manifest-path crates/external/sqlx-byoc/Cargo.toml
laplace axiom verify \
  --manifest-path crates/external/sqlx-byoc/Cargo.toml \
  --pattern sqlx_pool_acquire_close_abba \
  --seed 0xA1100ACE \
  --max-depth 128
```

If the report names generic resources such as `state` or `lock`, improve resource naming before filing an upstream-quality repro.

## 6. Avoid Real Databases in the First Harness

SQLx bugs often appear near pools, transactions, statement caches, listeners, and migration locks. The first BYOC harness should model those resources directly. Avoid connecting to a real database unless the pattern depends on server behavior. A real database adds timing, network, authentication, and cleanup variables that make schedule replay harder.

For `sqlx_pool_acquire_close_abba`, model pool state and close event. For `sqlx_transaction_drop_rollback_race`, model transaction state and rollback future. For `sqlx_migrate_advisory_lock_starvation`, model advisory lock and migration table. These resources are named directly in `vendor/sqlx-0.8.6-patched/src/lib.rs`.

## 7. Keep Transaction Cleanup Explicit

Transaction drop paths are easy to hide behind RAII. Make rollback state visible in the harness even if production code relies on a drop implementation.

```rust
struct TransactionCleanup {
    transaction_state: std::sync::Mutex<bool>,
    rollback_future: std::sync::Mutex<bool>,
}

fn schedule_rollback(cleanup: &TransactionCleanup) {
    let _transaction_state = cleanup
        .transaction_state
        .lock()
        .expect("sqlx.transaction_state");
    let mut rollback_future = cleanup
        .rollback_future
        .lock()
        .expect("sqlx.rollback_future");
    *rollback_future = true;
}
```

This makes `sqlx_transaction_drop_rollback_race` reviewable without requiring a live connection.

## 8. Classify the Result

The SQLx manifest contains deadlock, race, and starvation patterns. Do not collapse them into a single "concurrency bug" bucket. A statement cache deadlock usually needs lock ordering changes. A row decode shared-buffer race usually needs ownership or copy boundaries. Migration advisory lock starvation usually needs fairness or timeout policy.

When a run returns `BugFound`, attach the pattern name and class to the issue title:

```text
sqlx_statement_cache_eviction_deadlock: statement cache and connection lock ABBA
```

That title is more useful than "SQLx verification failed".

## 9. Keep Secrets Out of Replays

Database URLs, usernames, and query parameters can leak into diagnostics if a harness records too much metadata. The BYOC harness should use synthetic names and redacted payloads. If you need query text to understand a cache key, reduce it to a stable identifier before writing an `.ard` file.

Use CI retention limits for replay artifacts. Store long-lived reproductions in a sanitized repro repository, not in general CI logs.

## 10. Acceptance Checklist

The SQLx BYOC crate should compile with `cargo test --manifest-path crates/external/sqlx-byoc/Cargo.toml`. Verification should select one pattern and should use synthetic pool, transaction, statement, migration, listener, or row decode resources. No command should require a live database for the first audit pass. If a live database becomes necessary later, isolate credentials in CI secrets and keep them out of replay metadata.

Reviewers should check that the migration keeps query behavior unchanged. A tracked wrapper must not alter transaction lifetime, statement cache keys, listener shutdown order, or row decoding ownership unless that is the intended fix. For transaction cleanup, prefer an explicit harness helper over relying on hidden drop timing. For statement cache fixes, verify that every path uses the same lock order.

Close the migration when the issue has a class-specific title, a stable command, a documented depth, and a sanitized replay when the verdict is `BugFound`. A `Verified` result should still record the exact pattern and bound.

Prefer one database concern per harness. Pool lifecycle, transaction rollback, statement caching, migrations, notifications, and row decoding each have different ownership rules. Keeping them separate makes both the replay and the eventual fix easier to review.
