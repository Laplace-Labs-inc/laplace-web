import { defineCollection } from "astro:content";
import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";
import { z } from "astro:content";

// Migrated docs carry a few legacy frontmatter keys (section/order/category/
// last_updated). Extend Starlight's schema so they validate instead of erroring.
export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: z.object({
        section: z.string().optional(),
        order: z.number().optional(),
        category: z.string().optional(),
        last_updated: z.string().optional(),
      }),
    }),
  }),
};
