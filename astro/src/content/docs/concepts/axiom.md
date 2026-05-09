---
title: "Axiom — Ki-DPOR Verification"
description: "How Laplace's Ki-DPOR engine exhaustively proves concurrency correctness."
section: "concepts"
order: 1
---

# Axiom — Ki-DPOR Verification

Axiom is Laplace's formal verification engine. It uses **Ki-DPOR** (Knowledge-Informed Dynamic
Partial Order Reduction) to exhaustively explore all thread interleavings of your concurrent code
and prove the absence of concurrency bugs.

## How It Works

Traditional testing runs your code a few times and hopes to catch race conditions. Axiom is different:
it **explores every possible execution order** up to a configurable depth.

```
Thread A                Thread B
────────────────────────────────
lock(mutex)             .
.                       lock(mutex)  ← DEADLOCK detected
release(mutex)          .
```

Ki-DPOR uses A* heuristics to prioritize dangerous interleavings, finding bugs faster than
exhaustive breadth-first search.

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
