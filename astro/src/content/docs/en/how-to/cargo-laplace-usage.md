---
title: "Use cargo-laplace"
description: "Run Laplace verification as a Cargo-centered workflow for local and CI use."
category: "how-to"
order: 206
last_updated: "2026-05-30"
---

# Use cargo-laplace

`cargo laplace` is the expected developer entry point when verification is tied to a Rust workspace. If the subcommand is not installed in your environment yet, use the equivalent `laplace axiom verify` command shown in each example.

## 1. Install

```bash
gh release download v0.1.0-alpha-1-rc.2 \
  --repo Laplace-Labs-inc/laplace-cloud \
  --pattern laplace-cli-x86_64-unknown-linux-gnu.tar.xz
tar -xf laplace-cli-x86_64-unknown-linux-gnu.tar.xz
install -m 0755 laplace "$HOME/.cargo/bin/laplace"
cargo laplace --help
```

Fallback:

```bash
laplace axiom verify --help
```

## 2. Transform a Raw CLI Run into a Cargo Run

Before:

```bash
laplace axiom verify --manifest-path crates/external/hyper-byoc/Cargo.toml --max-depth 128
```

After:

```bash
cargo laplace verify --manifest-path crates/external/hyper-byoc/Cargo.toml --max-depth 128
```

Keep `--manifest-path` explicit for detached BYOC crates.

## 3. Transform One Pattern into a Named Job

Before:

```bash
cargo test --manifest-path crates/external/tower-byoc/Cargo.toml
```

After:

```bash
cargo laplace verify \
  --manifest-path crates/external/tower-byoc/Cargo.toml \
  --pattern tower_layer_ready_call_abba \
  --seed 0xA1100ACE \
  --max-depth 128
```

The local Tower scaffold is `laplace-cloud/vendor/tower-0.5.0-patched`.

## 4. Transform CI Commands

Before:

```yaml
- run: laplace axiom verify --harness changed --max-depth 128
```

After:

```yaml
- run: cargo laplace verify --harness changed --max-depth 128
```

Use the same release candidate asset as local developers:

```yaml
- run: |
    gh release download v0.1.0-alpha-1-rc.2 \
      --repo Laplace-Labs-inc/laplace-cloud \
      --pattern laplace-cli-x86_64-unknown-linux-gnu.tar.xz
    tar -xf laplace-cli-x86_64-unknown-linux-gnu.tar.xz
    install -m 0755 laplace "$HOME/.cargo/bin/laplace"
```

## 5. Work with Local Vendor Crates

The LQ-1 BYOC crates cite these local vendor paths:

- `vendor/hyper-1.5.0-patched`
- `vendor/tower-0.5.0-patched`
- `vendor/axum-0.7.9-patched`
- `vendor/sqlx-0.8.6-patched`
- `vendor/sled-0.34.7-patched`

Run each detached crate independently:

```bash
for crate in hyper tower axum sqlx sled; do
  cargo test --manifest-path "crates/external/${crate}-byoc/Cargo.toml"
done
```

Use `cargo laplace` for verification and `cargo test` for manifest compile checks. Do not let the audit path override leak into the main application workspace.

## 6. Recommended Local Workflow

Run local verification in three passes. First, compile the detached BYOC crate. Second, run the smallest pattern that covers your change. Third, replay any generated `.ard` file before editing the fix. This avoids the common mistake of changing code before confirming which resource order failed.

```bash
cargo test --manifest-path crates/external/axum-byoc/Cargo.toml
cargo laplace verify \
  --manifest-path crates/external/axum-byoc/Cargo.toml \
  --pattern axum_state_extractor_extension_abba \
  --max-depth 128
laplace axiom forensic replay --ard target/laplace/axum_state_extractor_extension_abba.ard
```

If `cargo laplace` is not available in the installed release, keep the same arguments and use `laplace axiom verify`.

## 7. Recommended CI Workflow

CI should be boring and bounded. Use one required job for changed harnesses and one scheduled job for full manifests.

```yaml
name: laplace-nightly

on:
  schedule:
    - cron: "0 8 * * *"

jobs:
  byoc:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - run: |
          gh release download v0.1.0-alpha-1-rc.2 \
            --repo Laplace-Labs-inc/laplace-cloud \
            --pattern laplace-cli-x86_64-unknown-linux-gnu.tar.xz
          tar -xf laplace-cli-x86_64-unknown-linux-gnu.tar.xz
          install -m 0755 laplace "$HOME/.cargo/bin/laplace"
      - run: cargo test --manifest-path crates/external/sqlx-byoc/Cargo.toml
      - run: cargo laplace verify --manifest-path crates/external/sqlx-byoc/Cargo.toml --max-depth 512
```

Archive replay files with restricted retention and avoid printing secrets. This matters for database and HTTP harnesses where environment variables are often nearby.

## 8. Exit Code Policy

Use strict exit codes in required jobs. A `BugFound` verdict should fail unless the job is explicitly adding or preserving a known repro. For known repros, name the job accordingly so reviewers do not confuse expected failures with regressions.

```rust
#[derive(Debug, Clone, Copy, Eq, PartialEq)]
enum JobKind {
    RegressionCheck,
    KnownRepro,
}

fn fail_on_bug_found(kind: JobKind) -> bool {
    matches!(kind, JobKind::RegressionCheck)
}
```

## 9. Workspace Hygiene

Keep command examples explicit. `--manifest-path` prevents Cargo from accidentally selecting the root workspace when the target is a detached BYOC crate. `--pattern` prevents a quick local check from turning into a full manifest sweep. `--seed` makes a result easier to reproduce when a teammate reruns the command.

When documenting a result, include the exact command, the installed Laplace version, the selected vendor path, and whether the command used `cargo laplace` or `laplace axiom verify`.

## 10. Acceptance Checklist

A `cargo-laplace` workflow is ready for review when local and CI commands are equivalent. The local command should use the same manifest path, pattern, seed, and depth as the CI command unless CI intentionally uses a deeper scheduled bound. The installed version should be visible in logs, and this LQ-3 docs set uses `0.1.0-alpha-1-rc.2` for install examples.

Reviewers should check that command wrappers do not hide failures. If `cargo laplace verify` returns `BugFound`, the job should fail for regression checks and should archive the replay. If the job is a known repro, the job name and comments should say so. Avoid shell constructs that swallow exit codes, especially in matrix jobs.

The workflow is complete when a new developer can run one command locally, CI can run the same command in a bounded job, and replay artifacts are available without exposing secrets. Keep sync work, such as package installation changes or shared Astro config edits, outside this docs-only change set.

Prefer explicit commands in documentation even when a project later wraps them in `make` or `just`. The explicit form is easier to copy into CI, easier to compare across BYOC crates, and easier to audit when a future release changes default flags.
