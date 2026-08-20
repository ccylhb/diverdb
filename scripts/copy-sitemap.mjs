// Copies the generated leaf sitemap to a stable name (sitemap.xml) so Google
// treats it as a fresh submission and fetches it.
import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const src = join(process.cwd(), "dist", "sitemap-0.xml");
const dst = join(process.cwd(), "dist", "sitemap.xml");
const alt = join(process.cwd(), "dist", "sitemap-diverdb.xml");

if (existsSync(src)) {
  copyFileSync(src, dst);
  copyFileSync(src, alt);
  console.log("copied sitemap-0.xml -> sitemap.xml");
  console.log("copied sitemap-0.xml -> sitemap-diverdb.xml");
} else {
  console.warn("sitemap-0.xml not found, skipping copy");
}
