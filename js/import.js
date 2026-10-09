// Network + device imports: links, photos (OCR) and image compression.
import { extractRecipeFromHtml, parseRecipeText, platformFromUrl, hostFromUrl, cleanSocialCaption } from './parse.js';

// Most sites don't send CORS headers, so a static app needs a relay to read their HTML.
// These public relays only ever see the URL being imported. Users can turn this off in Profile.
const PROXIES = [
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
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
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } finally {
    clearTimeout(t);
  }
}

async function fetchText(url, { useProxy }) {
  const attempts = [() => fetchWithTimeout(url, 8000)];
  if (useProxy) PROXIES.forEach((p) => attempts.push(() => fetchWithTimeout(p(url))));
  let lastErr;
  for (const attempt of attempts) {
    try {
      const res = await attempt();
      const text = await res.text();
      if (text && text.length > 200) return text;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Could not reach that page');
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

export async function importFromUrl(input, { useProxy = true } = {}) {
  const url = normalizeUrl(input);
  if (!url) throw new ImportError('That doesn\'t look like a link. Try copying it again.');
  const platform = platformFromUrl(url);
  let partial = { source: { url, platform, name: hostFromUrl(url) } };

  if (platform === 'tiktok') {
    try {
      const o = await fetchJson(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, { useProxy });
      const parsed = parseRecipeText(o.title || '');
      partial = { ...partial, title: parsed.title, image: o.thumbnail_url, caption: o.title };
      if (hasRecipe(parsed)) return finish({ ...parsed, image: o.thumbnail_url }, url, platform, o.author_name ? `@${o.author_unique_id || o.author_name}` : '');
    } catch { /* fall through to page scrape */ }
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
        partial = { ...partial, title: fixedTitle || parsed.title, image, caption: text };
        if (hasRecipe(parsed)) return finish({ ...parsed, title: fixedTitle || parsed.title, image }, url, platform);
      }
    } catch { /* fall through */ }
  }

  let html;
  try {
    html = await fetchText(url, { useProxy });
  } catch {
    throw new ImportError(
      useProxy
        ? 'We couldn\'t open that link. The post may be private, or the site blocked us.'
        : 'This site doesn\'t allow direct imports. Turn on "Import helper" in Profile, or paste the recipe text.',
      partial,
    );
  }
  const r = extractRecipeFromHtml(html, url);
  const merged = { ...r, image: r.image || partial.image, title: r.title || partial.title };
  if (!hasRecipe(merged)) {
    throw new ImportError(
      platform === 'instagram' || platform === 'tiktok' || platform === 'facebook'
        ? 'We found the post but couldn\'t read its caption. Paste the caption and we\'ll do the rest.'
        : 'We couldn\'t find a recipe on that page. Paste the recipe text instead.',
      { ...partial, title: merged.title, image: merged.image, caption: r.caption ? cleanSocialCaption(r.caption) : partial.caption },
    );
  }
  return finish(merged, url, platform);
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
