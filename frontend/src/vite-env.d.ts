/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the laplace-api control plane, e.g. https://api.laplace-labs.com */
  readonly VITE_API_BASE_URL?: string;
  /** "true" enables the dev email sign-in (pairs with backend OAUTH_DEV_ALLOW_UNVERIFIED). */
  readonly VITE_OAUTH_DEV?: string;
  /** GitHub OAuth App client id (public). */
  readonly VITE_GITHUB_CLIENT_ID?: string;
  /** OAuth redirect URI registered on the GitHub OAuth App. */
  readonly VITE_OAUTH_REDIRECT_URI?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
