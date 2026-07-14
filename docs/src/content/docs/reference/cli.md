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

Authenticate with GitHub device flow or store an existing session or service-account credential.

```bash
laplace login                              # GitHub device flow (interactive onboarding)
laplace login --session-token <SESSION_JWT>
laplace login --service-account-key <KEY>  # CI / automation
```

## laplace axiom verify

Run Classic DPOR verification in one of the supported input modes.

```bash
# Run the test suite, capture envelopes, and drive the engine (no server required)
laplace axiom verify --capture

# Inject a previously captured envelope file
laplace axiom verify --model-events ./capture.json

# Replay a modeled dependency contract
laplace axiom verify --contract tokio-mutex-across-await

# Live Probe mode
laplace axiom verify --target http://127.0.0.1:3000
```

Key flags:

- `--capture` — run the test suite with trace capture, then drive the engine
- `--model-events <FILE>` — inject a captured envelope file
- `--contract <ID>` — replay a modeled dependency contract; use `--contract list` to list contracts
- `--target <URL>` — collect Probe events from a live target
- `--max-depth <N>` — DPOR schedule budget (default: `20000000`); spending the budget truncates the run and downgrades the verdict to `bounded`
- `--strict` — return exit code 1 when the run is not clean

**Exit-code contract** (use it as a CI gate):

| Code | Meaning |
|------|---------|
| `0` | clean — no violation; assurance acceptable |
| `1` | violation found (`.ard` recorded), or `--strict` refused a non-`FullyDeterministic` assurance |
| `2` | usage / infra error (no mode selected, unknown contract, missing build feature) |

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
