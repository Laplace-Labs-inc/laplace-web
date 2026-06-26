---
title: "Axiom — DPOR+POR Verification"
description: "How Laplace's DPOR+POR engine proves concurrency correctness within a bounded search."
section: "concepts"
order: 1
---

# Axiom — DPOR+POR Verification

Axiom is Laplace's formal verification engine. It uses **Classic DPOR+POR** (Dynamic Partial-Order
Reduction with sleep-set partial-order reduction) to systematically explore the *distinct* thread
interleavings of your concurrent code and prove the absence of concurrency bugs within a bounded search.

## How It Works

Traditional testing runs your code a few times and hopes to catch race conditions. Axiom is different:
it **explores every distinct execution order** up to a configurable depth.

```
Thread A                Thread B
────────────────────────────────
lock(mutex)             .
.                       lock(mutex)  ← DEADLOCK detected
release(mutex)          .
```

DPOR's sleep-set and persistent-set reduction prune interleavings that are equivalent under
independence, so Axiom covers the full space of *distinct* behaviors without re-exploring
redundant schedules.

## Verdicts

| Verdict | Meaning |
|---------|---------|
| `CLEAN` | No violations found in the explored state space |
| `BUG FOUND` | A violation was detected; an `.ard` forensic file is written |

## ARD Forensic Files

When a bug is found, Axiom writes an `.ard` (Axiom Report Dump) file containing the exact
thread schedule that triggered the bug. You can replay it:

```bash
laplace axiom forensic replay --ard bug_report_1234.ard
```

## Tier Limits

| Tier | Max Exploration Depth |
|------|-----------------------|
| FREE/PLUS | 500 states |
| PRO/ULTRA | 10,000 states |
| ENTERPRISE/TRINITY | Unlimited |
