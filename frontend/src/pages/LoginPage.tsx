import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Github } from "lucide-react";
import { useAuth } from "../lib/auth";
import { DEV_AUTH_ENABLED, GITHUB_CLIENT_ID } from "../lib/api";
import { ThemeToggle } from "../components/ThemeToggle";

export const LoginPage = () => {
  const { isAuthenticated, startGithubLogin, devLogin } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (isAuthenticated) {
    const from = (location.state as { from?: string } | null)?.from ?? "/console";
    return <Navigate to={from} replace />;
  }

  const githubReady = GITHUB_CLIENT_ID.length > 0;

  const onDevSubmit = async (e: React.FormEvent) => {
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

  return (
    <div className="flex min-h-screen flex-col bg-bg text-fg">
      <header className="flex items-center justify-between px-6 py-5">
        <img
          src="/images/Laplace_labs.png"
          alt="Laplace"
          className="h-8 w-auto object-contain dark:invert dark:brightness-90"
        />
        <ThemeToggle />
      </header>

      <div className="flex flex-1 items-center justify-center px-6 pb-24">
        <div className="w-full max-w-sm">
          <h1 className="text-center text-2xl font-semibold tracking-tight">
            Sign in to Laplace
          </h1>
          <p className="mt-2 text-center text-sm text-muted">
            Access your verification console.
          </p>

          <div className="mt-8 rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]">
            <button
              onClick={startGithubLogin}
              disabled={!githubReady}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-fg py-2.5 font-medium text-bg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Github className="h-4 w-4" /> Continue with GitHub
            </button>
            {!githubReady && (
              <p className="mt-3 text-center text-xs text-faint">
                GitHub sign-in is not configured for this deployment yet.
              </p>
            )}

            {DEV_AUTH_ENABLED && (
              <form onSubmit={onDevSubmit} className="mt-6 border-t border-border pt-6">
                <label className="mb-2 block text-[11px] font-medium uppercase tracking-wide text-faint">
                  Dev sign-in
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mb-3 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm focus:border-accent focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-lg bg-accent py-2 font-medium text-accent-fg transition hover:bg-accent-hover disabled:opacity-40"
                >
                  {busy ? "Signing in…" : "Sign in (dev)"}
                </button>
              </form>
            )}

            {error && <p className="mt-4 text-center text-sm text-danger">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};
