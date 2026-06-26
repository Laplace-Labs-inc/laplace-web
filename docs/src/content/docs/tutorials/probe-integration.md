---
title: "Probe Integration"
description: "Emit minimal verification telemetry from a service without changing request behavior."
section: tutorials
category: "LQ-3"
order: 104
last_updated: "2026-05-30"
---

# Probe Integration

Probe should observe verification and replay events without becoming part of the critical path. Start with explicit event emission around verification boundaries.

## 1. Define Events

```rust
#[derive(Debug, Clone, Eq, PartialEq)]
struct ProbeEvent {
    name: &'static str,
    harness: String,
    verdict: String,
}

impl ProbeEvent {
    fn verification_finished(harness: impl Into<String>, verdict: impl Into<String>) -> Self {
        Self {
            name: "verification.finished",
            harness: harness.into(),
            verdict: verdict.into(),
        }
    }
}
```

## 2. Keep Emission Fallible

Telemetry failure must not hide a verification result.

```rust
fn emit_probe_event(event: &ProbeEvent) -> Result<(), std::io::Error> {
    let line = format!("{} {} {}\n", event.name, event.harness, event.verdict);
    std::fs::write("target/laplace/probe.log", line)
}

fn report_verdict(harness: &str, verdict: &str) {
    let event = ProbeEvent::verification_finished(harness, verdict);
    if let Err(error) = emit_probe_event(&event) {
        eprintln!("probe emit failed: {error}");
    }
}
```

## 3. Run Locally

```bash
mkdir -p target/laplace
laplace axiom verify --harness hyper_pool_idle_reuse_abba --max-depth 128
tail -n 20 target/laplace/probe.log
```

Use file output first. Move to an agent or collector only after event names and cardinality are stable.

