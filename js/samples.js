// Built-in recipes for the Discover feed and a starter library.
const kitchen = { url: '', name: 'Forkful Kitchen', platform: 'forkful' };

export const SAMPLE_RECIPES = [
  {
    id: 's-tuscan-chicken', title: 'Creamy Tuscan Chicken', emoji: '🍗', servings: 4, prepTime: 10, cookTime: 25,
    description: 'Golden seared chicken in a garlicky sun-dried tomato and spinach cream sauce. A weeknight favourite that tastes like a restaurant dish.',
    categories: ['dinner', 'popular'], tags: ['chicken', 'italian', 'one-pan'], source: kitchen,
    ingredients: [
      '4 boneless chicken breasts', '1 tsp salt', '1/2 tsp black pepper', '1 tsp italian seasoning', '2 tbsp olive oil',
      '2 tbsp butter', '4 cloves garlic, minced', '1/2 cup sun-dried tomatoes, chopped', '1 cup heavy cream',
      '1/2 cup chicken broth', '1/2 cup parmesan, grated', '2 cups spinach',
    ],
    instructions: [
      'Season the chicken on both sides with salt, pepper and italian seasoning.',
      'Heat the olive oil in a large skillet over medium-high heat. Sear the chicken for 5-6 minutes per side until golden and cooked through. Transfer to a plate.',
      'Lower the heat to medium and melt the butter. Add the garlic and sun-dried tomatoes and cook for 1 minute until fragrant.',
      'Pour in the heavy cream and chicken broth, scraping up any browned bits. Simmer for 3 minutes.',
      'Stir in the parmesan until melted, then add the spinach and let it wilt for about 1 minute.',
      'Return the chicken to the pan, spoon the sauce over and simmer for 2 minutes. Serve with pasta, rice or crusty bread.',
    ],
  },
  {
    id: 's-garlic-pasta', title: 'One-Pot Garlic Butter Pasta', emoji: '🍝', servings: 2, prepTime: 5, cookTime: 15,
    description: 'Everything cooks in one pot, so the starchy pasta water turns into a silky garlic butter sauce.',
    categories: ['dinner', 'quick', 'vegetarian'], tags: ['pasta', 'vegetarian', '20-minute'], source: kitchen,
    ingredients: [
      '200 g spaghetti', '3 tbsp butter', '5 cloves garlic, thinly sliced', '1/4 tsp red pepper flakes', '2 1/2 cups water',
      '1/2 tsp salt', '1/3 cup parmesan, grated', '1 lemon (zest and juice)', '2 tbsp parsley, chopped',
    ],
    instructions: [
      'Melt 2 tbsp of the butter in a wide pot over medium heat. Add the garlic and red pepper flakes and cook for 2 minutes until golden.',
      'Add the spaghetti, water and salt. Bring to a boil, then simmer for 10-12 minutes, stirring often, until the pasta is al dente and most of the liquid is absorbed.',
      'Take off the heat and toss in the remaining butter, parmesan, lemon zest and a squeeze of lemon juice until glossy.',
      'Finish with parsley and more parmesan.',
    ],
  },
  {
    id: 's-smashed-potatoes', title: 'Crispy Smashed Potatoes', emoji: '🥔', servings: 4, prepTime: 10, cookTime: 45,
    description: 'Boiled baby potatoes smashed flat and roasted until shatteringly crisp. Viral for a reason.',
    categories: ['quick', 'vegetarian', 'popular'], tags: ['side', 'vegetarian', 'gluten-free'], source: kitchen,
    ingredients: [
      '1 kg baby potatoes', '1 tbsp salt', '4 tbsp olive oil', '3 cloves garlic, minced', '1 tsp smoked paprika',
      '1/2 cup parmesan, grated', '2 tbsp chives, chopped', '1/2 cup sour cream, to serve',
    ],
    instructions: [
      'Preheat the oven to 450°F.',
      'Boil the potatoes in salted water for 15-20 minutes until fork-tender. Drain and let them steam dry for 5 minutes.',
      'Spread on an oiled baking sheet and gently smash each potato with the bottom of a glass.',
      'Mix the olive oil, garlic and smoked paprika and brush over the potatoes. Sprinkle with parmesan.',
      'Roast for 25 minutes until deeply golden and crisp at the edges.',
      'Top with chives and serve with sour cream.',
    ],
  },
  {
    id: 's-banana-bread', title: 'Brown Butter Banana Bread', emoji: '🍌', servings: 10, prepTime: 15, cookTime: 60,
    description: 'Moist, deeply flavoured banana bread with nutty brown butter and a crackly sugar top.',
    categories: ['dessert', 'breakfast', 'popular'], tags: ['baking', 'dessert', 'breakfast'], source: kitchen,
    ingredients: [
      '1/2 cup butter', '3 ripe bananas', '2/3 cup brown sugar', '2 eggs', '1 tsp vanilla extract',
      '1 3/4 cups all-purpose flour', '1 tsp baking soda', '1/2 tsp salt', '1 tsp cinnamon', '1/2 cup walnuts, chopped (optional)',
    ],
    instructions: [
      'Preheat the oven to 350°F and line a 9x5 inch loaf pan with parchment.',
      'Melt the butter in a small pan and cook for 4-5 minutes, swirling, until it smells nutty and turns golden brown. Let cool for 10 minutes.',
      'Mash the bananas in a large bowl. Whisk in the brown butter, brown sugar, eggs and vanilla.',
      'Fold in the flour, baking soda, salt and cinnamon until just combined, then fold in the walnuts.',
      'Pour into the pan and bake for 55-60 minutes until a skewer comes out clean.',
      'Cool in the pan for 15 minutes before slicing.',
    ],
  },
  {
    id: 's-peanut-noodles', title: 'Spicy Peanut Noodles', emoji: '🥜', servings: 2, prepTime: 10, cookTime: 10,
    description: 'Slurpable noodles in a creamy, spicy peanut-sesame sauce with crunchy veg.',
    categories: ['dinner', 'quick', 'vegetarian'], tags: ['noodles', 'asian', 'vegan'], source: kitchen,
    ingredients: [
      '200 g noodles', '3 tbsp peanut butter', '2 tbsp soy sauce', '1 tbsp maple syrup', '1 tbsp rice vinegar',
      '1 tsp sesame oil', '1 tbsp sriracha', '1 clove garlic, grated', '1 tsp ginger, grated', '1/4 cup hot water',
      '1 carrot, julienned', '1 cucumber, sliced', '2 green onions, sliced', '2 tbsp peanuts, chopped',
    ],
    instructions: [
      'Cook the noodles according to the package, about 4-5 minutes. Rinse under cold water and drain.',
      'Whisk the peanut butter, soy sauce, maple syrup, rice vinegar, sesame oil, sriracha, garlic and ginger with the hot water until smooth.',
      'Toss the noodles with the sauce, carrot and cucumber.',
      'Top with green onions and chopped peanuts.',
    ],
  },
  {
    id: 's-sheet-pan-salmon', title: 'Sheet-Pan Honey Garlic Salmon', emoji: '🐟', servings: 4, prepTime: 10, cookTime: 20,
    description: 'Sticky honey-garlic salmon and roasted broccoli on one tray. Minimal washing up.',
    categories: ['dinner', 'quick', 'popular'], tags: ['seafood', 'healthy', 'sheet-pan'], source: kitchen,
    ingredients: [
      '4 salmon fillets', '1 head broccoli, cut into florets', '2 tbsp olive oil', '1/2 tsp salt', '3 tbsp honey',
      '3 tbsp soy sauce', '3 cloves garlic, minced', '1 tbsp lemon juice', '1 tsp sesame seeds',
    ],
    instructions: [
      'Preheat the oven to 400°F and line a baking sheet.',
      'Toss the broccoli with olive oil and salt and roast for 8 minutes.',
      'Whisk the honey, soy sauce, garlic and lemon juice.',
      'Push the broccoli to the sides, add the salmon and brush generously with the glaze.',
      'Roast for 12 minutes until the salmon flakes easily.',
      'Sprinkle with sesame seeds and serve with rice.',
    ],
  },
  {
    id: 's-overnight-oats', title: 'Blueberry Overnight Oats', emoji: '🥣', servings: 1, prepTime: 5, cookTime: 0,
    description: 'Five minutes the night before for a creamy, grab-and-go breakfast.',
    categories: ['breakfast', 'quick', 'vegetarian'], tags: ['breakfast', 'meal-prep', 'no-cook'], source: kitchen,
    ingredients: [
      '1/2 cup oats', '1/2 cup milk', '1/4 cup greek yogurt', '1 tbsp chia seeds', '1 tbsp maple syrup',
      '1/4 tsp vanilla extract', '1/2 cup blueberries',
    ],
    instructions: [
      'Stir the oats, milk, yogurt, chia seeds, maple syrup and vanilla together in a jar.',
      'Fold in half of the blueberries, cover and refrigerate for at least 4 hours or overnight.',
      'In the morning, stir, loosen with a splash of milk and top with the remaining blueberries.',
    ],
  },
  {
    id: 's-cookies', title: 'Chewy Chocolate Chip Cookies', emoji: '🍪', servings: 18, prepTime: 15, cookTime: 12,
    description: 'Crisp edges, gooey centres and puddles of chocolate. Chill the dough if you can.',
    categories: ['dessert', 'popular'], tags: ['baking', 'dessert', 'cookies'], source: kitchen,
    ingredients: [
      '3/4 cup butter, melted', '1 cup brown sugar', '1/4 cup sugar', '1 egg', '1 egg yolk', '2 tsp vanilla extract',
      '2 1/4 cups all-purpose flour', '1 tsp baking soda', '1/2 tsp salt', '1 1/2 cups chocolate chips', 'flaky sea salt, to finish',
    ],
    instructions: [
      'Whisk the melted butter with both sugars until smooth, then whisk in the egg, egg yolk and vanilla.',
      'Stir in the flour, baking soda and salt until just combined. Fold in the chocolate chips.',
      'Cover and chill the dough for 30 minutes.',
      'Preheat the oven to 350°F. Scoop 2 tbsp balls onto lined baking sheets, spaced well apart.',
      'Bake for 10-12 minutes until the edges are golden but the centres look underdone.',
      'Sprinkle with flaky salt and cool on the tray for 5 minutes.',
    ],
  },
  {
    id: 's-chickpea-curry', title: 'Coconut Chickpea Curry', emoji: '🍛', servings: 4, prepTime: 10, cookTime: 25,
    description: 'A cosy, pantry-friendly curry with spinach and creamy coconut milk.',
    categories: ['dinner', 'vegetarian'], tags: ['vegan', 'curry', 'meal-prep'], source: kitchen,
    ingredients: [
      '1 tbsp coconut oil', '1 onion, diced', '3 cloves garlic, minced', '1 tbsp ginger, grated', '2 tbsp curry powder',
      '1 tsp turmeric', '1 (14 oz) can diced tomatoes', '1 (14 oz) can coconut milk', '2 (15 oz) cans chickpeas, drained',
      '3 cups spinach', '1 tsp salt', '1 lime, juiced', '1/4 cup cilantro, chopped',
    ],
    instructions: [
      'Heat the coconut oil in a large pan over medium heat and cook the onion for 5 minutes until soft.',
      'Add the garlic, ginger, curry powder and turmeric and stir for 1 minute.',
      'Pour in the tomatoes and coconut milk, add the chickpeas and salt and simmer for 15 minutes.',
      'Stir in the spinach until wilted, then add the lime juice.',
      'Serve over rice topped with cilantro.',
    ],
  },
  {
    id: 's-greek-salad', title: 'Big Greek Salad', emoji: '🥗', servings: 4, prepTime: 15, cookTime: 0,
    description: 'Crunchy, juicy and salty with a punchy oregano vinaigrette. No lettuce required.',
    categories: ['quick', 'vegetarian'], tags: ['salad', 'vegetarian', 'no-cook'], source: kitchen,
    ingredients: [
      '4 tomatoes, cut into wedges', '1 cucumber, sliced', '1 red onion, thinly sliced', '1 bell pepper, sliced',
      '1/2 cup olives', '200 g feta', '1/4 cup olive oil', '2 tbsp red wine vinegar', '1 tsp dried oregano', '1/2 tsp salt',
    ],
    instructions: [
      'Combine the tomatoes, cucumber, red onion, bell pepper and olives in a large bowl.',
      'Whisk the olive oil, red wine vinegar, oregano and salt.',
      'Pour the dressing over the salad and toss.',
      'Top with a slab of feta and an extra pinch of oregano.',
    ],
  },
  {
    id: 's-shakshuka', title: 'Easy Shakshuka', emoji: '🍳', servings: 2, prepTime: 5, cookTime: 20,
    description: 'Eggs gently poached in a smoky, spiced tomato and pepper sauce. Brunch in one pan.',
    categories: ['breakfast', 'vegetarian'], tags: ['eggs', 'brunch', 'one-pan'], source: kitchen,
    ingredients: [
      '2 tbsp olive oil', '1 onion, diced', '1 bell pepper, diced', '2 cloves garlic, minced', '1 tsp cumin',
      '1 tsp smoked paprika', '1 (28 oz) can crushed tomatoes', '1/2 tsp salt', '4 eggs', '1/4 cup feta, crumbled', '2 tbsp parsley, chopped',
    ],
    instructions: [
      'Heat the olive oil in a skillet over medium heat. Cook the onion and bell pepper for 6 minutes until soft.',
      'Add the garlic, cumin and smoked paprika and cook for 1 minute.',
      'Pour in the crushed tomatoes and salt and simmer for 8 minutes until slightly thickened.',
      'Make 4 wells in the sauce and crack an egg into each. Cover and cook for 5-6 minutes until the whites are set.',
      'Top with feta and parsley and serve with warm bread.',
    ],
  },
  {
    id: 's-beef-tacos', title: 'Weeknight Beef Tacos', emoji: '🌮', servings: 4, prepTime: 10, cookTime: 15,
    description: 'Juicy spiced beef in warm tortillas with all the toppings. Taco Tuesday sorted.',
    categories: ['dinner', 'quick', 'popular'], tags: ['mexican', 'beef', 'family'], source: kitchen,
    ingredients: [
      '1 lb ground beef', '1 onion, diced', '2 cloves garlic, minced', '1 tbsp chili powder', '1 tsp cumin',
      '1 tsp smoked paprika', '1/2 tsp salt', '1/3 cup tomato sauce', '8 tortillas', '1 cup cheddar, shredded',
      '2 cups lettuce, shredded', '1 avocado, sliced', '1/2 cup sour cream', '1 lime, cut into wedges',
    ],
    instructions: [
      'Brown the ground beef with the onion in a skillet over medium-high heat for 6-8 minutes, breaking it up as it cooks.',
      'Add the garlic, chili powder, cumin, smoked paprika and salt and cook for 1 minute.',
      'Stir in the tomato sauce and simmer for 3 minutes.',
      'Warm the tortillas in a dry pan for 30 seconds per side.',
      'Fill with the beef and top with cheddar, lettuce, avocado, sour cream and a squeeze of lime.',
    ],
  },
];

export const STARTER_IDS = ['s-tuscan-chicken', 's-garlic-pasta', 's-banana-bread', 's-sheet-pan-salmon'];

export const STARTER_COOKBOOKS = [
  { id: 'cb-weeknight', name: 'Weeknight Dinners', emoji: '🌙', sampleIds: ['s-tuscan-chicken', 's-garlic-pasta', 's-sheet-pan-salmon'] },
  { id: 'cb-baking', name: 'Baking', emoji: '🧁', sampleIds: ['s-banana-bread'] },
];

export const DISCOVER_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'popular', label: '🔥 Trending' },
  { id: 'dinner', label: '🍽 Dinner' },
  { id: 'quick', label: '⚡ Under 30 min' },
  { id: 'vegetarian', label: '🌱 Vegetarian' },
  { id: 'breakfast', label: '☀️ Breakfast' },
  { id: 'dessert', label: '🍰 Dessert' },
];
