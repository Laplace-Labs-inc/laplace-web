// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

// docs.laplace-labs.com — Starlight (Astro). Built-in offline search (Pagefind),
// theme toggle, sidebar, TOC. Warm cream / warm dark palette is mapped onto
// Starlight's --sl-color-* tokens in src/styles/laplace-docs.css.
export default defineConfig({
  site: "https://docs.laplace-labs.com",
  vite: {
    server: {
      // Allow importing the shared palette from the repo root (../shared).
      fs: { allow: [".."] },
      allowedHosts: true,
    },
    preview: {
      allowedHosts: true,
    },
  },
  integrations: [
    starlight({
      title: "Laplace Docs",
      description:
        "Deterministic concurrency verification — the Axiom engine and the Laplace CLI.",
      logo: {
        light: "./public/images/Laplace_labs.png",
        dark: "./public/images/Laplace_labs.png",
        replacesTitle: false,
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/Laplace-Labs-inc",
        },
      ],
      customCss: ["./src/styles/laplace-docs.css"],
      // Pagefind is on by default — no Algolia/DocSearch dependency.
      sidebar: [
        { label: "Getting Started", items: [{ autogenerate: { directory: "getting-started" } }] },
        { label: "Concepts", items: [{ autogenerate: { directory: "concepts" } }] },
        { label: "Tutorials", items: [{ autogenerate: { directory: "tutorials" } }] },
        { label: "How-To", items: [{ autogenerate: { directory: "how-to" } }] },
        { label: "Tasks", items: [{ autogenerate: { directory: "tasks" } }] },
        { label: "Reference", items: [{ autogenerate: { directory: "reference" } }] },
      ],
    }),
  ],
});
