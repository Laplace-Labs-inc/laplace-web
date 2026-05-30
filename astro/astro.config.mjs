import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";
import mdx from "@astrojs/mdx";

export default defineConfig({
  site: "https://laplace-labs.com",
  output: "static",
  i18n: {
    locales: ["en", "ko", "ja", "zh-CN"],
    defaultLocale: "en",
    routing: {
      prefixDefaultLocale: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [react(), mdx()],
  markdown: {
    shikiConfig: {
      theme: "github-dark",
      langs: ["rust", "bash", "toml", "yaml", "json", "typescript"],
    },
  },
});
