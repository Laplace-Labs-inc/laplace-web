---
title: "Migrating from Stateright to Laplace"
competitor: "stateright"
fixture_date: "2026-05-28"
version: "0.31.0"
version_status: "fixture version from LQ-9 JSON; verify latest before publish"
---

# Migrating from Stateright to Laplace

Use Stateright when a protocol is clearer as an explicit model with transitions and invariants. Use Laplace when the target is implementation-level Rust concurrency and the output must be a replayable harness artifact.

The examples below map the five LQ-9 scenario fixtures to Laplace-style harness code. The compiled after examples live in `laplace-cloud/tests/lq10/migration-examples/from-stateright`.

## 1. ABBA 4-thread deadlock

```diff
- impl Model for LockOrderModel {
-     fn actions(&self, _state: &State, actions: &mut Vec<Action>) {
-         actions.push(Action::AcquireLeftThenRight);
-         actions.push(Action::AcquireRightThenLeft);
-     }
- }
+ axiom_harness("abba_4_thread_deadlock", || {
+     let locks = tracked_locks(2);
+     thread("worker-a", || lock_pair(&locks, 0, 1));
+     thread("worker-b", || lock_pair(&locks, 1, 0));
+ });
```

## 2. Producer-consumer bounded queue

```diff
- enum Action { Produce, Consume }
- property("queue never exceeds capacity", |state| state.len <= 4);
+ axiom_harness("producer_consumer_bounded", || {
+     let queue = tracked_queue("bounded", 4);
+     queue.push(1);
+     queue.pop();
+ });
```

## 3. RwLock reader starvation

```diff
- property("writer eventually enters", |state| state.writer_progress);
+ axiom_harness("rwlock_reader_starvation", || {
+     let lock = tracked_rwlock("read-heavy", 0);
+     read("reader", &lock);
+     write("writer", &lock, 1);
+ });
```

## 4. tokio watch mutex race

```diff
- enum Action { SendWatch, ReceiveWatch, LockState }
- property("receiver observes committed state", assert_watch_invariant);
+ axiom_harness("tokio_watch_mutex_race", || {
+     let value = tracked_mutex("watch-state", 0);
+     notify("watch-send");
+     thread("watch-receiver", || *value.lock() = 1);
+ });
```

## 5. Dining philosophers

```diff
- enum Action { PickLeft(usize), PickRight(usize), Eat(usize) }
- property("no circular wait", assert_no_cycle);
+ axiom_harness("dining_philosophers_5p", || {
+     let forks = tracked_locks(5);
+     run_philosophers_with_ordering(forks);
+ });
```
