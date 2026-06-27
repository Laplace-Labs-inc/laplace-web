// API client for the Laplace control-plane (laplace-api).
//
// Route contract (see laplace-cloud/crates/cloud/laplace-api/src/main.rs):
//   POST /api/v1/auth/oauth/exchange  -> { session_token, expires_at, user_id, email }
//   GET  /api/metrics                 (Authorization: Bearer <session_token>)
//   POST /credits/balance             (Authorization: Bearer <session_token>)
//
// The base URL is injected at build time. When unset, the console renders a
// clear "not connected" state instead of issuing requests to a wrong origin.
export const API_BASE: string = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

/** Dev sign-in is only offered when the build opts in AND the backend sets
 *  OAUTH_DEV_ALLOW_UNVERIFIED=true. It never ships enabled by default. */
export const DEV_AUTH_ENABLED: boolean = import.meta.env.VITE_OAUTH_DEV === "true";

export const GITHUB_CLIENT_ID: string = import.meta.env.VITE_GITHUB_CLIENT_ID ?? "";
export const OAUTH_REDIRECT_URI: string =
  import.meta.env.VITE_OAUTH_REDIRECT_URI ?? `${globalThis.location?.origin ?? ""}/auth/callback`;

export interface Session {
  session_token: string;
  expires_at: number; // unix seconds
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
  if (!API_BASE) {
    throw new ApiError(0, "API base URL is not configured (VITE_API_BASE_URL).");
  }
  return API_BASE;
}

/** Exchange a GitHub authorization `code` (production path) for a Laplace session.
 *  The backend code->token exchange route is the OWNER-gated go-live tail. */
export async function exchangeOAuthCode(provider: "github", code: string): Promise<Session> {
  const res = await fetch(`${requireBase()}/api/v1/auth/oauth/exchange`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ provider, code }),
  });
  if (!res.ok) {
    throw new ApiError(res.status, `OAuth exchange failed (${res.status})`);
  }
  return (await res.json()) as Session;
}

/** Dev-only sign-in. Requires the backend to run with OAUTH_DEV_ALLOW_UNVERIFIED=true. */
export async function exchangeDevIdentity(email: string): Promise<Session> {
  const res = await fetch(`${requireBase()}/api/v1/auth/oauth/exchange`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      provider: "github",
      dev_identity: {
        provider_subject: `dev:${email}`,
        email,
        email_verified: true,
      },
    }),
  });
  if (!res.ok) {
    throw new ApiError(res.status, `Dev sign-in failed (${res.status})`);
  }
  return (await res.json()) as Session;
}

/** Authenticated GET that attaches the bearer token; throws ApiError on 401/5xx. */
export async function authedGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${requireBase()}${path}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    throw new ApiError(401, "Session expired or unauthorized.");
  }
  if (!res.ok) {
    throw new ApiError(res.status, await errorMessage(res, path));
  }
  return (await res.json()) as T;
}

async function errorMessage(res: Response, path: string): Promise<string> {
  try {
    const body = (await res.json()) as { error?: { message?: string } };
    if (body?.error?.message) return body.error.message;
  } catch {
    /* non-JSON body */
  }
  return `Request to ${path} failed (${res.status})`;
}

/** Authenticated JSON request (POST/DELETE) with bearer token. */
export async function authedJson<T>(
  method: "POST" | "DELETE",
  path: string,
  token: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${requireBase()}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) throw new ApiError(401, "Session expired or unauthorized.");
  if (!res.ok) throw new ApiError(res.status, await errorMessage(res, path));
  return (await res.json()) as T;
}

// ── Control-plane management types ──────────────────────────────────────────
export interface Org {
  id: string;
  slug: string;
  name: string;
}
export interface Project {
  id: string;
  org_id: string;
  slug: string;
  name: string;
}
export interface RoleDef {
  name: string;
  permissions?: string[];
}
export interface RoleBinding {
  id: string;
  scope_kind: "org" | "project" | "tenant";
  scope_id: string;
  principal_kind: "user" | "service_account" | "api_key" | "device";
  principal_id: string;
  role_name: string;
}

export const listOrgs = (token: string) => authedGet<Org[]>("/api/v1/orgs", token);
export const createOrg = (token: string, slug: string, name: string) =>
  authedJson<Org>("POST", "/api/v1/orgs", token, { slug, name });

export const listProjects = (token: string, orgId: string) =>
  authedGet<Project[]>(`/api/v1/projects?org_id=${encodeURIComponent(orgId)}`, token);
export const createProject = (token: string, orgId: string, slug: string, name: string) =>
  authedJson<Project>("POST", "/api/v1/projects", token, { org_id: orgId, slug, name });

export const listRoles = (token: string) =>
  authedGet<{ roles: RoleDef[] }>("/api/v1/iam/roles", token).then((r) => r.roles);

export const removeBinding = (
  token: string,
  bindingId: string,
  scope: { org_id: string; project_id?: string },
) => authedJson<{ state: string }>("DELETE", `/api/v1/iam/bindings/${bindingId}`, token, scope);

export const listBindings = (token: string, orgId: string, projectId?: string) => {
  const q = new URLSearchParams({ org_id: orgId });
  if (projectId) q.set("project_id", projectId);
  return authedGet<RoleBinding[]>(`/api/v1/iam/bindings?${q.toString()}`, token);
};
export interface AddBindingInput {
  org_id: string;
  project_id?: string;
  scope_kind: "org" | "project";
  scope_id: string;
  principal_kind: "user" | "service_account";
  principal_id: string;
  role_name: string;
}
export const addBinding = (token: string, input: AddBindingInput) =>
  authedJson<RoleBinding>("POST", "/api/v1/iam/bindings", token, input);

// ── Live exploration view (unauthenticated demo; built-in models only) ───────
export type ExploreCase = "deadlock" | "clean" | "cycle3";

export interface ExploreSnapshot {
  running: boolean;
  explored: number;
  pruned: number;
  frontier: string;
  verdict: "idle" | "running" | "clean" | "violation";
  detail: string;
}

/** Kick off a built-in Axiom verification demo on the API (in-process). */
export async function startExploration(demo: ExploreCase, delayMs = 15): Promise<void> {
  const res = await fetch(`${requireBase()}/api/explore/start`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ case: demo, delay_ms: delayMs }),
  });
  if (!res.ok) throw new ApiError(res.status, `Failed to start exploration (${res.status})`);
}

/** SSE endpoint URL for the live exploration stream (consume via EventSource). */
export function explorationStreamUrl(): string {
  return `${requireBase()}/api/explore/stream`;
}

/** Probe telemetry summary; requires org/project scope headers + probe.events.read. */
export async function getMetrics<T>(token: string, orgId: string, projectId: string): Promise<T> {
  const res = await fetch(`${requireBase()}/api/metrics`, {
    headers: {
      authorization: `Bearer ${token}`,
      "x-laplace-org-id": orgId,
      "x-laplace-project-id": projectId,
    },
  });
  if (res.status === 401) throw new ApiError(401, "Session expired or unauthorized.");
  if (!res.ok) throw new ApiError(res.status, await errorMessage(res, "/api/metrics"));
  return (await res.json()) as T;
}
