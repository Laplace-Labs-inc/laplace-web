---
title: "Quickstart"
description: "Get from zero to your first verified concurrency bug in 10 minutes."
section: "getting-started"
order: 1
---

# Quickstart

Laplace formally verifies the concurrency correctness of your Rust code using Ki-DPOR — exhaustive state-space exploration that **proves** the absence of deadlocks, starvation, and data races.

This guide takes you from installation to your first verified bug in under 10 minutes.

## Prerequisites

- **Rust 1.75+** (stable channel) — `rustup update stable`
- **License key** — get one at [laplace-labs.com](https://laplace-labs.com)
- **OS**: Linux or macOS (Windows via WSL2)

## Step 1: Install

```bash
git clone https://github.com/laplace-labs/laplace
cd laplace
cargo build --release -p laplace-cli
sudo cp target/release/laplace /usr/local/bin/
```

## Step 2: Authenticate

```bash
laplace login --token LAPLACE-YOUR-KEY-HERE
```

On first login, you'll be asked whether to contribute anonymized bug patterns to the Laplace Bug DB. Opting in earns **50 bonus credits**.

## Step 3: Instrument Your Code

Add `laplace-sdk` to your `Cargo.toml`:

```toml
[dev-dependencies]
laplace-sdk = "0.8"
```

Wrap your concurrent struct fields:

```rust
use laplace_sdk::prelude::*;

#[laplace_tracked]
pub struct AccountService {
    #[track]
    balance: tokio::sync::Mutex<i64>,
}
```

## Step 4: Add a Verification Test

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use laplace_sdk::prelude::*;

    #[laplace_sdk::verify(threads = 2)]
    async fn test_concurrent_balance(svc: &AccountService) {
        let mut b = svc.balance.lock().await;
        *b += 10;
    }
}
```

## Step 5: Run

```bash
cargo test
```

Laplace's Ki-DPOR exhaustively explores all thread interleavings and reports any violations.

## Next Steps

- [One-Line Integration](/docs/getting-started/one-line) — integrate without modifying production code
- [Concepts: Axiom](/docs/concepts/axiom) — understand how Ki-DPOR works
