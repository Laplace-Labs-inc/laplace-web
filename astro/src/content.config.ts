import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const docs = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/docs" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    section: z
      .enum(["getting-started", "concepts", "tasks", "reference"])
      .optional(),
    order: z.number().optional(),
  }),
});

const caseStudies = defineCollection({
  loader: glob({
    pattern: "F*.md",
    base: "../../laplace-cloud/docs/Laplace-Labs-Docs/blog/case-studies",
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    slug: z.string(),
    scenario: z.string(),
    library: z.string(),
    author: z.string(),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
    tags: z.array(z.string()),
    cover: z.object({
      image: z.string(),
      alt: z.string(),
      license: z.literal("CC-BY-4.0"),
    }),
    seo: z.object({
      ogImage: z.string(),
      twitterCard: z.literal("summary_large_image"),
      jsonLd: z.record(z.any()),
    }),
    reproRepository: z.string().url(),
    reproRepositoryStatus: z.string(),
    disclosure: z.object({
      status: z.string(),
      notifiedOn: z.string().nullable(),
      publicAfter: z.string().nullable(),
      notes: z.string(),
    }),
    license: z.literal("CC-BY-4.0"),
  }),
});

export const collections = { docs, caseStudies };
