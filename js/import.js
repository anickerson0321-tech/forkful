// Network + device imports: links, recipe search, photos (OCR) and image compression.
import {
  extractRecipeFromHtml, parseRecipeText, platformFromUrl, hostFromUrl, cleanSocialCaption,
  recipeFromMealDb, guessDishFromUrl, textFromEmbedHtml, looksLikeLoginWall,
} from './parse.js';

// Most sites don't send CORS headers, so a static app needs a relay to read their HTML.
// These free public services only ever see the URL being imported. Users can turn this
// off in Profile. They're raced in parallel and the first usable page wins.
const RELAYS = [
  // Reader service that renders the page and returns its HTML.
  { url: (u) => `https://r.jina.ai/${u}`, headers: { 'X-Return-Format': 'html' } },
  { url: (u) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(u)}` },
  { url: (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}` },
];

export class ImportError extends Error {
  constructor(message, partial = {}) {
    super(message);
    this.partial = partial;
  }
}

async function fetchWithTimeout(url, ms = 12000, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  const onAbort = () => ctrl.abort();
  opts.signal?.addEventListener('abort', onAbort);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } finally {
    clearTimeout(t);
    opts.signal?.removeEventListener('abort', onAbort);
  }
}

async function readPage(url, opts) {
  const text = await (await fetchWithTimeout(url, 15000, opts)).text();
  if (!text || text.length < 200) throw new Error('Empty page');
  return text;
}

async function fetchText(url, { useProxy }) {
  try {
    return await readPage(url, {});
  } catch (directErr) {
    if (!useProxy) throw directErr;
  }
  const stop = new AbortController();
  try {
    return await Promise.any(RELAYS.map((r) => readPage(r.url(url), { headers: r.headers, signal: stop.signal })));
  } catch {
    throw new Error('Could not reach that page');
  } finally {
    stop.abort();
  }
}

async function fetchJson(url, { useProxy }) {
  try {
    return await (await fetchWithTimeout(url, 8000)).json();
  } catch (e) {
    if (!useProxy) throw e;
    return JSON.parse(await fetchText(url, { useProxy }));
  }
}

function normalizeUrl(input) {
  const m = String(input).match(/https?:\/\/[^\s"'<>]+/i);
  let url = m ? m[0] : String(input).trim();
  if (!/^https?:\/\//i.test(url) && /\.[a-z]{2,}/i.test(url)) url = `https://${url}`;
  try { return new URL(url).href; } catch { return null; }
}

function hasRecipe(r) {
  return (r.ingredients?.length || 0) + (r.instructions?.length || 0) > 0;
}

function finish(result, url, platform, author) {
  return {
    title: result.title || 'Untitled recipe',
    description: result.description || '',
    image: result.image || '',
    servings: result.servings || null,
    prepTime: result.prepTime || null,
    cookTime: result.cookTime || null,
    ingredients: result.ingredients || [],
    instructions: result.instructions || [],
    tags: result.tags || [],
    notes: result.notes || '',
    nutrition: result.nutrition || null,
    source: { url, platform, name: author || result.author || hostFromUrl(url) },
  };
}

const SOCIAL_NAMES = { facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok' };

export async function importFromUrl(input, { useProxy = true } = {}) {
  const url = normalizeUrl(input);
  if (!url) throw new ImportError('That doesn\'t look like a link. Try copying it again.');
  const platform = platformFromUrl(url);
  let partial = { source: { url, platform, name: hostFromUrl(url) }, query: guessDishFromUrl(url) };

  if (platform === 'tiktok') {
    try {
      const o = await fetchJson(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, { useProxy });
      const parsed = parseRecipeText(o.title || '');
      partial = { ...partial, title: parsed.title, image: o.thumbnail_url, caption: o.title, query: parsed.title || partial.query };
      if (hasRecipe(parsed)) return finish({ ...parsed, image: o.thumbnail_url }, url, platform, o.author_name ? `@${o.author_unique_id || o.author_name}` : '');
    } catch { /* fall through to page scrape */ }
  }

  if (platform === 'facebook' && useProxy) {
    // Facebook's embed page shows public posts without a login.
    try {
      const html = await fetchText(`https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(url)}&show_text=true`, { useProxy });
      const text = textFromEmbedHtml(html);
      if (text) {
        const parsed = parseRecipeText(text);
        partial = { ...partial, title: parsed.title, caption: text, query: parsed.title || partial.query };
        if (hasRecipe(parsed)) return finish(parsed, url, platform);
      }
    } catch { /* fall through */ }
  }

  if (platform === 'youtube') {
    try {
      const html = await fetchText(url, { useProxy });
      const desc = html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/);
      const title = html.match(/<meta name="title" content="([^"]*)"/)?.[1] || '';
      const id = url.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{11})/)?.[1];
      const image = id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '';
      if (desc) {
        const text = JSON.parse(`"${desc[1]}"`);
        const parsed = parseRecipeText(text);
        const fixedTitle = title ? extractRecipeFromHtml(`<title>${title}</title>`).title : parsed.title;
        partial = { ...partial, title: fixedTitle || parsed.title, image, caption: text, query: fixedTitle || partial.query };
        if (hasRecipe(parsed)) return finish({ ...parsed, title: fixedTitle || parsed.title, image }, url, platform);
      }
    } catch { /* fall through */ }
  }

  const social = SOCIAL_NAMES[platform];
  let html;
  try {
    html = await fetchText(url, { useProxy });
  } catch {
    throw new ImportError(
      !useProxy
        ? 'This site doesn\'t allow direct imports. Turn on "Import helper" in Profile, or paste the recipe text.'
        : social
          ? `${social} wouldn't let us read that post — it usually only shows posts to people who are logged in.`
          : 'We couldn\'t reach that page. The site may be blocking apps from reading it.',
      partial,
    );
  }
  const r = extractRecipeFromHtml(html, url);
  const merged = { ...r, image: r.image || partial.image, title: r.title || partial.title };
  if (!hasRecipe(merged)) {
    const wall = looksLikeLoginWall(html);
    const title = wall ? partial.title : merged.title;
    throw new ImportError(
      social
        ? `${social} wouldn't show us the post's caption${wall ? ' without a login' : ''}.`
        : 'We opened the page but couldn\'t find a recipe on it.',
      {
        ...partial,
        title,
        image: wall ? partial.image : merged.image,
        caption: r.caption ? cleanSocialCaption(r.caption) : partial.caption,
        query: (title && !/^(facebook|instagram|tiktok|log in)/i.test(title) ? title : '') || partial.query,
      },
    );
  }
  return finish(merged, url, platform);
}

// ---------- Recipe search ----------

const SEARCH_STOPWORDS = new Set(['recipe', 'recipes', 'easy', 'best', 'quick', 'homemade', 'the', 'and', 'with', 'my', 'how', 'make', 'simple', 'perfect', 'ever', 'minute', 'minutes', 'healthy']);

async function mealDb(path) {
  const res = await fetchWithTimeout(`https://www.themealdb.com/api/json/v1/1/${path}`, 10000);
  return (await res.json()).meals || [];
}

// Searches a free recipe database by dish name. Tries the full phrase first,
// then each meaningful word, so "easy cheesy beef lasagna" still finds "Lasagna".
export async function searchRecipes(query) {
  const q = String(query || '').trim();
  if (!q) return [];
  const seen = new Set();
  const out = [];
  const add = (meals) => meals.forEach((m) => { if (!seen.has(m.idMeal)) { seen.add(m.idMeal); out.push(m); } });
  add(await mealDb(`search.php?s=${encodeURIComponent(q)}`));
  if (out.length < 6) {
    const words = q.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3 && !SEARCH_STOPWORDS.has(w));
    const results = await Promise.allSettled(words.slice(0, 4).map((w) => mealDb(`search.php?s=${encodeURIComponent(w)}`)));
    results.forEach((r) => { if (r.status === 'fulfilled') add(r.value); });
  }
  return out.slice(0, 18).map(recipeFromMealDb);
}

export function webSearchUrl(query) {
  return `https://www.google.com/search?q=${encodeURIComponent(`${query} recipe`)}`;
}

// ---------- OCR ----------

let tesseractPromise;
function loadTesseract() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  tesseractPromise ||= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
    s.onload = () => resolve(window.Tesseract);
    s.onerror = () => { tesseractPromise = null; reject(new Error('Could not load the text scanner. Check your connection.')); };
    document.head.append(s);
  });
  return tesseractPromise;
}

export async function ocrImage(file, onProgress = () => {}) {
  const Tesseract = await loadTesseract();
  const { data } = await Tesseract.recognize(file, 'eng', {
    logger: (m) => { if (m.status === 'recognizing text') onProgress(m.progress); },
  });
  return data.text || '';
}

// ---------- Images ----------

export function compressImage(file, maxDim = 1100, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that image')); };
    img.src = url;
  });
}
