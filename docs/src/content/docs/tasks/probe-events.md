---
title: "Inspect Probe Events"
draft: true  # M1 scope: non-Axiom/CLI product hidden until post-launch
description: "Stream and analyze real-time probe events from your running service."
section: "tasks"
order: 3
---

# Inspect Probe Events

## Stream Live Events

```bash
laplace probe events --follow
```

Output:

```
[12:34:01.123] LOCK_ACQUIRE  tid=42  resource=0xdeadbeef  latency=1.2µs
[12:34:01.124] LOCK_RELEASE  tid=42  resource=0xdeadbeef
[12:34:01.130] LOCK_ACQUIRE  tid=43  resource=0xdeadbeef  contention=8.1µs
```

## Start Probe Agent

To forward events to the cloud:

```bash
laplace probe agent start --edge-url wss://edge.laplace-labs.com:8443
```
