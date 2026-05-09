---
title: "Installation"
description: "Install the Laplace CLI and SDK on Linux, macOS, or WSL2."
section: "getting-started"
order: 3
---

# Installation

## CLI

### From Source (Recommended)

```bash
git clone https://github.com/laplace-labs/laplace
cd laplace
cargo build --release -p laplace-cli
sudo cp target/release/laplace /usr/local/bin/laplace
laplace --version
```

## SDK

Add to `Cargo.toml`:

```toml
[dev-dependencies]
laplace-sdk = "0.8"
```

## System Requirements

| Component | Requirement |
|-----------|-------------|
| Rust      | 1.75+ (stable) |
| OS        | Linux, macOS, WSL2 |
| RAM       | 512 MB minimum (1 GB+ for deep verification) |
