// "My Kitchen": what's in the fridge, freezer and pantry, and suggestions built from it.
// Pure functions (no DOM) so they can be unit tested. Suggestions are rule-based.
import { parseIngredient, normalizeName, categorize, uid } from './parse.js';

export const LOCATIONS = [
  { id: 'fridge', label: 'Fridge', emoji: '🧊' },
  { id: 'freezer', label: 'Freezer', emoji: '❄️' },
  { id: 'pantry', label: 'Pantry & counter', emoji: '🥫' },
];

// How long things keep, in days, by where they're stored. 0 = not recommended there.
// Order matters: the first match wins, so specific items ("chicken broth", "peanut butter",
// "eggplant") come before general ones ("chicken", "butter", "egg").
const SHELF = [
  { kw: ['frozen', 'ice cream'], loc: 'freezer', days: { freezer: 180, fridge: 2 } },
  { kw: ['eggplant', 'aubergine', 'green bean', 'string bean'], loc: 'fridge', days: { fridge: 6, freezer: 240 } },
  { kw: ['juice'], loc: 'fridge', days: { fridge: 7, freezer: 180 } },
  { kw: ['leftover', 'cooked', 'soup', 'stew', 'chili con'], loc: 'fridge', days: { fridge: 4, freezer: 90 } },
  { kw: ['broth', 'stock', 'bouillon', 'canned', 'can of', 'bean', 'chickpea', 'lentil', 'peanut butter', 'soy sauce', 'sauce', 'paste', 'powder', 'seasoning', 'flour', 'sugar', 'cornstarch', 'corn starch', 'rice', 'pasta', 'spaghetti', 'noodle', 'oats', 'oil', 'vinegar', 'honey', 'syrup', 'spice', 'cereal', 'cracker', 'nut', 'almond', 'chips', 'baking', 'vanilla', 'cocoa', 'chocolate', 'coffee', 'tea', 'salt', 'pepper flakes', 'black pepper', 'ground pepper'], loc: 'pantry', days: { pantry: 365, fridge: 365 } },
  { kw: ['yogurt', 'sour cream', 'cream cheese', 'cottage cheese', 'ricotta', 'hummus'], loc: 'fridge', days: { fridge: 14, freezer: 60 } },
  { kw: ['ground beef', 'ground turkey', 'ground pork', 'mince', 'chicken', 'turkey', 'pork', 'sausage'], loc: 'fridge', days: { fridge: 2, freezer: 120 } },
  { kw: ['steak', 'beef', 'lamb', 'roast'], loc: 'fridge', days: { fridge: 4, freezer: 180 } },
  { kw: ['salmon', 'fish', 'shrimp', 'prawn', 'cod', 'tilapia', 'scallop', 'crab'], loc: 'fridge', days: { fridge: 2, freezer: 90 } },
  { kw: ['bacon', 'ham', 'deli', 'salami', 'hot dog', 'pepperoni'], loc: 'fridge', days: { fridge: 7, freezer: 60 } },
  { kw: ['milk', 'buttermilk', 'half and half', 'cream', 'heavy cream'], loc: 'fridge', days: { fridge: 7, freezer: 90 } },
  { kw: ['cheese', 'parmesan', 'cheddar', 'mozzarella', 'feta'], loc: 'fridge', days: { fridge: 21, freezer: 120 } },
  { kw: ['butter'], loc: 'fridge', days: { fridge: 45, freezer: 180 } },
  { kw: ['egg'], loc: 'fridge', days: { fridge: 28 } },
  { kw: ['tofu'], loc: 'fridge', days: { fridge: 5, freezer: 90 } },
  { kw: ['spinach', 'lettuce', 'kale', 'arugula', 'salad', 'herbs', 'cilantro', 'parsley', 'basil', 'mint', 'dill', 'green onion', 'scallion'], loc: 'fridge', days: { fridge: 5, freezer: 90 } },
  { kw: ['berries', 'berry', 'strawberr', 'blueberr', 'raspberr', 'grape'], loc: 'fridge', days: { fridge: 5, freezer: 240 } },
  { kw: ['mushroom', 'zucchini', 'bell pepper', 'cucumber', 'broccoli', 'cauliflower', 'green bean', 'asparagus', 'celery', 'corn'], loc: 'fridge', days: { fridge: 6, freezer: 240 } },
  { kw: ['carrot', 'cabbage', 'beet', 'radish'], loc: 'fridge', days: { fridge: 21, freezer: 240 } },
  { kw: ['apple', 'lemon', 'lime', 'orange'], loc: 'fridge', days: { fridge: 28, pantry: 7 } },
  { kw: ['banana', 'avocado', 'tomato', 'peach', 'pear', 'mango', 'pineapple', 'melon'], loc: 'pantry', days: { pantry: 5, fridge: 7, freezer: 180 } },
  { kw: ['onion', 'potato', 'sweet potato', 'garlic', 'shallot', 'squash'], loc: 'pantry', days: { pantry: 30, fridge: 30 } },
  { kw: ['bread', 'tortilla', 'bagel', 'bun', 'roll', 'pita', 'naan'], loc: 'pantry', days: { pantry: 5, fridge: 10, freezer: 90 } },
  { kw: ['mayo', 'mayonnaise', 'ketchup', 'mustard', 'salsa', 'pesto', 'jam'], loc: 'fridge', days: { fridge: 60 } },
];

const DEFAULT_DAYS = { fridge: 7, freezer: 120, pantry: 180 };

function shelfEntry(name) {
  const n = ` ${String(name).toLowerCase()} `;
  return SHELF.find((e) => e.kw.some((k) => n.includes(` ${k}`))) || null;
}

export function guessLocation(name) {
  const entry = shelfEntry(name);
  if (entry) return entry.loc;
  const aisle = categorize(name);
  if (aisle === 'Frozen') return 'freezer';
  if (['Meat & Seafood', 'Dairy & Eggs', 'Produce'].includes(aisle)) return 'fridge';
  return 'pantry';
}

export function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Estimated "use by" date, or null for things that keep for ages.
export function estimateUseBy(name, location, from = new Date()) {
  const entry = shelfEntry(name);
  const days = entry ? entry.days[location] ?? (location === 'freezer' ? 0 : DEFAULT_DAYS[location]) : DEFAULT_DAYS[location];
  if (!days || days >= 180) return null;
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return ymd(d);
}

export function daysLeft(useBy, today = new Date()) {
  if (!useBy) return null;
  const [y, m, d] = useBy.split('-').map(Number);
  const t = new Date(today);
  t.setHours(0, 0, 0, 0);
  return Math.round((new Date(y, m - 1, d) - t) / 86400000);
}

export function makePantryItem(line, location = null, from = new Date()) {
  const p = parseIngredient(line);
  if (p.isHeader || !p.name) return null;
  const name = p.name.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  const loc = location || guessLocation(name);
  return {
    id: uid('k'),
    name,
    key: normalizeName(name),
    qty: p.qty,
    unit: p.unit,
    unitText: p.unitText,
    location: loc,
    added: from.getTime(),
    useBy: estimateUseBy(name, loc, from),
  };
}

// "2 lb chicken, milk, a dozen eggs" -> several lines.
export function splitItems(text) {
  return String(text).split(/\n|,(?![^(]*\))|;/).map((s) => s.trim()).filter(Boolean);
}

// ---------- Matching recipes to what's in the kitchen ----------

// With "assume basics" on, these (and anything in the spice aisle) count as on hand.
const BASICS = ['salt', 'pepper', 'black pepper', 'kosher salt', 'sea salt', 'water', 'ice', 'oil', 'olive oil', 'vegetable oil', 'canola oil', 'cooking spray',
  'baking soda', 'baking powder', 'vanilla', 'vanilla extract', 'sugar', 'garlic powder', 'onion powder'];

function isBasic(key) {
  return BASICS.some((b) => key === normalizeName(b)) || /^(salt|pepper)( and (salt|pepper))?( to taste)?$/.test(key) || /^salt and pepper/.test(key)
    || categorize(key) === 'Spices & Seasonings';
}

// Does a kitchen item cover this ingredient? "chicken" covers "chicken breast",
// "parmesan cheese" covers "parmesan", "heavy cream" is covered by "cream".
export function covers(itemKey, ingredientKey) {
  if (!itemKey || !ingredientKey) return false;
  const a = ` ${itemKey} `;
  const b = ` ${ingredientKey} `;
  return b.includes(a) || a.includes(b);
}

function ingredientsOf(recipe) {
  return (recipe.ingredients || []).map(parseIngredient).filter((p) => !p.isHeader && p.name)
    .map((p) => ({ line: p.raw, key: normalizeName(p.name) })).filter((i) => i.key);
}

export function matchRecipe(recipe, pantry, { assumeBasics = true, today = new Date() } = {}) {
  const items = pantry.map((it) => ({ ...it, key: it.key || normalizeName(it.name), left: daysLeft(it.useBy, today) }));
  const have = [];
  const missing = [];
  const usesSoon = new Set();
  for (const ing of ingredientsOf(recipe)) {
    if (assumeBasics && isBasic(ing.key)) continue;
    const hit = items.find((it) => covers(it.key, ing.key));
    if (hit) {
      have.push(ing.line);
      if (hit.left != null && hit.left <= 3) usesSoon.add(hit.id);
    } else {
      missing.push(ing.line);
    }
  }
  const total = have.length + missing.length;
  return { recipe, have, missing, total, score: total ? have.length / total : 0, usesSoon: usesSoon.size };
}

// Recipes you can (nearly) make, best first.
export function whatCanIMake(recipes, pantry, opts = {}) {
  const { maxMissing = 3, minScore = 0.5, limit = 40 } = opts;
  const seen = new Set();
  return recipes
    .filter((r) => r && r.ingredients?.length && !seen.has(r.title.toLowerCase()) && seen.add(r.title.toLowerCase()))
    .map((r) => matchRecipe(r, pantry, opts))
    .filter((m) => m.have.length >= Math.min(2, m.total) && (m.missing.length <= maxMissing || m.score >= minScore))
    .sort((a, b) => a.missing.length - b.missing.length || b.usesSoon - a.usesSoon || b.score - a.score || b.have.length - a.have.length)
    .slice(0, limit);
}

const NOT_DINNER = /\b(cookies?|cakes?|cupcakes?|brownies?|muffins?|banana bread|pies?|tarts?|puddings?|smoothies?|overnight oats|oatmeal|granola|pancakes?|waffles?|french toast|ice cream|fudge|frosting|jam|cobbler|crumble|dessert)\b/i;

// Dinners only: no desserts, baking or breakfasts.
export function isMainMeal(recipe) {
  const tags = [...(recipe.tags || []), ...(recipe.categories || [])].map((t) => String(t).toLowerCase());
  if (tags.some((t) => ['dessert', 'desserts', 'baking', 'breakfast', 'brunch', 'cookies', 'snack', 'drink', 'drinks', 'side'].includes(t))) return false;
  return !NOT_DINNER.test(recipe.title || '');
}

// A few days of dinners that use what's on hand, things about to go off first.
export function suggestPlan(recipes, pantry, { days = 5, ...opts } = {}) {
  const pool = whatCanIMake(recipes.filter(isMainMeal), pantry, { ...opts, maxMissing: 5, minScore: 0.3 });
  const chosen = [];
  const usedProteins = new Set();
  const proteinKeys = (m) => m.have.map((l) => normalizeName(parseIngredient(l).name)).filter((k) => categorize(k) === 'Meat & Seafood');
  while (chosen.length < days && pool.length) {
    pool.sort((a, b) => rank(b) - rank(a));
    const next = pool.shift();
    chosen.push(next);
    proteinKeys(next).forEach((k) => usedProteins.add(k));
  }
  return chosen;

  function rank(m) {
    const reused = proteinKeys(m).filter((k) => usedProteins.has(k)).length;
    return m.usesSoon * 3 + m.score * 4 - m.missing.length * 0.8 - reused * 2.5;
  }
}

// ---------- Stretching food ----------

const USE_UP = [
  { kw: ['banana'], tip: 'Spotty bananas are perfect for banana bread or pancakes. Or peel, slice and freeze for smoothies.', search: 'banana bread' },
  { kw: ['bread', 'bagel', 'bun', 'roll'], tip: 'Freeze slices to toast straight from frozen, or turn stale bread into croutons, breadcrumbs or French toast.', search: 'french toast' },
  { kw: ['spinach', 'kale', 'lettuce', 'arugula'], tip: 'Wilt greens into pasta, soup or eggs. Spinach and kale freeze well for smoothies.', search: 'spinach pasta' },
  { kw: ['herbs', 'basil', 'parsley', 'cilantro', 'dill', 'mint'], tip: 'Chop and freeze in an ice-cube tray with olive oil, or blend into pesto or chimichurri.', search: 'pesto' },
  { kw: ['berries', 'berry', 'strawberr', 'blueberr', 'raspberr'], tip: 'Freeze on a tray for smoothies, or simmer with a little sugar into a quick jam or compote.', search: 'berry compote' },
  { kw: ['milk', 'cream', 'half and half'], tip: 'Use it in pancakes, a creamy pasta, soup or rice pudding. Milk freezes for 3 months (shake after thawing).', search: 'creamy pasta' },
  { kw: ['yogurt', 'sour cream'], tip: 'Bake it into muffins, marinate chicken in it, or freeze in smoothie packs.', search: 'yogurt marinated chicken' },
  { kw: ['cheese', 'cheddar', 'mozzarella', 'parmesan'], tip: 'Grate and freeze for pizzas and bakes, or make mac and cheese, quesadillas or a frittata.', search: 'mac and cheese' },
  { kw: ['chicken', 'turkey'], tip: 'Cook it today, or freeze it now (portion into bags). Cooked chicken stretches into soup, wraps, fried rice and salads.', search: 'chicken soup' },
  { kw: ['ground beef', 'ground turkey', 'mince'], tip: 'Brown it all at once and freeze in portions for tacos, chili and pasta sauce.', search: 'ground beef chili' },
  { kw: ['beef', 'steak', 'pork', 'lamb'], tip: 'Freeze it now, or slow-cook it so it stretches across several meals.', search: 'slow cooker' },
  { kw: ['fish', 'salmon', 'shrimp', 'cod'], tip: 'Cook it today or freeze it right away. Leftovers make great fish tacos or fried rice.', search: 'fish tacos' },
  { kw: ['rice'], tip: 'Day-old cooked rice makes the best fried rice. Cooked rice freezes for a month.', search: 'fried rice' },
  { kw: ['egg'], tip: 'Hard-boil a batch for snacks, or make egg muffins or a frittata to use up odds and ends.', search: 'frittata' },
  { kw: ['tomato'], tip: 'Roast soft tomatoes into a quick pasta sauce, or blend into salsa or soup.', search: 'roasted tomato sauce' },
  { kw: ['potato', 'sweet potato'], tip: 'Bake a tray to reheat through the week, or make soup, hash or mash (mash freezes well).', search: 'potato soup' },
  { kw: ['zucchini', 'bell pepper', 'mushroom', 'broccoli', 'cauliflower', 'carrot', 'celery', 'green bean', 'asparagus'], tip: 'Roast a tray of veg for bowls and wraps, toss into fried rice or soup, or chop and freeze.', search: 'roasted vegetables' },
  { kw: ['avocado'], tip: 'Mash into guacamole or avocado toast. Ripe avocado halves freeze for smoothies.', search: 'guacamole' },
  { kw: ['apple', 'pear', 'peach'], tip: 'Bake into a crumble, or simmer into a sauce for oatmeal and yogurt.', search: 'apple crumble' },
  { kw: ['leftover', 'cooked', 'soup', 'stew', 'chili'], tip: 'Freeze in single portions for easy lunches, or turn into a wrap, bowl or pasta bake.', search: 'leftovers' },
];

export function useItUpTip(name) {
  const n = ` ${String(name).toLowerCase()} `;
  return USE_UP.find((t) => t.kw.some((k) => n.includes(` ${k}`))) || {
    tip: 'Plan it into a meal in the next day or two, or freeze it if it freezes well.',
    search: String(name),
  };
}

// Items that need using soon (including anything past its date), soonest first.
export function useSoon(pantry, { within = 3, today = new Date() } = {}) {
  return pantry
    .map((it) => ({ ...it, left: daysLeft(it.useBy, today) }))
    .filter((it) => it.left != null && it.left <= within)
    .sort((a, b) => a.left - b.left);
}

// Batch-prep projects that turn what you have into ready meals. Each `need` group must be
// matched by at least one kitchen item; `extra` groups are nice-to-have.
export const PREP_PROJECTS = [
  {
    id: 'burritos', emoji: '🌯', title: 'Freezer burritos',
    need: [['tortilla', 'wrap'], ['bean', 'ground beef', 'ground turkey', 'chicken', 'egg', 'sausage', 'potato']],
    extra: [['rice'], ['cheese', 'cheddar'], ['salsa', 'bell pepper', 'onion']],
    makes: '6–10 burritos', keeps: 'Freezer: 3 months',
    why: 'Grab-and-go breakfasts or lunches from odds and ends.',
    steps: ['Cook your filling (brown meat, scramble eggs or warm beans) with salt, pepper and any spices you like.', 'Let it cool, then fill each tortilla with filling, rice and cheese.', 'Roll tightly, wrap each in foil or cling film and freeze flat.', 'To eat: unwrap, microwave 2–3 minutes, or bake at 400°F for 25 minutes.'],
  },
  {
    id: 'soup', emoji: '🍲', title: 'Big pot of soup',
    need: [['onion', 'carrot', 'celery', 'potato', 'zucchini', 'spinach', 'kale', 'tomato', 'mushroom', 'broccoli'], ['broth', 'stock', 'bouillon', 'chicken', 'bean', 'lentil', 'canned tomato', 'crushed tomato']],
    extra: [['pasta', 'rice', 'potato'], ['garlic'], ['herbs', 'parsley', 'thyme']],
    makes: '6–8 bowls', keeps: 'Fridge: 4 days · Freezer: 3 months',
    why: 'Uses up tired vegetables and stretches a little protein a long way.',
    steps: ['Soften chopped onion, carrot and celery in a big pot with a little oil for 8 minutes.', 'Add garlic and any other chopped veg, then broth or water and a can of tomatoes or beans.', 'Simmer for 20–30 minutes; add pasta, rice or cooked chicken for the last 10.', 'Season, cool, and freeze in single portions.'],
  },
  {
    id: 'fried-rice', emoji: '🍚', title: 'Clean-out-the-fridge fried rice',
    need: [['rice'], ['egg', 'chicken', 'shrimp', 'pork', 'tofu', 'ham', 'bacon', 'carrot', 'pea', 'broccoli', 'bell pepper', 'corn', 'green onion', 'onion', 'cabbage']],
    extra: [['soy sauce'], ['garlic', 'ginger']],
    makes: '4 servings', keeps: 'Fridge: 3 days',
    why: 'Best with day-old rice and whatever bits of veg and protein are left.',
    steps: ['Fry chopped veg and any protein in a hot pan with oil for 4–5 minutes.', 'Push to the side, scramble 2 eggs, then add the cold rice and break it up.', 'Stir-fry for 3–4 minutes with soy sauce, garlic and green onion until hot.'],
  },
  {
    id: 'smoothie-packs', emoji: '🥤', title: 'Smoothie freezer packs',
    need: [['banana', 'berries', 'berry', 'strawberr', 'blueberr', 'mango', 'peach', 'spinach', 'kale', 'pineapple']],
    extra: [['yogurt'], ['oats'], ['peanut butter']],
    makes: '5–7 packs', keeps: 'Freezer: 3 months',
    why: 'Saves fruit and greens before they turn.',
    steps: ['Chop fruit and greens and portion into freezer bags (about 1½ cups each).', 'Add a spoon of oats or peanut butter if you like, squeeze out the air and freeze flat.', 'To use: tip a pack into the blender with milk or yogurt and blend.'],
  },
  {
    id: 'egg-muffins', emoji: '🧁', title: 'Egg muffin cups',
    need: [['egg'], ['spinach', 'bell pepper', 'mushroom', 'onion', 'tomato', 'broccoli', 'ham', 'bacon', 'sausage', 'cheese', 'zucchini', 'kale']],
    extra: [['cheese', 'cheddar', 'feta'], ['milk']],
    makes: '12 cups', keeps: 'Fridge: 4 days · Freezer: 2 months',
    why: 'Quick protein breakfasts that mop up small amounts of veg and cheese.',
    steps: ['Heat the oven to 350°F and grease a 12-cup muffin tin.', 'Whisk 10 eggs with a splash of milk, salt and pepper.', 'Divide chopped veg, meat and cheese between the cups and pour the egg over.', 'Bake 20–22 minutes until set. Cool, then refrigerate or freeze.'],
  },
  {
    id: 'sheet-pan', emoji: '🥘', title: 'Sheet-pan meal prep bowls',
    need: [['chicken', 'sausage', 'tofu', 'salmon', 'chickpea', 'pork'], ['broccoli', 'bell pepper', 'zucchini', 'carrot', 'potato', 'sweet potato', 'cauliflower', 'green bean', 'onion', 'asparagus']],
    extra: [['rice', 'quinoa', 'couscous'], ['lemon', 'garlic']],
    makes: '4 lunches', keeps: 'Fridge: 4 days',
    why: 'One tray, four ready lunches.',
    steps: ['Heat the oven to 425°F. Chop protein and veg into bite-size pieces.', 'Toss with oil, salt, pepper and spices and spread on one or two trays.', 'Roast 20–25 minutes, turning once, until cooked through.', 'Divide into containers with rice or grains.'],
  },
  {
    id: 'pasta-bake', emoji: '🍝', title: 'Freezer pasta bake',
    need: [['pasta', 'penne', 'macaroni', 'spaghetti'], ['tomato sauce', 'crushed tomato', 'canned tomato', 'pasta sauce', 'marinara', 'cheese', 'cream', 'milk']],
    extra: [['ground beef', 'sausage', 'chicken', 'spinach', 'mushroom', 'zucchini'], ['mozzarella', 'cheese', 'parmesan']],
    makes: '6 servings', keeps: 'Fridge: 4 days · Freezer: 3 months',
    why: 'Stretches a little meat or veg into a family-size dinner.',
    steps: ['Cook the pasta 2 minutes short of the packet time.', 'Mix with sauce and any cooked meat or wilted veg.', 'Top with cheese and bake at 375°F for 25 minutes, or cover and freeze unbaked.'],
  },
  {
    id: 'chili', emoji: '🌶️', title: 'Big batch chili',
    need: [['ground beef', 'ground turkey', 'bean', 'lentil'], ['tomato', 'crushed tomato', 'canned tomato', 'tomato sauce', 'salsa']],
    extra: [['onion', 'bell pepper'], ['corn'], ['chili powder', 'cumin']],
    makes: '8 bowls', keeps: 'Fridge: 4 days · Freezer: 4 months',
    why: 'Cheap, filling and freezes brilliantly.',
    steps: ['Brown the meat with chopped onion and pepper.', 'Add chili powder and cumin, then tomatoes and drained beans.', 'Simmer 30 minutes, season, and freeze in portions.'],
  },
  {
    id: 'oats', emoji: '🥣', title: 'Overnight oats jars',
    need: [['oats'], ['milk', 'yogurt']],
    extra: [['banana', 'berries', 'berry', 'apple'], ['peanut butter', 'honey', 'maple syrup', 'chia']],
    makes: '5 jars', keeps: 'Fridge: 4 days',
    why: 'A week of breakfasts in ten minutes.',
    steps: ['In each jar mix ½ cup oats with ½ cup milk and ¼ cup yogurt.', 'Add fruit and a drizzle of honey or a spoon of peanut butter.', 'Lid and refrigerate overnight. Eat cold or warm.'],
  },
  {
    id: 'croutons', emoji: '🍞', title: 'Croutons & breadcrumbs',
    need: [['bread', 'bagel', 'bun', 'roll', 'baguette']],
    extra: [['garlic', 'parmesan'], ['butter', 'olive oil']],
    makes: '1 big jar', keeps: 'Pantry: 2 weeks · Freezer: 3 months',
    why: 'Rescues bread before it goes stale.',
    steps: ['Cut bread into cubes (or blitz into crumbs).', 'Toss with oil or melted butter, salt and garlic powder.', 'Bake at 350°F for 12–15 minutes until crisp. Cool and store airtight.'],
  },
  {
    id: 'roast-veg', emoji: '🥕', title: 'Roasted veg for the week',
    need: [['broccoli', 'carrot', 'bell pepper', 'zucchini', 'sweet potato', 'potato', 'cauliflower', 'onion', 'mushroom', 'squash', 'brussels'], ['broccoli', 'carrot', 'bell pepper', 'zucchini', 'sweet potato', 'potato', 'cauliflower', 'onion', 'mushroom', 'squash', 'brussels']],
    extra: [['garlic'], ['herbs', 'thyme', 'rosemary']],
    makes: '6 cups', keeps: 'Fridge: 5 days',
    why: 'Ready for bowls, wraps, pasta and eggs all week.',
    steps: ['Heat the oven to 425°F. Chop veg into even chunks.', 'Toss with oil, salt and pepper and spread out on trays (don\'t crowd them).', 'Roast 25–35 minutes, turning once. Cool and refrigerate.'],
  },
  {
    id: 'stock', emoji: '🫕', title: 'Stock from scraps',
    need: [['chicken', 'carrot', 'celery', 'onion']],
    extra: [['garlic'], ['herbs', 'parsley', 'thyme', 'bay']],
    makes: '2–3 quarts', keeps: 'Fridge: 5 days · Freezer: 6 months',
    why: 'Free broth from bones and veg trimmings you\'d throw away.',
    steps: ['Put bones and veg scraps in a big pot and cover with water.', 'Simmer gently for 2–3 hours (or 8 hours in a slow cooker).', 'Strain, cool and freeze in containers or ice-cube trays.'],
  },
  {
    id: 'banana-bread', emoji: '🍌', title: 'Banana bread',
    need: [['banana'], ['flour']],
    extra: [['egg'], ['butter', 'oil'], ['sugar', 'brown sugar', 'honey']],
    makes: '1 loaf', keeps: 'Counter: 3 days · Freezer: 3 months',
    why: 'The best use for very ripe bananas.',
    steps: ['Mash 3 ripe bananas and mix with ⅓ cup melted butter, ¾ cup sugar, 1 egg and 1 tsp vanilla.', 'Stir in 1 tsp baking soda, a pinch of salt and 1½ cups flour.', 'Bake in a lined loaf tin at 350°F for 55–60 minutes.'],
  },
];

function groupMatch(group, items) {
  return items.filter((it) => group.some((k) => ` ${it.key} `.includes(` ${normalizeName(k)}`)));
}

// Prep projects you can do with what you have, best first.
export function prepIdeas(pantry, { today = new Date() } = {}) {
  const items = pantry.map((it) => ({ ...it, key: it.key || normalizeName(it.name), left: daysLeft(it.useBy, today) }));
  const out = [];
  for (const p of PREP_PROJECTS) {
    const used = new Set();
    let ok = true;
    for (const g of p.need) {
      const hits = groupMatch(g, items).filter((it) => !used.has(it.id));
      if (!hits.length) { ok = false; break; }
      hits.forEach((it) => used.add(it.id));
    }
    if (!ok) continue;
    p.extra.forEach((g) => groupMatch(g, items).forEach((it) => used.add(it.id)));
    const uses = items.filter((it) => used.has(it.id));
    out.push({ project: p, uses, soon: uses.filter((it) => it.left != null && it.left <= 3).length });
  }
  return out.sort((a, b) => b.soon - a.soon || b.uses.length - a.uses.length);
}

// Turns a prep project into a recipe for the library.
export function projectToRecipe(idea) {
  const p = idea.project;
  return {
    title: p.title,
    emoji: p.emoji,
    description: `${p.why} Makes ${p.makes}. ${p.keeps}.`,
    servings: parseInt(p.makes, 10) || 4,
    ingredients: idea.uses.map((it) => it.name),
    instructions: p.steps,
    tags: ['meal-prep'],
    source: { url: '', platform: 'forkful', name: 'Forkful prep idea' },
  };
}

// Common staples for quick setup.
export const STAPLES = {
  Pantry: ['rice', 'pasta', 'all-purpose flour', 'sugar', 'brown sugar', 'oats', 'olive oil', 'vegetable oil', 'salt', 'black pepper', 'garlic powder', 'onion powder', 'paprika', 'cumin', 'chili powder', 'italian seasoning', 'cinnamon', 'baking soda', 'baking powder', 'vanilla extract', 'soy sauce', 'honey', 'peanut butter', 'canned tomatoes', 'tomato sauce', 'chicken broth', 'black beans', 'chickpeas', 'tortillas', 'bread', 'onions', 'potatoes', 'garlic'],
  Fridge: ['eggs', 'milk', 'butter', 'cheddar cheese', 'parmesan', 'greek yogurt', 'sour cream', 'mayonnaise', 'ketchup', 'mustard', 'carrots', 'celery', 'lemons', 'spinach', 'bell peppers'],
  Freezer: ['frozen peas', 'frozen corn', 'frozen mixed vegetables', 'frozen berries', 'chicken breasts', 'ground beef'],
};
