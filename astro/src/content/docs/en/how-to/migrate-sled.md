---
title: "Migrate sled Code to Laplace BYOC"
description: "Map sled tree, pagecache, watcher, transaction, and ivar resources into BYOC patterns."
category: "how-to"
order: 205
last_updated: "2026-05-30"
---

# Migrate sled Code to Laplace BYOC

This guide cites `laplace-cloud/vendor/sled-0.34.7-patched` and `laplace-cloud/crates/external/sled-byoc`. The local manifest lists tree latch, flush snapshot, watcher, transaction conflict, pagecache GC, and ivar completion patterns.

## 1. Scope the Vendor Override

```toml
[dependencies]
sled = { path = "../../vendor/sled-0.34.7-patched" }
```

Keep the override in the detached BYOC crate. The patched package is a local scaffold and records resource names for verification.

## 2. Transform Tree and Pagecache Locks

Before:

```rust
struct TreeState {
    tree: std::sync::Mutex<u64>,
    pagecache: std::sync::Mutex<u64>,
}
```

After:

```rust
struct TreeState {
    tree_latch: std::sync::Mutex<u64>,
    pagecache_segment: std::sync::Mutex<u64>,
}

fn write_tree(state: &TreeState) {
    let _tree_latch = state.tree_latch.lock().expect("sled.tree_latch");
    let mut pagecache_segment = state
        .pagecache_segment
        .lock()
        .expect("sled.pagecache_segment");
    *pagecache_segment += 1;
}
```

This maps to `sled_tree_latch_pagecache_abba`.

## 3. Transform Watcher Shutdown

Before:

```rust
struct Watchers {
    list: std::sync::Mutex<Vec<u64>>,
    dropping: std::sync::Mutex<bool>,
}
```

After:

```rust
struct Watchers {
    watcher_list: std::sync::Mutex<Vec<u64>>,
    drop_guard: std::sync::Mutex<bool>,
}

fn drop_watcher(watchers: &Watchers) {
    let _watcher_list = watchers.watcher_list.lock().expect("sled.watcher_list");
    let mut drop_guard = watchers.drop_guard.lock().expect("sled.drop_guard");
    *drop_guard = true;
}
```

This maps to `sled_watcher_send_drop_deadlock`.

## 4. Transform Transaction Retry State

Before:

```rust
struct TxnRetry {
    conflicts: std::sync::Mutex<u32>,
    retries: std::sync::Mutex<u32>,
}
```

After:

```rust
struct TxnRetry {
    conflict_set: std::sync::Mutex<u32>,
    retry_state: std::sync::Mutex<u32>,
}

fn record_retry(txn: &TxnRetry) {
    let mut conflict_set = txn.conflict_set.lock().expect("sled.conflict_set");
    let mut retry_state = txn.retry_state.lock().expect("sled.retry_state");
    *conflict_set += 1;
    *retry_state += 1;
}
```

This maps to `sled_transaction_conflict_retry_race`.

## 5. Verify

```bash
cd laplace-cloud
cargo test --manifest-path crates/external/sled-byoc/Cargo.toml
laplace axiom verify \
  --manifest-path crates/external/sled-byoc/Cargo.toml \
  --pattern sled_tree_latch_pagecache_abba \
  --max-depth 128
```

Use the replay to confirm resource names before opening an issue or publishing a case study.

## 6. Model Storage State, Not Disk

The first sled BYOC harness should not depend on real disk timing. Model the tree latch, pagecache segment, watcher list, drop guard, conflict set, retry state, and ivar completion flag directly. Disk-backed tests are useful later, but they add nondeterminism that can hide the schedule being audited.

For `sled_pagecache_segment_gc_cycle`, include segment GC state and page table state. For `sled_ivar_wait_complete_race`, include waiter state and completion flag. The resource names are already present in `vendor/sled-0.34.7-patched/src/lib.rs`.

## 7. Make Retry Behavior Bounded

Transaction retry loops must be bounded in verification. A production retry policy might run until success, but a verifier needs a fixed limit so the schedule space stays finite.

```rust
fn bounded_retry_count(conflicts: u32) -> u32 {
    conflicts.min(3)
}

#[test]
fn retry_count_is_bounded() {
    assert_eq!(bounded_retry_count(10), 3);
}
```

Use the bound in the harness, then document the difference from production behavior. The goal is to preserve the conflict shape, not to simulate every storage retry.

## 8. Separate Watchers from Transactions

Watcher shutdown and transaction retry patterns exercise different invariants. Keep them in separate harnesses even if production code shares helper types. A watcher deadlock usually involves notification ownership and drop order. A transaction race usually involves conflict observation and retry mutation. Combining them creates larger schedules without improving the first diagnosis.

## 9. Replay Hygiene

For sled audits, replay files should not include real keys or values. Replace keys with small deterministic identifiers:

```rust
fn key_id(raw_key: &[u8]) -> u64 {
    raw_key.iter().fold(0_u64, |acc, byte| acc + u64::from(*byte))
}
```

This is not a hash for security. It is a small deterministic label for local harnesses. Do not use it for production storage.

Keep one replay per failing pattern. If several patterns fail after a broad change, reduce them independently. The local manifest has one expected verdict per pattern, and the audit is easier to close when every verdict has its own command and artifact.

## 10. Acceptance Checklist

The sled BYOC crate should compile with `cargo test --manifest-path crates/external/sled-byoc/Cargo.toml`. The verification command should name one manifest pattern and should use bounded retry or bounded wait behavior. Resource names should use the `sled.` prefix and should map to tree latches, pagecache segments, watcher lists, drop guards, conflict sets, retry state, segment GC, page tables, ivar waiters, or completion flags.

Reviewers should check that the harness does not depend on disk timing. A first-pass audit should not need real files, background flush threads, or nondeterministic sleeps. If disk behavior is required, document why the selected pattern cannot be modeled in memory. For transaction and ivar patterns, make completion state explicit so replay output identifies the failing transition.

Close the migration when each failing pattern has one command and one sanitized replay. Keep known `Verified` patterns in the manifest and avoid changing expected verdicts without a corresponding evidence update.

For long-running storage scenarios, keep the first verification bound conservative and increase it only after the small harness is stable. A deeper bound is useful evidence, but it should not compensate for unclear resource names, hidden disk timing, or unbounded retry behavior.
