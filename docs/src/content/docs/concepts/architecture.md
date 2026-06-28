---
title: "Sovereign Architecture"
description: "OS의 간섭을 배제하고 자원·스케줄링을 스스로 통제하는 주권적 커널 아키텍처."
section: concepts
order: 5
---

# 💡 Sovereign Architecture란?

**Laplace Framework**는 단순한 애플리케이션 프레임워크가 아닙니다. 초고성능 AI 에이전트 구동을 위해 OS의 간섭을 배제하고, 스스로 자원과 스케줄링을 통제하는 **'주권적 커널(Sovereign Kernel)'**입니다.

## 왜 Sovereign(주권적)인가?

기존의 런타임 환경은 운영체제(OS)나 언어의 가비지 컬렉터(GC)가 언제 스레드를 멈출지 예측할 수 없습니다. 이는 나노초(ns) 단위의 응답이 필요한 대규모 AI 에이전트 군집 환경에서는 치명적인 '지연 스파이크(Latency Spike)'를 유발합니다.

Laplace는 이러한 외부의 불확실성을 배제하고, 프레임워크 스스로가 실행에 대한 완벽한 통제권(Sovereignty)을 가집니다.

- **결정론적 실행 (Deterministic Execution):** 우연에 기대지 않고, 모든 실행 경로를 예측하고 통제합니다.
- **초저지연 (Ultra-Low Latency):** 프레임워크 오버헤드를 마이크로초(µs)를 넘어 나노초(ns) 단위로 압축했습니다.
- **FFI 무결성 보장:** Rust와 외부 언어(C/C++, V8) 경계에서 `#[repr(C, align(8))]` 기반의 엄격한 ABI 안정성을 수호합니다.

---

## 👑 The Holy Trinity (3대 핵심 모듈)

Laplace는 완벽하게 분리되고 또 유기적으로 결합된 3개의 코어 엔진으로 구동됩니다.

### 1. Axiom — 스케줄링 & 검증 엔진

- **역할:** 시스템의 심장. 동시성 제어와 작업 스케줄링을 담당합니다.
- **성능:** 의존성 주입(DI) 싱글톤 해결에 단 **14.0ns**가 소요되는 경이로운 속도를 자랑합니다.
- **특징:** DPOR(Dynamic Partial Order Reduction) 알고리즘을 통해 수만 개의 병렬 작업이 충돌 없이 실행됨을 수학적으로 검증합니다.

자세한 설명: [Axiom — DPOR Verification](/concepts/axiom/)

> **Post-launch 엔진.** Kraken(결정론적 부하/카오스)과 Probe(QUIC/eBPF 관측 메시)는
> M1 출시 범위에 포함되지 않으며 post-launch에 별도로 문서화됩니다. M1의 출시 표면은
> Axiom 검증 엔진과 `laplace` CLI입니다.

직접 체험: [빠른 시작 (Quickstart)](/getting-started/quickstart/)
