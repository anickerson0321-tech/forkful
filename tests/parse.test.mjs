import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseIngredient, displayIngredient, formatQuantity, parseISODuration, parseDurationText, findTimers,
  parseRecipeText, extractRecipeFromHtml, categorize, addToGroceryList, groceryAmount, estimateNutrition,
  convertTemperatures, cleanSocialCaption, ingredientsInStep, normalizeName, platformFromUrl,
  recipeFromMealDb, guessDishFromUrl, textFromEmbedHtml, looksLikeLoginWall,
  instagramShortcode, parseInstagramEmbed, describePage, cleanScreenshotText,
  recipeFromMarkup, parseMarkdownRecipe, parseSearchResults, isLikelyRecipeUrl,
} from '../js/parse.js';

test('parses quantities, units, names and notes', () => {
  assert.deepEqual(
    pick(parseIngredient('2 cups all-purpose flour, sifted')),
    { qty: 2, qtyMax: null, unit: 'cup', name: 'all-purpose flour', note: 'sifted' },
  );
  assert.deepEqual(pick(parseIngredient('1 ½ tbsp olive oil')), { qty: 1.5, qtyMax: null, unit: 'tbsp', name: 'olive oil', note: '' });
  assert.deepEqual(pick(parseIngredient('1 1/2 tsp. salt')), { qty: 1.5, qtyMax: null, unit: 'tsp', name: 'salt', note: '' });
  assert.deepEqual(pick(parseIngredient('2-3 cloves garlic, minced')), { qty: 2, qtyMax: 3, unit: 'clove', name: 'garlic', note: 'minced' });
  assert.deepEqual(pick(parseIngredient('1 (14 oz) can coconut milk')), { qty: 1, qtyMax: null, unit: 'can', name: 'coconut milk', note: '14 oz' });
  assert.deepEqual(pick(parseIngredient('3 large eggs')), { qty: 3, qtyMax: null, unit: null, name: 'large eggs', note: '' });
  assert.deepEqual(pick(parseIngredient('a pinch of salt')), { qty: 1, qtyMax: null, unit: 'pinch', name: 'salt', note: '' });
  assert.deepEqual(pick(parseIngredient('Salt and pepper to taste')), { qty: null, qtyMax: null, unit: null, name: 'Salt and pepper to taste', note: '' });
  assert.deepEqual(pick(parseIngredient('- 200g spaghetti')), { qty: 200, qtyMax: null, unit: 'g', name: 'spaghetti', note: '' });
  assert.deepEqual(pick(parseIngredient('1 lemon (zest and juice)')), { qty: 1, qtyMax: null, unit: null, name: 'lemon (zest and juice)', note: '' });
  assert.equal(parseIngredient('For the sauce:').isHeader, true);
  assert.equal(parseIngredient('## Topping').isHeader, true);
});

test('formats and scales quantities', () => {
  assert.equal(formatQuantity(0.5), '½');
  assert.equal(formatQuantity(1.333), '1⅓');
  assert.equal(formatQuantity(2.75), '2¾');
  assert.equal(formatQuantity(0.98), '1');
  assert.equal(formatQuantity(1.17), '1.17');
  const p = parseIngredient('1 ½ cups milk');
  assert.equal(displayIngredient(p, 2).amount, '3 cups');
  assert.equal(displayIngredient(parseIngredient('1 cup milk'), 0.5).amount, '½ cup');
  assert.equal(displayIngredient(p, 1, 'metric').amount, '355 ml');
  assert.equal(displayIngredient(parseIngredient('1 lb ground beef'), 1, 'metric').amount, '455 g');
  assert.equal(displayIngredient(parseIngredient('500 g pasta'), 1, 'us').amount, '1⅛ lb');
  assert.equal(displayIngredient(parseIngredient('250 ml cream'), 1, 'us').amount, '1 cup');
  assert.equal(displayIngredient(parseIngredient('2 tsp vanilla'), 1, 'metric').amount, '2 tsp');
});

test('durations and timers', () => {
  assert.equal(parseISODuration('PT1H30M'), 90);
  assert.equal(parseISODuration('PT45M'), 45);
  assert.equal(parseISODuration('P0DT0H20M'), 20);
  assert.equal(parseDurationText('1 hr 15 mins'), 75);
  assert.equal(parseDurationText('25 minutes'), 25);
  const t = findTimers('Bake for 25-30 minutes, then rest 1 hour.');
  assert.equal(t.length, 2);
  assert.equal(t[0].seconds, 30 * 60);
  assert.equal(t[1].seconds, 3600);
  assert.equal(findTimers('Simmer for a minute').at(0).seconds, 60);
});

test('temperature conversion', () => {
  assert.equal(convertTemperatures('Preheat oven to 350°F.', 'metric'), 'Preheat oven to 350°F (175°C).');
  assert.equal(convertTemperatures('Heat to 200°C', 'us'), 'Heat to 200°C (392°F)');
  assert.equal(convertTemperatures('Heat to 200°C', 'original'), 'Heat to 200°C');
});

test('parses a social caption with headings', () => {
  const caption = `Creamy Garlic Parmesan Orzo 🧄🧀 Save this for dinner tonight!
Serves 4 | Prep 5 mins | Cook 20 mins

Ingredients:
• 2 tbsp butter
• 4 cloves garlic, minced
• 1 ½ cups orzo
• 3 cups chicken broth
• ½ cup parmesan

Method:
1. Melt butter in a pan and sauté garlic for 1 minute.
2. Add orzo and toast for 2 minutes, then pour in broth.
3. Simmer for 12 minutes, stirring often. Stir in parmesan.

#orzo #easydinner #recipe #fyp`;
  const r = parseRecipeText(caption);
  assert.equal(r.title, 'Creamy Garlic Parmesan Orzo');
  assert.equal(r.servings, 4);
  assert.equal(r.prepTime, 5);
  assert.equal(r.cookTime, 20);
  assert.deepEqual(r.ingredients, ['2 tbsp butter', '4 cloves garlic, minced', '1 ½ cups orzo', '3 cups chicken broth', '½ cup parmesan']);
  assert.equal(r.instructions.length, 3);
  assert.match(r.instructions[0], /^Melt butter/);
  assert.deepEqual(r.tags, ['orzo', 'easydinner']);
});

test('parses text without headings heuristically', () => {
  const r = parseRecipeText(`Lazy Banana Pancakes
1 ripe banana
2 eggs
1/4 tsp cinnamon
Mash the banana in a bowl and whisk in the eggs and cinnamon until smooth.
Cook small pancakes in a buttered pan for about 2 minutes per side.`);
  assert.equal(r.title, 'Lazy Banana Pancakes');
  assert.equal(r.ingredients.length, 3);
  assert.equal(r.instructions.length, 2);
});

test('parses a flattened one-line caption (TikTok oEmbed)', () => {
  const r = parseRecipeText('Viral Feta Pasta 🍅🧀 Ingredients: 2 cups cherry tomatoes, 200g feta, 3 tbsp olive oil, 250g pasta. Steps: Roast tomatoes and feta at 400°F for 30 minutes. Stir in the cooked pasta. #fetapasta #fyp');
  assert.equal(r.title, 'Viral Feta Pasta');
  assert.deepEqual(r.ingredients, ['2 cups cherry tomatoes', '200g feta', '3 tbsp olive oil', '250g pasta']);
  assert.deepEqual(r.instructions, ['Roast tomatoes and feta at 400°F for 30 minutes.', 'Stir in the cooked pasta.']);
  const numbered = parseRecipeText('Garlic Bread Ingredients: 1 baguette, 4 tbsp butter, 3 cloves garlic Method: 1. Mix butter and garlic. 2. Spread on the bread. 3. Bake for 10 minutes.');
  assert.equal(numbered.ingredients.length, 3);
  assert.equal(numbered.instructions.length, 3);
});

test('extracts schema.org recipe from HTML', () => {
  const html = `<html><head><script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', name: 'x' },
      {
        '@type': ['Recipe'], name: 'Best Brownies &amp; More', image: [{ url: '/img/b.jpg' }], recipeYield: ['16', '16 brownies'],
        prepTime: 'PT15M', totalTime: 'PT45M', recipeIngredient: ['1 cup sugar', '&frac12; cup butter'],
        recipeInstructions: [
          { '@type': 'HowToSection', name: 'Batter', itemListElement: [{ '@type': 'HowToStep', text: 'Mix it.' }] },
          { '@type': 'HowToStep', text: 'Bake 30 minutes.' },
        ],
        keywords: 'chocolate, dessert', nutrition: { calories: '250 kcal' }, author: { name: 'Jo' },
      },
    ],
  })}</script></head></html>`;
  const r = extractRecipeFromHtml(html, 'https://example.com/recipes/brownies');
  assert.equal(r.method, 'schema');
  assert.equal(r.title, 'Best Brownies & More');
  assert.equal(r.image, 'https://example.com/img/b.jpg');
  assert.equal(r.servings, 16);
  assert.equal(r.prepTime, 15);
  assert.equal(r.cookTime, 30);
  assert.deepEqual(r.ingredients, ['1 cup sugar', '½ cup butter']);
  assert.deepEqual(r.instructions, ['## Batter', 'Mix it.', 'Bake 30 minutes.']);
  assert.deepEqual(r.tags, ['chocolate', 'dessert']);
  assert.equal(r.nutrition.calories, 250);
  assert.equal(r.author, 'Jo');
});

test('falls back to og:description caption', () => {
  const html = `<meta property="og:description" content="1,204 likes, 33 comments - chef on May 1, 2024: &quot;Easy Pesto Pasta&#10;Ingredients:&#10;200g pasta&#10;3 tbsp pesto&#10;Steps:&#10;Boil the pasta until al dente, about 9 minutes.&#10;Toss with pesto and serve.&quot;"><meta property="og:image" content="https://cdn.example/p.jpg">`;
  const r = extractRecipeFromHtml(html, 'https://www.instagram.com/p/abc/');
  assert.equal(r.method, 'caption');
  assert.equal(r.title, 'Easy Pesto Pasta');
  assert.deepEqual(r.ingredients, ['200g pasta', '3 tbsp pesto']);
  assert.equal(r.instructions.length, 2);
  assert.equal(r.image, 'https://cdn.example/p.jpg');
  assert.equal(cleanSocialCaption('5 likes, 0 comments - a on Jan 1, 2025: "hi"'), 'hi');
});

test('aisle categorization picks the head noun', () => {
  assert.equal(categorize('chicken broth'), 'Pantry');
  assert.equal(categorize('boneless chicken thighs'), 'Meat & Seafood');
  assert.equal(categorize('garlic powder'), 'Spices & Seasonings');
  assert.equal(categorize('garlic'), 'Produce');
  assert.equal(categorize('coconut milk'), 'Pantry');
  assert.equal(categorize('whole milk'), 'Dairy & Eggs');
  assert.equal(categorize('cherry tomatoes'), 'Produce');
  assert.equal(categorize('frozen peas'), 'Frozen');
  assert.equal(categorize('sourdough bread'), 'Bakery');
  assert.equal(categorize('unicorn dust'), 'Other');
});

test('grocery list merges compatible items', () => {
  let list = [];
  list = addToGroceryList(list, '1 cup milk', { recipeId: 'a', recipeTitle: 'A' });
  list = addToGroceryList(list, '2 tbsp milk', { recipeId: 'b', recipeTitle: 'B' });
  list = addToGroceryList(list, '2 large eggs', { factor: 2, recipeId: 'a', recipeTitle: 'A' });
  list = addToGroceryList(list, '1 egg', { recipeId: 'b', recipeTitle: 'B' });
  list = addToGroceryList(list, 'Salt to taste');
  list = addToGroceryList(list, 'salt to taste');
  assert.equal(list.length, 3);
  const milk = list.find((i) => i.key === 'milk');
  assert.equal(groceryAmount(milk), '1⅛ cups');
  assert.equal(milk.recipes.length, 2);
  assert.equal(list.find((i) => i.key === 'egg').qty, 5);
  assert.equal(normalizeName('2 Large Tomatoes, diced'), 'tomato');
  let butter = addToGroceryList([], '2 tbsp butter');
  butter = addToGroceryList(butter, '1 cup butter');
  assert.equal(groceryAmount(butter[0]), '1⅛ cups');
  assert.equal(groceryAmount({ qty: 2, unit: 'tsp' }), '2 tsp');
  assert.equal(groceryAmount({ qty: 1500, unit: 'g' }), '1.5 kg');
  assert.equal(groceryAmount({ qty: 1, unit: 'cup' }), '1 cup');
});

test('nutrition estimate', () => {
  const n = estimateNutrition(['2 cups flour', '1 cup sugar', '1/2 cup butter', '2 eggs', '1 tsp salt'], 8);
  assert.ok(n.calories > 300 && n.calories < 450, `calories ${n.calories}`);
  assert.equal(estimateNutrition(['3 mystery things', '1 cup unknown'], 2), null);
});

test('ingredients mentioned in a step', () => {
  const ings = ['2 tbsp butter', '4 cloves garlic, minced', '1 ½ cups orzo'].map(parseIngredient);
  assert.deepEqual(ingredientsInStep('Melt the butter and add garlic.', ings), [0, 1]);
});

test('platform detection', () => {
  assert.equal(platformFromUrl('https://www.tiktok.com/@a/video/1'), 'tiktok');
  assert.equal(platformFromUrl('https://instagram.com/reel/x'), 'instagram');
  assert.equal(platformFromUrl('https://youtu.be/x'), 'youtube');
  assert.equal(platformFromUrl('https://cooking.example.com/r'), 'web');
});

test('maps a recipe search result', () => {
  const r = recipeFromMealDb({
    idMeal: '52772', strMeal: 'Teriyaki Chicken Casserole', strCategory: 'Chicken', strArea: 'Japanese', strTags: 'Meat,Casserole',
    strMealThumb: 'https://www.themealdb.com/images/media/meals/wvpsxx1468256321.jpg', strSource: '',
    strInstructions: 'STEP 1\r\nPreheat oven to 350° F.\r\n\r\nSTEP 2\r\nCombine soy sauce and honey in a pan.',
    strIngredient1: 'soy sauce', strMeasure1: '3/4 cup', strIngredient2: 'honey', strMeasure2: '1/2 cup', strIngredient3: '', strMeasure3: ' ', strIngredient4: null,
  });
  assert.equal(r.title, 'Teriyaki Chicken Casserole');
  assert.deepEqual(r.ingredients, ['3/4 cup soy sauce', '1/2 cup honey']);
  assert.deepEqual(r.instructions, ['Preheat oven to 350° F.', 'Combine soy sauce and honey in a pan.']);
  assert.deepEqual(r.tags, ['chicken', 'japanese', 'meat', 'casserole']);
  assert.equal(r.source.url, 'https://www.themealdb.com/meal/52772');
  assert.equal(r.source.name, 'TheMealDB');
});

test('guesses a dish name from a link', () => {
  assert.equal(guessDishFromUrl('https://www.facebook.com/tastyrecipes/videos/easy-beef-lasagna/1234567890/'), 'easy beef lasagna');
  assert.equal(guessDishFromUrl('https://www.facebook.com/share/r/1AbCdEfGh/'), '');
  assert.equal(guessDishFromUrl('https://www.facebook.com/reel/1234567890'), '');
  assert.equal(guessDishFromUrl('https://cooking.example.com/recipes/12345-crispy-chicken-thighs'), 'crispy chicken thighs');
  assert.equal(guessDishFromUrl('not a url'), '');
});

test('reads post text from an embed page and spots login walls', () => {
  const embed = '<div class="userContent"><p>Garlic Butter Shrimp<br>Ingredients:<br>1 lb shrimp<br>3 tbsp butter</p><p>Steps:<br>Melt butter and cook shrimp for 3 minutes.</p></div>';
  const text = textFromEmbedHtml(embed);
  assert.match(text, /^Garlic Butter Shrimp\nIngredients:/);
  const r = parseRecipeText(text);
  assert.deepEqual(r.ingredients, ['1 lb shrimp', '3 tbsp butter']);
  assert.equal(r.instructions.length, 1);
  assert.equal(looksLikeLoginWall('<html><head><title>Log into Facebook</title></head><body>…</body></html>'), true);
  assert.equal(looksLikeLoginWall('<title>Facebook</title><meta property="og:description" content="Recipe…">'), false);
  assert.equal(looksLikeLoginWall('<title>Best Brownies</title>'), false);
});

test('reads the caption from Instagram embed pages', () => {
  assert.equal(instagramShortcode('https://www.instagram.com/reel/DbO0aBcD123/?igsh=xyz'), 'DbO0aBcD123');
  assert.equal(instagramShortcode('https://instagram.com/p/C1x2y3z4/'), 'C1x2y3z4');
  assert.equal(instagramShortcode('https://www.instagram.com/chef.anna/reel/C9abcdEF/'), 'C9abcdEF');
  assert.equal(instagramShortcode('https://www.instagram.com/chef.anna/'), null);

  const html = `<div class="Embed"><div class="Caption"><a class="CaptionUsername" href="https://www.instagram.com/chef.anna/" target="_blank">chef.anna</a><br /><br />Creamy Tuscan Gnocchi 🍝 Save this!<br /><br />Ingredients:<br />- 1 lb gnocchi<br />- 1 cup heavy cream<br />- 2 cloves garlic<br /><br />Method:<br />1. Boil the gnocchi for 3 minutes.<br />2. Stir in the cream and garlic.<br />#gnocchi #dinner<div class="CaptionComments"><a href="#">View all 120 comments</a></div></div></div>
    <img class="EmbeddedMediaImage" alt="x" src="https://scontent.cdninstagram.com/v/t51/abc.jpg?a=1&amp;b=2">`;
  const ig = parseInstagramEmbed(html);
  assert.equal(ig.author, 'chef.anna');
  assert.equal(ig.image, 'https://scontent.cdninstagram.com/v/t51/abc.jpg?a=1&b=2');
  const r = parseRecipeText(ig.caption);
  assert.equal(r.title, 'Creamy Tuscan Gnocchi');
  assert.deepEqual(r.ingredients, ['1 lb gnocchi', '1 cup heavy cream', '2 cloves garlic']);
  assert.equal(r.instructions.length, 2);
  assert.doesNotMatch(ig.caption, /View all|chef\.anna/);

  // Caption only in the (double-escaped) JSON blob.
  const inner = JSON.stringify({ shortcode_media: { owner: { username: 'pasta.queen' }, edge_media_to_caption: { edges: [{ node: { text: 'Lemon Orzo\nIngredients:\n1 cup orzo\n1 lemon' } }] } } });
  const json = `<script>window.__additionalDataLoaded('extra',{"contextJSON":${JSON.stringify(inner)}});</script>`;
  const ig2 = parseInstagramEmbed(json);
  assert.equal(ig2.caption, 'Lemon Orzo\nIngredients:\n1 cup orzo\n1 lemon');
  assert.equal(ig2.author, 'pasta.queen');
  assert.equal(parseInstagramEmbed('<html><title>Instagram</title></html>').caption, '');
});

test('cleans social-app clutter out of screenshot text', () => {
  const ocr = `chef.anna • Follow
Original audio
Liked by sam and 2,301 others
chef.anna Creamy Tuscan Gnocchi
Ingredients:
- 1 lb gnocchi
- 1 cup heavy cream
Method:
1. Boil the gnocchi for 3 minutes.
2. Stir in the cream... more
View all 120 comments
2d
See translation`;
  const cleaned = cleanScreenshotText(ocr);
  assert.doesNotMatch(cleaned, /Follow|Liked by|View all|See translation|Original audio|^2d$/m);
  const r = parseRecipeText(cleaned);
  assert.equal(r.title, 'Creamy Tuscan Gnocchi');
  assert.deepEqual(r.ingredients, ['1 lb gnocchi', '1 cup heavy cream']);
  assert.deepEqual(r.instructions, ['Boil the gnocchi for 3 minutes.', 'Stir in the cream']);
  // Handle prefix stripped even without a "• Follow" line; ordinary words are kept.
  assert.equal(cleanScreenshotText('the_lazy.cook Easy Banana Bread'), 'Easy Banana Bread');
  assert.equal(cleanScreenshotText('Grandma Easy Banana Bread'), 'Grandma Easy Banana Bread');
  assert.equal(cleanScreenshotText('2 cups flour'), '2 cups flour');
});

test('summarizes fetched pages for the Details view', () => {
  const d = describePage(`<title>Log into Facebook</title>${'x'.repeat(3000)}`);
  assert.match(d, /title "Log into Facebook"/);
  assert.match(d, /no preview text/);
  assert.match(d, /login page/);
  assert.match(describePage('<title>Post</title><meta property="og:description" content="Best chili &amp; cornbread">'), /preview text "Best chili & cornbread"/);
});

test('reads recipe-card markup when a page has no structured data', () => {
  const html = `<html><head><meta property="og:title" content="Easy Banana Muffins | Sally's Kitchen"><meta property="og:image" content="/img/m.jpg"></head><body>
    <div class="wprm-recipe"><span class="wprm-recipe-servings-container">Servings: 12 muffins</span>
    <ul class="wprm-recipe-ingredients"><li class="wprm-recipe-ingredient"><span class="wprm-recipe-ingredient-amount">2</span> <span class="wprm-recipe-ingredient-unit">cups</span> <span class="wprm-recipe-ingredient-name">all-purpose flour</span></li>
    <li class="wprm-recipe-ingredient"><span>3</span> <span>ripe bananas</span>, <span class="wprm-recipe-ingredient-notes">mashed</span></li>
    <li class="wprm-recipe-ingredient"><span>1</span> <span>tsp</span> <span>baking soda</span></li></ul>
    <ul class="wprm-recipe-instructions"><li class="wprm-recipe-instruction"><div class="wprm-recipe-instruction-text">Preheat the oven to 350°F.</div></li>
    <li class="wprm-recipe-instruction"><div class="wprm-recipe-instruction-text">Bake for 20 minutes.</div></li></ul></div></body></html>`;
  const r = recipeFromMarkup(html, 'https://sally.example/banana-muffins/');
  assert.equal(r.title, 'Easy Banana Muffins');
  assert.deepEqual(r.ingredients, ['2 cups all-purpose flour', '3 ripe bananas , mashed', '1 tsp baking soda']);
  assert.deepEqual(r.instructions, ['Preheat the oven to 350°F.', 'Bake for 20 minutes.']);
  assert.equal(r.image, 'https://sally.example/img/m.jpg');
  assert.equal(r.servings, 12);
  assert.equal(extractRecipeFromHtml(html, 'https://sally.example/x').method, 'markup');
  assert.equal(recipeFromMarkup('<ul><li class="nav-item">Home</li></ul>'), null);
});

test('reads a recipe from a page converted to Markdown', () => {
  const md = `Title: Best Chocolate Chip Cookies

URL Source: https://cookies.example/best

Markdown Content:
![photo](https://cookies.example/a.jpg)
Jump to Recipe · Print
## Ingredients
* 1 cup **butter**, softened
* 2 cups [all-purpose flour](https://cookies.example/flour)
* 1 tsp salt
### For the topping
* flaky sea salt
## Directions
1. Preheat the oven to 350°F.
2. Mix everything and bake for 10 minutes.
## Nutrition Facts
Calories 200
## Reviews
* Loved these!`;
  const r = parseMarkdownRecipe(md);
  assert.equal(r.title, 'Best Chocolate Chip Cookies');
  assert.deepEqual(r.ingredients, ['1 cup butter, softened', '2 cups all-purpose flour', '1 tsp salt', '## For the topping', 'flaky sea salt']);
  assert.deepEqual(r.instructions, ['Preheat the oven to 350°F.', 'Mix everything and bake for 10 minutes.']);
  assert.equal(parseMarkdownRecipe('Title: Hi\n\nJust a blog post.'), null);
});

test('parses web search results and keeps recipe pages', () => {
  const rss = `<?xml version="1.0"?><rss><channel><title>Bing</title>
    <item><title>Chicken Alfredo Recipe</title><link>https://www.allrecipes.com/recipe/23431/to-die-for-fettuccine-alfredo/</link><description>Creamy &amp; easy.</description></item>
    <item><title>Alfredo video</title><link>https://www.youtube.com/watch?v=abc</link><description>x</description></item>
    <item><title>Best Alfredo</title><link>https://www.budgetbytes.com/chicken-alfredo/</link><description>y</description></item>
  </channel></rss>`;
  const r = parseSearchResults(rss);
  assert.deepEqual(r.map((x) => x.site), ['allrecipes.com', 'budgetbytes.com']);
  assert.equal(r[0].snippet, 'Creamy & easy.');
  const ddg = '<a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.seriouseats.com%2Ffettuccine-alfredo&amp;rut=1">Fettuccine <b>Alfredo</b></a>';
  assert.deepEqual(parseSearchResults(ddg), [{ title: 'Fettuccine Alfredo', url: 'https://www.seriouseats.com/fettuccine-alfredo', snippet: '', site: 'seriouseats.com' }]);
  assert.equal(isLikelyRecipeUrl('https://www.pinterest.com/pin/1'), false);
  assert.equal(isLikelyRecipeUrl('https://www.allrecipes.com/'), false);
  assert.equal(isLikelyRecipeUrl('https://site.example/category/dinner/'), false);
});

function pick(p) {
  return { qty: p.qty, qtyMax: p.qtyMax, unit: p.unit, name: p.name, note: p.note };
}
