---
title: "Probe — Observation Mesh"
description: "Zero-overhead production monitoring via QUIC-based observation mesh."
section: "concepts"
order: 3
---

# Probe — Observation Mesh

Probe provides **zero-overhead production monitoring** by routing telemetry events through a
QUIC-based mesh network with 0-RTT session resumption.

## Architecture

```
Your Service
  └── TrackedMutex (SDK)
       └── ProbeEvent
            └── WebSocket → probe-edge (:8443) → laplace-api
```

## SDK Integration

```rust
use laplace_sdk::TrackedMutex;

struct AccountService {
    balance: TrackedMutex<i64>,  // auto-emits ProbeEvents on lock/unlock
}
```

Every lock/unlock operation emits a `RawProbeEvent` (128-byte fixed structure) with nanosecond
timestamps, thread IDs, and resource addresses.

## Probe Agent

Start the cloud observation agent:

```bash
laplace probe agent start --edge-url wss://edge.laplace-labs.com:8443
```
