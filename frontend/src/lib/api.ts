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
    throw new ApiError(res.status, `Request to ${path} failed (${res.status})`);
  }
  return (await res.json()) as T;
}
