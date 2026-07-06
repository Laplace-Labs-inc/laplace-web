---
title: "Installation"
description: "Install the Laplace CLI and SDK on Linux, macOS, or Windows."
section: "getting-started"
order: 3
---
## CLI

The `laplace` CLI ships as a prebuilt binary. Pick the channel for your platform.

### Install Script (macOS / Linux)

```bash
curl -fsSL https://install.laplace-labs.com | sh
laplace --version
```

### Windows PowerShell

```powershell
irm https://install.laplace-labs.com/install.ps1 | iex
laplace --version
```

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

To pin an exact build, download the latest public asset for your platform from GitHub Releases:

```bash
gh release download --repo Laplace-Labs-inc/laplace \
  --pattern 'laplace-cli-x86_64-unknown-linux-musl.tar.xz'
```

See `https://github.com/Laplace-Labs-inc/laplace/releases/latest` for current public assets.

## SDK

Add to `Cargo.toml`:

```toml
[dev-dependencies]
  # Until laplace-sdk is published to crates.io, use the public git dependency.
laplace-sdk = { git = "https://github.com/Laplace-Labs-inc/laplace" }
```

The SDK is in **alpha**; the API may change before the `0.1.0` stable release.

## System Requirements

| Component | Requirement |
|-----------|-------------|
| Rust      | 1.88+ (stable) |
| OS        | Linux, macOS, Windows native, WSL2 |
| RAM       | 512 MB minimum (1 GB+ for deep verification) |
