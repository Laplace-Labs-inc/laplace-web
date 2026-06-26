import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  exchangeDevIdentity,
  exchangeOAuthCode,
  GITHUB_CLIENT_ID,
  OAUTH_REDIRECT_URI,
  type Session,
} from "./api";

const STORAGE_KEY = "laplace_session";
const STATE_KEY = "laplace_oauth_state";

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    // Drop expired sessions on load.
    if (typeof s.expires_at === "number" && s.expires_at * 1000 <= Date.now()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

interface AuthValue {
  session: Session | null;
  isAuthenticated: boolean;
  /** Begin the GitHub OAuth redirect (production path). */
  startGithubLogin: () => void;
  /** Complete the OAuth redirect: exchange the returned code for a session. */
  completeOAuth: (code: string, state: string | null) => Promise<void>;
  /** Dev-only email sign-in (gated by VITE_OAUTH_DEV + backend dev flag). */
  devLogin: (email: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => loadSession());

  const persist = useCallback((s: Session | null) => {
    if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    else localStorage.removeItem(STORAGE_KEY);
    setSession(s);
  }, []);

  // Auto-logout when the token reaches its expiry while the app is open.
  // setState happens only inside the timeout callback, never synchronously here.
  useEffect(() => {
    if (!session) return;
    const ms = session.expires_at * 1000 - Date.now();
    const t = setTimeout(() => persist(null), Math.max(0, ms));
    return () => clearTimeout(t);
  }, [session, persist]);

  const startGithubLogin = useCallback(() => {
    const state = crypto.randomUUID();
    sessionStorage.setItem(STATE_KEY, state);
    const url = new URL("https://github.com/login/oauth/authorize");
    url.searchParams.set("client_id", GITHUB_CLIENT_ID);
    url.searchParams.set("redirect_uri", OAUTH_REDIRECT_URI);
    url.searchParams.set("scope", "read:user user:email");
    url.searchParams.set("state", state);
    globalThis.location.assign(url.toString());
  }, []);

  const completeOAuth = useCallback(
    async (code: string, state: string | null) => {
      const expected = sessionStorage.getItem(STATE_KEY);
      sessionStorage.removeItem(STATE_KEY);
      if (!expected || expected !== state) {
        throw new Error("OAuth state mismatch — possible CSRF, aborting.");
      }
      const s = await exchangeOAuthCode("github", code);
      persist(s);
    },
    [persist],
  );

  const devLogin = useCallback(
    async (email: string) => {
      const s = await exchangeDevIdentity(email);
      persist(s);
    },
    [persist],
  );

  const logout = useCallback(() => persist(null), [persist]);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      isAuthenticated: !!session,
      startGithubLogin,
      completeOAuth,
      devLogin,
      logout,
    }),
    [session, startGithubLogin, completeOAuth, devLogin, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook co-located with its provider
export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
