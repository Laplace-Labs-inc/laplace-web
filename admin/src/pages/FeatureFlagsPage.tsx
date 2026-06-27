import { PageHeader, Panel } from "../components/ui";
import { getFlags } from "../lib/api";
import { useAdminData } from "../lib/use-admin-data";

const STATE_STYLE: Record<string, string> = {
  on: "border-success/40 bg-success/10 text-success",
  beta: "border-accent/40 bg-accent/10 text-accent",
  internal: "border-warning/40 bg-warning/10 text-warning",
  off: "border-border bg-bg text-faint",
};

export function FeatureFlagsPage() {
  const flags = useAdminData(getFlags);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feature Flags & System"
        subtitle="Fleet-wide rollout state for gated features."
      />

      <Panel title="Feature flags">
        {flags.kind === "loading" ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : flags.kind === "error" ? (
          <div className="text-sm">
            <p className="text-warning">Could not load feature flags.</p>
            <p className="mt-1 text-faint">{flags.message}</p>
          </div>
        ) : flags.data.flags.length === 0 ? (
          <p className="text-faint text-sm">No feature flags configured.</p>
        ) : (
          <ul className="divide-y divide-border">
            {flags.data.flags.map((f) => (
              <li key={f.key} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm text-fg">{f.key}</p>
                  <p className="truncate text-xs text-muted">{f.description}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                    STATE_STYLE[f.state] ?? STATE_STYLE.off
                  }`}
                >
                  {f.state}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
