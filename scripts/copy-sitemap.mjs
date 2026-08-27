// Copies the generated leaf sitemap to a stable name (sitemap.xml) so Google
// treats it as a fresh submission and fetches it.
import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const outDir = process.env.DIVERDB_OUT_DIR || "dist";
const src = join(process.cwd(), outDir, "sitemap-0.xml");
const dst = join(process.cwd(), outDir, "sitemap.xml");
const alt = join(process.cwd(), outDir, "sitemap-diverdb.xml");

if (existsSync(src)) {
  copyFileSync(src, dst);
  copyFileSync(src, alt);
  console.log("copied sitemap-0.xml -> sitemap.xml");
  console.log("copied sitemap-0.xml -> sitemap-diverdb.xml");
} else {
  console.warn("sitemap-0.xml not found, skipping copy");
}
