---
title: "Kraken — Load Engine"
draft: true  # M1 scope: non-Axiom/CLI product hidden until post-launch
description: "Deterministic chaos and load simulation for your production services."
section: "concepts"
order: 2
---

# Kraken — Load Engine

Kraken is Laplace's deterministic load and chaos simulation engine. Unlike traditional load
testing tools that rely on random timing, Kraken uses **ChaCha8 RNG** with a fixed seed —
making every load test fully reproducible.

## Scenario DSL

Kraken scenarios are defined in YAML:

```yaml
name: billing-load
vus: 100
steps:
  - think: { min: 200, max: 500 }
  - request:
      method: POST
      path: /credits/meter
      body: { module: "axiom", amount: 1 }
  - loop: 10
  - finish:
```

Run it:

```bash
laplace kraken run scenarios/billing-load.yaml
```

## Key Properties

- **Deterministic**: same seed → same execution order → reproducible results
- **VU State Machine**: 6 states, 7 TLA+ transitions (prevents impossible state combinations)
- **DPOR Integration**: Kraken's RNG pool is compatible with Axiom's DPOR exploration
