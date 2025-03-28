// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from "@tailwindcss/vite";
import compress from "@playform/compress"

// https://astro.build/config
export default defineConfig({
  site: "https://ugc.branqr.com",

  vite: {
    plugins: [tailwindcss(), compress()],
  },
});