---
title: "Ghost Constraints Index"
description: "Index of Step 3 and repository ghost constraints cited by LQ-3."
section: reference
category: "LQ-3"
order: 304
last_updated: "2026-05-30"
---

# Ghost Constraints Index

This index derives from `laplace-cloud/task/coder_task.md` and the files under `laplace-cloud/tests/ghost_constraints/`.

## Step 3 LQ-3 Constraints

| ID | Constraint | Source |
|---|---|---|
| `GC-LQ3-1` | Lighthouse Performance, Accessibility, SEO, and Best Practices scores must be at least 90. | `task/coder_task.md` section 4.3 |
| `GC-LQ3-2` | Mobile viewport 375x667 must render without broken layout. | `task/coder_task.md` section 4.3 |
| `GC-LQ3-3` | Code examples must be compile-safe or clearly marked as operational snippets. | `task/coder_task.md` section 4.3 |
| `GC-LQ-X5` | English, Korean, Japanese, and Simplified Chinese skeletons must exist before localization content ships. | `task/coder_task.md` section 4.3 |

## Multi-Agent Constraints

| ID | Constraint | Source |
|---|---|---|
| `GC-MA-1` | Agents stay inside their branch prefix and single-owner directories. | `task/coder_task.md` section 5.1 |
| `GC-MA-6` | Shared config changes go through sync PRs only. | `task/coder_task.md` section 5.1 |
| `GC-MA-7` | Secrets must not be exposed in stdout or PR bodies. | `task/coder_task.md` section 5.1 |
| `GC-MA-8` | Force push is blocked except before opening a PR on a new branch. | `task/coder_task.md` section 5.1 |
| `GC-MA-10` | Main branch changes must merge through PRs. | `task/coder_task.md` section 5.1 |
| `GC-MA-14` | Sub-agent worktrees are isolated under `.worktrees/step3`. | `task/coder_task.md` section 5.1 |
| `GC-MA-16` | Lead meta PRs merge after all sub PRs in the documented order. | `task/coder_task.md` section 5.1 |

## Repository Tests

| Test file | Constraint |
|---|---|
| `gc_l1_no_apply.rs` | Terraform apply calls are blocked before M0. |
| `gc_l2_vendoring.rs` | Existing BYOC audit crates and L2 crates remain vendored. |
| `gc_l3_wfg_compat.rs` | WFG to RAG migration retains backward-compatible public WFG API. |
| `gc_h1_skip_verify.rs` | Release and verification paths must not create undocumented skip-verify behavior. |
| `gc_h2_msrv_docsrs.rs` | MSRV and docs.rs metadata remain explicit. |
| `gc_h3_padding_assert.rs` | Layout-sensitive padding assertions remain present. |
| `gc_h4_token_redacted.rs` | Tokens remain redacted in release and diagnostic outputs. |

## Step 1 Constraints Referenced by Docs

| ID | Constraint |
|---|---|
| `GC-ST1-A1` | Dry-run release workflow must keep `dry_run=true`. |
| `GC-ST1-B1` | Changelog edits are append-only. |
| `GC-ST1-B2` | Workspace version must not receive an RC suffix. |
| `GC-ST1-C2` | Release tags must not be force-pushed. |
| `GC-ST1-D1` | Verification reports must stay factual. |

