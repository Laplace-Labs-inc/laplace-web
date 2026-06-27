import { useEffect, useState } from "react";
import { ApiError } from "./api";
import { useAuth } from "./auth";
import type { Load } from "./use-bug-metrics";

/** Fetches an operator endpoint with the session token (no tenant scope needed). */
export function useAdminData<T>(fetcher: (token: string) => Promise<T>): Load<T> {
  const { session, logout } = useAuth();
  const token = session?.session_token;
  const [state, setState] = useState<Load<T>>({ kind: "loading" });

  useEffect(() => {
    if (!token) return;
    let alive = true;
    fetcher(token)
      .then((d) => alive && setState({ kind: "ok", data: d }))
      .catch((e) => {
        if (!alive) return;
        if (e instanceof ApiError && e.status === 401) logout();
        setState({ kind: "error", message: e instanceof Error ? e.message : "failed" });
      });
    return () => {
      alive = false;
    };
  }, [token, fetcher, logout]);

  return state;
}
