---
title: "Migrating from Loom to Laplace"
competitor: "loom"
fixture_date: "2026-05-28"
version: "0.7.2"
version_status: "fixture version from LQ-9 JSON; verify latest before publish"
---

# Migrating from Loom to Laplace

Use Loom when the target code already fits `loom::model` and loom-aware primitives. Use Laplace when the test must stay closer to production dependencies, emit replayable forensic artifacts, or become part of a deterministic release gate.

The examples below map the five LQ-9 scenario fixtures to Laplace-style harness code. The compiled after examples live in `laplace-cloud/tests/lq10/migration-examples/from-loom`.

## 1. ABBA 4-thread deadlock

```diff
- loom::model(|| {
-     let left = loom::sync::Arc::new(loom::sync::Mutex::new(()));
-     let right = loom::sync::Arc::new(loom::sync::Mutex::new(()));
-     loom::thread::spawn(move || {
-         let _a = left.lock().unwrap();
-         let _b = right.lock().unwrap();
-     });
- });
+ axiom_harness("abba_4_thread_deadlock", || {
+     let locks = tracked_locks(2);
+     thread("worker-a", || lock_pair(&locks, 0, 1));
+     thread("worker-b", || lock_pair(&locks, 1, 0));
+ });
```

## 2. Producer-consumer bounded queue

```diff
- let queue = loom::sync::Arc::new(loom::sync::Mutex::new(VecDeque::new()));
- loom::thread::spawn(move || queue.lock().unwrap().push_back(1));
+ let queue = tracked_queue("producer_consumer_bounded", 4);
+ thread("producer", || queue.push(1));
+ thread("consumer", || queue.pop());
```

## 3. RwLock reader starvation

```diff
- let state = loom::sync::Arc::new(loom::sync::RwLock::new(0));
- let _reader = state.read().unwrap();
- let mut writer = state.write().unwrap();
+ let state = tracked_rwlock("rwlock_reader_starvation", 0);
+ read("reader-1", &state);
+ write("writer-1", &state, 1);
```

## 4. tokio watch mutex race

```diff
- loom::model(|| {
-     let value = loom::sync::Arc::new(loom::sync::Mutex::new(0));
-     loom::thread::spawn(move || *value.lock().unwrap() = 1);
- });
+ axiom_harness("tokio_watch_mutex_race", || {
+     let value = tracked_mutex("watch-state", 0);
+     notify("watch-send");
+     thread("watch-receiver", || *value.lock() = 1);
+ });
```

## 5. Dining philosophers

```diff
- loom::model(|| {
-     let forks = make_loom_mutexes(5);
-     run_philosophers(forks);
- });
+ axiom_harness("dining_philosophers_5p", || {
+     let forks = tracked_locks(5);
+     run_philosophers_with_ordering(forks);
+ });
```
