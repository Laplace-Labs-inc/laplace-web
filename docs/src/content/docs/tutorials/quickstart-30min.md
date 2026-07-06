---
title: "Quickstart in 30 Minutes"
description: "Install the CLI, authenticate, run the scaffolded verification gate, and prove a real deadlock."
section: tutorials
category: "LQ-3"
order: 101
last_updated: "2026-07-06"
---
This tutorial takes you from zero Laplace state to a passing verification gate and one engine-proven deadlock. Every command below is part of the supported first-launch surface — you can follow it top to bottom.

## 1. Install

Use the public install script for the current release.

```bash
curl -fsSL https://install.laplace-labs.com | sh
laplace --version
```

For pinned assets, use the latest public GitHub release:

```bash
gh release download --repo Laplace-Labs-inc/laplace \
  --pattern laplace-cli-x86_64-unknown-linux-musl.tar.xz
```

## 2. Authenticate

`laplace axiom verify` is entitlement-gated, so log in before running the gate. All you need is a GitHub account:

```bash
laplace login
```

The CLI starts GitHub Device Flow (enter the code it prints in your browser), then bootstraps an
organization and project, issues a FREE license automatically, and stores a service-account key
for later CLI calls. Pass `--org` / `--project` to reuse existing context instead.

## 3. Scaffold a Gated Project

`laplace init` (no license required) creates a project with the verification gate already wired:

```bash
laplace init laplace-quickstart --template byoc-tokio
cd laplace-quickstart
```

The template ships a scenario gate at `tests/laplace_gate.rs`: two workers take two
`std::sync::Mutex` locks in the same `a -> b` order under
`#[laplace_sdk::verify(scenario, expected = "clean")]`. Run tier 1 — the in-process check —
first:

```bash
cargo test --features laplace-gate
```

## 4. Run the Verification Gate (Tier 2)

Tier 2 hands the captured synchronization events to the Axiom engine:

```bash
laplace axiom verify --capture --capture-args="--features laplace-gate"
```

`--capture` orchestrates `cargo test` with event capture and then drives the engine over the
captured interleavings. A clean run exits `0` and reports the verdict, the determinism assurance
grade, and the replay seed — the same seed, code, and config reproduce the result bit-for-bit.

## 5. Prove a Real Deadlock

You do not have to break your own build to see a failure. Run a modeled dependency-misuse
contract — the engine explores it and proves the AB-BA deadlock:

```bash
laplace axiom verify --contract tokio-mutex-across-await
```

This exits `1` (violation found). Use `laplace axiom verify --contract list` to see the contract
library.

If you would rather see the ABBA shape in the scaffolded scenario itself, flip `worker_two` in
`tests/laplace_gate.rs` to take the locks in `b -> a` order — but note the template's own caveat:
a real native deadlock can hang during tier-1 capture, so the contract path above is the
canonical bug demo.

## 6. Read the Result

The exit code is the CI contract: `0` clean, `1` violation found (or `--strict` refused a weaker
assurance), `2` usage/infra error. BugFound runs can preserve `.ard` forensic records
(`--ard-out <DIR>`); replay one for human inspection with:

```bash
laplace axiom forensic replay --ard <file>.ard
```

Honest scope: a green gate means "safe within the supported model primitives captured by this
scenario" — see [Coverage Boundaries](/reference/coverage) for what Laplace does and does not
catch.
