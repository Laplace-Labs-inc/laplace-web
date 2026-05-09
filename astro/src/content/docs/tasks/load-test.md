---
title: "Run a Load Test"
description: "Use Kraken to run a deterministic load test against your API."
section: "tasks"
order: 2
---

# Run a Load Test

## 1. Write a Scenario

Create `scenarios/my-load.yaml`:

```yaml
name: credits-meter-load
vus: 100
steps:
  - think: { min: 200, max: 500 }
  - request:
      method: POST
      path: /credits/meter
      headers:
        Authorization: "Bearer {{ jwt }}"
      body:
        module: axiom
        amount: 1
  - loop: 10
  - finish:
```

## 2. Run

```bash
laplace kraken run scenarios/my-load.yaml --data "jwt=$(cat ~/.laplace/jwt)"
```

## 3. Read the Report

```
Kraken Load Test — credits-meter-load
VUs: 100 | Duration: 12.4s

total=1000 ok=1000 failed=0
p50=48ms p90=112ms p99=234ms
```
