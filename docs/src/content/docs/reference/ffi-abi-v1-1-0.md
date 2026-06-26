---
title: "FFI ABI v1.1.0"
description: "Reference boundary for host integrations that pass verification events over FFI."
section: reference
category: "LQ-3"
order: 303
last_updated: "2026-05-30"
---

# FFI ABI v1.1.0

The FFI boundary should pass plain data and explicit lengths. Ownership must be visible at the function name or documented next to the type.

## Types

```rust
#[repr(C)]
pub struct LaplaceBytes {
    pub ptr: *const u8,
    pub len: usize,
}

#[repr(C)]
pub struct LaplaceEventV1_1_0 {
    pub kind: u32,
    pub payload: LaplaceBytes,
}
```

## Event Kinds

| Value | Meaning |
|---:|---|
| `1` | Verification started. |
| `2` | Verification finished. |
| `3` | Replay written. |
| `4` | Probe event emitted. |

## Safety Rules

- The caller owns `LaplaceBytes.ptr` unless the callee function name contains `take`.
- Payload bytes are UTF-8 JSON unless a function documents another encoding.
- Callers must not pass null pointers with nonzero lengths.
- Callees must validate lengths before reading.

## Example Validation

```rust
fn validate_bytes(bytes: LaplaceBytes) -> Result<(), &'static str> {
    if bytes.ptr.is_null() && bytes.len != 0 {
        return Err("null pointer with nonzero length");
    }
    Ok(())
}
```

