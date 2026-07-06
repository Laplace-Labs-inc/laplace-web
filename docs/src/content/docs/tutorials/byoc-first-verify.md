---
title: "First BYOC Audit"
description: "Inspect a Bring Your Own Crate audit scaffold against a local patched vendor crate."
section: tutorials
category: "LQ-3"
order: 102
last_updated: "2026-05-30"
---

# First BYOC Audit

BYOC audits keep third-party crate instrumentation local until the audit result is stable enough to publish. The first-launch live BYOC scaffold is SQLx under `laplace-cloud/vendor/sqlx-0.8.6-patched` and `laplace-cloud/crates/byoc/sqlx-byoc`.

## 1. Pick a Crate

Start with SQLx because it is a live workspace member:

- `laplace-cloud/vendor/sqlx-0.8.6-patched`
- `laplace-cloud/crates/byoc/sqlx-byoc`

The vendor crate exposes audit resource names. The detached audit crate reads those patterns without importing the full upstream source snapshot.

## 2. Inspect the Pattern Manifest

```bash
cd laplace-cloud
cargo test --manifest-path crates/byoc/sqlx-byoc/Cargo.toml
```

The current detached crate is compile-safe. Full `#[axiom_harness]` execution requires the workspace sync noted in the BYOC README.

## 3. Select One Scenario

Pick one scenario name for evidence tracking:

```rust
#[derive(Debug, Clone, Eq, PartialEq)]
struct AuditSelection {
    crate_name: &'static str,
    pattern_name: &'static str,
    expected: &'static str,
}

fn first_sqlx_selection() -> AuditSelection {
    AuditSelection {
        crate_name: "sqlx",
        pattern_name: "sqlx_pool_acquire_close_abba",
        expected: "BugFound",
    }
}
```

## 4. Create the Verification Command

Use the supported first-launch CLI surface to create the onboarding plan. Keep full pattern execution on the private audit branch until the BYOC README marks it ready.

```bash
laplace axiom init --path . --channel alpha-1 --dry-run
```

## 5. Record Evidence

Keep three artifacts with the audit branch:

- the command line
- the generated onboarding plan
- the vendor path and exact pattern name

Do not edit upstream crate code during the first pass. Treat `vendor/sqlx-0.8.6-patched/src/lib.rs` as the local citation source until the full upstream snapshot is synced.
