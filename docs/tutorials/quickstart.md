# 🚀 빠른 시작 (Quickstart)

이 가이드는 단 **3분** 만에 Laplace의 3대 코어 엔진(Axiom, Kraken, Probe)을 로컬 환경에 부트스트랩하고, 제로 다운타임(Zero-Downtime) 핫리로딩을 경험하는 과정을 안내합니다.

## 1. 사전 준비 (Prerequisites)
Laplace 커널을 구동하기 위해서는 최신 버전의 Rust 툴체인이 필요합니다.
```bash
curl --proto '=https' --tlsv1.2 -sSf [https://sh.rustup.rs](https://sh.rustup.rs) | sh
````

## 2\. Laplace CLI 설치 및 초기화

Laplace의 통제 평면(Control Plane)인 CLI 도구를 설치합니다. (현재는 소스 빌드 방식을 제공합니다.)

```bash
# 저장소 클론 및 CLI 설치
git clone [https://github.com/Laplace-Labs-inc/laplace-dev.git](https://github.com/Laplace-Labs-inc/laplace-dev.git)
cd laplace-dev
cargo build --release -p laplace-cli
```

## 3\. `laplace.toml` 설정 파일 생성

Laplace는 쿠버네티스의 철학을 계승하여 단 하나의 선언적(Declarative) 파일로 시스템을 통제합니다. 프로젝트 루트에 `laplace.toml` 파일을 생성하고 아래 내용을 복사해 넣습니다.

```toml
# laplace.toml
[axiom]
max_threads = 8
max_depth = 20
default_seed = 0xA1100ACE5EED0001

[kraken]
max_response_bytes = 4096
network_base_latency_ms = 10
network_jitter_ms = 2
network_error_probability_ppm = 0

[probe]
batch_size = 64
flush_interval_ms = 100
bind_port = 9000
```

## 4\. 커널 부트스트랩 (Run)

이제 준비가 끝났습니다. 아래 명령어를 통해 Laplace 제국의 심장을 뛰게 하십시오.

```bash
laplace run --config laplace.toml
```

**✅ 예상 출력 결과:**

```text
╔══════════════════════════════════════════════════════╗
║        Laplace Framework Bootstrap                   ║
╠══════════════════════════════════════════════════════╣
║  Config file : laplace.toml                          ║
║  [axiom] max_threads          = 8                    ║
║  [kraken] network_latency_ms  = 10                   ║
║  [probe] bind_port            = 9000                 ║
╚══════════════════════════════════════════════════════╝
Laplace framework bootstrapped successfully.
Framework is running. Press Ctrl-C to stop.
```

*Axiom의 14ns 스케줄러, Kraken의 부하 엔진, Probe의 텔레메트리 메쉬가 완벽하게 정렬되어 구동을 시작했습니다.*

## 5\. 마법 경험하기: 무중단 핫리로딩 (Apply)

Laplace의 진가는 런타임에 드러납니다. **서버를 끄지 않은 상태에서** 다른 터미널 창을 열어 네트워크 지연(Latency)을 인위적으로 주입해 보겠습니다.

1.  `laplace.toml` 파일에서 `network_base_latency_ms`를 `10`에서 `500`으로 수정하고 저장합니다.
2.  새 터미널 창에서 아래의 Apply 명령어를 실행합니다.

<!-- end list -->

```bash
laplace apply -f laplace.toml
```

**✅ 즉각적인 RCU 기반 설정 교체:**

```text
Applying new config (RCU hot-reload):
 → IPC target  : /run/laplace/daemon.sock
 → kraken.network_base_latency_ms = 500
Config applied successfully. Zero downtime.
```

축하합니다\! 단 1밀리초의 시스템 중단(Downtime)도 없이, 실행 중인 10,000명의 AI 에이전트 네트워크 환경에 가혹한 500ms 지연을 주입하는 데 성공하셨습니다. 이것이 바로 **Sovereign Control**입니다.