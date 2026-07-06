---
title: "Use cargo-laplace"
description: "Run the Cargo wrapper for Laplace CLI workflows."
category: "how-to"
order: 206
last_updated: "2026-07-06"
---
`cargo laplace` is a thin Cargo subcommand wrapper around the `laplace` binary. If the wrapper is not installed in your environment yet, use the equivalent `laplace` command shown in each section.

## 1. Install the Laplace CLI

```bash
curl -fsSL https://install.laplace-labs.com | sh
laplace --version
```

For pinned assets, use the latest public release:

```bash
gh release download --repo Laplace-Labs-inc/laplace \
  --pattern laplace-cli-x86_64-unknown-linux-musl.tar.xz
```

## 2. Verify a Harness

`cargo laplace verify` forwards to `laplace axiom verify`.

```bash
cargo laplace verify --harness my_harness
```

Equivalent raw CLI:

```bash
laplace axiom verify --harness my_harness
```

## 3. Verify Staged Rust Changes

`--staged` checks staged Rust files and requires an explicit harness because the underlying CLI does not accept file-scoped verification targets yet.

```bash
cargo laplace verify --staged --harness my_harness
```

## 4. Run Wrapper Diagnostics

```bash
cargo laplace test --dry-run --json
cargo laplace forensic failure.ard
cargo laplace install-hooks --force
cargo laplace bench --nocapture
```

`install-hooks` is opt-in and never runs automatically.

## 5. Forward Cloud Commands

The wrapper forwards IAM and service-account commands to the `laplace` binary.

```bash
cargo laplace iam roles list
cargo laplace service-accounts keys create ci-runner
```

## 6. Scaffold a Project

```bash
cargo laplace init demo --template byoc-tokio
```

The current first-launch BYOC workspace member is SQLx at `crates/byoc/sqlx-byoc` in the private development repository. The archived Axum, Hyper, sled, and Tower BYOC stubs are not part of this first-launch how-to path.

## 7. Acceptance Checklist

A `cargo-laplace` workflow is ready for review when the local wrapper command and raw `laplace` command are equivalent, the selected harness is explicit, and any replay artifact is reviewed before being shared.
