import { useEffect, useState } from "react";
import { Activity, CheckCircle2, XCircle } from "lucide-react";
import { API_BASE, ApiError, getMetrics } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useConsoleScope } from "../../lib/console-scope";

type Load<T> =
  | { kind: "loading" }
  | { kind: "ok"; data: T }
  | { kind: "error"; message: string };

export function StatusPage() {
  const { session, logout } = useAuth();
  const { selectedOrg, selectedProject } = useConsoleScope();
  const [health, setHealth] = useState<Load<unknown>>({ kind: "loading" });
  const [metrics, setMetrics] = useState<Load<unknown>>({ kind: "loading" });

  const token = session?.session_token;
  const hasScope = !!(selectedOrg && selectedProject);

  // Health: fetch once; setState only in async callbacks.
  useEffect(() => {
    if (!API_BASE) return;
    let alive = true;
    fetch(`${API_BASE}/health`)
      .then((r) => r.json())
      .then((d) => alive && setHealth({ kind: "ok", data: d }))
      .catch(
        (e) => alive && setHealth({ kind: "error", message: e instanceof Error ? e.message : "failed" }),
      );
    return () => {
      alive = false;
    };
  }, []);

  // Metrics: refetch when scope changes; setState only in async callbacks.
  useEffect(() => {
    if (!token || !selectedOrg || !selectedProject) return;
    let alive = true;
    getMetrics<unknown>(token, selectedOrg.id, selectedProject.id)
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

      <section className="rounded-2xl border border-border bg-surface p-6">
        <h3 className="text-lg font-semibold mb-3">Control plane</h3>
        {!API_BASE ? (
          <p className="text-warning text-sm">API base URL not configured.</p>
        ) : health.kind === "ok" ? (
          <p className="flex items-center gap-2 text-success text-sm">
            <CheckCircle2 className="w-4 h-4" /> Connected — {JSON.stringify(health.data)}
          </p>
        ) : health.kind === "error" ? (
          <p className="flex items-center gap-2 text-danger text-sm">
            <XCircle className="w-4 h-4" /> {health.message}
          </p>
        ) : (
          <p className="text-muted text-sm">Checking…</p>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-accent" /> Telemetry
        </h3>
        {!hasScope ? (
          <p className="text-muted text-sm">
            Select an organization and project to load probe telemetry.
          </p>
        ) : metrics.kind === "loading" ? (
          <p className="text-muted text-sm">Loading…</p>
        ) : metrics.kind === "error" ? (
          <div className="text-sm">
            <p className="text-warning">Could not load telemetry.</p>
            <p className="text-faint mt-1">{metrics.message}</p>
          </div>
        ) : (
          <pre className="text-xs text-muted overflow-auto max-h-80 bg-surface-2 rounded-lg p-4">
            {JSON.stringify(metrics.data, null, 2)}
          </pre>
        )}
      </section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs uppercase tracking-wide text-faint">{label}</p>
      <p className="mt-1 text-fg truncate">{value}</p>
    </div>
  );
}
