// Network + device imports: links, recipe search, photos (OCR) and image compression.
import {
  extractRecipeFromHtml, parseRecipeText, platformFromUrl, hostFromUrl, cleanSocialCaption,
  recipeFromMealDb, guessDishFromUrl, textFromEmbedHtml, looksLikeLoginWall,
  instagramShortcode, parseInstagramEmbed, describePage,
} from './parse.js';

// Most sites don't send CORS headers, so a static app needs a relay to read their HTML.
// These free public services only ever see the URL being imported. Users can turn this
// off in Profile. They're raced in parallel and the first usable page wins.
const RELAYS = [
  { name: 'r.jina.ai', url: (u) => `https://r.jina.ai/${u}`, headers: { 'X-Return-Format': 'html' } },
  { name: 'codetabs', url: (u) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(u)}` },
  { name: 'allorigins', url: (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}` },
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
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('timed out');
    if (e instanceof TypeError) throw new Error('blocked or unreachable');
    throw e;
  } finally {
    clearTimeout(t);
    opts.signal?.removeEventListener('abort', onAbort);
  }
}

async function readPage(url, opts = {}) {
  const text = await (await fetchWithTimeout(url, 15000, opts)).text();
  if (!text || text.length < 200) throw new Error('empty page');
  return text;
}

function serverUrl(server, url, ua) {
  const u = new URL(server);
  u.searchParams.set('url', url);
  if (ua) u.searchParams.set('ua', ua);
  return u.href;
}

// Fetches a page: your own import server first (if set), then directly, then the
// public relays in parallel. Every attempt is written to ctx.log for the Details view.
async function fetchPage(url, ctx, label, { ua } = {}) {
  if (ctx.server) {
    try {
      const text = await readPage(serverUrl(ctx.server, url, ua));
      ctx.log.push(`${label} via your import server: ${describePage(text)}`);
      return text;
    } catch (e) {
      ctx.log.push(`${label} via your import server: failed (${e.message})`);
    }
  }
  try {
    const text = await readPage(url);
    ctx.log.push(`${label} directly: ${describePage(text)}`);
    return text;
  } catch (e) {
    ctx.log.push(`${label} directly: ${e.message} (normal for most sites)`);
  }
  if (!ctx.useProxy) throw new Error('Import helper is off');
  const stop = new AbortController();
  try {
    const { text, via } = await Promise.any(RELAYS.map((r) => readPage(r.url(url), { headers: r.headers, signal: stop.signal })
      .then((t) => ({ text: t, via: r.name }), (e) => { if (!stop.signal.aborted) ctx.log.push(`${label} via ${r.name}: failed (${e.message})`); throw e; })));
    ctx.log.push(`${label} via ${via}: ${describePage(text)}`);
    return text;
  } catch {
    throw new Error('Could not reach that page');
  } finally {
    stop.abort();
  }
}

async function fetchJson(url, ctx, label) {
  try {
    return await (await fetchWithTimeout(url, 8000)).json();
  } catch (e) {
    ctx.log.push(`${label} directly: ${e.message}`);
    return JSON.parse(await fetchPage(url, ctx, label));
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

export async function importFromUrl(input, { useProxy = true, server = '' } = {}) {
  const url = normalizeUrl(input);
  if (!url) throw new ImportError('That doesn\'t look like a link. Try copying it again.', { log: [] });
  const platform = platformFromUrl(url);
  const ctx = { useProxy, server: server || '', log: [] };
  let partial = { source: { url, platform, name: hostFromUrl(url) }, query: guessDishFromUrl(url), log: ctx.log };

  // Captions often have the recipe; keep the best one we see for the "use caption" fallback.
  const tryCaption = (caption, extra = {}, author = '') => {
    if (!caption) return null;
    const parsed = parseRecipeText(caption);
    partial = { ...partial, ...extra, caption, title: parsed.title || partial.title, query: parsed.title || partial.query };
    if (hasRecipe(parsed)) return finish({ ...parsed, ...extra }, url, platform, author);
    ctx.log.push(`Found a caption (${caption.length} characters) but no ingredient list in it`);
    return null;
  };

  if (platform === 'tiktok') {
    try {
      const o = await fetchJson(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, ctx, 'TikTok caption');
      const done = tryCaption(o.title, { image: o.thumbnail_url }, o.author_name ? `@${o.author_unique_id || o.author_name}` : '');
      if (done) return done;
    } catch { /* fall through to page scrape */ }
  }

  if (platform === 'instagram') {
    // The public embed page has the full caption and doesn't need a login.
    const code = instagramShortcode(url);
    if (code) {
      try {
        const html = await fetchPage(`https://www.instagram.com/p/${code}/embed/captioned/`, ctx, 'Instagram embed page', { ua: 'browser' });
        const ig = parseInstagramEmbed(html);
        if (!ig.caption) ctx.log.push('No caption on the embed page');
        const done = tryCaption(ig.caption, ig.image ? { image: ig.image } : {}, ig.author ? `@${ig.author}` : '');
        if (done) return done;
      } catch { /* fall through */ }
    }
  }

  if (platform === 'facebook' && (useProxy || server)) {
    // Facebook's embed page shows public posts without a login.
    try {
      const html = await fetchPage(`https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(url)}&show_text=true`, ctx, 'Facebook embed page', { ua: 'browser' });
      const text = textFromEmbedHtml(html);
      if (!text) ctx.log.push('No post text on the embed page');
      const done = tryCaption(text);
      if (done) return done;
    } catch { /* fall through */ }
  }

  if (platform === 'youtube') {
    try {
      const html = await fetchPage(url, ctx, 'YouTube page');
      const desc = html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/);
      const title = html.match(/<meta name="title" content="([^"]*)"/)?.[1] || '';
      const id = url.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{11})/)?.[1];
      const image = id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '';
      if (desc) {
        const fixedTitle = title ? extractRecipeFromHtml(`<title>${title}</title>`).title : '';
        const text = JSON.parse(`"${desc[1]}"`);
        const parsed = parseRecipeText(text);
        partial = { ...partial, title: fixedTitle || parsed.title, image, caption: text, query: fixedTitle || partial.query };
        if (hasRecipe(parsed)) return finish({ ...parsed, title: fixedTitle || parsed.title, image }, url, platform);
      }
    } catch { /* fall through */ }
  }

  const social = SOCIAL_NAMES[platform];
  let html;
  try {
    html = await fetchPage(url, ctx, social ? `${social} post page` : 'Recipe page', { ua: social ? 'bot' : undefined });
  } catch {
    if (partial.caption) throw new ImportError(`We found the ${social || 'page'}'s caption but couldn't spot a recipe in it.`, partial);
    throw new ImportError(
      !useProxy && !server
        ? 'This site doesn\'t allow direct imports. Turn on "Import helper" in Profile, or paste the recipe text.'
        : social
          ? `${social} wouldn't let us read that post.`
          : 'We couldn\'t reach that page. The site may be blocking apps from reading it.',
      partial,
    );
  }
  const r = extractRecipeFromHtml(html, url);
  const merged = { ...r, image: r.image || partial.image, title: r.title || partial.title };
  if (hasRecipe(merged)) return finish(merged, url, platform);
  const wall = looksLikeLoginWall(html);
  const caption = r.caption ? cleanSocialCaption(r.caption) : '';
  if (caption && caption.length > (partial.caption?.length || 0)) {
    partial = { ...partial, caption };
    ctx.log.push(`Post preview text (${caption.length} characters) has no ingredient list — it may be cut short`);
  }
  const title = wall ? partial.title : merged.title;
  throw new ImportError(
    partial.caption
      ? `We found the ${social ? 'post\'s caption' : 'page text'} but couldn't spot a recipe in it.`
      : social
        ? `${social} wouldn't show us the post's caption${wall ? ' without a login' : ''}.`
        : 'We opened the page but couldn\'t find a recipe on it.',
    {
      ...partial,
      title,
      image: (wall ? partial.image : merged.image) || partial.image,
      query: (title && !/^(facebook|instagram|tiktok|log in)/i.test(title) ? title : '') || partial.query,
    },
  );
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

// Screenshots are often dark mode with small text; the OCR engine reads dark text on a
// light background best, so convert to grayscale, invert dark images and upscale small ones.
function prepareForOcr(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        const scale = Math.min(3, Math.max(1, 1600 / img.width));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const g = canvas.getContext('2d', { willReadFrequently: true });
        g.drawImage(img, 0, 0, canvas.width, canvas.height);
        const data = g.getImageData(0, 0, canvas.width, canvas.height);
        const px = data.data;
        let sum = 0;
        for (let i = 0; i < px.length; i += 4) sum += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
        const invert = sum / (px.length / 4) < 110;
        for (let i = 0; i < px.length; i += 4) {
          let y = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
          if (invert) y = 255 - y;
          px[i] = px[i + 1] = px[i + 2] = y;
        }
        g.putImageData(data, 0, 0);
        URL.revokeObjectURL(url);
        canvas.toBlob((b) => resolve(b || file), 'image/png');
      } catch {
        URL.revokeObjectURL(url);
        resolve(file);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

export async function ocrImage(file, onProgress = () => {}) {
  const [Tesseract, prepared] = await Promise.all([loadTesseract(), prepareForOcr(file)]);
  const { data } = await Tesseract.recognize(prepared, 'eng', {
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
