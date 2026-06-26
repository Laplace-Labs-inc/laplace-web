import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ApiError, listOrgs, listProjects, type Org, type Project } from "./api";
import { useAuth } from "./auth";

const ORG_KEY = "laplace_sel_org";
const PROJ_KEY = "laplace_sel_proj";

interface ConsoleScopeValue {
  orgs: Org[];
  projects: Project[];
  selectedOrg: Org | null;
  selectedProject: Project | null;
  selectOrg: (id: string) => void;
  selectProject: (id: string) => void;
  reloadOrgs: () => void;
  reloadProjects: () => void;
  loading: boolean;
  error: string | null;
}

const Ctx = createContext<ConsoleScopeValue | null>(null);

function describe(err: unknown): string {
  return err instanceof Error ? err.message : "Request failed";
}

export function ConsoleScopeProvider({ children }: { children: ReactNode }) {
  const { session, logout } = useAuth();
  const token = session?.session_token ?? "";

  const [orgs, setOrgs] = useState<Org[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(() =>
    localStorage.getItem(ORG_KEY),
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() =>
    localStorage.getItem(PROJ_KEY),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onError = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) logout();
      setError(describe(err));
    },
    [logout],
  );

  const reloadOrgs = useCallback(() => {
    if (!token) return;
    listOrgs(token)
      .then((os) => {
        setOrgs(os);
        setError(null);
        setSelectedOrgId((prev) => (prev && os.some((o) => o.id === prev) ? prev : (os[0]?.id ?? null)));
      })
      .catch(onError)
      .finally(() => setLoading(false));
  }, [token, onError]);

  const reloadProjects = useCallback(() => {
    if (!token || !selectedOrgId) return;
    listProjects(token, selectedOrgId)
      .then((ps) => {
        setProjects(ps);
        setSelectedProjectId((prev) =>
          prev && ps.some((p) => p.id === prev) ? prev : (ps[0]?.id ?? null),
        );
      })
      .catch(onError);
  }, [token, selectedOrgId, onError]);

  useEffect(() => {
    reloadOrgs();
  }, [reloadOrgs]);

  useEffect(() => {
    reloadProjects();
  }, [reloadProjects]);

  useEffect(() => {
    if (selectedOrgId) localStorage.setItem(ORG_KEY, selectedOrgId);
  }, [selectedOrgId]);

  useEffect(() => {
    if (selectedProjectId) localStorage.setItem(PROJ_KEY, selectedProjectId);
  }, [selectedProjectId]);

  const selectOrg = useCallback((id: string) => {
    setSelectedOrgId(id);
    setSelectedProjectId(null);
  }, []);
  const selectProject = useCallback((id: string) => setSelectedProjectId(id), []);

  const value = useMemo<ConsoleScopeValue>(
    () => ({
      orgs,
      projects,
      selectedOrg: orgs.find((o) => o.id === selectedOrgId) ?? null,
      selectedProject: projects.find((p) => p.id === selectedProjectId) ?? null,
      selectOrg,
      selectProject,
      reloadOrgs,
      reloadProjects,
      loading,
      error,
    }),
    [
      orgs,
      projects,
      selectedOrgId,
      selectedProjectId,
      selectOrg,
      selectProject,
      reloadOrgs,
      reloadProjects,
      loading,
      error,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook co-located with its provider
export function useConsoleScope(): ConsoleScopeValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useConsoleScope must be used within <ConsoleScopeProvider>");
  return ctx;
}
