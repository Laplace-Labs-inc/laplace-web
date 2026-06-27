import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Served at the root of admin-staging.laplace-labs.com (own subdomain).
  base: "/",
  plugins: [tailwindcss(), react()],
  server: {
    port: 5175,
    // Allow importing the shared design-token CSS from the repo root (../shared).
    fs: { allow: [".."] },
    allowedHosts: true,
  },
  preview: {
    port: 5175,
    allowedHosts: true,
  },
});
