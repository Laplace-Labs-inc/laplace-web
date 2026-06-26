import { useEffect, useState } from "react";
import { Activity, LogOut, Terminal } from "lucide-react";
import { useAuth } from "../lib/auth";
import { API_BASE, ApiError, authedGet } from "../lib/api";

type LoadState<T> =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; data: T }
  | { kind: "error"; message: string };

export const ConsolePage = () => {
  const { session, logout } = useAuth();
  const configured = !!API_BASE;
  // Start in "loading" when we will actually fetch; setState happens only in the
  // async callbacks below (never synchronously in the effect body).
  const [metrics, setMetrics] = useState<LoadState<unknown>>({ kind: "loading" });

  useEffect(() => {
    if (!session || !configured) return;
    let alive = true;
    authedGet<unknown>("/api/metrics", session.session_token)
      .then((data) => alive && setMetrics({ kind: "ok", data }))
      .catch((err) => {
        if (!alive) return;
        if (err instanceof ApiError && err.status === 401) logout();
        setMetrics({
          kind: "error",
          message: err instanceof Error ? err.message : "Failed to load metrics",
        });
      });
    return () => {
      alive = false;
    };
  }, [session, configured, logout]);

  return (
    <div className="p-10 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Terminal className="text-green-400" /> Console
          </h2>
          <p className="text-gray-400 text-sm">
            Signed in as <span className="text-white">{session?.email}</span>
          </p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-gray-300 border border-gray-800 rounded-lg px-3 py-1.5 hover:text-white hover:border-gray-600 transition"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>

      <section className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-500" /> Telemetry
        </h3>

        {!configured && (
          <div className="text-sm">
            <p className="text-amber-400">Not connected to the control plane.</p>
            <p className="text-gray-500 mt-1">
              API base URL is not configured for this deployment (VITE_API_BASE_URL).
            </p>
          </div>
        )}

        {configured && metrics.kind === "loading" && (
          <p className="text-gray-400 text-sm">Loading metrics…</p>
        )}

        {configured && metrics.kind === "error" && (
          <div className="text-sm">
            <p className="text-amber-400">Not connected to the control plane.</p>
            <p className="text-gray-500 mt-1">{metrics.message}</p>
          </div>
        )}

        {configured && metrics.kind === "ok" && (
          <pre className="text-xs text-gray-300 overflow-auto max-h-96 bg-gray-950 rounded-lg p-4">
            {JSON.stringify(metrics.data, null, 2)}
          </pre>
        )}
      </section>

      <p className="text-xs text-gray-600 mt-6">
        Remote RCU hot-reload, agent monitoring, and API-key management land here as the control
        plane comes online.
      </p>
    </div>
  );
};
