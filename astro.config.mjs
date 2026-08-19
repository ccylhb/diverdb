import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// Static site output (works with Cloudflare Pages / GitHub Pages for free)
export default defineConfig({
  site: "https://diverdb.pages.dev",
  output: "static",
  compressHTML: true,
  integrations: [sitemap()],
});
