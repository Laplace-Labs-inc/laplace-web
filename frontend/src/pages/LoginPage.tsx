import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Github, ShieldAlert } from "lucide-react";
import { useAuth } from "../lib/auth";
import { DEV_AUTH_ENABLED, GITHUB_CLIENT_ID } from "../lib/api";

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
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="p-8 border border-gray-800 bg-gray-900/50 rounded-2xl w-96 text-center">
        <ShieldAlert className="w-12 h-12 text-blue-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-6">Sign in to Laplace</h2>

        <button
          onClick={startGithubLogin}
          disabled={!githubReady}
          className="w-full flex items-center justify-center gap-2 bg-white text-black py-2 rounded-lg font-bold hover:bg-gray-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Github className="w-4 h-4" /> Continue with GitHub
        </button>
        {!githubReady && (
          <p className="mt-3 text-xs text-gray-500">
            GitHub sign-in is not configured for this deployment yet.
          </p>
        )}

        {DEV_AUTH_ENABLED && (
          <form onSubmit={onDevSubmit} className="mt-6 border-t border-gray-800 pt-6 text-left">
            <label className="block text-xs uppercase tracking-wide text-gray-500 mb-2">
              Dev sign-in
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-500 transition disabled:opacity-40"
            >
              {busy ? "Signing in…" : "Sign in (dev)"}
            </button>
          </form>
        )}

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
};
