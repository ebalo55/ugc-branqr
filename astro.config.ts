// @ts-check
import sitemap from "@astrojs/sitemap";
import compress from "@playform/compress";

import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";


// https://astro.build/config
export default defineConfig({
    site: "https://ugc.branqr.com",

    vite: {
        plugins: [ tailwindcss() ],
    },

    integrations: [ sitemap(), compress() ],
});