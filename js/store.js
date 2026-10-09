// App state persisted to localStorage.
import { uid, addToGroceryList } from './parse.js';
import { SAMPLE_RECIPES, STARTER_IDS, STARTER_COOKBOOKS } from './samples.js';

const KEY = 'forkful:v1';
const listeners = new Set();

function defaults() {
  const now = Date.now();
  const recipes = SAMPLE_RECIPES.filter((r) => STARTER_IDS.includes(r.id)).map((r, i) => ({
    ...structuredClone(r),
    id: uid('r'),
    sampleId: r.id,
    createdAt: now - i * 60000,
    cookbookIds: STARTER_COOKBOOKS.filter((c) => c.sampleIds.includes(r.id)).map((c) => c.id),
  }));
  return {
    version: 1,
    recipes,
    cookbooks: STARTER_COOKBOOKS.map(({ sampleIds, ...c }) => c),
    plan: {},
    groceries: [],
    settings: { name: '', units: 'original', theme: 'system', wakeLock: true, useProxy: true, onboarded: false, groceryGroup: 'aisle' },
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw);
      const base = defaults();
      return { ...base, ...data, settings: { ...base.settings, ...(data.settings || {}) } };
    }
  } catch (e) {
    console.warn('Could not load saved data', e);
  }
  return defaults();
}

export const state = load();

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.error(e);
    listeners.forEach((fn) => fn({ error: 'storage' }));
    return false;
  }
  listeners.forEach((fn) => fn({}));
  return true;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ---------- Recipes ----------

export function getRecipe(id) {
  return state.recipes.find((r) => r.id === id) || null;
}

export function emptyRecipe() {
  return {
    id: null, title: '', description: '', image: '', emoji: '', servings: 2, prepTime: null, cookTime: null,
    ingredients: [], instructions: [], tags: [], cookbookIds: [], notes: '', nutrition: null,
    source: { url: '', name: '', platform: '' }, favorite: false, rating: 0, cookedCount: 0, lastCooked: null,
  };
}

export function saveRecipe(recipe) {
  const existing = recipe.id && getRecipe(recipe.id);
  if (existing) Object.assign(existing, recipe, { updatedAt: Date.now() });
  else {
    recipe = { ...emptyRecipe(), ...recipe, id: uid('r'), createdAt: Date.now() };
    state.recipes.unshift(recipe);
  }
  save();
  return existing || recipe;
}

export function updateRecipe(id, patch) {
  const r = getRecipe(id);
  if (!r) return null;
  Object.assign(r, patch);
  save();
  return r;
}

export function deleteRecipe(id) {
  state.recipes = state.recipes.filter((r) => r.id !== id);
  for (const day of Object.keys(state.plan)) {
    state.plan[day] = state.plan[day].filter((e) => e.recipeId !== id);
    if (!state.plan[day].length) delete state.plan[day];
  }
  save();
}

export function saveSample(sample) {
  const existing = state.recipes.find((r) => r.sampleId === sample.id);
  if (existing) return existing;
  const r = { ...emptyRecipe(), ...structuredClone(sample), id: uid('r'), sampleId: sample.id, createdAt: Date.now(), cookbookIds: [] };
  state.recipes.unshift(r);
  save();
  return r;
}

// ---------- Cookbooks ----------

export function getCookbook(id) {
  return state.cookbooks.find((c) => c.id === id) || null;
}

export function saveCookbook(cb) {
  const existing = cb.id && getCookbook(cb.id);
  if (existing) Object.assign(existing, cb);
  else state.cookbooks.push({ ...cb, id: uid('cb') });
  save();
  return existing || state.cookbooks[state.cookbooks.length - 1];
}

export function deleteCookbook(id) {
  state.cookbooks = state.cookbooks.filter((c) => c.id !== id);
  state.recipes.forEach((r) => { r.cookbookIds = (r.cookbookIds || []).filter((c) => c !== id); });
  save();
}

export function toggleRecipeInCookbook(recipeId, cookbookId) {
  const r = getRecipe(recipeId);
  if (!r) return;
  const ids = new Set(r.cookbookIds || []);
  if (ids.has(cookbookId)) ids.delete(cookbookId);
  else ids.add(cookbookId);
  r.cookbookIds = [...ids];
  save();
}

// ---------- Meal plan ----------

export function planAdd(date, entry) {
  (state.plan[date] ||= []).push({ id: uid('p'), meal: 'dinner', servings: null, ...entry });
  save();
}

export function planRemove(date, entryId) {
  state.plan[date] = (state.plan[date] || []).filter((e) => e.id !== entryId);
  if (!state.plan[date].length) delete state.plan[date];
  save();
}

export function planMove(fromDate, entryId, toDate) {
  const entry = (state.plan[fromDate] || []).find((e) => e.id === entryId);
  if (!entry || fromDate === toDate) return;
  planRemove(fromDate, entryId);
  (state.plan[toDate] ||= []).push(entry);
  save();
}

// ---------- Groceries ----------

export function addRecipeToGroceries(recipe, servings, lineIndexes = null) {
  const factor = servings && recipe.servings ? servings / recipe.servings : 1;
  let list = state.groceries;
  let added = 0;
  recipe.ingredients.forEach((line, i) => {
    if (lineIndexes && !lineIndexes.includes(i)) return;
    const before = list;
    list = addToGroceryList(list, line, { factor, recipeId: recipe.id, recipeTitle: recipe.title });
    if (list !== before) added++;
  });
  state.groceries = list;
  save();
  return added;
}

export function addGroceryText(text) {
  state.groceries = addToGroceryList(state.groceries, text);
  save();
}

export function toggleGrocery(id) {
  const g = state.groceries.find((x) => x.id === id);
  if (g) g.checked = !g.checked;
  save();
}

export function removeGrocery(id) {
  state.groceries = state.groceries.filter((g) => g.id !== id);
  save();
}

export function clearGroceries(onlyChecked) {
  state.groceries = onlyChecked ? state.groceries.filter((g) => !g.checked) : [];
  save();
}

// ---------- Settings & data ----------

export function setSetting(key, value) {
  state.settings[key] = value;
  save();
}

export function exportData() {
  return JSON.stringify({ app: 'forkful', exportedAt: new Date().toISOString(), ...state }, null, 2);
}

export function importData(json) {
  const data = JSON.parse(json);
  if (!Array.isArray(data.recipes)) throw new Error('This file does not look like a Forkful backup.');
  state.recipes = data.recipes;
  state.cookbooks = data.cookbooks || [];
  state.plan = data.plan || {};
  state.groceries = data.groceries || [];
  state.settings = { ...state.settings, ...(data.settings || {}) };
  save();
}

export function resetAll() {
  const fresh = defaults();
  Object.keys(state).forEach((k) => delete state[k]);
  Object.assign(state, fresh);
  save();
}
