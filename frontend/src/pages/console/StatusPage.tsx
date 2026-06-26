import { useEffect, useState } from "react";
import { Activity, CheckCircle2, Database, Server, XCircle } from "lucide-react";
import { API_BASE, ApiError, getMetrics } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useConsoleScope } from "../../lib/console-scope";

type Load<T> =
  | { kind: "loading" }
  | { kind: "ok"; data: T }
  | { kind: "error"; message: string };

type Health = { status?: string; db?: string } & Record<string, unknown>;
type Metrics = {
  total_events_1h?: number;
  by_source?: { source?: string; count?: number }[];
  generated_at_unix?: number;
} & Record<string, unknown>;

export function StatusPage() {
  const { session, logout } = useAuth();
  const { selectedOrg, selectedProject } = useConsoleScope();
  const [health, setHealth] = useState<Load<Health>>({ kind: "loading" });
  const [metrics, setMetrics] = useState<Load<Metrics>>({ kind: "loading" });

  const token = session?.session_token;
  const hasScope = !!(selectedOrg && selectedProject);

  useEffect(() => {
    if (!API_BASE) return;
    let alive = true;
    fetch(`${API_BASE}/health`)
      .then((r) => r.json())
      .then((d) => alive && setHealth({ kind: "ok", data: d as Health }))
      .catch(
        (e) => alive && setHealth({ kind: "error", message: e instanceof Error ? e.message : "failed" }),
      );
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!token || !selectedOrg || !selectedProject) return;
    let alive = true;
    getMetrics<Metrics>(token, selectedOrg.id, selectedProject.id)
      .then((d) => alive && setMetrics({ kind: "ok", data: d }))
      .catch((e) => {
        if (!alive) return;
        if (e instanceof ApiError && e.status === 401) logout();
        setMetrics({ kind: "error", message: e instanceof Error ? e.message : "failed" });
      });
    return () => {
      alive = false;
    };
  }, [token, selectedOrg, selectedProject, logout]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Status</h1>
        <p className="mt-1 text-sm text-muted">
          Control-plane health and probe telemetry for the selected project.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card label="Signed in" value={session?.email ?? "—"} />
        <Card label="Organization" value={selectedOrg?.name ?? "— none —"} />
        <Card label="Project" value={selectedProject?.name ?? "— none —"} />
      </section>

      {/* Control plane */}
      <Panel title="Control plane">
        {!API_BASE ? (
          <p className="text-sm text-warning">API base URL not configured.</p>
        ) : health.kind === "loading" ? (
          <p className="text-sm text-muted">Checking…</p>
        ) : health.kind === "error" ? (
          <p className="flex items-center gap-2 text-sm text-danger">
            <XCircle className="h-4 w-4" /> {health.message}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <HealthRow
              icon={<Server className="h-4 w-4" />}
              label="API server"
              state={health.data.status}
            />
            <HealthRow
              icon={<Database className="h-4 w-4" />}
              label="Database"
              state={health.data.db}
            />
          </div>
        )}
      </Panel>

      {/* Telemetry */}
      <Panel
        title="Telemetry"
        icon={<Activity className="h-[18px] w-[18px] text-accent" />}
      >
        {!hasScope ? (
          <p className="text-sm text-muted">
            Select an organization and project to load probe telemetry.
          </p>
        ) : metrics.kind === "loading" ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : metrics.kind === "error" ? (
          <div className="text-sm">
            <p className="text-warning">Could not load telemetry.</p>
            <p className="mt-1 text-faint">{metrics.message}</p>
          </div>
        ) : (
          <Telemetry data={metrics.data} />
        )}
      </Panel>
    </div>
  );
}

function Telemetry({ data }: { data: Metrics }) {
  const total = data.total_events_1h ?? 0;
  const sources = data.by_source ?? [];
  const generated = data.generated_at_unix
    ? new Date(data.generated_at_unix * 1000).toLocaleString()
    : null;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Events (last 1h)" value={total.toLocaleString()} />
        <Stat label="Active sources" value={String(sources.length)} />
        <Stat label="Last updated" value={generated ?? "—"} small />
      </div>

      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-faint">
          Events by source
        </p>
        {sources.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-faint">
            No probe events in the last hour.
          </p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {sources.map((s, i) => (
              <li
                key={`${s.source ?? "src"}-${i}`}
                className="flex items-center justify-between px-4 py-2.5 text-sm"
              >
                <span className="font-mono text-muted">{s.source ?? "unknown"}</span>
                <span className="font-medium tabular-nums">
                  {(s.count ?? 0).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function HealthRow({
  icon,
  label,
  state,
}: {
  icon: React.ReactNode;
  label: string;
  state?: string;
}) {
  const ok = (state ?? "").toLowerCase() === "ok";
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-bg px-4 py-3">
      <span className="flex items-center gap-2 text-sm text-muted">
        {icon} {label}
      </span>
      <span
        className={`flex items-center gap-1.5 text-sm font-medium ${
          ok ? "text-success" : state ? "text-danger" : "text-faint"
        }`}
      >
        {ok ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : state ? (
          <XCircle className="h-4 w-4" />
        ) : null}
        {state ? (ok ? "Operational" : state) : "Unknown"}
      </span>
    </div>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-6">
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function Stat({
  label,
  value,
  small,
}: {
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-bg px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-faint">
        {label}
      </p>
      <p className={`mt-1 font-semibold ${small ? "text-sm" : "text-2xl"}`}>
        {value}
      </p>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-faint">
        {label}
      </p>
      <p className="mt-1 truncate font-medium" title={value}>
        {value}
      </p>
    </div>
  );
}
