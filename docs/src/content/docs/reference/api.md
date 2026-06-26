---
title: "API Reference"
description: "REST API reference for laplace-api — auth, credits, probe events, Bug DB."
section: "reference"
order: 2
---

# API Reference

Base URL: `https://api.laplace-labs.com`

All requests require `Authorization: Bearer <JWT>` unless noted.

## POST /auth/activate

Activate a license key and receive a JWT.

**Request**

```json
{
  "license_key": "LAPLACE-ABCD-1234-EFGH-5678",
  "data_consent": true
}
```

**Response**

```json
{
  "jwt": "eyJ...",
  "tier": "FREE",
  "credits": 150,
  "expires_at": 1756000000
}
```

## GET /credits/balance

Get current credit balance.

**Response**

```json
{ "balance": 9950, "tier": "PRO" }
```

## POST /credits/meter

Deduct credits for a module operation.

**Request**

```json
{ "module": "axiom", "amount": 1 }
```

**Response**

```json
{ "remaining": 9949 }
```

## POST /api/bugs/report

Report an anonymized bug pattern to the Bug DB.

> Requires `data_consent: true` in JWT claims. ENTERPRISE/TRINITY -> 403.

**Request**

```json
{
  "jwt": "eyJ...",
  "bug_type": "Deadlock",
  "violation_desc": "Deadlock { cycle: [ThreadId(0), ThreadId(1)] }",
  "thread_count": 2,
  "resource_count": 2,
  "lock_order_seq": "R0->R1,R1->R0",
  "exploration_depth": 183,
  "axiom_seed": 11605788121205899265,
  "target_id_hash": "sha256(crate_name)"
}
```

**Response**

```json
{
  "pattern_id": 1042,
  "is_duplicate": false,
  "occurrence_count": 1
}
```
