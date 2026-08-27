import { readFileSync, readdirSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "dist-gh");
const base = "/diverdb";

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      walk(full);
    } else if (name.endsWith(".html")) {
      let html = readFileSync(full, "utf8");
      html = html.replace(/href="\/(?!diverdb\/)/g, `href="${base}/`);
      html = html.replace(/src="\/(?!diverdb\/)/g, `src="${base}/`);
      writeFileSync(full, html);
    }
  }
}

walk(root);

const robots = join(root, "robots.txt");
try {
  let text = readFileSync(robots, "utf8");
  text = text.replace(
    /Sitemap:.*/,
    `Sitemap: https://ccylhb.github.io${base}/sitemap.xml`
  );
  writeFileSync(robots, text);
  console.log("prefix-gh-links: rewrote links and robots.txt");
} catch {
  console.warn("prefix-gh-links: robots.txt not found");
}
