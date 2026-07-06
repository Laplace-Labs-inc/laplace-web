---
title: "CI Integration"
description: "Run bounded Laplace verification in pull requests and archive replay artifacts."
section: tutorials
category: "LQ-3"
order: 105
last_updated: "2026-07-06"
---
CI should run the bounded capture gate on pull requests. Deeper contract sweeps belong in scheduled jobs.

`laplace axiom verify` is entitlement-gated in CI too: create a service-account key once
(`laplace service-accounts keys create <sa> --ttl 30d`) and store it as a repository secret.

## 1. Add a Pull Request Job

```yaml
name: laplace-verify

on:
  pull_request:
  workflow_dispatch:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - name: Install Laplace
        run: |
          curl -fsSL https://install.laplace-labs.com | sh
      - name: Authenticate
        run: |
          laplace login --service-account-key "${{ secrets.LAPLACE_SA_KEY }}"
      - name: Run the verification gate
        run: |
          laplace axiom verify --capture --capture-args="--features laplace-gate" --budget smoke
      - name: Archive replays
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: laplace-ard
          path: target/laplace/*.ard
          if-no-files-found: ignore
```

## 2. Separate Required and Informational Checks

Use a fast required job with the shallow `smoke` budget for pull requests — a smoke green is
never reported as a full green. Run the full-budget capture and contract jobs on a schedule.

```bash
laplace axiom verify --capture --capture-args="--features laplace-gate" --budget smoke
laplace axiom verify --capture --capture-args="--features laplace-gate" --budget full
laplace axiom verify --contract tokio-mutex-across-await --budget full
```

## 3. Fail on Regressions

Treat `BugFound` as a failing PR status unless the pull request is adding a known failing repro.

```rust
#[derive(Debug, Clone, Copy, Eq, PartialEq)]
enum Verdict {
    Verified,
    BugFound,
}

fn should_fail_ci(verdict: Verdict, expected_repro: bool) -> bool {
    matches!(verdict, Verdict::BugFound) && !expected_repro
}
```
