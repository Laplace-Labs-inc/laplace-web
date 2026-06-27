import { useState } from "react";
import { Navigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { DEV_AUTH_ENABLED } from "../lib/api";
import { useAuth } from "../lib/auth";

export function LoginPage() {
  const { session, devLogin } = useAuth();
  const [email, setEmail] = useState("operator@laplace-labs.com");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await devLogin(email.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  if (session) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg text-fg">
      <div className="w-96 rounded-2xl border border-border bg-surface p-8">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-sm font-bold text-accent-fg">
            L
          </div>
          <div className="leading-tight">
            <div className="font-semibold">Laplace</div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-accent">
              Operator
            </div>
          </div>
        </div>

        <h1 className="text-lg font-semibold">Operator sign-in</h1>
        <p className="mt-1 mb-5 flex items-center gap-1.5 text-xs text-faint">
          <ShieldAlert className="h-3.5 w-3.5 text-accent" /> Internal — staging
        </p>

        {error && <p className="mb-3 text-sm text-danger">{error}</p>}

        {DEV_AUTH_ENABLED ? (
          <form onSubmit={submit} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@laplace-labs.com"
              required
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-accent py-2 text-sm font-bold text-accent-fg transition hover:bg-accent-hover disabled:opacity-40"
            >
              {busy ? "Signing in…" : "Sign in (dev)"}
            </button>
          </form>
        ) : (
          <p className="text-sm text-muted">
            Dev sign-in is disabled for this build. Configure an operator identity provider.
          </p>
        )}
      </div>
    </div>
  );
}
