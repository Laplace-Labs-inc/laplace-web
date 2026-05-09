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

Run Ki-DPOR verification on a harness.

```bash
laplace axiom verify --harness <NAME>
laplace axiom verify --harness all
laplace axiom verify --harness deadlock_ab_ba --max-depth 5000
```

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
