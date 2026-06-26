---
title: "Installation"
description: "Install the Laplace CLI and SDK on Linux, macOS, or WSL2."
section: "getting-started"
order: 3
---

# Installation

## CLI

The `laplace` CLI ships as a prebuilt binary. Pick the channel for your platform.

### Homebrew (macOS / Linux)

```bash
brew install laplace-labs-inc/homebrew-tap/laplace
laplace --version
```

### Scoop (Windows)

```powershell
scoop bucket add laplace https://github.com/Laplace-Labs-inc/scoop-bucket
scoop install laplace
laplace --version
```

### Pinned release asset

To pin an exact pre-release build, download the asset for your platform from GitHub Releases:

```bash
gh release download v0.1.0-alpha-1-rc.2 \
  --repo Laplace-Labs-inc/laplace-cloud \
  --pattern 'laplace-*-x86_64-unknown-linux-gnu.tar.gz'
```

> The engine and CLI are distributed as binaries; their source lives in the private
> `laplace-cloud` repository. The public [`laplace`](https://github.com/Laplace-Labs-inc/laplace)
> repository contains the Apache-2.0 SDK and interface crates only.

## SDK

Add to `Cargo.toml`:

```toml
[dev-dependencies]
laplace-sdk = "0.1.0-alpha-1"
```

The SDK is in **alpha**; the API may change before the `0.1.0` stable release.

## System Requirements

| Component | Requirement |
|-----------|-------------|
| Rust      | 1.88+ (stable) |
| OS        | Linux, macOS, WSL2 |
| RAM       | 512 MB minimum (1 GB+ for deep verification) |
