---
title: "CLI Reference"
description: "Complete reference for the laplace CLI — Axiom verification commands."
section: "reference"
order: 1
---

# CLI Reference

The `laplace` CLI drives Axiom formal verification: scaffold a project, verify
your concurrent code, and replay any bug it finds. (Kraken load testing and the
Probe observation mesh ship post-launch and are documented separately then.)

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

## laplace axiom replay

Replay a recorded schedule file deterministically.

```bash
laplace axiom replay --schedule schedule.json
```

## laplace init

Scaffold a new project wired for Axiom verification (no license required).

```bash
laplace init my-project --template byoc        # byoc | byoc-probe | kraken-scenario | byoc-axum | byoc-tokio
laplace init my-project --channel alpha-1
```

## laplace axiom mock-verify

Run a no-license demo verification — useful as a smoke test in CI.

```bash
laplace axiom mock-verify --scenario clean      # must exit 0
laplace axiom mock-verify --scenario deadlock   # must exit 1 (writes an .ard)
```

## laplace status

Show the current license/credit state.

```bash
laplace status
```

## laplace install / uninstall

Install an optional engine plugin, or remove local Laplace state.

```bash
laplace install axiom        # plugin: axiom (kraken/probe/sentinel ship post-launch)
laplace uninstall
```
