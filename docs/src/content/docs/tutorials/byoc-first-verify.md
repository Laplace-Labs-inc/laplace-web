---
title: "First BYOC Verification"
description: "Run a Bring Your Own Crate audit scaffold against a local patched vendor crate."
section: tutorials
category: "LQ-3"
order: 102
last_updated: "2026-05-30"
---

# First BYOC Verification

BYOC audits keep third-party crate instrumentation local until the audit result is stable enough to publish. The LQ-1 scaffolds live under `laplace-cloud/vendor/*-patched` and `laplace-cloud/crates/external/*-byoc`.

## 1. Pick a Crate

Start with Hyper because its local scaffold is small and exposes six manifest scenarios:

- `laplace-cloud/vendor/hyper-1.5.0-patched`
- `laplace-cloud/crates/external/hyper-byoc`

The vendor crate exposes `hyper::laplace_patch::patterns()`. The detached audit crate reads those patterns without importing the full upstream source snapshot.

## 2. Inspect the Pattern Manifest

```bash
cd laplace-cloud
cargo test --manifest-path crates/external/hyper-byoc/Cargo.toml
```

The current detached crate is compile-safe. Full `#[axiom_harness]` execution requires the workspace sync noted in the BYOC README.

## 3. Select One Scenario

Use a scenario with an expected `BugFound` verdict for the first run:

```rust
#[derive(Debug, Clone, Eq, PartialEq)]
struct AuditSelection {
    crate_name: &'static str,
    pattern_name: &'static str,
    expected: &'static str,
}

fn first_hyper_selection() -> AuditSelection {
    AuditSelection {
        crate_name: "hyper",
        pattern_name: "hyper_pool_idle_reuse_abba",
        expected: "BugFound",
    }
}
```

## 4. Create the Verification Command

Use the manifest path as the stable input. Keep output deterministic by pinning seed and depth.

```bash
laplace axiom verify \
  --manifest-path crates/external/hyper-byoc/Cargo.toml \
  --pattern hyper_pool_idle_reuse_abba \
  --seed 0xA1100ACE \
  --max-depth 128
```

## 5. Record Evidence

Keep three artifacts with the audit branch:

- the command line
- the generated `.ard` replay
- the vendor path and exact pattern name

Do not edit upstream crate code during the first pass. Treat `vendor/hyper-1.5.0-patched/src/lib.rs` as the local citation source until the full upstream snapshot is synced.

