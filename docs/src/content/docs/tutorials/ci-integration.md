---
title: "CI Integration"
description: "Run bounded Laplace verification in pull requests and archive replay artifacts."
section: tutorials
category: "LQ-3"
order: 105
last_updated: "2026-05-30"
---

# CI Integration

CI should run bounded verification on the smallest useful harness set. Expensive internal sweeps belong in scheduled jobs.

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
      - name: Verify changed harnesses
        run: |
          laplace axiom verify --harness changed --max-depth 128
      - name: Archive replays
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: laplace-ard
          path: target/laplace/*.ard
          if-no-files-found: ignore
```

## 2. Separate Required and Informational Checks

Use a fast required job for harnesses directly touched by the pull request. Run deeper contract or capture jobs on a schedule.

```bash
laplace axiom verify --harness changed --max-depth 128
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
