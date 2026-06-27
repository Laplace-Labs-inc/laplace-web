import { PageHeader, Panel, Stat, NotWired } from "../components/ui";
import { BugMetricsPanel } from "../components/BugMetricsView";
import { useBugMetrics } from "../lib/use-bug-metrics";

export function OverviewPage() {
  const bugs = useBugMetrics();
  const patterns = bugs.kind === "ok" ? bugs.data.total_patterns.toLocaleString() : "—";
  const reports = bugs.kind === "ok" ? bugs.data.reports_30d.toLocaleString() : "—";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        subtitle="Cross-tenant operational health for the Laplace control plane."
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Organizations" value="—" hint="all tenants" />
        <Stat label="Active users (24h)" value="—" />
        <Stat label="Bug patterns" value={patterns} hint="audit corpus" />
        <Stat label="Bug reports (30d)" value={reports} />
      </section>

      <Panel title="Bug DB">
        <BugMetricsPanel state={bugs} />
      </Panel>

      <Panel title="Control plane">
        <NotWired what="Aggregate API / database / probe-ingest health across the fleet." />
      </Panel>
    </div>
  );
}
