export interface NavItem {
  title: string;
  slug: string;
}

export interface NavSection {
  section: string;
  icon: string;
  items: NavItem[];
}

export const docsNav: NavSection[] = [
  {
    section: "Getting Started",
    icon: "🚀",
    items: [
      { title: "Quickstart", slug: "getting-started" },
      { title: "One-Line Integration", slug: "getting-started/one-line" },
      { title: "Installation", slug: "getting-started/installation" },
    ],
  },
  {
    section: "Concepts",
    icon: "💡",
    items: [
      { title: "Sovereign Architecture", slug: "concepts/architecture" },
      { title: "Axiom — DPOR+POR Verification", slug: "concepts/axiom" },
      { title: "Kraken — Load Engine", slug: "concepts/kraken" },
      { title: "Probe — Observation Mesh", slug: "concepts/probe" },
      { title: "Tiers & Pricing", slug: "concepts/tiers" },
      { title: "TrackedMutex Internals", slug: "en/concepts/trackedmutex-internals" },
      { title: "Sovereign Pool Sharding", slug: "en/concepts/sovereign-pool-sharding" },
    ],
  },
  {
    section: "Tutorials",
    icon: "📘",
    items: [
      { title: "빠른 시작 (Quickstart)", slug: "tutorials/quickstart" },
      { title: "Quickstart in 30 Minutes", slug: "en/tutorials/quickstart-30min" },
      { title: "BYOC First Verify", slug: "en/tutorials/byoc-first-verify" },
      { title: "ABBA Debugging", slug: "en/tutorials/abba-debugging" },
      { title: "Probe Integration", slug: "en/tutorials/probe-integration" },
      { title: "CI Integration", slug: "en/tutorials/ci-integration" },
    ],
  },
  {
    section: "How-to Guides",
    icon: "How-to",
    items: [
      { title: "Migrate hyper", slug: "en/how-to/migrate-hyper" },
      { title: "Migrate tower", slug: "en/how-to/migrate-tower" },
      { title: "Migrate axum", slug: "en/how-to/migrate-axum" },
      { title: "Migrate sqlx", slug: "en/how-to/migrate-sqlx" },
      { title: "Migrate sled", slug: "en/how-to/migrate-sled" },
      { title: "cargo-laplace Usage", slug: "en/how-to/cargo-laplace-usage" },
    ],
  },
  {
    section: "Tasks",
    icon: "🔧",
    items: [
      { title: "Verify Concurrent Code", slug: "tasks/verify" },
      { title: "Run a Load Test", slug: "tasks/load-test" },
      { title: "Inspect Probe Events", slug: "tasks/probe-events" },
    ],
  },
  {
    section: "Reference",
    icon: "📚",
    items: [
      { title: "CLI Reference", slug: "reference/cli" },
      { title: "API Reference", slug: "reference/api" },
      { title: "CLI Options", slug: "en/reference/cli-options" },
      { title: "ARD File Format", slug: "en/reference/ard-file-format" },
      { title: "FFI ABI v1.1.0", slug: "en/reference/ffi-abi-v1-1-0" },
      { title: "Ghost Constraints", slug: "en/reference/ghost-constraints-index" },
    ],
  },
];

/** docsNav를 1차원 배열로 flatten */
export const allDocItems: NavItem[] = docsNav.flatMap((s) => s.items);
