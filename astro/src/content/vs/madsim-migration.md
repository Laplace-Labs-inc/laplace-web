---
title: "Migrating from madsim to Laplace"
competitor: "madsim"
fixture_date: "2026-05-28"
version: "0.2.34"
version_status: "fixture version from LQ-9 JSON; verify latest before publish"
---

# Migrating from madsim to Laplace

Use madsim when deterministic distributed simulation, simulated time, and service-level failure injection are the center of the test. Use Laplace when the target is local Rust synchronization with deterministic replay and forensic artifacts.

The examples below map the five LQ-9 scenario fixtures to Laplace-style harness code. The compiled after examples live in `laplace-cloud/tests/lq10/migration-examples/from-madsim`.

## 1. ABBA 4-thread deadlock

```diff
- madsim::runtime::Runtime::new().block_on(async {
-     let left = std::sync::Arc::new(tokio::sync::Mutex::new(()));
-     let right = std::sync::Arc::new(tokio::sync::Mutex::new(()));
-     madsim::task::spawn(acquire(left, right));
- });
+ axiom_harness("abba_4_thread_deadlock", || {
+     let locks = tracked_locks(2);
+     thread("worker-a", || lock_pair(&locks, 0, 1));
+     thread("worker-b", || lock_pair(&locks, 1, 0));
+ });
```

## 2. Producer-consumer bounded queue

```diff
- madsim::task::spawn(async move { tx.send(1).await.unwrap(); });
- madsim::task::spawn(async move { rx.recv().await.unwrap(); });
+ axiom_harness("producer_consumer_bounded", || {
+     let queue = tracked_queue("bounded", 4);
+     queue.push(1);
+     queue.pop();
+ });
```

## 3. RwLock reader starvation

```diff
- let state = std::sync::Arc::new(tokio::sync::RwLock::new(0));
- madsim::task::spawn(async move { *state.write().await = 1; });
+ axiom_harness("rwlock_reader_starvation", || {
+     let state = tracked_rwlock("read-heavy", 0);
+     read("reader", &state);
+     write("writer", &state, 1);
+ });
```

## 4. tokio watch mutex race

```diff
- madsim::task::spawn(async move { watch_tx.send(1).unwrap(); });
- madsim::task::spawn(async move { watch_rx.changed().await.unwrap(); });
+ axiom_harness("tokio_watch_mutex_race", || {
+     notify("watch-send");
+     thread("watch-receiver", || receive_watch_update());
+ });
```

## 5. Dining philosophers

```diff
- madsim::runtime::Runtime::new().block_on(async {
-     run_philosophers_with_simulated_time(5).await;
- });
+ axiom_harness("dining_philosophers_5p", || {
+     let forks = tracked_locks(5);
+     run_philosophers_with_ordering(forks);
+ });
```
