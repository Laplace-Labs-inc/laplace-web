/// <reference types="astro/client" />

// Side-effect-only stylesheet import shipped without type declarations.
declare module "@docsearch/css";

// FABLE-032 build-time public env contract (see .env.example).
interface ImportMetaEnv {
  readonly PUBLIC_WAITLIST_ENDPOINT?: string;
  readonly PUBLIC_ALGOLIA_APP_ID?: string;
  readonly PUBLIC_ALGOLIA_SEARCH_KEY?: string;
  readonly PUBLIC_ALGOLIA_INDEX_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
