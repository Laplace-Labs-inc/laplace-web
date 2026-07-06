---
title: "CLI Reference"
description: "Reference for the laplace CLI surface."
section: "reference"
order: 1
---
The `laplace` CLI drives project scaffolding, authentication, Axiom verification, replay, and local diagnostics. Kraken and Probe remain post-launch hidden commands in first-touch help.

## Global Options

- `--help` — print help.
- `--version` — print version.
- `--output text|json` — select human-readable text or JSON output. The default is `text`.

## `laplace init`

Create a project from a template. The current template names are `byoc`, `byoc-axum`, and `byoc-tokio`; `byoc-probe` and `kraken-scenario` remain post-launch surfaces even if named explicitly.

```bash
laplace init demo --template byoc-tokio --channel alpha-1
```

Flags:

- `--template <NAME>` — template name, default `byoc`.
- `--channel alpha-1|alpha-2|beta` — SDK channel, default `alpha-1`.
- `--force` — overwrite if the project directory exists.

## `laplace scan`

Scan a Rust source tree for concurrency primitive surfaces.

```bash
laplace scan crates/my-service
```

## `laplace login`

Authenticate with GitHub Device Flow by default. The CLI bootstraps org/project context, issues a FREE license when needed, and stores a service-account key for later calls.

```bash
laplace login
laplace login --org acme --project default
```

Flags:

- `--org <SLUG>` — organization slug for device-flow onboarding.
- `--project <SLUG>` — project slug for device-flow onboarding.
- `--no-input` — disable prompts; non-TTY stdin is treated the same way.
- `--session-token <JWT>` — store an IAM/session JWT as bearer auth.
- `--service-account-key <KEY>` — store a service-account key as bearer auth.
- `--token <KEY>` — legacy license key flag, deprecated for API calls and kept for local module gates.

## `laplace status`

Show current license status and credit balance.

```bash
laplace status
```

## `laplace config`

Set or read the active org/project context.

```bash
laplace config set org acme
laplace config set project default
laplace config get
laplace config get project
```

## `laplace orgs`

Manage organizations and members.

```bash
laplace orgs list
laplace orgs create "Acme" --slug acme
laplace orgs describe org_123
laplace orgs members add --org org_123 --email dev@example.com
laplace orgs members remove --org org_123 --member user_123
```

## `laplace projects`

Manage projects under an organization.

```bash
laplace projects create "Default" --org org_123
laplace projects list --org org_123
laplace projects describe proj_123
```

## `laplace iam`

List roles, manage bindings, and test permissions.

```bash
laplace iam roles list
laplace iam bindings list --project proj_123
laplace iam bindings add --project proj_123 --member user:dev@example.com --role roles/axiom.runner
laplace iam bindings remove --project proj_123 --member user:dev@example.com --role roles/axiom.runner
laplace iam test-permission --project proj_123 --permission axiom.verify
```

Scope flags are mutually exclusive: use one of `--org`, `--project`, or `--tenant`.

## `laplace service-accounts`

Manage service accounts and keys.

```bash
laplace service-accounts create ci-runner --project proj_123
laplace service-accounts list --project proj_123
laplace service-accounts delete sa_123
laplace service-accounts keys create sa_123 --ttl 30d
laplace service-accounts keys revoke key_123
```

## `laplace install` / `laplace uninstall`

Install an engine plugin or remove local Laplace state.

```bash
laplace install axiom
laplace uninstall
```

## `laplace report`

Create a local diagnostic package for a user-reviewed bug report. Upload is disabled by default.

```bash
laplace report --bug --ard target/laplace/failure.ard --include-system-info
laplace report --bug --upload=true
```

Flags:

- `--bug` — required for the current report path.
- `--ard <ARD_PATH>` — include a scrubbed ARD file.
- `--include-system-info` — include OS, architecture, and CLI version.
- `--upload[=true|false]` — request upload after a confirmation prompt.

## `laplace hunt`

Run the observation-to-Axiom entry point: capture, WFG triage, engine bridge, and optional ARD output.

```bash
laplace hunt --demo ab-ba --max-depth 500 --write-ard
laplace hunt --pid 1234 --duration 10
```

Flags:

- `--pid <PID>` — live eBPF capture target PID.
- `--duration <SECONDS>` — eBPF capture duration, default `10`.
- `--demo ab-ba|clean|data-race` — zero-root demo source.
- `--max-depth <N>` — DPOR exploration depth, default `500`.
- `--write-ard` — write an ARD forensic report when a bug is found.

## `laplace axiom verify`

Run Axiom verification against a target, harness, captured model events, one-command capture, or a dependency contract.

```bash
laplace axiom verify --harness meter_inner
laplace axiom verify --capture --capture-args="--features laplace-gate"
laplace axiom verify --model-events target/laplace/events --preflight
laplace axiom verify --contract tokio-mutex-across-await
laplace axiom verify --contract list
```

Mode flags:

| Flag | Purpose |
|---|---|
| `--target <CRATE>` | Verify an external target. Conflicts with `--harness` and `--model-events`. |
| `--harness <NAME>` | Verify a named harness. Conflicts with `--target` and `--model-events`. |
| `--model-events <PATH>` | Ingest captured model-event files from a file or directory. |
| `--capture` | Run `cargo test` with `LAPLACE_VERIFY_EVENTS_DIR`, then ingest captured traces. |
| `--capture-args <ARGS>` | Append extra args to the orchestrated `cargo test` invocation. Requires `--capture`. |
| `--contract <ID|list>` | Run a modeled dependency-misuse contract or list available contracts. |

Search and gate flags:

| Flag | Purpose |
|---|---|
| `--max-depth <N>` | Set exploration depth, default `1000`. |
| `--budget full|smoke` | Select the verification budget. `smoke` is shallow PR triage and is not full green. |
| `--no-cache` | Ignore the verdict cache and force a fresh model-events engine run. |
| `--strict` | Fail unless assurance is acceptable; strict also refuses smoke as full green. |
| `--share-name` | Opt into sharing the raw crate name with the Bug DB. |
| `--crate-version <VERSION>` | Attach verified crate version metadata to Bug DB reports. |

Determinism and reporting flags:

| Flag | Purpose |
|---|---|
| `--source <PATH>` | Scan a source file or directory for non-deterministic call sites and emit sidecar findings. |
| `--preflight` | Compare repeated captures of the same target and downgrade assurance if op streams diverge. |
| `--triage-flake` | With `--model-events`, decide whether a flaky test is a real determinism bug or environmental. |
| `--baseline <PATH>` | Suppress findings already accepted in a determinism baseline. |
| `--update-baseline` | Record current findings into the baseline. |
| `--sarif <PATH>` | Write determinism findings as SARIF 2.1.0. |
| `--receipt <PATH>` | Write a positive reproducibility receipt. |
| `--pin-seed` | Write the master Axiom seed to `.laplace/reproducibility.toml`. |
| `--ard-out <DIR>` | Preserve BugFound ARD files for `laplace axiom pin`. |

Exit-code contract:

| Code | Meaning |
|---|---|
| `0` | Clean: no violation; assurance acceptable. |
| `1` | Violation found, or `--strict` refused non-acceptable assurance. |
| `2` | Usage or infrastructure error, such as no mode selected, unknown harness, or missing build feature. |

## `laplace axiom pin`

Pin an ARD finding as a seed-fixed regression guard.

```bash
laplace axiom pin target/laplace/failure.ard --manifest laplace-pins.toml --note "regression guard"
```

## `laplace axiom replay`

Replay a recorded ARD forensic file.

```bash
laplace axiom replay --file target/laplace/failure.ard
```

## `laplace axiom forensic replay`

Run the forensic replay subcommand for an ARD file.

```bash
laplace axiom forensic replay --ard target/laplace/failure.ard
```

## `laplace axiom diff`

Compare two ARD files.

```bash
laplace axiom diff --before before.ard --after after.ard
```

## `laplace axiom init`

Inspect `Cargo.lock` and generate dependency onboarding artifacts.

```bash
laplace axiom init --path . --channel alpha-1 --dry-run
```

Flags:

- `--path <PATH>` — target repo path, default `.`.
- `--channel alpha-1|alpha-2|beta` — SDK channel, default `alpha-1`.
- `--dry-run` — print the plan without writing files.

## `laplace axiom mock-verify`

Run the synthetic mock pipeline for CI smoke checks. This is a mock pipeline command, not a product coverage claim.

```bash
laplace axiom mock-verify --scenario clean
laplace axiom mock-verify --scenario deadlock --write-ard --output-dir target/laplace
```

Flags:

- `--scenario deadlock|data-race|livelock|clean` — synthetic scenario.
- `--max-depth <N>` — mock exploration depth, default `500`.
- `--write-ard` — write an ARD file when a mock bug is found.
- `--output-dir <DIR>` — ARD output directory, default `.`.

## Hidden Post-Launch Commands

`laplace kraken` and `laplace probe` are present as hidden post-launch command groups. They are intentionally not part of first-launch user onboarding.
