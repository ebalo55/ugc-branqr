import { glob } from "astro/loaders";
import { defineCollection, z } from "astro:content";

const content_schema = z.object({
    id: z.number().describe("Unique identifier for the content"),
    crypt_data: z.string().describe("Encrypted data describing the content"),
})

const static_content = defineCollection({
    loader: glob({pattern: "**/*.json", base: "./src/content/static"}),
    schema: content_schema,
});
const dynamic_content = defineCollection({
    loader: glob({pattern: "**/*.json", base: "./src/content/static"}),
    schema: content_schema,
});

const images = defineCollection({
    loader: glob({pattern: "*.png", base: "./src/content/image"}),
    schema: ({image}) => image(),
})

export const collections = {static_content, dynamic_content, images};