import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// GitHub Pages mirror: https://ccylhb.github.io/diverdb/
export default defineConfig({
  site: "https://ccylhb.github.io",
  base: "/diverdb",
  output: "static",
  compressHTML: true,
  integrations: [sitemap()],
});
