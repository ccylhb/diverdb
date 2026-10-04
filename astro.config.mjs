import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// Static site output (works with Cloudflare Pages / GitHub Pages for free)
export default defineConfig({
  site: "https://diverdb.lootseer.com",
  output: "static",
  compressHTML: true,
  integrations: [sitemap()],
});
