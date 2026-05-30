---
title: "CLI Options Reference"
description: "Reference for common Laplace CLI options used by LQ-3 docs and BYOC audits."
section: reference
category: "LQ-3"
order: 301
last_updated: "2026-05-30"
---

# CLI Options Reference

Use `laplace --help` and subcommand help as the authoritative runtime source. This page documents the option set used by the LQ-3 tutorials.

## Global

| Option | Purpose |
|---|---|
| `--help` | Print command help. |
| `--version` | Print the installed version. |

## `laplace axiom verify`

| Option | Purpose |
|---|---|
| `--harness <NAME>` | Verify one named harness or a supported harness selector. |
| `--manifest-path <PATH>` | Run against a detached Cargo manifest, useful for BYOC crates. |
| `--pattern <NAME>` | Select one BYOC pattern from the manifest. |
| `--seed <U64>` | Pin scheduler search seed for reproducibility. |
| `--max-depth <N>` | Bound the search depth. |

Example:

```bash
laplace axiom verify \
  --manifest-path crates/external/hyper-byoc/Cargo.toml \
  --pattern hyper_pool_idle_reuse_abba \
  --seed 0xA1100ACE \
  --max-depth 128
```

## `laplace axiom forensic replay`

| Option | Purpose |
|---|---|
| `--ard <PATH>` | Replay one recorded `.ard` file. |

```bash
laplace axiom forensic replay --ard target/laplace/failure.ard
```

