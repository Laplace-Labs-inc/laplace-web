import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../lib/auth";

/** Landing route for the GitHub OAuth redirect (/auth/callback?code=...&state=...).
 *  Exchanges the code for a Laplace session, then routes into the console. */
export const AuthCallbackPage = () => {
  const [params] = useSearchParams();
  const { completeOAuth } = useAuth();
  const navigate = useNavigate();
  const [asyncError, setAsyncError] = useState<string | null>(null);
  const ran = useRef(false);

  // Errors that are knowable synchronously from the URL are derived, not stored,
  // so no setState happens in the effect body (only in the async catch below).
  const oauthError = params.get("error");
  const code = params.get("code");
  const state = params.get("state");
  const staticError = oauthError
    ? (params.get("error_description") ?? oauthError)
    : !code
      ? "Missing authorization code."
      : null;
  const error = staticError ?? asyncError;

  useEffect(() => {
    if (ran.current) return; // guard React 18 strict double-invoke
    ran.current = true;
    if (staticError || !code) return; // nothing to exchange
    completeOAuth(code, state)
      .then(() => navigate("/console", { replace: true }))
      .catch((err) => setAsyncError(err instanceof Error ? err.message : "Sign-in failed"));
  }, [staticError, code, state, completeOAuth, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg text-fg">
      <div className="p-8 border border-border bg-surface rounded-2xl w-96 text-center">
        {error ? (
          <>
            <h2 className="text-xl font-bold mb-3 text-danger">Sign-in failed</h2>
            <p className="text-sm text-muted mb-6">{error}</p>
            <button
              onClick={() => navigate("/login", { replace: true })}
              className="w-full bg-fg text-bg py-2 rounded-lg font-bold hover:opacity-90 transition"
            >
              Back to sign in
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 text-muted">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
            <p>Completing sign-in…</p>
          </div>
        )}
      </div>
    </div>
  );
};
