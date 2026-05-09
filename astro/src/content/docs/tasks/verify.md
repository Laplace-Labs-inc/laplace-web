---
title: "Verify Concurrent Code"
description: "Step-by-step guide to verifying a Rust concurrent data structure with Axiom."
section: "tasks"
order: 1
---

# Verify Concurrent Code

This task walks through verifying a concurrent Rust service end-to-end.

## 1. Instrument Your Struct

Replace standard sync primitives with `Tracked*` variants:

```rust
use laplace_sdk::prelude::*;

#[laplace_tracked]
pub struct BillingService {
    #[track]
    credits: tokio::sync::Mutex<i64>,
    #[track]
    ledger: std::sync::Mutex<Vec<Entry>>,
}
```

## 2. Write a Verification Test

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use laplace_sdk::prelude::*;

    #[laplace_sdk::verify(threads = 2)]
    async fn test_concurrent_deduct(svc: &BillingService) {
        let mut credits = svc.credits.lock().await;
        if *credits >= 10 {
            *credits -= 10;
            svc.ledger.lock().unwrap().push(Entry::deduct(10));
        }
    }
}
```

## 3. Run

```bash
cargo test test_concurrent_deduct
```

## 4. Interpret Results

**CLEAN**: No violation found.

```
✅ Axiom: CLEAN — 2 threads, 2 resources, 48 events
```

**BUG FOUND**: Deadlock or starvation detected.

```
✗ BUG FOUND: Deadlock { cycle: [ThreadId(0), ThreadId(1)] }
ARD: bug_report_1716000000.ard
Replay: laplace axiom forensic replay --ard bug_report_1716000000.ard
```

## 5. Replay the Bug

```bash
laplace axiom forensic replay --ard bug_report_1716000000.ard
```

This shows the exact thread interleaving that caused the bug.
