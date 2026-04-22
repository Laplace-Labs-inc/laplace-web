---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "Laplace Labs"
  text: "Eradicate Heisenbugs."
  tagline: "The industry's first commercial suite engineered to hunt and destroy elusive concurrency failures."
  actions:
    - theme: brand
      text: Quickstart
      link: /tutorials/quickstart
    - theme: alt
      text: Architecture of Solutions
      link: /concepts/architecture

features:
  - title: Axiom
    details: Heisenbug Hunter. Axiom is a perfectly deterministic scheduling and verification engine that processes tens of thousands of parallel tasks collision-free. It completely eliminates chance through 1us ultra-low latency loop and mathematical verification based on the DPOR algorithm.
  - title: Kraken
    details: Chaos Orchestrator. Kraken is a load simulation and network engine that simulates a load of up to production-server in a single instance and demonstrates the fault tolerance of a system by intentionally injecting severe network faults (latency, packet loss).
  - title: Probe
    details: Zero-Overhead Telemetry. Probe is an observability engine that collects and propagates hundreds of thousands of real-time metrics per second losslessly without performance degradation, by drastically controlling system overhead based on a Zero-Copy architecture, Layer-3 LZ4 compression, and QUIC communication.
---