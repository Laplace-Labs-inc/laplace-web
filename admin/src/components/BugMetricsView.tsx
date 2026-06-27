import type { BugMetrics } from "../lib/api";
import { Stat } from "./ui";

/** Shared Bug DB visualization (corpus stats + by-type bars + top crates). */
export function BugMetricsView({ data }: { data: BugMetrics }) {
  const max = Math.max(1, ...data.by_type.map((t) => t.count));
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Patterns (corpus)" value={data.total_patterns.toLocaleString()} />
        <Stat label="Reports (30d)" value={data.reports_30d.toLocaleString()} />
        <Stat label="Reports (total)" value={data.total_reports.toLocaleString()} />
      </div>

      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-faint">
          Patterns by type
        </p>
        {data.by_type.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-faint">
            No patterns in the corpus yet.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {data.by_type.map((t) => (
              <li key={t.bug_type}>
                <div className="mb-1 flex items-baseline justify-between text-sm">
                  <span className="text-muted">{t.bug_type}</span>
                  <span className="font-medium tabular-nums">{t.count.toLocaleString()}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-bg">
                  <div
                    className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
                    style={{ width: `${Math.max(2, Math.round((t.count / max) * 100))}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {data.top_crates.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-faint">
            Top crates
          </p>
          <div className="flex flex-wrap gap-2">
            {data.top_crates.map((c) => (
              <span
                key={c.crate_name}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg px-3 py-1 text-xs"
              >
                <span className="font-mono text-muted">{c.crate_name}</span>
                <span className="font-medium tabular-nums">{c.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Renders a Load<BugMetrics> with loading/error/empty handling. */
export function BugMetricsPanel({
  state,
}: {
  state: { kind: "loading" } | { kind: "ok"; data: BugMetrics } | { kind: "error"; message: string };
}) {
  if (state.kind === "loading") return <p className="text-sm text-muted">Loading…</p>;
  if (state.kind === "error")
    return (
      <div className="text-sm">
        <p className="text-warning">Could not load Bug DB metrics.</p>
        <p className="mt-1 text-faint">{state.message}</p>
      </div>
    );
  return <BugMetricsView data={state.data} />;
}
