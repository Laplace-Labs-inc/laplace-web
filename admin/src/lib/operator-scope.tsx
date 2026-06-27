import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createOrg, createProject, listOrgs, listProjects } from "./api";
import { useAuth } from "./auth";

/** The Bug DB metrics endpoint is gated behind a per-org/project `probe.events.read`
 *  permission. An operator's data is global, so any authorized scope returns the same
 *  corpus — we just need *a* scope. This provider resolves (or auto-provisions) one:
 *  reuse the operator's first org/project, else create an "operations" org/project
 *  (the creator is auto-bound as owner, which grants the read). */
type ScopeValue = {
  ready: boolean;
  error: string | null;
  orgId: string | null;
  projectId: string | null;
};

const ScopeContext = createContext<ScopeValue | null>(null);

export function OperatorScopeProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const token = session?.session_token ?? null;
  const [state, setState] = useState<ScopeValue>({
    ready: false,
    error: null,
    orgId: null,
    projectId: null,
  });
  const ran = useRef<string | null>(null);

  useEffect(() => {
    if (!token) {
      ran.current = null;
      setState({ ready: false, error: null, orgId: null, projectId: null });
      return;
    }
    if (ran.current === token) return; // guard StrictMode double-invoke per token
    ran.current = token;
    let alive = true;

    (async () => {
      try {
        const orgs = await listOrgs(token);
        const org = orgs[0] ?? (await createOrg(token, "operations", "Operations"));
        const projects = await listProjects(token, org.id);
        const project =
          projects[0] ?? (await createProject(token, org.id, "operations", "Operations"));
        if (alive) {
          setState({ ready: true, error: null, orgId: org.id, projectId: project.id });
        }
      } catch (e) {
        if (alive) {
          setState({
            ready: false,
            error: e instanceof Error ? e.message : "Failed to resolve operator scope",
            orgId: null,
            projectId: null,
          });
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [token]);

  return <ScopeContext.Provider value={state}>{children}</ScopeContext.Provider>;
}

export function useOperatorScope(): ScopeValue {
  const ctx = useContext(ScopeContext);
  if (!ctx) throw new Error("useOperatorScope must be used within <OperatorScopeProvider>");
  return ctx;
}
