---
title: "CLI Reference"
description: "Complete reference for the laplace CLI — Axiom, Kraken, Probe commands."
section: "reference"
order: 1
---

# CLI Reference

The `laplace` CLI controls Axiom formal verification, Kraken load testing, and Probe observation.

## Global Options

- `--version` — print version
- `--help` — print help

## laplace login

Authenticate with your license key.

```bash
laplace login --token <LICENSE_KEY>
```

## laplace axiom verify

Run Classic DPOR verification against a target crate or a named harness.

```bash
# Verify an external crate that uses supported primitives (zero-rewrite path)
laplace axiom verify --target my-crate

# Verify a named in-repo harness
laplace axiom verify --harness deadlock_ab_ba --max-depth 1000

# CI gate mode: refuse any assurance weaker than FullyDeterministic
laplace axiom verify --target my-crate --strict
```

Key flags:

- `--target <CRATE>` — verify an external crate (conflicts with `--harness`)
- `--harness <NAME>` — verify a named harness (conflicts with `--target`)
- `--max-depth <N>` — bounded search depth (default: `1000`)
- `--strict` — gate mode; exit non-zero unless the run is `FullyDeterministic`
- `--share-name` / `--crate-version` — opt-in metadata for the Bug DB

**Exit-code contract** (use it as a CI gate):

| Code | Meaning |
|------|---------|
| `0` | clean — no violation; assurance acceptable |
| `1` | violation found (`.ard` recorded), or `--strict` refused a non-`FullyDeterministic` assurance |
| `2` | usage / infra error (no mode selected, unknown harness, missing build feature) |

## laplace axiom forensic replay

Replay a recorded bug from an `.ard` file.

```bash
laplace axiom forensic replay --ard bug_report_1234.ard
```

## laplace kraken run

Run a load test scenario.

```bash
laplace kraken run scenarios/my-load.yaml
laplace kraken run scenarios/my-load.yaml --data "jwt=<TOKEN>"
```

## laplace probe agent

Manage the cloud observation agent.

```bash
laplace probe agent start --edge-url wss://edge.laplace-labs.com:8443
laplace probe agent status
```
