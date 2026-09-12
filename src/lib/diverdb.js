// DiverDB 共享工具 + 派生索引
// 注意：.astro 的 frontmatter 每次页面渲染都会执行，重计算必须放在本模块（ES 模块只求值一次），
// 否则 572 页的静态构建会从 30s 膨胀到 280s+。
import fishData from "../data/fish.json";
import recipeData from "../data/recipes.json";

/* ---------------- 基础工具 ---------------- */

export function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function parseIngredient(part) {
  const raw = String(part || "").split("|")[0].trim();
  if (!raw) return null;
  const m = raw.match(/^([\d.]+)\s+(.+)$/);
  if (m) return { qty: m[1], name: m[2].trim() };
  return { qty: "", name: raw };
}

export function parseIngredients(str) {
  return String(str || "")
    .split(";")
    .map(parseIngredient)
    .filter(Boolean);
}

// 鱼的 recipes 字段可能带 `|card_number=0108` 元数据尾巴，也可能两条菜名粘连，
// 用「已知菜名最长前缀贪心切分」恢复。
export function splitDishTitles(str, knownTitles) {
  const known = knownTitles instanceof Set ? knownTitles : new Set(knownTitles || []);
  const cleaned = String(str || "")
    .split(";")
    .map((p) => p.split("|")[0].trim())
    .filter(Boolean);
  const out = [];
  for (const chunk of cleaned) {
    if (known.has(chunk)) {
      out.push(chunk);
      continue;
    }
    const parts = [];
    let rest = chunk;
    let guard = 0;
    while (rest && guard++ < 12) {
      let best = "";
      for (const t of known) {
        if (t.length > best.length && rest.startsWith(t)) best = t;
      }
      if (!best) break;
      parts.push(best);
      rest = rest.slice(best.length).trim();
    }
    if (parts.length) {
      out.push(...parts);
      if (rest) out.push(rest);
    } else {
      out.push(chunk);
    }
  }
  return [...new Set(out)];
}

export function primaryZone(item) {
  const cats = (item && item.categories) || [];
  return cats.find((c) => c !== "Fish" && c !== "Bosses" && c !== "Recipes") || item.source || "Unknown";
}

export function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/* ---------------- 派生索引（模块级，只算一次） ---------------- */

export { fishData, recipeData };

export const fishByTitle = new Map(fishData.map((f) => [f.title, f]));
export const recipeByTitle = new Map(recipeData.map((r) => [r.title, r]));
export const dishTitles = new Set(recipeData.map((r) => r.title));
export const zoneOfFish = new Map(fishData.map((f) => [f.title, primaryZone(f)]));
export const fishSlugByTitle = new Map(fishData.map((f) => [f.title, slugify(f.title)]));
export const recipeSlugByTitle = new Map(recipeData.map((r) => [r.title, slugify(r.title)]));

export const byWorth = (a, b) => num(b.maxprice) - num(a.maxprice);
export const recipesByWorth = [...recipeData].sort(byWorth);

export const ingredientNames = new Map(
  recipeData.map((r) => [r.title, parseIngredients(r.ingredients).map((i) => i.name)])
);

export const maxPriceSite = Math.max(...recipeData.map((r) => num(r.maxprice)));
export const maxTasteSite = Math.max(...recipeData.map((r) => num(r.maxtaste)));

// 按「每天肉产量」排序的全部鱼
export const fishByMeatPerDay = [...fishData].sort((a, b) => num(b.meat_per_day) - num(a.meat_per_day));

// zone -> Set(鱼名)，惰性构建并缓存
const zoneFishCache = new Map();
export function fishTitlesInZone(zone) {
  if (!zoneFishCache.has(zone)) {
    zoneFishCache.set(zone, new Set(fishData.filter((f) => zoneOfFish.get(f.title) === zone).map((f) => f.title)));
  }
  return zoneFishCache.get(zone);
}

// zone -> 按日产肉排序的鱼列表（详情页对比表用）
const fishByZoneCache = new Map();
export function fishInZoneByMeat(zone) {
  if (!fishByZoneCache.has(zone)) {
    fishByZoneCache.set(zone, fishByMeatPerDay.filter((f) => zoneOfFish.get(f.title) === zone));
  }
  return fishByZoneCache.get(zone);
}

/* ---------------- 菜谱「同类对比」倒排索引（模块级，只建一次） ---------------- */

// 食材名 -> 使用它的菜名列表
const byIngredient = new Map();
for (const r of recipeData) {
  for (const n of new Set(ingredientNames.get(r.title) || [])) {
    if (!byIngredient.has(n)) byIngredient.set(n, []);
    byIngredient.get(n).push(r.title);
  }
}

// 解锁来源 -> 菜列表（按价值降序）
const byAcquired = new Map();
for (const r of recipeData) {
  const k = r.acquired || "";
  if (!byAcquired.has(k)) byAcquired.set(k, []);
  byAcquired.get(k).push(r);
}
for (const list of byAcquired.values()) list.sort(byWorth);

// 区域 -> 用该区域鱼做的菜列表（按价值降序）
const recipesByZone = new Map();
for (const r of recipeData) {
  const f = r.acquired ? fishByTitle.get(r.acquired) : null;
  const z = f ? zoneOfFish.get(f.title) : null;
  if (!z) continue;
  if (!recipesByZone.has(z)) recipesByZone.set(z, []);
  recipesByZone.get(z).push(r);
}
for (const list of recipesByZone.values()) list.sort(byWorth);

const ingFishOf = (r) => {
  const names = ingredientNames.get(r.title) || [];
  for (const n of names) {
    const f = fishByTitle.get(n);
    if (f) return f;
  }
  return null;
};

// 分层回退：①共用食材 ②同解锁来源 ③同区域鱼产出的菜 ④兜底高价菜
// 单食材寿司（72 道）没有共用食材的菜，靠第③层拿到同区域主题内链。
export function recipePeers(r, limit = 8) {
  const seen = new Set([r.title]);
  const out = [];
  let mode = "shared";
  const add = (list, m) => {
    for (const x of list) {
      if (out.length >= limit) return;
      if (!x || seen.has(x.title)) continue;
      seen.add(x.title);
      out.push(x);
      if (out.length === 1) mode = m;
    }
  };

  const names = new Set(ingredientNames.get(r.title) || []);
  const counts = new Map();
  for (const n of names) {
    for (const t of byIngredient.get(n) || []) counts.set(t, (counts.get(t) || 0) + 1);
  }
  add(
    [...counts.entries()]
      .map(([t, s]) => ({ x: recipeByTitle.get(t), s }))
      .filter((o) => o.x)
      .sort((a, b) => b.s - a.s || byWorth(a.x, b.x))
      .map((o) => o.x),
    "shared"
  );

  if (r.acquired) add(byAcquired.get(r.acquired) || [], "unlock");

  const ingFish = ingFishOf(r);
  const zone = ingFish ? zoneOfFish.get(ingFish.title) : null;
  if (out.length < limit && zone) add(recipesByZone.get(zone) || [], "zone");

  if (out.length === 0) add(recipesByWorth, "top");

  const heading =
    mode === "zone"
      ? `Other dishes made from ${zone}`
      : mode === "unlock"
        ? `Other dishes unlocked through ${r.acquired}`
        : mode === "top"
          ? "Highest-value dishes to compare against"
          : `Similar dishes to ${r.title}`;
  const note =
    mode === "zone"
      ? `Every dish here uses a fish caught in the ${zone}. Species in the same zone share spawn windows and dive routes.`
      : mode === "shared"
        ? `Dishes that share an ingredient with ${r.title}.`
        : mode === "unlock"
          ? `Dishes grouped by the same unlock source.`
          : `The highest-value dishes in the database.`;

  return { rows: out.slice(0, limit), mode, heading, note };
}

