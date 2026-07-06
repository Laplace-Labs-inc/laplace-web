/// <reference types="astro/client" />

// FABLE-032 build-time public env contract (see .env.example).
interface ImportMetaEnv {
  readonly PUBLIC_WAITLIST_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
