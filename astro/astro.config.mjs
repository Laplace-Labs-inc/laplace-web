import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";
import mdx from "@astrojs/mdx";

export default defineConfig({
  site: "https://laplace-labs.com",
  output: "static",
  // Docs (incl. the retired Ki-DPOR page) moved to docs.laplace-labs.com; no
  // /docs/* routes remain on the marketing site, so the legacy redirects are gone.
  i18n: {
    locales: ["en", "ko", "ja", "zh-CN"],
    defaultLocale: "en",
    routing: {
      prefixDefaultLocale: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      // Allow importing the shared design-token CSS from the repo root (../shared).
      fs: { allow: [".."] },
      // Permit tunnel/staging hostnames (preview behind Cloudflare Tunnel).
      allowedHosts: true,
    },
    preview: {
      allowedHosts: true,
    },
  },
  integrations: [react(), mdx()],
  markdown: {
    shikiConfig: {
      theme: "github-dark",
      langs: ["rust", "bash", "toml", "yaml", "json", "typescript"],
    },
  },
});
