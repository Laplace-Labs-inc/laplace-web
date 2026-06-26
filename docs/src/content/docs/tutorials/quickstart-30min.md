---
title: "Quickstart in 30 Minutes"
description: "Install the rc.2 CLI, run a small ABBA harness, and read the first verification report."
section: tutorials
category: "LQ-3"
order: 101
last_updated: "2026-05-30"
---

# Quickstart in 30 Minutes

This tutorial takes a new Rust service from zero Laplace state to one local verification run. It uses the Step 1 release candidate tag `v0.1.0-alpha-1-rc.2`.

## 1. Install

Use the verified GitHub release asset path for this release candidate. The `cargo-binstall` channel is deferred until crates.io publishing is enabled.

```bash
gh release download v0.1.0-alpha-1-rc.2 \
  --repo Laplace-Labs-inc/laplace-cloud \
  --pattern laplace-cli-x86_64-unknown-linux-gnu.tar.xz
tar -xf laplace-cli-x86_64-unknown-linux-gnu.tar.xz
install -m 0755 laplace "$HOME/.cargo/bin/laplace"
laplace --version
```

If your environment cannot use binstall, build the CLI from the repository checkout that contains the release tag.

```bash
git clone https://github.com/Laplace-Labs-inc/laplace-cloud.git
cd laplace-cloud
git checkout v0.1.0-alpha-1-rc.2
cargo build --release -p laplace-cli
```

## 2. Create a Harness

Create a small crate and add a deterministic two-lock scenario. This intentionally models an ABBA ordering error.

```bash
cargo new laplace-quickstart
cd laplace-quickstart
mkdir -p tests
```

```rust
// tests/abba.rs
use std::sync::{Arc, Mutex};
use std::thread;

#[test]
fn abba_lock_order_can_deadlock() {
    let left = Arc::new(Mutex::new(()));
    let right = Arc::new(Mutex::new(()));

    let left_a = Arc::clone(&left);
    let right_a = Arc::clone(&right);
    let first = thread::spawn(move || {
        let _left_guard = left_a.lock().expect("left lock");
        let _right_guard = right_a.lock().expect("right lock");
    });

    let left_b = Arc::clone(&left);
    let right_b = Arc::clone(&right);
    let second = thread::spawn(move || {
        let _right_guard = right_b.lock().expect("right lock");
        let _left_guard = left_b.lock().expect("left lock");
    });

    first.join().expect("first thread");
    second.join().expect("second thread");
}
```

## 3. Run Verification

Keep the first run bounded. The exact CLI surface may vary by package source, so prefer `laplace --help` before wiring CI.

```bash
laplace axiom verify --harness abba_lock_order_can_deadlock --max-depth 64
```

Expected report shape:

```text
verdict: BugFound
class: Deadlock
resource_order: left -> right, right -> left
replay: target/laplace/abba_lock_order_can_deadlock.ard
```

## 4. Read the Result

The important fields are the verdict, the lock order, and the replay file. A `BugFound` result is actionable when the replay file names both conflicting resources.

## 5. Fix the Ordering

Make every path acquire locks in the same order.

```rust
use std::sync::{Arc, Mutex};
use std::thread;

#[test]
fn fixed_lock_order_is_stable() {
    let left = Arc::new(Mutex::new(()));
    let right = Arc::new(Mutex::new(()));

    let worker = |left: Arc<Mutex<()>>, right: Arc<Mutex<()>>| {
        thread::spawn(move || {
            let _left_guard = left.lock().expect("left lock");
            let _right_guard = right.lock().expect("right lock");
        })
    };

    let first = worker(Arc::clone(&left), Arc::clone(&right));
    let second = worker(Arc::clone(&left), Arc::clone(&right));

    first.join().expect("first thread");
    second.join().expect("second thread");
}
```

Run the verifier again and attach the `.ard` file only when the result remains `BugFound`.
