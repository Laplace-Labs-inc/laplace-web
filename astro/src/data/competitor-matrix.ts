import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export type ToolId = "laplace" | "loom" | "shuttle" | "stateright" | "madsim";
export type CompetitorId = Exclude<ToolId, "laplace">;

type MetricSet = {
  wall_clock_ms: { median: number; p99: number; unit: string };
  peak_rss_mb: { peak: number; unit: string };
};

export type ScenarioResult = {
  id: string;
  name: string;
  description: string;
  metrics: MetricSet;
  verdict: string;
};

export type BenchmarkResult = {
  schema_version: string;
  sample_kind: string;
  measurement_scope: string;
  generated_at: string;
  hardware: {
    runner: string;
    cpu: string;
    memory: string;
  };
  tool: {
    name: ToolId;
    version: string;
    category: string;
    runner: string;
  };
  scenarios: ScenarioResult[];
};

export type MatrixDimension =
  | "algorithm"
  | "determinism"
  | "externalLibrarySupport"
  | "stateSpaceEfficiency"
  | "memoryEfficiency"
  | "macroIntegration"
  | "forensicOutput"
  | "ideIntegration"
  | "communitySize"
  | "license";

export type ComparisonCell = {
  label: string;
  detail: string;
  source: "lq9-json" | "product-positioning" | "verify-before-publish";
};

export type ComparisonDimension = {
  id: MatrixDimension;
  label: string;
  cells: Record<ToolId, ComparisonCell>;
};

export type CompetitorProfile = {
  id: CompetitorId;
  name: string;
  titleName: string;
  betterChoice: string[];
  laplaceChoice: string[];
  migrationExamples: string[];
  faq: Array<{ question: string; answer: string }>;
};

const benchmarkDate = "2026-05-28";
const toolOrder: ToolId[] = ["laplace", "loom", "shuttle", "stateright", "madsim"];
const competitorOrder: CompetitorId[] = ["loom", "shuttle", "stateright", "madsim"];

const cloudFixtureDir = resolve(process.cwd(), "../../laplace-cloud/benchmarks/lq9", benchmarkDate);
const webFixtureDir = resolve(process.cwd(), "src/data/lq9-benchmarks", benchmarkDate);

function readBenchmark(tool: ToolId): BenchmarkResult {
  const filename = `${tool}.json`;

  try {
    return JSON.parse(readFileSync(resolve(cloudFixtureDir, filename), "utf8")) as BenchmarkResult;
  } catch {
    return JSON.parse(readFileSync(resolve(webFixtureDir, filename), "utf8")) as BenchmarkResult;
  }
}

export const benchmarkResults = Object.fromEntries(
  toolOrder.map((tool) => [tool, readBenchmark(tool)]),
) as Record<ToolId, BenchmarkResult>;

const latestVersionStatus: Record<ToolId, string> = {
  laplace: "project release tag",
  loom: "fixture version from LQ-9 JSON; verify latest before publish",
  shuttle: "fixture version from LQ-9 JSON; verify latest before publish",
  stateright: "fixture version from LQ-9 JSON; verify latest before publish",
  madsim: "fixture version from LQ-9 JSON; verify latest before publish",
};

const staticCells: Record<
  Exclude<MatrixDimension, "stateSpaceEfficiency" | "memoryEfficiency">,
  Record<ToolId, ComparisonCell>
> = {
  algorithm: {
    laplace: cell("POR + Axiom/Kraken/Probe", "Partial-order reduction over instrumented Rust harnesses.", "product-positioning"),
    loom: cell("DPOR permutation testing", benchmarkResults.loom.tool.category, "lq9-json"),
    shuttle: cell("Randomized + PCT scheduling", benchmarkResults.shuttle.tool.category, "lq9-json"),
    stateright: cell("Model checking", benchmarkResults.stateright.tool.category, "lq9-json"),
    madsim: cell("Deterministic simulation", benchmarkResults.madsim.tool.category, "lq9-json"),
  },
  determinism: {
    laplace: cell("Deterministic", "Stable harness replay and forensic artifacts."),
    loom: cell("Deterministic", "Exhaustive model schedules for supported primitives."),
    shuttle: cell("Hybrid", "Random and PCT strategies can reproduce persisted failing schedules."),
    stateright: cell("Deterministic", "Explicit state-space exploration."),
    madsim: cell("Deterministic", "Simulation runtime controls distributed time and events."),
  },
  externalLibrarySupport: {
    laplace: cell("BYOC possible", "Designed for patched third-party crates and local harnesses."),
    loom: cell("Requires loom primitives", "Best when dependencies can be adapted to loom types."),
    shuttle: cell("Harness-oriented", "Best around code shaped for Shuttle scheduler APIs."),
    stateright: cell("Model-first", "Best when behavior can be represented as a model."),
    madsim: cell("Simulation runtime", "Best for services that can run inside the simulation stack."),
  },
  macroIntegration: {
    laplace: cell("#[axiom_harness]", "Harness macro plus tracked synchronization wrappers."),
    loom: cell("loom::model", "Test closure wraps loom-aware code."),
    shuttle: cell("shuttle::check_*", "Scheduler entry point wraps the test body."),
    stateright: cell("Model trait", "Implement model transitions and properties."),
    madsim: cell("madsim runtime", "Runtime wrapper around async/distributed tasks."),
  },
  forensicOutput: {
    laplace: cell(".ard + Probe", "Replayable forensic artifact and edge probe data."),
    loom: cell("Trace / panic", "Failure comes from the explored schedule and panic output."),
    shuttle: cell("Persisted schedule", "Can persist and replay failing randomized schedules."),
    stateright: cell("Counterexample", "Model checker can expose a counterexample path."),
    madsim: cell("Simulation trace", "Distributed simulation events can be logged by the harness."),
  },
  ideIntegration: {
    laplace: cell("VS Code / IntelliJ planned", "Publish verification required before claiming shipped plugins.", "verify-before-publish"),
    loom: cell("Cargo-native", "Runs as Rust tests; no dedicated IDE plugin claimed here.", "verify-before-publish"),
    shuttle: cell("Cargo-native", "Runs as Rust tests; no dedicated IDE plugin claimed here.", "verify-before-publish"),
    stateright: cell("Cargo-native", "Runs as Rust examples/tests; no dedicated IDE plugin claimed here.", "verify-before-publish"),
    madsim: cell("Cargo-native", "Runs as Rust tests; no dedicated IDE plugin claimed here.", "verify-before-publish"),
  },
  communitySize: {
    laplace: cell("Pre-release", "Community numbers require publish verification.", "verify-before-publish"),
    loom: cell("verify-before-publish", "GitHub stars and Discord/member counts were not verified in this worker.", "verify-before-publish"),
    shuttle: cell("verify-before-publish", "GitHub stars and Discord/member counts were not verified in this worker.", "verify-before-publish"),
    stateright: cell("verify-before-publish", "GitHub stars and Discord/member counts were not verified in this worker.", "verify-before-publish"),
    madsim: cell("verify-before-publish", "GitHub stars and Discord/member counts were not verified in this worker.", "verify-before-publish"),
  },
  license: {
    laplace: cell("Apache-2.0", "Workspace package license."),
    loom: cell("verify-before-publish", "Crates.io API returned no crate license field in this worker.", "verify-before-publish"),
    shuttle: cell("verify-before-publish", "Crates.io API returned no crate license field in this worker.", "verify-before-publish"),
    stateright: cell("verify-before-publish", "Crates.io API returned no crate license field in this worker.", "verify-before-publish"),
    madsim: cell("verify-before-publish", "Crates.io API returned no crate license field in this worker.", "verify-before-publish"),
  },
};

export const comparisonDimensions: ComparisonDimension[] = [
  { id: "algorithm", label: "Algorithm", cells: staticCells.algorithm },
  { id: "determinism", label: "Determinism", cells: staticCells.determinism },
  { id: "externalLibrarySupport", label: "External library support", cells: staticCells.externalLibrarySupport },
  { id: "stateSpaceEfficiency", label: "State-space exploration efficiency", cells: metricCells("time") },
  { id: "memoryEfficiency", label: "Memory efficiency", cells: metricCells("memory") },
  { id: "macroIntegration", label: "Macro integration depth", cells: staticCells.macroIntegration },
  { id: "forensicOutput", label: "Forensic output", cells: staticCells.forensicOutput },
  { id: "ideIntegration", label: "IDE integration", cells: staticCells.ideIntegration },
  { id: "communitySize", label: "Community size", cells: staticCells.communitySize },
  { id: "license", label: "License", cells: staticCells.license },
];

export const competitorProfiles: Record<CompetitorId, CompetitorProfile> = {
  loom: {
    id: "loom",
    name: "loom",
    titleName: "Loom",
    betterChoice: [
      "Choose Loom when your concurrency surface already uses loom-aware atomics, Arc, Mutex, Condvar, or thread APIs.",
      "Choose Loom for small library-level tests where exhaustive schedule exploration is more important than production dependency coverage.",
      "Choose Loom when your team wants a mature, cargo-native testing workflow with minimal new operational surface.",
    ],
    laplaceChoice: [
      "Choose Laplace when the target is code that cannot be fully rewritten around loom primitives.",
      "Choose Laplace when the review artifact needs replayable .ard output and Probe context for a postmortem.",
      "Choose Laplace when the same page must compare BYOC dependency patches and LQ-9 fixture results.",
    ],
    migrationExamples: ["loom::sync::Mutex", "loom::sync::Arc", "loom::thread::spawn", "loom::model", "loom atomics"],
    faq: commonFaq("Loom"),
  },
  shuttle: {
    id: "shuttle",
    name: "shuttle",
    titleName: "Shuttle",
    betterChoice: [
      "Choose Shuttle when probabilistic or PCT scheduling is enough and the fastest path is to wrap existing tests.",
      "Choose Shuttle when persisted randomized schedules match your team's debugging workflow.",
      "Choose Shuttle when you want to keep the model close to a standard test body instead of building an explicit model.",
    ],
    laplaceChoice: [
      "Choose Laplace when deterministic replay and forensic output are release gates.",
      "Choose Laplace when patched external crates are part of the behavior under test.",
      "Choose Laplace when LQ-9 fixture comparisons need a deterministic baseline across the same scenarios.",
    ],
    migrationExamples: ["shuttle::sync::Mutex", "shuttle::sync::Arc", "shuttle::thread::spawn", "shuttle::check_pct", "schedule replay"],
    faq: commonFaq("Shuttle"),
  },
  stateright: {
    id: "stateright",
    name: "stateright",
    titleName: "Stateright",
    betterChoice: [
      "Choose Stateright when you can state the system as transitions, invariants, and model properties.",
      "Choose Stateright for distributed protocols where an explicit model is clearer than instrumenting implementation code.",
      "Choose Stateright when the desired output is a model-checker counterexample rather than a production-code replay artifact.",
    ],
    laplaceChoice: [
      "Choose Laplace when the code under review is the Rust implementation itself, not a separate model.",
      "Choose Laplace when BYOC dependencies and synchronization wrappers need to stay close to production call sites.",
      "Choose Laplace when benchmarked migration examples should compile as ordinary Rust harness projects.",
    ],
    migrationExamples: ["Model trait", "transition actions", "properties", "counterexample path", "implementation harness"],
    faq: commonFaq("Stateright"),
  },
  madsim: {
    id: "madsim",
    name: "madsim",
    titleName: "madsim",
    betterChoice: [
      "Choose madsim when the target is a distributed async service that benefits from deterministic simulated time.",
      "Choose madsim when failure injection, network simulation, and runtime-controlled async execution matter most.",
      "Choose madsim when you are testing service behavior rather than local synchronization wrappers.",
    ],
    laplaceChoice: [
      "Choose Laplace when the target is local Rust concurrency with forensic replay requirements.",
      "Choose Laplace when the migration path should stay in standard Cargo projects with tracked primitives.",
      "Choose Laplace when the LQ-9 fixture table is the source of timing and memory claims.",
    ],
    migrationExamples: ["madsim runtime", "spawned tasks", "simulated channels", "time control", "service harness"],
    faq: commonFaq("madsim"),
  },
};

export { benchmarkDate, competitorOrder, latestVersionStatus, toolOrder };

export function formatMs(value: number): string {
  return `${value} ms`;
}

export function formatMiB(value: number): string {
  return `${value} MiB`;
}

export function metricRange(tool: ToolId, kind: "time" | "memory"): string {
  const values = benchmarkResults[tool].scenarios.map((scenario) =>
    kind === "time" ? scenario.metrics.wall_clock_ms.median : scenario.metrics.peak_rss_mb.peak,
  );
  const unit = kind === "time" ? "ms median" : "MiB peak RSS";
  return `${Math.min(...values)}-${Math.max(...values)} ${unit}`;
}

export function scenarioFor(tool: ToolId, scenarioId: string): ScenarioResult {
  const scenario = benchmarkResults[tool].scenarios.find((entry) => entry.id === scenarioId);
  if (!scenario) {
    throw new Error(`Missing scenario ${scenarioId} for ${tool}`);
  }
  return scenario;
}

export function comparisonJsonLd(pageUrl: string, comparedTools: ToolId[] = toolOrder): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ComparisonTable",
    name: "Laplace concurrency verification comparison",
    url: pageUrl,
    datePublished: benchmarkResults.laplace.generated_at,
    measurementTechnique: benchmarkResults.laplace.measurement_scope,
    about: comparedTools.map((tool) => ({
      "@type": "SoftwareApplication",
      name: benchmarkResults[tool].tool.name,
      softwareVersion: benchmarkResults[tool].tool.version,
      applicationCategory: benchmarkResults[tool].tool.category,
    })),
    variableMeasured: comparisonDimensions.map((dimension) => ({
      "@type": "PropertyValue",
      name: dimension.label,
      value: comparedTools.map((tool) => `${benchmarkResults[tool].tool.name}: ${dimension.cells[tool].label}`).join("; "),
    })),
  };
}

function cell(
  label: string,
  detail: string,
  source: ComparisonCell["source"] = "product-positioning",
): ComparisonCell {
  return { label, detail, source };
}

function metricCells(kind: "time" | "memory"): Record<ToolId, ComparisonCell> {
  return Object.fromEntries(
    toolOrder.map((tool) => [
      tool,
      cell(metricRange(tool, kind), `Derived from ${benchmarkDate} LQ-9 JSON scenarios.`, "lq9-json"),
    ]),
  ) as Record<ToolId, ComparisonCell>;
}

function commonFaq(tool: string): Array<{ question: string; answer: string }> {
  return [
    {
      question: `Is Laplace a drop-in replacement for ${tool}?`,
      answer: "No. The migration examples show mechanical patterns, but real projects need harness review and dependency decisions.",
    },
    {
      question: "Are the benchmark numbers production measurements?",
      answer: "No. The checked LQ-9 JSON marks them as deterministic fixtures for CI shape checks and static rendering.",
    },
    {
      question: "Can I keep existing tests?",
      answer: "Usually yes. Treat Laplace harnesses as additional verification targets while keeping existing unit and integration tests.",
    },
    {
      question: "What should I migrate first?",
      answer: "Start with one small race or deadlock regression that already has a known failure mode.",
    },
    {
      question: "Does Laplace require patched dependencies?",
      answer: "Only when the behavior under test crosses library boundaries that need tracking or replay support.",
    },
    {
      question: "When should I stay with the competitor?",
      answer: `${tool} remains the better choice when its native model is already a clean fit for the code and team workflow.`,
    },
    {
      question: "Do the examples compile?",
      answer: "The LQ-10 migration projects under tests/lq10/migration-examples are standalone Cargo projects and are built by CI.",
    },
    {
      question: "Are community and license claims final?",
      answer: "No. Unverified community or license fields are marked verify-before-publish.",
    },
    {
      question: "Can these pages cite the raw JSON directly?",
      answer: "Yes. Numeric timing and memory values are read from the committed LQ-9 JSON fixtures.",
    },
    {
      question: "What is the fastest validation path?",
      answer: "Run the Astro build and cargo build each migration example before publishing.",
    },
  ];
}
