import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, Play, Radar, XCircle } from "lucide-react";
import {
  API_BASE,
  explorationStreamUrl,
  startExploration,
  type ExploreCase,
  type ExploreSnapshot,
} from "../../lib/api";

const CASES: { id: ExploreCase; label: string; blurb: string }[] = [
  { id: "deadlock", label: "AB-BA deadlock", blurb: "2 threads · lock-order inversion → a wait-for cycle" },
  { id: "clean", label: "Consistent order", blurb: "3 threads · one global lock order → exhaustively clean" },
  { id: "cycle3", label: "ABC 3-way cycle", blurb: "3 threads · circular wait invisible to a 2-thread model" },
];

const IDLE: ExploreSnapshot = {
  running: false,
  explored: 0,
  pruned: 0,
  frontier: "root",
  verdict: "idle",
  detail: "",
};

/** Live, animated view of the Axiom engine searching the interleaving space.
 *  Mirrors the console `--verify` TUI: the same in-process sweep, streamed over
 *  SSE from `/api/explore/stream`. */
export function ExplorationPage() {
  const [snap, setSnap] = useState<ExploreSnapshot>(IDLE);
  const [active, setActive] = useState<ExploreCase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const closeStream = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
  }, []);

  const openStream = useCallback(() => {
    closeStream();
    const es = new EventSource(explorationStreamUrl());
    esRef.current = es;
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as ExploreSnapshot;
        setSnap(data);
        if (data.verdict === "clean" || data.verdict === "violation") {
          // The server closes the stream shortly after terminal; mirror that.
          setTimeout(closeStream, 400);
        }
      } catch {
        /* keep-alive / non-JSON frame */
      }
    };
    es.onerror = () => closeStream();
  }, [closeStream]);

  useEffect(() => () => closeStream(), [closeStream]);

  const run = useCallback(
    async (demo: ExploreCase) => {
      setError(null);
      setActive(demo);
      setSnap({ ...IDLE, verdict: "running", running: true });
      try {
        await startExploration(demo, 18);
        openStream();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to start");
        setSnap(IDLE);
      }
    },
    [openStream],
  );

  const hops = snap.frontier.split("→");

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-2 text-faint">
          <Radar className="h-4 w-4" />
          <span className="text-[11px] font-medium uppercase tracking-wide">Live verification</span>
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Exploration</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted">
          Watch the Axiom engine search the interleaving space of a built-in model in real time.
          Each schedule the deterministic DPOR sweep replays advances the frontier below.
        </p>
      </header>

      {!API_BASE && (
        <div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted">
          API base URL is not configured — set <code>VITE_API_BASE_URL</code> to connect.
        </div>
      )}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {CASES.map((c) => (
          <button
            key={c.id}
            onClick={() => run(c.id)}
            disabled={!API_BASE || snap.running}
            className={`group flex flex-col rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
              active === c.id
                ? "border-accent bg-surface-2"
                : "border-border bg-surface hover:border-accent/60 hover:bg-surface-2"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{c.label}</span>
              <Play className="h-4 w-4 text-faint transition group-hover:text-accent" />
            </div>
            <span className="mt-1 text-xs text-muted">{c.blurb}</span>
          </button>
        ))}
      </section>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/5 px-4 py-3 text-sm text-red-500">
          {error}
        </div>
      )}

      <VerdictPanel snap={snap} hops={hops} />
    </div>
  );
}

function VerdictPanel({ snap, hops }: { snap: ExploreSnapshot; hops: string[] }) {
  return (
    <section className="rounded-xl border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <VerdictBadge verdict={snap.verdict} />
        <div className="flex items-center gap-6 text-sm">
          <Stat label="Explored" value={snap.explored} />
          <Stat label="Pruned" value={snap.pruned} />
        </div>
      </div>

      <div className="px-5 py-6">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-faint">
          Search frontier
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-surface-2 px-2.5 py-1 font-mono text-xs text-muted">root</span>
          {hops
            .filter((h) => h !== "root")
            .map((hop, i, arr) => {
              const isActive = snap.running && i === arr.length - 1;
              return (
                <span key={`${hop}-${i}`} className="flex items-center gap-2">
                  <span className="text-faint">→</span>
                  <span
                    className={`rounded-md px-2.5 py-1 font-mono text-xs transition ${
                      isActive
                        ? "animate-pulse bg-accent text-accent-fg ring-2 ring-accent/40"
                        : "bg-surface-2 text-fg"
                    }`}
                  >
                    {hop}
                  </span>
                </span>
              );
            })}
          {snap.running && (
            <Loader2 className="ml-1 h-4 w-4 animate-spin text-accent" aria-label="searching" />
          )}
        </div>

        {snap.verdict === "violation" && snap.detail && (
          <pre className="mt-5 overflow-x-auto rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3 font-mono text-xs text-red-500">
            {snap.detail}
          </pre>
        )}
        {snap.verdict === "clean" && (
          <p className="mt-5 text-sm text-emerald-500">
            Exhaustive search complete — no violation across {snap.explored} schedules.
          </p>
        )}
        {snap.verdict === "idle" && (
          <p className="mt-5 text-sm text-muted">Pick a scenario above to begin.</p>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-right">
      <div className="font-mono text-base font-semibold tabular-nums">{value.toLocaleString()}</div>
      <div className="text-[11px] uppercase tracking-wide text-faint">{label}</div>
    </div>
  );
}

function VerdictBadge({ verdict }: { verdict: ExploreSnapshot["verdict"] }) {
  if (verdict === "violation")
    return (
      <span className="flex items-center gap-2 text-sm font-medium text-red-500">
        <XCircle className="h-4 w-4" /> Violation detected
      </span>
    );
  if (verdict === "clean")
    return (
      <span className="flex items-center gap-2 text-sm font-medium text-emerald-500">
        <CheckCircle2 className="h-4 w-4" /> Clean
      </span>
    );
  if (verdict === "running")
    return (
      <span className="flex items-center gap-2 text-sm font-medium text-accent">
        <Loader2 className="h-4 w-4 animate-spin" /> Searching…
      </span>
    );
  return (
    <span className="flex items-center gap-2 text-sm font-medium text-muted">
      <Radar className="h-4 w-4" /> Idle
    </span>
  );
}
