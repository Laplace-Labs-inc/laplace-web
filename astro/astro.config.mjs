import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";

export default defineConfig({
  site: "https://laplace-labs.com",
  output: "static",
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [react()],
});
