import test from 'node:test';
import assert from 'node:assert/strict';
import {
  guessLocation, estimateUseBy, daysLeft, makePantryItem, splitItems, covers, matchRecipe, whatCanIMake,
  suggestPlan, useItUpTip, useSoon, prepIdeas, projectToRecipe,
} from '../js/kitchen.js';
import { normalizeName } from '../js/parse.js';

const TODAY = new Date(2026, 9, 10); // Oct 10 2026
const item = (line, opts = {}) => ({ ...makePantryItem(line, opts.location || null, opts.from || TODAY), ...(opts.useBy !== undefined ? { useBy: opts.useBy } : {}) });

test('guesses where things are stored', () => {
  assert.equal(guessLocation('chicken breasts'), 'fridge');
  assert.equal(guessLocation('chicken broth'), 'pantry');
  assert.equal(guessLocation('peanut butter'), 'pantry');
  assert.equal(guessLocation('butter'), 'fridge');
  assert.equal(guessLocation('frozen peas'), 'freezer');
  assert.equal(guessLocation('bananas'), 'pantry');
  assert.equal(guessLocation('eggplant'), 'fridge');
  assert.equal(guessLocation('green beans'), 'fridge');
  assert.equal(guessLocation('black beans'), 'pantry');
  assert.equal(guessLocation('orange juice'), 'fridge');
  assert.equal(guessLocation('garlic powder'), 'pantry');
  assert.equal(guessLocation('cooked rice'), 'fridge');
  assert.equal(guessLocation('greek yogurt'), 'fridge');
});

test('estimates use-by dates', () => {
  assert.equal(estimateUseBy('chicken breasts', 'fridge', TODAY), '2026-10-12');
  assert.equal(estimateUseBy('chicken breasts', 'freezer', TODAY), '2027-02-07');
  assert.equal(estimateUseBy('milk', 'fridge', TODAY), '2026-10-17');
  assert.equal(estimateUseBy('rice', 'pantry', TODAY), null);
  assert.equal(estimateUseBy('eggs', 'freezer', TODAY), null);
  assert.equal(daysLeft('2026-10-12', TODAY), 2);
  assert.equal(daysLeft('2026-10-09', TODAY), -1);
  assert.equal(daysLeft(null, TODAY), null);
});

test('makes kitchen items from typed text', () => {
  assert.deepEqual(splitItems('2 lb chicken thighs, milk\n1 dozen eggs; 1 (14 oz) can black beans, rinsed'), ['2 lb chicken thighs', 'milk', '1 dozen eggs', '1 (14 oz) can black beans', 'rinsed']);
  const c = item('2 lb chicken thighs');
  assert.equal(c.name, 'chicken thighs');
  assert.equal(c.qty, 2);
  assert.equal(c.unit, 'lb');
  assert.equal(c.location, 'fridge');
  assert.equal(c.useBy, '2026-10-12');
  assert.equal(c.key, normalizeName('chicken thighs'));
  assert.equal(item('rice').useBy, null);
  assert.equal(item('ground beef', { location: 'freezer' }).location, 'freezer');
});

test('matches recipe ingredients to what you have', () => {
  assert.equal(covers('chicken', 'chicken breast'), true);
  assert.equal(covers('parmesan cheese', 'parmesan'), true);
  assert.equal(covers('cream', 'heavy cream'), true);
  assert.equal(covers('chicken', 'pork'), false);
  const recipe = { title: 'Garlic Chicken Pasta', ingredients: ['8 oz spaghetti', '2 boneless chicken breasts', '3 cloves garlic, minced', '1 cup heavy cream', 'salt and pepper to taste', '2 tbsp olive oil', '1/2 cup parmesan'] };
  const pantry = [item('spaghetti'), item('1 lb chicken breast', { useBy: '2026-10-11' }), item('garlic'), item('parmesan cheese')];
  const m = matchRecipe(recipe, pantry, { today: TODAY });
  assert.equal(m.total, 5); // salt/pepper and oil count as basics
  assert.deepEqual(m.missing, ['1 cup heavy cream']);
  assert.equal(m.have.length, 4);
  assert.equal(m.usesSoon, 1);
  assert.equal(matchRecipe(recipe, pantry, { today: TODAY, assumeBasics: false }).missing.length, 3);
});

test('ranks what you can make and plans a few days', () => {
  const recipes = [
    { title: 'Chicken Fried Rice', ingredients: ['2 cups cooked rice', '2 eggs', '1 cup chicken, diced', '1 carrot', '2 tbsp soy sauce'] },
    { title: 'Beef Tacos', ingredients: ['1 lb ground beef', '8 tortillas', '1 cup cheddar', '1 avocado'] },
    { title: 'Omelette', ingredients: ['3 eggs', '1/4 cup cheddar', 'salt'] },
    { title: 'Lobster Thermidor', ingredients: ['2 lobsters', '1 cup brandy', '1 cup cream', 'gruyere'] },
    { title: 'Chicken Soup', ingredients: ['1 lb chicken', '2 carrots', '1 onion', '6 cups chicken broth'] },
  ];
  const pantry = [item('rice'), item('eggs'), item('chicken thighs', { useBy: '2026-10-11' }), item('carrots'), item('soy sauce'), item('cheddar cheese'), item('onion')];
  const ranked = whatCanIMake(recipes, pantry, { today: TODAY });
  assert.deepEqual(ranked.map((m) => m.recipe.title), ['Chicken Fried Rice', 'Omelette', 'Chicken Soup']);
  assert.equal(ranked[0].missing.length, 0);
  assert.ok(!ranked.some((m) => m.recipe.title === 'Lobster Thermidor'));
  assert.ok(!ranked.some((m) => m.recipe.title === 'Beef Tacos')); // only the cheese matches

  const withDessert = [...recipes, { title: 'Chocolate Chip Cookies', ingredients: ['2 eggs', '2 cups flour', '1 cup sugar'] }, { title: 'Rice Pudding', tags: ['dessert'], ingredients: ['1 cup rice', '2 cups milk'] }];
  assert.ok(!suggestPlan(withDessert, [...pantry, item('flour'), item('milk')], { days: 7, today: TODAY }).some((m) => /cookie|pudding/i.test(m.recipe.title)));
  const plan = suggestPlan(recipes, pantry, { days: 3, today: TODAY });
  assert.equal(plan.length, 3);
  assert.equal(plan[0].recipe.title, 'Chicken Fried Rice'); // uses the chicken that's about to go off
  // Doesn't plan two chicken dinners back to back when other options exist.
  assert.notEqual(plan[1].recipe.title, 'Chicken Soup');
});

test('use-it-up tips and soon-to-expire items', () => {
  assert.match(useItUpTip('ripe bananas').tip, /banana bread/);
  assert.equal(useItUpTip('ripe bananas').search, 'banana bread');
  assert.match(useItUpTip('mystery jar').tip, /freeze/);
  const pantry = [item('milk', { useBy: '2026-10-12' }), item('spinach', { useBy: '2026-10-09' }), item('rice'), item('cheddar', { useBy: '2026-11-01' })];
  assert.deepEqual(useSoon(pantry, { today: TODAY }).map((i) => [i.name, i.left]), [['spinach', -1], ['milk', 2]]);
});

test('suggests prep projects from what you have', () => {
  const pantry = [item('tortillas'), item('black beans'), item('rice'), item('cheddar'), item('eggs'), item('spinach', { useBy: '2026-10-11' }), item('bananas', { useBy: '2026-10-11' }), item('flour')];
  const ideas = prepIdeas(pantry, { today: TODAY });
  const ids = ideas.map((i) => i.project.id);
  assert.ok(ids.includes('burritos'));
  assert.ok(ids.includes('egg-muffins'));
  assert.ok(ids.includes('smoothie-packs'));
  assert.ok(ids.includes('banana-bread'));
  assert.ok(!ids.includes('chili'));
  assert.ok(ids.indexOf('smoothie-packs') < ids.indexOf('burritos')); // uses soon-to-expire items first
  const burritos = ideas.find((i) => i.project.id === 'burritos');
  assert.deepEqual(burritos.uses.map((u) => u.name).sort(), ['black beans', 'cheddar', 'eggs', 'rice', 'tortillas']);
  const r = projectToRecipe(burritos);
  assert.equal(r.title, 'Freezer burritos');
  assert.equal(r.ingredients.length, 5);
  assert.ok(r.instructions.length >= 3);
});
