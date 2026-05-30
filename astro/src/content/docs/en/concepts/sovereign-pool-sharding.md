---
title: "Sovereign Pool Sharding"
description: "How pool sharding reduces shared-state pressure while preserving auditability."
section: concepts
category: "LQ-3"
order: 403
last_updated: "2026-05-30"
---

# Sovereign Pool Sharding

Sovereign pool sharding splits a shared pool into deterministic ownership lanes. Each lane has its own synchronization resources, and routing decides which lane handles a request.

## Goal

The goal is not only throughput. Sharding also reduces the number of schedules the verifier must consider because unrelated requests stop contending on the same lock.

## Basic Shape

```rust
#[derive(Debug)]
struct PoolShard {
    shard_id: usize,
    inflight: std::sync::Mutex<usize>,
}

fn shard_for_key(key: u64, shard_count: usize) -> usize {
    (key as usize) % shard_count
}
```

## Verification Impact

Stable sharding helps verification when:

- shard selection is deterministic
- cross-shard operations are rare and explicitly named
- shutdown drains shards in one canonical order

It hurts verification when request routing depends on wall-clock time or mutable global state. Keep the shard function pure and make cross-shard lock ordering explicit.

