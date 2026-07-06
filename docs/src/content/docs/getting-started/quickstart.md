---
title: "Quickstart"
description: "Get from zero to your first verified concurrency bug in 10 minutes."
section: "getting-started"
order: 1
---

# Quickstart

Laplace formally verifies the concurrency correctness of your Rust code using **Classic DPOR** —
deterministic state-space exploration that systematically searches the distinct thread interleavings
and **proves** the absence of deadlocks, AB-BA cycles, and lost wakeups within a bounded search.

This guide takes you from installation to your first verified bug in under 10 minutes.

## Prerequisites

- **Rust 1.88+** (stable channel) — `rustup update stable`
- **GitHub account** — `laplace login` uses GitHub Device Flow and issues a FREE license during onboarding.
- **OS**: Linux, macOS, or Windows

## Step 1: Install the CLI

**macOS / Linux:**

```bash
curl -fsSL https://install.laplace-labs.com | sh
```

**Windows PowerShell:**

```powershell
irm https://install.laplace-labs.com/install.ps1 | iex
```

Package-manager installs are also available:

```bash
brew install laplace-labs-inc/homebrew-tap/laplace
```

```powershell
scoop bucket add laplace https://github.com/Laplace-Labs-inc/scoop-bucket
scoop install laplace
```

Verify the install:

```bash
laplace --version
```

> Pre-release builds are also published as GitHub release assets — see
> [Installation](/getting-started/installation) for pinning a specific version.

## Step 2: Authenticate

```bash
laplace login
```

The CLI opens GitHub Device Flow, asks you to enter the browser code, then bootstraps an org/project.
You can also pass `--org` or `--project` to select existing context. A FREE license is issued
automatically and a service-account key is saved for later CLI calls.

On first login, you'll be asked whether to contribute anonymized bug patterns to the Laplace Bug DB.
The cloud implementation grants **50 bonus credits** for Free and Plus accounts that opt in.

## Step 3: Instrument Your Code

Add `laplace-sdk` to your `Cargo.toml`:

```toml
[dev-dependencies]
# Until laplace-sdk is published to crates.io, use the public git dependency.
laplace-sdk = { git = "https://github.com/Laplace-Labs-inc/laplace" }
```

Alternatively, `laplace init demo --template byoc-tokio` creates a project with this dependency
wired automatically.

Wrap your concurrent struct fields. `#[laplace_tracked]` swaps the `#[track]` fields for
instrumented `Tracked*` primitives at test time:

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

Laplace's DPOR engine explores the distinct thread interleavings and reports any violation,
along with the **determinism assurance grade** and the seed used — the same seed, code, and config
reproduce the result bit-for-bit.

## Next Steps

- [One-Line Integration](/getting-started/one-line) — verify an existing function with a single annotation
- [Verify Concurrent Code](/tasks/verify) — deeper end-to-end walkthrough
- [Concepts: Axiom](/concepts/axiom) — understand how DPOR works
- [Coverage Boundaries](/reference/coverage) — what Laplace catches and what it does not catch
