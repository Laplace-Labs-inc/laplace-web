import { useEffect, useState } from "react";
import { getBugMetrics, type BugMetrics } from "./api";
import { useAuth } from "./auth";
import { useOperatorScope } from "./operator-scope";

export type Load<T> =
  | { kind: "loading" }
  | { kind: "ok"; data: T }
  | { kind: "error"; message: string };

/** Fetches the global Bug DB metrics once the operator scope is resolved. */
export function useBugMetrics(): Load<BugMetrics> {
  const { session, logout } = useAuth();
  const scope = useOperatorScope();
  const token = session?.session_token;
  const [state, setState] = useState<Load<BugMetrics>>({ kind: "loading" });

  useEffect(() => {
    if (scope.error) {
      setState({ kind: "error", message: scope.error });
      return;
    }
    if (!token || !scope.ready || !scope.orgId || !scope.projectId) return;
    let alive = true;
    getBugMetrics(token, scope.orgId, scope.projectId)
      .then((d) => alive && setState({ kind: "ok", data: d }))
      .catch((e) => {
        if (!alive) return;
        if (e instanceof Error && "status" in e && (e as { status: number }).status === 401) {
          logout();
        }
        setState({ kind: "error", message: e instanceof Error ? e.message : "failed" });
      });
    return () => {
      alive = false;
    };
  }, [token, scope.ready, scope.orgId, scope.projectId, scope.error, logout]);

  return state;
}
