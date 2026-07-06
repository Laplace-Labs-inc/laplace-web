---
title: "CLI Options Reference"
description: "Reference for common Laplace CLI options used by tutorials."
section: reference
category: "LQ-3"
order: 301
last_updated: "2026-07-06"
---
Use `laplace --help` and subcommand help as the authoritative runtime source. This page lists the common options used by the tutorials.

## Global

| Option | Purpose |
|---|---|
| `--help` | Print command help. |
| `--version` | Print the installed version. |
| `--output text|json` | Select text or JSON output. |

## `laplace axiom verify`

| Option | Purpose |
|---|---|
| `--harness <NAME>` | Verify one named harness. |
| `--model-events <PATH>` | Ingest captured model-event files. |
| `--capture` | Run `cargo test` with event capture, then verify captured traces. |
| `--capture-args <ARGS>` | Append args to the orchestrated `cargo test` invocation. |
| `--contract <ID|list>` | Run or list modeled dependency contracts. |
| `--max-depth <N>` | Bound the search depth. |
| `--budget full|smoke` | Select full or shallow PR-gate budget. |
| `--no-cache` | Force a fresh run instead of using the verdict cache. |
| `--strict` | Fail unless assurance is acceptable. |
| `--receipt <PATH>` | Write an assurance receipt. |
| `--ard-out <DIR>` | Preserve BugFound ARD files for pinning. |

Examples:

```bash
laplace axiom verify --harness my_harness --max-depth 128
laplace axiom verify --capture --capture-args="--features laplace-gate"
laplace axiom verify --contract tokio-mutex-across-await
```

## `laplace axiom replay`

| Option | Purpose |
|---|---|
| `--file <PATH>` | Replay one recorded `.ard` file. |

```bash
laplace axiom replay --file target/laplace/failure.ard
```

## `laplace axiom forensic replay`

| Option | Purpose |
|---|---|
| `--ard <PATH>` | Replay one recorded `.ard` file through the forensic subcommand. |

```bash
laplace axiom forensic replay --ard target/laplace/failure.ard
```
