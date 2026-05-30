---
title: "Migrating from Shuttle to Laplace"
competitor: "shuttle"
fixture_date: "2026-05-28"
version: "0.9.1"
version_status: "fixture version from LQ-9 JSON; verify latest before publish"
---

# Migrating from Shuttle to Laplace

Use Shuttle when randomized or PCT scheduling is the simplest way to expose a bug and persisted schedules are enough for replay. Use Laplace when the release gate requires deterministic harness replay and forensic output.

The examples below map the five LQ-9 scenario fixtures to Laplace-style harness code. The compiled after examples live in `laplace-cloud/tests/lq10/migration-examples/from-shuttle`.

## 1. ABBA 4-thread deadlock

```diff
- shuttle::check_pct(|| {
-     let left = shuttle::sync::Arc::new(shuttle::sync::Mutex::new(()));
-     let right = shuttle::sync::Arc::new(shuttle::sync::Mutex::new(()));
-     shuttle::thread::spawn(move || acquire(left, right));
- });
+ axiom_harness("abba_4_thread_deadlock", || {
+     let locks = tracked_locks(2);
+     thread("worker-a", || lock_pair(&locks, 0, 1));
+     thread("worker-b", || lock_pair(&locks, 1, 0));
+ });
```

## 2. Producer-consumer bounded queue

```diff
- shuttle::check_random(|| {
-     let queue = shuttle::sync::Mutex::new(VecDeque::new());
-     queue.lock().unwrap().push_back(1);
- });
+ axiom_harness("producer_consumer_bounded", || {
+     let queue = tracked_queue("bounded", 4);
+     queue.push(1);
+     queue.pop();
+ });
```

## 3. RwLock reader starvation

```diff
- shuttle::check_pct(|| {
-     let lock = shuttle::sync::RwLock::new(0);
-     let _read = lock.read().unwrap();
- });
+ axiom_harness("rwlock_reader_starvation", || {
+     let lock = tracked_rwlock("read-heavy", 0);
+     read("reader", &lock);
+     write("writer", &lock, 1);
+ });
```

## 4. tokio watch mutex race

```diff
- shuttle::check_random(|| {
-     shuttle::thread::spawn(|| publish_watch_update());
- });
+ axiom_harness("tokio_watch_mutex_race", || {
+     notify("watch-send");
+     thread("watch-receiver", || receive_watch_update());
+ });
```

## 5. Dining philosophers

```diff
- shuttle::check_pct(|| {
-     let forks = shuttle_forks(5);
-     run_philosophers(forks);
- });
+ axiom_harness("dining_philosophers_5p", || {
+     let forks = tracked_locks(5);
+     run_philosophers_with_ordering(forks);
+ });
```
