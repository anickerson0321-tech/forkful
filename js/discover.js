// Discover rows: recipes grouped by theme, refreshed weekly.
// "mealdb" rows come from TheMealDB's free API (always available, real photos); "web" rows
// search cooking websites (works best with the person's own import server).
import { recipeFromMealDb } from './parse.js';
import { searchWeb } from './import.js';

export const ROWS = [
  { id: 'crockpot', emoji: '🍲', title: 'Crock Pot & slow cooker', web: 'easy crock pot slow cooker dinner' },
  { id: 'italian', emoji: '🇮🇹', title: 'Italian', mealdb: 'a=Italian' },
  { id: 'chicken', emoji: '🍗', title: 'Chicken dinners', mealdb: 'c=Chicken' },
  { id: 'mexican', emoji: '🌮', title: 'Mexican', mealdb: 'a=Mexican' },
  { id: 'airfryer', emoji: '🔥', title: 'Air fryer', web: 'air fryer dinner' },
  { id: 'pasta', emoji: '🍝', title: 'Pasta night', mealdb: 'c=Pasta' },
  { id: 'soup', emoji: '🥣', title: 'Soups & stews', web: 'easy homemade soup' },
  { id: 'vegetarian', emoji: '🥦', title: 'Vegetarian', mealdb: 'c=Vegetarian' },
  { id: 'onepan', emoji: '🍳', title: 'One-pan & sheet-pan', web: 'one pan sheet pan dinner' },
  { id: 'seafood', emoji: '🐟', title: 'Seafood', mealdb: 'c=Seafood' },
  { id: 'chinese', emoji: '🥡', title: 'Takeout at home', mealdb: 'a=Chinese' },
  { id: 'indian', emoji: '🍛', title: 'Indian', mealdb: 'a=Indian' },
  { id: 'breakfast', emoji: '🥞', title: 'Breakfast', mealdb: 'c=Breakfast' },
  { id: 'dessert', emoji: '🍰', title: 'Desserts', mealdb: 'c=Dessert' },
  { id: 'beef', emoji: '🥩', title: 'Beef', mealdb: 'c=Beef' },
];

const CACHE_KEY = 'forkful:discover:v1';
const PER_ROW = 8;

export function weekNumber(date = new Date()) {
  return Math.floor((date.getTime() - Date.UTC(1970, 0, 5)) / (7 * 86400000));
}

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// Same order all week, new order next week.
export function weeklyPick(list, seed, n) {
  let x = hashString(seed) || 1;
  const rand = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; };
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

function readCache() {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (c && c.week === weekNumber()) return c;
  } catch { /* ignore */ }
  return { week: weekNumber(), rows: {} };
}

function writeCache(c) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch { /* storage full: skip caching */ }
}

export function cachedRow(id) {
  return readCache().rows[id] || null;
}

export function clearDiscoverCache() {
  try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
}

// Every recipe currently in the Discover rows (full recipes only), for "What can I make?".
export function cachedRecipes() {
  return Object.values(readCache().rows).flat().filter((r) => r.ingredients?.length);
}

export function findPreview(id) {
  for (const items of Object.values(readCache().rows)) {
    const hit = items.find((r) => r.id === id);
    if (hit) return hit;
  }
  return readMeals()[id] || null;
}

function saveItem(item) {
  const c = readCache();
  for (const id of Object.keys(c.rows)) c.rows[id] = c.rows[id].map((r) => (r.id === item.id ? item : r));
  writeCache(c);
}

async function getJson(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

// Fills a row. Calls onUpdate(items) as recipes arrive; resolves with the final list.
export async function loadRow(row, { useProxy = true, server = '', onUpdate = () => {} } = {}) {
  const cached = cachedRow(row.id);
  if (cached?.length) { onUpdate(cached); return cached; }
  let items = [];
  if (row.mealdb) {
    const data = await getJson(`https://www.themealdb.com/api/json/v1/1/filter.php?${row.mealdb}`);
    items = weeklyPick(data.meals || [], `${row.id}:${weekNumber()}`, PER_ROW)
      .map((m) => ({ id: `mdb-${m.idMeal}`, mealdbId: m.idMeal, title: m.strMeal, image: m.strMealThumb, ingredients: [], instructions: [] }));
    onUpdate(items);
  } else if (row.web) {
    const byIndex = [];
    await searchWeb(row.web, {
      useProxy,
      server,
      limit: PER_ROW + 2,
      onRecipe: (i, recipe) => {
        if (!recipe) return;
        byIndex[i] = { ...recipe, id: `web-${hashString(recipe.source?.url || recipe.title).toString(36)}` };
        items = byIndex.filter(Boolean).slice(0, PER_ROW);
        onUpdate(items);
      },
    });
  }
  if (items.length >= (row.web ? 3 : 1)) {
    const c = readCache();
    c.rows[row.id] = items;
    writeCache(c);
  }
  onUpdate(items);
  return items;
}

// TheMealDB row items only carry a name and photo; fetch the full recipe when opened.
export async function fullPreview(id) {
  const item = findPreview(id);
  if (!item) return null;
  if (item.ingredients?.length || !item.mealdbId) return item;
  const data = await getJson(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${item.mealdbId}`);
  const meal = data.meals?.[0];
  if (!meal) return item;
  const full = { ...recipeFromMealDb(meal), id: item.id, mealdbId: item.mealdbId };
  saveItem(full);
  return full;
}

// ---------- Recipes by ingredient (for "What can I make?" and plan suggestions) ----------

const MEALS_KEY = 'forkful:meals:v1';

function readMeals() {
  try { return JSON.parse(localStorage.getItem(MEALS_KEY) || '{}'); } catch { return {}; }
}

export function cachedMeals() {
  return Object.values(readMeals());
}

function storeMeals(recipes) {
  const all = { ...readMeals() };
  recipes.forEach((r) => { all[r.id] = r; });
  const ids = Object.keys(all);
  // Keep the cache small.
  ids.slice(0, Math.max(0, ids.length - 200)).forEach((id) => delete all[id]);
  try { localStorage.setItem(MEALS_KEY, JSON.stringify(all)); } catch { /* storage full */ }
}

// TheMealDB names ingredients like "Chicken Thighs"; try the full name, then each word.
function ingredientQueries(name) {
  const words = String(name).toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2);
  return [...new Set([words.join('_'), ...words.slice().reverse()])].filter(Boolean);
}

export async function mealsUsing(names, { perIngredient = 6 } = {}) {
  const have = readMeals();
  const found = [];
  for (const name of names) {
    let list = [];
    for (const q of ingredientQueries(name)) {
      try {
        list = (await getJson(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(q)}`)).meals || [];
      } catch { list = []; }
      if (list.length) break;
    }
    const todo = list.slice(0, perIngredient).filter((m) => !have[`mdb-${m.idMeal}`]);
    const full = await Promise.all(todo.map(async (m) => {
      try {
        const meal = (await getJson(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${m.idMeal}`)).meals?.[0];
        return meal ? { ...recipeFromMealDb(meal), id: `mdb-${m.idMeal}`, mealdbId: m.idMeal } : null;
      } catch { return null; }
    }));
    found.push(...full.filter(Boolean));
  }
  if (found.length) storeMeals(found);
  return found;
}
