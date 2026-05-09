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
      { title: "Axiom — Ki-DPOR Verification", slug: "concepts/axiom" },
      { title: "Kraken — Load Engine", slug: "concepts/kraken" },
      { title: "Probe — Observation Mesh", slug: "concepts/probe" },
      { title: "Tiers & Pricing", slug: "concepts/tiers" },
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
    ],
  },
];

/** docsNav를 1차원 배열로 flatten */
export const allDocItems: NavItem[] = docsNav.flatMap((s) => s.items);
