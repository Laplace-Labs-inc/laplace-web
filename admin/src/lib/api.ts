// API client for the Laplace operator console (laplace-api).
// Mirrors the user console's client but scoped to what admin needs.

export const API_BASE: string = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

/** Dev sign-in is only offered when the build opts in AND the backend sets
 *  OAUTH_DEV_ALLOW_UNVERIFIED=true. The operator console uses this internally. */
export const DEV_AUTH_ENABLED: boolean = import.meta.env.VITE_OAUTH_DEV === "true";

export interface Session {
  session_token: string;
  expires_at: number;
  user_id: string;
  email: string;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function requireBase(): string {
  if (!API_BASE) throw new ApiError(0, "API base URL is not configured (VITE_API_BASE_URL).");
  return API_BASE;
}

async function errorMessage(res: Response, path: string): Promise<string> {
  try {
    const body = await res.text();
    return body ? `${path}: ${res.status} ${body.slice(0, 200)}` : `${path}: ${res.status}`;
  } catch {
    return `${path}: ${res.status}`;
  }
}

export async function exchangeDevIdentity(email: string): Promise<Session> {
  const res = await fetch(`${requireBase()}/api/v1/auth/oauth/exchange`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      provider: "github",
      dev_identity: { provider_subject: `dev:${email}`, email, email_verified: true },
    }),
  });
  if (!res.ok) throw new ApiError(res.status, `Dev sign-in failed (${res.status})`);
  return (await res.json()) as Session;
}

async function authedGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${requireBase()}${path}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new ApiError(401, "Session expired or unauthorized.");
  if (!res.ok) throw new ApiError(res.status, await errorMessage(res, path));
  return (await res.json()) as T;
}

async function authedPost<T>(path: string, token: string, body: unknown): Promise<T> {
  const res = await fetch(`${requireBase()}${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 401) throw new ApiError(401, "Session expired or unauthorized.");
  if (!res.ok) throw new ApiError(res.status, await errorMessage(res, path));
  return (await res.json()) as T;
}

export type Org = { id: string; slug: string; name: string };
export type Project = { id: string; slug: string; name: string };

export const listOrgs = (token: string) => authedGet<Org[]>("/api/v1/orgs", token);
export const createOrg = (token: string, slug: string, name: string) =>
  authedPost<Org>("/api/v1/orgs", token, { slug, name });
export const listProjects = (token: string, orgId: string) =>
  authedGet<Project[]>(`/api/v1/projects?org_id=${encodeURIComponent(orgId)}`, token);
export const createProject = (token: string, orgId: string, slug: string, name: string) =>
  authedPost<Project>("/api/v1/projects", token, { org_id: orgId, slug, name });

export type BugMetrics = {
  total_patterns: number;
  total_reports: number;
  reports_30d: number;
  by_type: { bug_type: string; count: number }[];
  top_crates: { crate_name: string; count: number }[];
  generated_at_unix: number;
};

export type Tenants = {
  totals: { orgs: number; users: number; projects: number };
  orgs: { id: string; slug: string; name: string; members: number; projects: number }[];
};
export const getTenants = (token: string) => authedGet<Tenants>("/api/admin/tenants", token);

export type Licensing = {
  total: number;
  active: number;
  by_tier: { tier: string; active: boolean; count: number }[];
};
export const getLicensing = (token: string) => authedGet<Licensing>("/api/admin/licensing", token);

export type FeatureFlags = {
  flags: { key: string; description: string; state: string }[];
};
export const getFlags = (token: string) => authedGet<FeatureFlags>("/api/admin/flags", token);

export async function getBugMetrics(
  token: string,
  orgId: string,
  projectId: string,
): Promise<BugMetrics> {
  const res = await fetch(`${requireBase()}/api/metrics/bugs`, {
    headers: {
      authorization: `Bearer ${token}`,
      "x-laplace-org-id": orgId,
      "x-laplace-project-id": projectId,
    },
  });
  if (res.status === 401) throw new ApiError(401, "Session expired or unauthorized.");
  if (!res.ok) throw new ApiError(res.status, await errorMessage(res, "/api/metrics/bugs"));
  return (await res.json()) as BugMetrics;
}
