import { PageHeader, Panel } from "../components/ui";
import { BugMetricsPanel } from "../components/BugMetricsView";
import { useBugMetrics } from "../lib/use-bug-metrics";

export function BugDbPage() {
  const bugs = useBugMetrics();
  return (
    <div className="space-y-6">
      <PageHeader
        title="BugDB / Corpus"
        subtitle="Collected concurrency patterns across the audit corpus and customer reports."
      />
      <Panel title="Corpus">
        <BugMetricsPanel state={bugs} />
      </Panel>
    </div>
  );
}
