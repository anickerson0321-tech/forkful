// Pure parsing / formatting helpers. No DOM access so this module runs in Node tests too.

// ---------- Text helpers ----------

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—',
  frac12: '½', frac14: '¼', frac34: '¾', frac13: '⅓', frac23: '⅔', deg: '°', hellip: '…',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', eacute: 'é', egrave: 'è', ntilde: 'ñ',
  uuml: 'ü', ouml: 'ö', auml: 'ä', reg: '®', trade: '™', copy: '©', times: '×', frasl: '⁄',
};

export function decodeEntities(str) {
  if (str == null) return '';
  return String(str).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (m, code) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    const named = NAMED_ENTITIES[code.toLowerCase()];
    return named ?? m;
  });
}

export function stripTags(str) {
  return decodeEntities(String(str ?? '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''))
    .replace(/[ \t ]+/g, ' ')
    .trim();
}

const EMOJI_RE = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}️‍⃣]/gu;

export function stripEmoji(str) {
  return String(str ?? '').replace(EMOJI_RE, '').replace(/\s{2,}/g, ' ').trim();
}

export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// ---------- Quantities ----------

const UNICODE_FRACTIONS = {
  '½': '1/2', '⅓': '1/3', '⅔': '2/3', '¼': '1/4', '¾': '3/4', '⅕': '1/5', '⅖': '2/5', '⅗': '3/5',
  '⅘': '4/5', '⅙': '1/6', '⅚': '5/6', '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8',
};

const NUMBER_WORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, dozen: 12, half: 0.5,
};

function normalizeFractions(str) {
  return str
    .replace(/(\d)\s*([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])/g, (m, d, f) => `${d} ${UNICODE_FRACTIONS[f]}`)
    .replace(/[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/g, (f) => UNICODE_FRACTIONS[f])
    .replace(/⁄/g, '/');
}

const NUM_RE = /^(\d+\s+\d+\/\d+|\d+\/\d+|\d*\.\d+|\d+(?:,\d+)?)/;

function numValue(token) {
  token = token.trim();
  const mixed = token.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return +mixed[1] + +mixed[2] / +mixed[3];
  const frac = token.match(/^(\d+)\/(\d+)$/);
  if (frac) return +frac[2] ? +frac[1] / +frac[2] : null;
  return parseFloat(token.replace(',', '.'));
}

// Reads a quantity (with optional range) at the start of str.
export function readQuantity(str) {
  const s = normalizeFractions(str);
  let m = s.match(NUM_RE);
  if (!m) {
    const word = s.match(/^(an?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|dozen|half)\b\s*/i);
    if (!word) return null;
    const w = word[1].toLowerCase();
    return { qty: w === 'a' || w === 'an' ? 1 : NUMBER_WORDS[w], qtyMax: null, rest: s.slice(word[0].length), article: w === 'a' || w === 'an' };
  }
  const qty = numValue(m[1]);
  let rest = s.slice(m[0].length);
  let qtyMax = null;
  const range = rest.match(/^\s*(?:-|–|—|to|or)\s*/i);
  if (range) {
    const m2 = rest.slice(range[0].length).match(NUM_RE);
    if (m2) {
      qtyMax = numValue(m2[1]);
      rest = rest.slice(range[0].length + m2[0].length);
    }
  }
  return { qty, qtyMax, rest, article: false };
}

// ---------- Units ----------

export const UNITS = {
  tsp: { type: 'volume', ml: 4.92892, label: 'tsp', aliases: ['teaspoons', 'teaspoon', 'tsps', 'tsp'] },
  tbsp: { type: 'volume', ml: 14.7868, label: 'tbsp', aliases: ['tablespoons', 'tablespoon', 'tbsps', 'tbsp', 'tbls', 'tbl', 'tbs'] },
  floz: { type: 'volume', ml: 29.5735, label: 'fl oz', aliases: ['fluid ounces', 'fluid ounce', 'fl. oz', 'fl oz', 'floz'] },
  cup: { type: 'volume', ml: 236.588, label: 'cup', plural: 'cups', aliases: ['cups', 'cup'] },
  pint: { type: 'volume', ml: 473.176, label: 'pint', plural: 'pints', aliases: ['pints', 'pint', 'pt'] },
  quart: { type: 'volume', ml: 946.353, label: 'quart', plural: 'quarts', aliases: ['quarts', 'quart', 'qt'] },
  gallon: { type: 'volume', ml: 3785.41, label: 'gallon', plural: 'gallons', aliases: ['gallons', 'gallon', 'gal'] },
  ml: { type: 'volume', ml: 1, label: 'ml', aliases: ['milliliters', 'milliliter', 'millilitres', 'millilitre', 'mls', 'ml'] },
  cl: { type: 'volume', ml: 10, label: 'cl', aliases: ['centiliters', 'centilitres', 'cl'] },
  l: { type: 'volume', ml: 1000, label: 'l', aliases: ['liters', 'liter', 'litres', 'litre', 'l'] },
  g: { type: 'weight', g: 1, label: 'g', aliases: ['grams', 'gram', 'grammes', 'gr', 'g'] },
  kg: { type: 'weight', g: 1000, label: 'kg', aliases: ['kilograms', 'kilogram', 'kilos', 'kilo', 'kg'] },
  oz: { type: 'weight', g: 28.3495, label: 'oz', aliases: ['ounces', 'ounce', 'oz'] },
  lb: { type: 'weight', g: 453.592, label: 'lb', aliases: ['pounds', 'pound', 'lbs', 'lb'] },
  pinch: { type: 'count', label: 'pinch', plural: 'pinches', aliases: ['pinches', 'pinch'] },
  dash: { type: 'count', label: 'dash', plural: 'dashes', aliases: ['dashes', 'dash'] },
  clove: { type: 'count', label: 'clove', plural: 'cloves', aliases: ['cloves', 'clove'] },
  can: { type: 'count', label: 'can', plural: 'cans', aliases: ['cans', 'can', 'tins', 'tin'] },
  jar: { type: 'count', label: 'jar', plural: 'jars', aliases: ['jars', 'jar'] },
  package: { type: 'count', label: 'package', plural: 'packages', aliases: ['packages', 'package', 'pkgs', 'pkg', 'packets', 'packet', 'packs', 'pack'] },
  stick: { type: 'count', label: 'stick', plural: 'sticks', aliases: ['sticks', 'stick'] },
  slice: { type: 'count', label: 'slice', plural: 'slices', aliases: ['slices', 'slice'] },
  bunch: { type: 'count', label: 'bunch', plural: 'bunches', aliases: ['bunches', 'bunch'] },
  sprig: { type: 'count', label: 'sprig', plural: 'sprigs', aliases: ['sprigs', 'sprig'] },
  handful: { type: 'count', label: 'handful', plural: 'handfuls', aliases: ['handfuls', 'handful'] },
  piece: { type: 'count', label: 'piece', plural: 'pieces', aliases: ['pieces', 'piece', 'pcs', 'pc'] },
  head: { type: 'count', label: 'head', plural: 'heads', aliases: ['heads', 'head'] },
  stalk: { type: 'count', label: 'stalk', plural: 'stalks', aliases: ['stalks', 'stalk'] },
  fillet: { type: 'count', label: 'fillet', plural: 'fillets', aliases: ['fillets', 'fillet'] },
  sheet: { type: 'count', label: 'sheet', plural: 'sheets', aliases: ['sheets', 'sheet'] },
  bag: { type: 'count', label: 'bag', plural: 'bags', aliases: ['bags', 'bag'] },
  bottle: { type: 'count', label: 'bottle', plural: 'bottles', aliases: ['bottles', 'bottle'] },
  scoop: { type: 'count', label: 'scoop', plural: 'scoops', aliases: ['scoops', 'scoop'] },
};

const UNIT_ALIASES = Object.entries(UNITS)
  .flatMap(([key, u]) => u.aliases.map((a) => [a, key]))
  .sort((a, b) => b[0].length - a[0].length);

function readUnit(str) {
  const s = str.replace(/^\s+/, '');
  const lower = s.toLowerCase();
  for (const [alias, key] of UNIT_ALIASES) {
    if (lower.startsWith(alias)) {
      const after = s.slice(alias.length);
      // Must end on a word boundary (optionally with a trailing period).
      const m = after.match(/^\.?(?=$|[\s,)(/-])/);
      if (m) return { unit: key, unitText: s.slice(0, alias.length), rest: after.slice(m[0].length) };
    }
  }
  return null;
}

// ---------- Ingredient parsing ----------

export function isHeaderLine(line) {
  const t = String(line ?? '').trim();
  if (!t) return false;
  if (/^#{1,3}\s*\S/.test(t)) return true;
  return /:$/.test(t) && !/^\d/.test(t) && t.length < 50;
}

export function headerText(line) {
  return String(line).trim().replace(/^#{1,3}\s*/, '').replace(/:$/, '').trim();
}

export function cleanListLine(line) {
  return stripEmoji(String(line ?? ''))
    .replace(/^\s*(?:[-–—•*▢◦○●▪︎✓✔☐□>]+|\d+[.)]\s+(?=\D)|step\s*\d+\s*[:.)-]?)\s*/i, '')
    .trim();
}

export function parseIngredient(line) {
  const raw = String(line ?? '').trim();
  if (isHeaderLine(raw)) return { raw, isHeader: true, name: headerText(raw) };
  let s = cleanListLine(raw);
  const out = { raw, isHeader: false, qty: null, qtyMax: null, unit: null, unitText: '', name: '', note: '' };
  const q = readQuantity(s);
  let rest = s;
  if (q) {
    // "a" / "an" only counts as a quantity when followed by a unit ("a pinch of salt").
    const unitAfter = readUnit(q.rest);
    if (!q.article || unitAfter) {
      out.qty = q.qty;
      out.qtyMax = q.qtyMax;
      rest = q.rest;
    }
  }
  if (out.qty != null) {
    // "1 (14 oz) can tomatoes" -> keep the size as a note.
    const paren = rest.match(/^\s*\(([^)]*)\)/);
    let parenNote = '';
    if (paren && readUnit(rest.slice(paren[0].length))) {
      parenNote = paren[1].trim();
      rest = rest.slice(paren[0].length);
    }
    const u = readUnit(rest);
    if (u) {
      out.unit = u.unit;
      out.unitText = u.unitText;
      rest = u.rest;
    }
    if (parenNote) out.note = parenNote;
  }
  rest = rest.replace(/^\s*of\s+/i, '').trim();
  // Split "onion, finely diced" -> name + note (ignoring commas inside parentheses).
  let depth = 0;
  let cut = -1;
  for (let i = 0; i < rest.length; i++) {
    const c = rest[i];
    if (c === '(') depth++;
    else if (c === ')') depth = Math.max(0, depth - 1);
    else if (c === ',' && depth === 0) { cut = i; break; }
  }
  if (cut >= 0) {
    out.name = rest.slice(0, cut).trim();
    const note = rest.slice(cut + 1).trim();
    out.note = out.note ? `${out.note}, ${note}` : note;
  } else {
    out.name = rest.trim();
  }
  if (!out.name && out.unitText) {
    out.name = out.unitText;
    out.unit = null;
    out.unitText = '';
  }
  return out;
}

// ---------- Formatting & scaling ----------

const NICE_FRACTIONS = [
  [0, ''], [1 / 8, '⅛'], [1 / 4, '¼'], [1 / 3, '⅓'], [3 / 8, '⅜'], [1 / 2, '½'], [5 / 8, '⅝'],
  [2 / 3, '⅔'], [3 / 4, '¾'], [7 / 8, '⅞'], [1, ''],
];

export function formatQuantity(n, { fractions = true, tolerance = 0.04 } = {}) {
  if (n == null || !Number.isFinite(n)) return '';
  if (n <= 0) return '0';
  if (fractions && n < 20) {
    const whole = Math.floor(n);
    const frac = n - whole;
    let best = NICE_FRACTIONS[0];
    for (const f of NICE_FRACTIONS) if (Math.abs(f[0] - frac) < Math.abs(best[0] - frac)) best = f;
    if (Math.abs(best[0] - frac) <= tolerance) {
      const w = best[0] === 1 ? whole + 1 : whole;
      if (!best[1]) return String(w);
      return w ? `${w}${best[1]}` : best[1];
    }
  }
  if (n >= 100) return String(Math.round(n));
  if (n >= 10) return String(Math.round(n * 10) / 10);
  return String(Math.round(n * 100) / 100);
}

function roundMetric(n) {
  if (n >= 100) return Math.round(n / 5) * 5;
  if (n >= 10) return Math.round(n);
  return Math.round(n * 10) / 10;
}

function bestUsVolume(ml) {
  const cups = ml / UNITS.cup.ml;
  if (cups >= 0.25) return { qty: cups, unit: 'cup' };
  const tbsp = ml / UNITS.tbsp.ml;
  if (tbsp >= 1) return { qty: tbsp, unit: 'tbsp' };
  return { qty: ml / UNITS.tsp.ml, unit: 'tsp' };
}

// Converts a quantity between unit systems. system: 'original' | 'metric' | 'us'
export function convertUnit(qty, unit, system) {
  const u = UNITS[unit];
  if (!u || qty == null || system === 'original') return { qty, unit, converted: false };
  if (system === 'metric') {
    if (u.type === 'volume' && !['ml', 'l', 'cl', 'tsp', 'tbsp'].includes(unit)) {
      const ml = qty * u.ml;
      return ml >= 1000 ? { qty: ml / 1000, unit: 'l', converted: true } : { qty: roundMetric(ml), unit: 'ml', converted: true };
    }
    if (u.type === 'weight' && (unit === 'oz' || unit === 'lb')) {
      const g = qty * u.g;
      return g >= 1000 ? { qty: g / 1000, unit: 'kg', converted: true } : { qty: roundMetric(g), unit: 'g', converted: true };
    }
  }
  if (system === 'us') {
    if (u.type === 'volume' && ['ml', 'l', 'cl'].includes(unit)) return { ...bestUsVolume(qty * u.ml), converted: true };
    if (u.type === 'weight' && ['g', 'kg'].includes(unit)) {
      const oz = (qty * u.g) / UNITS.oz.g;
      return oz >= 16 ? { qty: oz / 16, unit: 'lb', converted: true } : { qty: oz, unit: 'oz', converted: true };
    }
  }
  return { qty, unit, converted: false };
}

export function unitLabel(unit, qty, fallback = '') {
  const u = UNITS[unit];
  if (!u) return fallback;
  return qty != null && qty > 1 && u.plural ? u.plural : u.label;
}

// Returns display pieces for an ingredient scaled by `factor` in the given unit system.
export function displayIngredient(parsed, factor = 1, system = 'original') {
  if (parsed.isHeader) return { header: parsed.name };
  if (parsed.qty == null) return { amount: '', name: parsed.name, note: parsed.note };
  let qty = parsed.qty * factor;
  let qtyMax = parsed.qtyMax != null ? parsed.qtyMax * factor : null;
  let unit = parsed.unit;
  let unitText = parsed.unitText;
  const conv = convertUnit(qty, unit, system);
  if (conv.converted) {
    const ratio = conv.qty / qty;
    qty = conv.qty;
    if (qtyMax != null) qtyMax *= ratio;
    unit = conv.unit;
  }
  const metric = ['g', 'kg', 'ml', 'l', 'cl'].includes(unit);
  const fmt = (n) => formatQuantity(n, { fractions: !metric, tolerance: conv.converted ? 0.08 : 0.04 });
  const shown = qtyMax != null ? `${fmt(qty)}–${fmt(qtyMax)}` : fmt(qty);
  // Pluralize based on what is displayed, so 1.03 cups (shown as "1") reads "1 cup".
  const last = qtyMax != null ? fmt(qtyMax) : fmt(qty);
  const singular = last === '1' || /^[⅛¼⅓⅜½⅝⅔¾⅞]$/.test(last) || parseFloat(last) < 1;
  if (conv.converted || (unit && factor !== 1)) unitText = unitLabel(unit, singular ? 1 : 2, unitText);
  const amount = [shown, unitText].filter(Boolean).join(' ');
  return { amount, name: parsed.name, note: parsed.note };
}

export function ingredientToString(parsed, factor = 1, system = 'original') {
  const d = displayIngredient(parsed, factor, system);
  if (d.header) return `${d.header}:`;
  return [d.amount, d.name].filter(Boolean).join(' ') + (d.note ? `, ${d.note}` : '');
}

// ---------- Times ----------

export function parseISODuration(str) {
  if (!str || typeof str !== 'string') return null;
  const m = str.match(/^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i);
  if (!m) return parseDurationText(str);
  const mins = (+m[1] || 0) * 1440 + (+m[2] || 0) * 60 + (+m[3] || 0) + (+m[4] || 0) / 60;
  return mins ? Math.round(mins) : null;
}

export function parseDurationText(str) {
  if (!str) return null;
  const s = normalizeFractions(String(str).toLowerCase());
  let total = 0;
  let found = false;
  const re = /(\d+(?:\.\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+)\s*(hours?|hrs?|h|minutes?|mins?|m)\b/g;
  let m;
  while ((m = re.exec(s))) {
    const n = numValue(m[1]);
    total += m[2].startsWith('h') ? n * 60 : n;
    found = true;
  }
  if (!found) {
    const bare = s.match(/^\s*(\d+)\s*$/);
    if (bare) return +bare[1];
  }
  return found ? Math.round(total) : null;
}

export function formatMinutes(mins) {
  if (!mins) return '';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (!h) return `${m} min`;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

// Finds durations inside an instruction step so the UI can offer timers.
export function findTimers(text) {
  const out = [];
  const re = /(\d+(?:\.\d+)?|an?|one|half an?)(?:\s*(?:-|–|to)\s*(\d+(?:\.\d+)?))?\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?)\b/gi;
  let m;
  while ((m = re.exec(text))) {
    const word = m[1].toLowerCase();
    let n = word.startsWith('half') ? 0.5 : word === 'a' || word === 'an' || word === 'one' ? 1 : parseFloat(m[1]);
    if (m[2]) n = parseFloat(m[2]);
    const unit = m[3].toLowerCase();
    const seconds = unit.startsWith('h') ? n * 3600 : unit.startsWith('s') ? n : n * 60;
    if (seconds > 0) out.push({ index: m.index, length: m[0].length, label: m[0], seconds: Math.round(seconds) });
  }
  return out;
}

export function formatClock(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0');
  return `${h ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`;
}

// Adds a converted temperature alongside the original, e.g. "350°F" -> "350°F (175°C)".
export function convertTemperatures(text, system) {
  if (system === 'original') return text;
  return text.replace(/(\d{2,3})\s*(?:°|º|degrees?\s*)\s*([FC])\b/gi, (m, n, scale) => {
    const v = +n;
    if (system === 'metric' && scale.toUpperCase() === 'F') return `${m} (${Math.round(((v - 32) * 5) / 9 / 5) * 5}°C)`;
    if (system === 'us' && scale.toUpperCase() === 'C') return `${m} (${Math.round((v * 9) / 5 + 32)}°F)`;
    return m;
  });
}

// ---------- Free-text / caption parsing (social posts, OCR, pasted text) ----------

const ING_HEADING = /^(ingredients?|ingredient list|what you('ll)? need|you('ll)? need|shopping list|for the [a-z ]+)$/i;
const STEP_HEADING = /^(instructions?|directions?|method|steps?|preparation|prep|how to( make)?( it)?|to make|recipe|cooking instructions)$/i;
const NOTE_HEADING = /^(notes?|tips?|recipe notes?|chef'?s? notes?)$/i;
const BORING_TAGS = new Set(['recipe', 'recipes', 'food', 'foodie', 'foodporn', 'reels', 'reel', 'fyp', 'foryou', 'foryoupage', 'viral', 'instafood', 'yummy', 'delicious', 'tiktok', 'tiktokfood', 'explore', 'explorepage', 'foodtiktok', 'easyrecipe', 'easyrecipes', 'cooking', 'homemade']);

function headingKind(line) {
  const t = stripEmoji(line).replace(/[*_~:.!-]+$/g, '').replace(/^[*_~#]+/, '').trim();
  if (!t || t.length > 40) return null;
  if (NOTE_HEADING.test(t)) return 'notes';
  if (STEP_HEADING.test(t)) return 'steps';
  if (ING_HEADING.test(t)) return /^for the /i.test(t) ? 'ingredients-sub' : 'ingredients';
  return null;
}

function looksLikeIngredient(line) {
  const t = cleanListLine(line);
  if (!t || t.length > 90) return false;
  const q = readQuantity(t);
  if (q && !q.article) {
    // Step-like sentences ("2 minutes later, stir") are not ingredients.
    if (/^\s*(minutes?|mins?|hours?|seconds?)\b/i.test(q.rest)) return false;
    return true;
  }
  return /^\s*[-•*▢◦]/.test(line) && t.split(/\s+/).length <= 6 && !/[.!?]$/.test(t);
}

function looksLikeStep(line) {
  const t = String(line).trim();
  return /^(\d+[.)]|step\s*\d+)/i.test(t) || (t.length > 45 && /[a-z]/.test(t));
}

function splitSentences(text) {
  return text.split(/(?<=[.!?])\s+(?=[A-Z])/).map((s) => s.trim()).filter(Boolean);
}

function extractMeta(text) {
  const meta = {};
  const serv = text.match(/\b(?:serves|servings?|yield[s]?|makes|portions?)\s*[:\-]?\s*(\d+)/i) || text.match(/\b(\d+)\s*(?:servings|portions)\b/i);
  if (serv) meta.servings = +serv[1];
  const grab = (label) => {
    const m = text.match(new RegExp(`${label}\\s*(?:time)?\\s*[:\\-]?\\s*((?:\\d[\\d\\s./]*\\s*(?:hours?|hrs?|h|minutes?|mins?|m)\\b\\s*(?:and\\s*)?)+)`, 'i'));
    return m ? parseDurationText(m[1]) : null;
  };
  meta.prepTime = grab('prep(?:aration)?');
  meta.cookTime = grab('(?:cook(?:ing)?|bake|baking)');
  meta.totalTime = grab('total');
  return meta;
}

function cleanTitle(line) {
  // Captions often use emoji as a separator: "Garlic Orzo 🧄🧀 Save this for later!"
  const firstSegment = String(line).split(EMOJI_RE).map((x) => x.trim()).find(Boolean) || '';
  if (firstSegment.length >= 8 && firstSegment.length < String(line).trim().length) line = firstSegment;
  let t = stripEmoji(line).replace(/#\w+/g, '').replace(/@\w+/g, '').replace(/^[^\p{L}\p{N}]+/u, '').trim();
  if (t.length > 70) {
    const cut = t.split(/(?<=[.!?|])\s|\s[|–—-]\s/)[0];
    if (cut && cut.length >= 8) t = cut;
  }
  t = t.replace(/[\s:.!|–—-]+$/, '').trim();
  return t.length > 90 ? `${t.slice(0, 87)}…` : t;
}

export function extractHashtags(text) {
  const tags = [];
  for (const m of String(text).matchAll(/#([\p{L}\p{N}_]+)/gu)) {
    const t = m[1].toLowerCase();
    if (!BORING_TAGS.has(t) && !tags.includes(t) && t.length < 30) tags.push(t);
  }
  return tags.slice(0, 6);
}

// Social captions (e.g. TikTok oEmbed titles) often arrive flattened onto one line.
// Re-insert breaks before section labels, numbered steps and bullets.
function unflatten(text) {
  if (text.split('\n').filter((l) => l.trim()).length > 3) return text;
  return text
    .replace(/\s*(?=\b(?:ingredients?|instructions?|directions?|method|steps?|notes?)\s*[:：])/gi, '\n')
    .replace(/\s+(?=(?:\d{1,2}[.)]|step\s*\d+[:.)]?)\s+\p{Lu})/gu, '\n')
    .replace(/\s*[•▪●]\s*/g, '\n• ')
    .replace(/^\n+/, '');
}

export function parseRecipeText(input) {
  const text = unflatten(String(input ?? '').replace(/\r/g, '').replace(/\\n/g, '\n'));
  const rawLines = text.split('\n').map((l) => l.trim());
  const recipe = { title: '', description: '', ingredients: [], instructions: [], notes: '', tags: extractHashtags(text), ...extractMeta(text) };
  let section = null;
  let sawHeading = false;
  const preamble = [];
  const notes = [];

  const isMetaLine = (l) => /^(serves|servings?|yield|makes|prep|cook|total|bake)\b[^.]{0,40}$/i.test(stripEmoji(l));

  for (const line of rawLines) {
    if (!line) continue;
    const kind = headingKind(line);
    if (kind) {
      sawHeading = true;
      if (kind === 'ingredients-sub') {
        section = 'ingredients';
        recipe.ingredients.push(`## ${stripEmoji(line).replace(/:$/, '')}`);
      } else section = kind;
      continue;
    }
    // Inline headings: "Ingredients: 2 eggs, 1 cup milk"
    const inline = stripEmoji(line).match(/^(ingredients|instructions|directions|method|steps)\s*:\s*(.+)$/i);
    if (inline) {
      sawHeading = true;
      section = /ingredients/i.test(inline[1]) ? 'ingredients' : 'steps';
      const body = inline[2];
      if (section === 'ingredients') recipe.ingredients.push(...body.split(/\s*[,;]\s*(?=\d|[a-z½¼¾⅓⅔])/i).map((x) => cleanListLine(x).replace(/\.$/, '')).filter(Boolean));
      else recipe.instructions.push(...splitSentences(body));
      continue;
    }
    if (/^(#[\p{L}\p{N}_]+\s*)+$/u.test(line)) continue; // pure hashtag lines
    if (!section) { preamble.push(line); continue; }
    if (section === 'ingredients') {
      if (sawHeading && isHeaderLine(stripEmoji(line)) && !readQuantity(cleanListLine(line))) {
        recipe.ingredients.push(`## ${headerText(stripEmoji(line))}`);
      } else {
        const c = cleanListLine(line);
        if (c) recipe.ingredients.push(c);
      }
    } else if (section === 'steps') {
      const c = cleanListLine(line);
      if (!c) continue;
      if (c.length > 220) recipe.instructions.push(...splitSentences(c));
      else recipe.instructions.push(c);
    } else if (section === 'notes') {
      notes.push(cleanListLine(line));
    }
  }

  // No explicit headings: classify each line heuristically.
  if (!sawHeading) {
    const leftovers = [];
    for (const line of preamble.splice(1)) {
      if (isMetaLine(line)) continue;
      if (looksLikeIngredient(line)) recipe.ingredients.push(cleanListLine(line));
      else if (recipe.ingredients.length && looksLikeStep(line)) {
        const c = cleanListLine(line);
        if (c.length > 220) recipe.instructions.push(...splitSentences(c));
        else recipe.instructions.push(c);
      } else leftovers.push(line);
    }
    preamble.push(...leftovers);
  }

  const titleLine = preamble.find((l) => cleanTitle(l).length >= 3 && !isMetaLine(l));
  recipe.title = titleLine ? cleanTitle(titleLine) : '';
  const desc = preamble
    .filter((l) => l !== titleLine && !isMetaLine(l))
    .map((l) => stripEmoji(l.replace(/#[\p{L}\p{N}_]+/gu, '')).trim())
    .filter(Boolean);
  recipe.description = desc.join(' ').slice(0, 400);
  recipe.notes = notes.filter(Boolean).join('\n');
  const dropTrailingTags = (l) => l.replace(/(\s+#[\p{L}\p{N}_]+)+\s*$/u, '').trim();
  recipe.instructions = recipe.instructions.filter((l) => !/^(#[\p{L}\p{N}_]+\s*)+$/u.test(l)).map(dropTrailingTags).filter(Boolean);
  recipe.ingredients = recipe.ingredients.map(dropTrailingTags).filter(Boolean);
  return recipe;
}

// ---------- HTML / schema.org parsing ----------

function asArray(v) {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function hasType(node, type) {
  return asArray(node?.['@type']).some((t) => String(t).toLowerCase() === type.toLowerCase());
}

export function findRecipeNode(data) {
  const stack = asArray(data);
  const seen = new Set();
  while (stack.length) {
    const node = stack.shift();
    if (!node || typeof node !== 'object' || seen.has(node)) continue;
    seen.add(node);
    if (hasType(node, 'Recipe')) return node;
    if (Array.isArray(node)) stack.push(...node);
    else {
      if (node['@graph']) stack.push(...asArray(node['@graph']));
      if (node.mainEntity) stack.push(...asArray(node.mainEntity));
      if (node.itemListElement) stack.push(...asArray(node.itemListElement));
      if (node.item) stack.push(node.item);
    }
  }
  return null;
}

function resolveUrl(url, base) {
  if (!url) return '';
  try { return new URL(url, base || undefined).href; } catch { return url; }
}

function imageFrom(v, base) {
  for (const item of asArray(v)) {
    if (typeof item === 'string') return resolveUrl(item, base);
    if (item && typeof item === 'object') {
      const u = item.url || item.contentUrl || item['@id'];
      if (u) return resolveUrl(u, base);
    }
  }
  return '';
}

function flattenInstructions(v) {
  const out = [];
  for (const item of asArray(v)) {
    if (typeof item === 'string') {
      const t = stripTags(item);
      if (t.includes('\n')) out.push(...t.split('\n').map(cleanListLine).filter(Boolean));
      else if (t.length > 300) out.push(...splitSentences(t));
      else if (t) out.push(t);
    } else if (item && typeof item === 'object') {
      if (hasType(item, 'HowToSection')) {
        if (item.name) out.push(`## ${stripTags(item.name)}`);
        out.push(...flattenInstructions(item.itemListElement));
      } else if (item.itemListElement) {
        out.push(...flattenInstructions(item.itemListElement));
      } else {
        const t = stripTags(item.text || item.name || item.description || '');
        if (t) out.push(t);
      }
    }
  }
  return out;
}

function firstNumber(v) {
  for (const item of asArray(v)) {
    const m = String(item).match(/\d+(?:\.\d+)?/);
    if (m) return Math.round(parseFloat(m[0]));
  }
  return null;
}

export function recipeFromJsonLd(node, baseUrl = '') {
  const tags = [];
  for (const k of ['recipeCategory', 'recipeCuisine', 'keywords']) {
    for (const v of asArray(node[k])) {
      for (const t of String(v).split(',')) {
        const s = stripTags(t).toLowerCase();
        if (s && s.length < 30 && !tags.includes(s)) tags.push(s);
      }
    }
  }
  const prep = parseISODuration(node.prepTime);
  let cook = parseISODuration(node.cookTime);
  const total = parseISODuration(node.totalTime);
  if (!cook && total && prep && total > prep) cook = total - prep;
  else if (!cook && !prep && total) cook = total;
  const n = node.nutrition || {};
  const nutrition = {
    calories: firstNumber(n.calories),
    protein: firstNumber(n.proteinContent),
    carbs: firstNumber(n.carbohydrateContent),
    fat: firstNumber(n.fatContent),
  };
  const author = asArray(node.author).map((a) => (typeof a === 'string' ? a : a?.name)).find(Boolean);
  return {
    title: stripTags(node.name || node.headline || ''),
    description: stripTags(node.description || '').slice(0, 400),
    image: imageFrom(node.image || node.thumbnailUrl, baseUrl),
    servings: firstNumber(node.recipeYield),
    prepTime: prep,
    cookTime: cook,
    ingredients: asArray(node.recipeIngredient || node.ingredients).map(stripTags).filter(Boolean),
    instructions: flattenInstructions(node.recipeInstructions),
    tags: tags.slice(0, 6),
    nutrition: Object.values(nutrition).some((x) => x != null) ? nutrition : null,
    author: author ? stripTags(author) : '',
    rating: node.aggregateRating ? Math.round(parseFloat(node.aggregateRating.ratingValue) * 10) / 10 || null : null,
    ratingCount: node.aggregateRating ? parseInt(String(node.aggregateRating.ratingCount ?? node.aggregateRating.reviewCount ?? '').replace(/\D/g, ''), 10) || null : null,
  };
}

function metaContent(html, prop) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*>`, 'i');
  const tag = html.match(re)?.[0];
  if (!tag) return '';
  const c = tag.match(/content=(["'])([\s\S]*?)\1/i);
  return c ? decodeEntities(c[2]).trim() : '';
}

// Instagram's og:description looks like: `1,234 likes, 56 comments - user on May 1, 2024: "caption"`.
export function cleanSocialCaption(text) {
  let t = String(text ?? '').trim();
  t = t.replace(/^[\d.,]+[KkMm]?\s+likes?,\s*[\d.,]+[KkMm]?\s+comments?\s*[-–]\s*[^:]+?:\s*/i, '');
  t = t.replace(/^[^:\n]{1,60}\son\s(?:Instagram|TikTok)\s*:\s*/i, '');
  t = t.replace(/^["“]|["”]\.?$/g, '');
  return t.trim();
}

export function extractRecipeFromHtml(html, baseUrl = '') {
  const scripts = [...String(html).matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const s of scripts) {
    let data;
    try { data = JSON.parse(s[1].trim()); } catch {
      try { data = JSON.parse(s[1].trim().replace(/[\u0000-\u001f]+/g, ' ')); } catch { continue; }
    }
    const node = findRecipeNode(data);
    if (node) {
      const r = recipeFromJsonLd(node, baseUrl);
      if (r.ingredients.length || r.instructions.length) return { ...r, method: 'schema' };
    }
  }
  // Recipe-card markup without structured data (class names like "wprm-recipe-ingredient").
  const markup = recipeFromMarkup(html, baseUrl);
  if (markup) return { ...markup, method: 'markup' };
  // Fallback: Open Graph caption (social posts) parsed as free text.
  const ogTitle = metaContent(html, 'og:title') || stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
  const ogDesc = metaContent(html, 'og:description') || metaContent(html, 'description');
  const ogImage = metaContent(html, 'og:image');
  const caption = cleanSocialCaption(ogDesc);
  const parsed = parseRecipeText(caption);
  if (!parsed.title || parsed.title.length < 4) parsed.title = cleanTitle(cleanSocialCaption(ogTitle));
  return { ...parsed, image: resolveUrl(ogImage, baseUrl), method: 'caption', caption };
}

export function platformFromUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\.|^m\./, '');
    if (/instagram\.com$/.test(host)) return 'instagram';
    if (/tiktok\.com$/.test(host)) return 'tiktok';
    if (/youtube\.com$|youtu\.be$/.test(host)) return 'youtube';
    if (/pinterest\.|pin\.it$/.test(host)) return 'pinterest';
    if (/facebook\.com$|fb\.watch$/.test(host)) return 'facebook';
    return 'web';
  } catch {
    return 'web';
  }
}

export function hostFromUrl(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

// ---------- Grocery aisles & merging ----------

const AISLES = [
  ['Produce', ['apple', 'avocado', 'banana', 'basil', 'bean sprout', 'bell pepper', 'berries', 'blueberr', 'broccoli', 'cabbage', 'carrot', 'cauliflower', 'celery', 'chili', 'chilli', 'cilantro', 'coriander', 'corn', 'cucumber', 'dill', 'eggplant', 'aubergine', 'garlic', 'ginger', 'grape', 'green onion', 'herbs', 'jalapeno', 'jalapeño', 'kale', 'leek', 'lemon', 'lettuce', 'lime', 'mango', 'mint', 'mushroom', 'onion', 'orange', 'parsley', 'peach', 'pear', 'peas', 'pepper', 'pineapple', 'potato', 'rosemary', 'romaine', 'scallion', 'shallot', 'spinach', 'squash', 'strawberr', 'sweet potato', 'thyme', 'tomato', 'zucchini', 'courgette', 'arugula', 'rocket', 'asparagus', 'beet', 'radish', 'fennel', 'chives', 'sage', 'raspberr', 'cherry tomato', 'cherries', 'watermelon', 'melon']],
  ['Meat & Seafood', ['bacon', 'beef', 'chicken', 'chorizo', 'cod', 'fish', 'ham', 'lamb', 'mince', 'pork', 'prawn', 'salmon', 'sausage', 'shrimp', 'steak', 'tuna', 'turkey', 'prosciutto', 'pancetta', 'salami', 'pepperoni', 'scallop', 'crab', 'thigh', 'breast', 'drumstick', 'ground meat', 'tilapia', 'halibut', 'anchov']],
  ['Dairy & Eggs', ['butter', 'buttermilk', 'cheddar', 'cheese', 'cream', 'egg', 'feta', 'ghee', 'half and half', 'milk', 'mozzarella', 'parmesan', 'parmigiano', 'ricotta', 'sour cream', 'yogurt', 'yoghurt', 'mascarpone', 'halloumi', 'gruyere', 'brie', 'goat cheese', 'creme fraiche', 'crème fraîche', 'cream cheese', 'heavy cream', 'whipping cream']],
  ['Bakery', ['bagel', 'baguette', 'bread', 'brioche', 'bun', 'ciabatta', 'croissant', 'naan', 'pita', 'roll', 'sourdough', 'tortilla', 'wrap', 'flatbread']],
  ['Pantry', ['baking powder', 'baking soda', 'bean', 'beans', 'black beans', 'broth', 'stock', 'bouillon', 'breadcrumb', 'panko', 'chickpea', 'chocolate', 'cocoa', 'coconut milk', 'cornstarch', 'corn starch', 'couscous', 'flour', 'honey', 'jam', 'ketchup', 'lentil', 'maple syrup', 'mayo', 'mayonnaise', 'mustard', 'noodle', 'nut', 'almond', 'walnut', 'pecan', 'cashew', 'peanut', 'oats', 'oil', 'olive oil', 'olives', 'pasta', 'spaghetti', 'penne', 'linguine', 'fettuccine', 'macaroni', 'orzo', 'quinoa', 'rice', 'soy sauce', 'sriracha', 'sugar', 'syrup', 'tahini', 'tomato paste', 'tomato sauce', 'crushed tomatoes', 'diced tomatoes', 'canned tomatoes', 'vinegar', 'yeast', 'vanilla', 'gochujang', 'fish sauce', 'hoisin', 'oyster sauce', 'salsa', 'sesame', 'seeds', 'raisin', 'dates', 'peanut butter', 'pesto', 'curry paste', 'chocolate chips', 'sun-dried tomato', 'sun dried tomato', 'capers', 'worcestershire', 'hot sauce', 'cornmeal', 'gelatin', 'condensed milk', 'evaporated milk', 'sauce']],
  ['Spices & Seasonings', ['allspice', 'bay leaf', 'bay leaves', 'black pepper', 'cardamom', 'cayenne', 'chili flakes', 'chili powder', 'chilli flakes', 'cinnamon', 'cloves', 'cumin', 'curry powder', 'garam masala', 'garlic powder', 'italian seasoning', 'nutmeg', 'onion powder', 'oregano', 'paprika', 'smoked paprika', 'pepper flakes', 'red pepper flakes', 'salt', 'seasoning', 'turmeric', 'za\'atar', 'dried thyme', 'dried basil', 'dried oregano', 'everything bagel', 'sea salt', 'kosher salt', 'msg', 'spice', 'ground ginger', 'ground pepper']],
  ['Frozen', ['frozen', 'ice cream', 'ice']],
  ['Drinks', ['beer', 'coffee', 'juice', 'soda', 'sparkling', 'tea', 'water', 'wine', 'espresso', 'kombucha']],
];

export const AISLE_ORDER = ['Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Bakery', 'Pantry', 'Spices & Seasonings', 'Frozen', 'Drinks', 'Other'];
export const AISLE_EMOJI = { Produce: '🥬', 'Meat & Seafood': '🥩', 'Dairy & Eggs': '🧀', Bakery: '🥖', Pantry: '🥫', 'Spices & Seasonings': '🧂', Frozen: '🧊', Drinks: '🧃', Other: '🛒' };

// Picks the keyword whose match ends last in the name (the head noun), then the longest one.
function bestKeywordMatch(name, entries) {
  const s = ` ${String(name).toLowerCase()} `;
  let best = null;
  for (const [value, keywords] of entries) {
    for (const kw of keywords) {
      let from = 0;
      let idx;
      while ((idx = s.indexOf(kw, from)) !== -1) {
        from = idx + 1;
        const before = s[idx - 1];
        if (/[a-z]/.test(before)) continue;
        // Allow plural / partial-word suffixes ("tomatoes", "blueberries").
        let end = idx + kw.length;
        while (/[a-z]/.test(s[end])) end++;
        const score = end * 100 + kw.length;
        if (!best || score > best.score) best = { value, score, kw };
      }
    }
  }
  return best;
}

export function categorize(name) {
  const n = String(name).toLowerCase();
  if (/^frozen\b/.test(n)) return 'Frozen';
  return bestKeywordMatch(n, AISLES)?.value || 'Other';
}

const DESCRIPTORS = /\b(large|small|medium|fresh|freshly|chopped|diced|minced|sliced|grated|shredded|ground|finely|roughly|thinly|peeled|boneless|skinless|ripe|cooked|uncooked|raw|optional|organic|whole|extra[- ]virgin|unsalted|salted|softened|melted|room temperature|cold|warm|packed|heaping|level|to taste|divided|plus more|for serving|for garnish|about|approx\.?|of)\b/gi;

export function normalizeName(name) {
  let n = String(name ?? '').toLowerCase().replace(/\([^)]*\)/g, ' ').replace(DESCRIPTORS, ' ').replace(/[^a-z\s'-]/g, ' ').replace(/\s+/g, ' ').trim();
  n = n.split(' ').map((w) => {
    if (w.length <= 3 || /ss$|us$|is$/.test(w)) return w;
    if (/(tomato|potato)es$/.test(w)) return w.slice(0, -2);
    if (/ies$/.test(w)) return `${w.slice(0, -3)}y`;
    if (/(ch|sh|x)es$/.test(w)) return w.slice(0, -2);
    if (/s$/.test(w)) return w.slice(0, -1);
    return w;
  }).join(' ');
  return n;
}

function tryConvertSameFamily(qty, fromUnit, toUnit) {
  const a = UNITS[fromUnit];
  const b = UNITS[toUnit];
  if (!a || !b || a.type !== b.type) return null;
  if (a.type === 'volume') return (qty * a.ml) / b.ml;
  if (a.type === 'weight') return (qty * a.g) / b.g;
  return fromUnit === toUnit ? qty : null;
}

// Adds an ingredient line to a grocery list, merging with matching items.
export function addToGroceryList(list, line, { factor = 1, recipeId = null, recipeTitle = '' } = {}) {
  const p = typeof line === 'string' ? parseIngredient(line) : line;
  if (p.isHeader || !p.name) return list;
  const key = normalizeName(p.name);
  if (!key) return list;
  const qty = p.qty != null ? (p.qtyMax ?? p.qty) * factor : null;
  const items = list.map((i) => ({ ...i }));
  for (const item of items) {
    if (item.checked || item.key !== key) continue;
    if (qty == null && item.qty == null) return mergeSource(items, item, recipeId, recipeTitle);
    if (qty != null && item.qty != null) {
      const sameUnit = (item.unit || null) === (p.unit || null) && (item.unit || item.unitText === (p.unitText || ''));
      const converted = sameUnit ? qty : item.unit && p.unit ? tryConvertSameFamily(qty, p.unit, item.unit) : null;
      if (converted != null) {
        item.qty = Math.round((item.qty + converted) * 1000) / 1000;
        return mergeSource(items, item, recipeId, recipeTitle);
      }
    }
  }
  items.push({
    id: uid('g'),
    key,
    name: p.name.replace(/\s*\([^)]*\)\s*/g, ' ').trim() || p.name,
    qty,
    unit: p.unit,
    unitText: p.unitText,
    aisle: categorize(p.name),
    checked: false,
    recipes: recipeId ? [{ id: recipeId, title: recipeTitle }] : [],
  });
  return items;
}

function mergeSource(items, item, recipeId, recipeTitle) {
  if (recipeId && !item.recipes.some((r) => r.id === recipeId)) item.recipes = [...item.recipes, { id: recipeId, title: recipeTitle }];
  return items;
}

export function groceryAmount(item) {
  if (item.qty == null) return '';
  let { qty, unit } = item;
  // Merged amounts can end up as "18 tbsp"; show them in the friendliest unit instead.
  if (['tsp', 'tbsp', 'cup'].includes(unit)) ({ qty, unit } = bestUsVolume(qty * UNITS[unit].ml));
  else if (unit === 'g' && qty >= 1000) { qty /= 1000; unit = 'kg'; }
  else if (unit === 'ml' && qty >= 1000) { qty /= 1000; unit = 'l'; }
  else if (unit === 'oz' && qty >= 16) { qty /= 16; unit = 'lb'; }
  const metric = ['g', 'kg', 'ml', 'l', 'cl'].includes(unit);
  const q = formatQuantity(qty, { fractions: !metric });
  const singular = q === '1' || /^[⅛¼⅓⅜½⅝⅔¾⅞]$/.test(q);
  const u = unit ? unitLabel(unit, singular ? 1 : 2) : item.unitText;
  return [q, u].filter(Boolean).join(' ');
}

// ---------- Nutrition estimate ----------
// Per 100 g: [kcal, protein, carbs, fat], d = density g/ml, each = grams per item, neg = negligible.

const FOODS = {
  'all-purpose flour': [364, 10, 76, 1, { d: 0.53 }], flour: [364, 10, 76, 1, { d: 0.53 }], 'bread flour': [361, 12, 73, 1.5, { d: 0.55 }],
  sugar: [387, 0, 100, 0, { d: 0.85 }], 'brown sugar': [380, 0, 98, 0, { d: 0.9 }], 'powdered sugar': [389, 0, 100, 0, { d: 0.5 }],
  butter: [717, 1, 0, 81, { d: 0.96, stick: 113 }], 'olive oil': [884, 0, 0, 100, { d: 0.92 }], oil: [884, 0, 0, 100, { d: 0.92 }],
  'sesame oil': [884, 0, 0, 100, { d: 0.92 }], 'coconut oil': [862, 0, 0, 100, { d: 0.92 }],
  egg: [143, 13, 1, 10, { each: 50 }], eggs: [143, 13, 1, 10, { each: 50 }], 'egg yolk': [322, 16, 3.6, 27, { each: 17 }],
  milk: [61, 3.2, 4.8, 3.3, { d: 1.03 }], 'heavy cream': [340, 2.8, 2.8, 36, { d: 1 }], cream: [340, 2.8, 2.8, 36, { d: 1 }],
  'cheddar': [403, 25, 1.3, 33, { d: 0.45 }], cheese: [380, 24, 2, 31, { d: 0.45 }], parmesan: [431, 38, 4, 29, { d: 0.4 }],
  mozzarella: [280, 28, 3, 17, { d: 0.45 }], 'cream cheese': [342, 6, 4, 34, { d: 1 }], feta: [264, 14, 4, 21, { d: 0.6 }],
  yogurt: [73, 9, 4, 2, { d: 1.03 }], 'greek yogurt': [73, 10, 3.6, 2, { d: 1.03 }], 'sour cream': [198, 2.4, 4.6, 19, { d: 1 }],
  'chicken breast': [165, 31, 0, 3.6, { each: 200 }], 'chicken thigh': [209, 26, 0, 11, { each: 110 }], chicken: [190, 28, 0, 8, { each: 200 }],
  'ground beef': [254, 17, 0, 20], beef: [250, 26, 0, 15], steak: [271, 25, 0, 19, { each: 250 }], pork: [242, 27, 0, 14], 'ground turkey': [203, 27, 0, 10],
  bacon: [541, 37, 1.4, 42, { slice: 12, each: 12 }], sausage: [301, 12, 2, 27, { each: 75 }], salmon: [208, 20, 0, 13, { each: 170, fillet: 170 }],
  shrimp: [99, 24, 0.2, 0.3], prawn: [99, 24, 0.2, 0.3], tuna: [132, 28, 0, 1.3, { can: 140 }], cod: [82, 18, 0, 0.7, { fillet: 170, each: 170 }], tofu: [76, 8, 1.9, 4.8, { package: 400, each: 400 }],
  rice: [365, 7, 80, 0.7, { d: 0.85 }], pasta: [371, 13, 75, 1.5, { d: 0.42 }], spaghetti: [371, 13, 75, 1.5], noodle: [371, 13, 75, 1.5], penne: [371, 13, 75, 1.5], linguine: [371, 13, 75, 1.5], orzo: [371, 13, 75, 1.5, { d: 0.8 }],
  bread: [265, 9, 49, 3.2, { slice: 30, each: 30 }], tortilla: [310, 8, 50, 8, { each: 45 }], oats: [389, 17, 66, 7, { d: 0.38 }], quinoa: [368, 14, 64, 6, { d: 0.85 }],
  potato: [77, 2, 17, 0.1, { each: 170 }], 'sweet potato': [86, 1.6, 20, 0.1, { each: 130 }], onion: [40, 1.1, 9, 0.1, { each: 110 }], 'red onion': [40, 1.1, 9, 0.1, { each: 110 }], shallot: [72, 2.5, 17, 0.1, { each: 40 }],
  garlic: [149, 6.4, 33, 0.5, { clove: 5, each: 5, head: 50 }], tomato: [18, 0.9, 3.9, 0.2, { each: 120 }], 'cherry tomato': [18, 0.9, 3.9, 0.2, { d: 0.6, each: 15 }],
  'crushed tomatoes': [32, 1.6, 7, 0.3, { can: 400, d: 1 }], 'diced tomatoes': [32, 1.6, 7, 0.3, { can: 400, d: 1 }], 'tomato paste': [82, 4.3, 19, 0.5, { d: 1.1 }], 'tomato sauce': [29, 1.3, 6, 0.2, { d: 1, can: 400 }],
  carrot: [41, 0.9, 10, 0.2, { each: 60 }], 'bell pepper': [31, 1, 6, 0.3, { each: 120 }], spinach: [23, 2.9, 3.6, 0.4, { d: 0.13, bag: 140 }], broccoli: [34, 2.8, 7, 0.4, { d: 0.38, head: 300 }],
  mushroom: [22, 3.1, 3.3, 0.3, { d: 0.3, each: 18 }], zucchini: [17, 1.2, 3.1, 0.3, { each: 200 }], cucumber: [15, 0.7, 3.6, 0.1, { each: 300 }], avocado: [160, 2, 9, 15, { each: 150 }],
  banana: [89, 1.1, 23, 0.3, { each: 118 }], apple: [52, 0.3, 14, 0.2, { each: 180 }], lemon: [29, 1.1, 9, 0.3, { each: 60 }], 'lemon juice': [22, 0.4, 7, 0.2, { d: 1.03 }], lime: [30, 0.7, 11, 0.2, { each: 45 }], 'lime juice': [25, 0.4, 8, 0.1, { d: 1.03 }],
  blueberries: [57, 0.7, 14, 0.3, { d: 0.6 }], strawberries: [32, 0.7, 7.7, 0.3, { d: 0.6 }], corn: [86, 3.2, 19, 1.2, { d: 0.6 }], peas: [81, 5, 14, 0.4, { d: 0.6 }], kale: [49, 4.3, 9, 0.9, { d: 0.1, bunch: 200 }], lettuce: [15, 1.4, 2.9, 0.2, { d: 0.2, head: 500 }], cabbage: [25, 1.3, 6, 0.1, { head: 900 }], cauliflower: [25, 1.9, 5, 0.3, { head: 600 }], 'green beans': [31, 1.8, 7, 0.2, { d: 0.5 }], asparagus: [20, 2.2, 3.9, 0.1, { bunch: 450 }],
  honey: [304, 0.3, 82, 0, { d: 1.42 }], 'maple syrup': [260, 0, 67, 0, { d: 1.32 }], 'soy sauce': [53, 8, 4.9, 0.6, { d: 1.15 }], 'peanut butter': [588, 25, 20, 50, { d: 1.08 }],
  'chocolate chips': [480, 4, 63, 24, { d: 0.7 }], chocolate: [546, 5, 61, 31, { d: 0.7 }], 'cocoa powder': [228, 20, 58, 14, { d: 0.37 }],
  chickpeas: [139, 7, 22, 2.6, { can: 240, d: 0.65 }], 'black beans': [132, 9, 24, 0.5, { can: 240, d: 0.7 }], beans: [130, 8, 22, 0.5, { can: 240, d: 0.7 }], lentils: [352, 25, 63, 1, { d: 0.8 }],
  'coconut milk': [197, 2.2, 2.8, 21, { d: 1, can: 400 }], broth: [5, 0.5, 0.4, 0.2, { d: 1 }], stock: [5, 0.5, 0.4, 0.2, { d: 1 }], cornstarch: [381, 0.3, 91, 0.1, { d: 0.54 }],
  almonds: [579, 21, 22, 50, { d: 0.6 }], walnuts: [654, 15, 14, 65, { d: 0.47 }], peanuts: [567, 26, 16, 49, { d: 0.6 }], cashews: [553, 18, 30, 44, { d: 0.6 }], 'sesame seeds': [573, 18, 23, 50, { d: 0.6 }],
  mayonnaise: [680, 1, 0.6, 75, { d: 0.92 }], mayo: [680, 1, 0.6, 75, { d: 0.92 }], ketchup: [112, 1.7, 26, 0.1, { d: 1.1 }], 'sun-dried tomatoes': [258, 14, 56, 3, { d: 0.5 }], olives: [115, 0.8, 6, 11, { d: 0.6, each: 4 }],
  wine: [85, 0.1, 2.6, 0, { d: 0.99 }], breadcrumbs: [395, 13, 72, 5, { d: 0.45 }], panko: [395, 13, 72, 5, { d: 0.25 }], raisins: [299, 3, 79, 0.5, { d: 0.65 }], 'chia seeds': [486, 17, 42, 31, { d: 0.65 }],
  // Negligible contributors that should still count as "recognized".
  salt: [0, 0, 0, 0, { neg: true }], pepper: [0, 0, 0, 0, { neg: true }], 'black pepper': [0, 0, 0, 0, { neg: true }], water: [0, 0, 0, 0, { neg: true }], ice: [0, 0, 0, 0, { neg: true }],
  'baking soda': [0, 0, 0, 0, { neg: true }], 'baking powder': [0, 0, 0, 0, { neg: true }], vanilla: [0, 0, 0, 0, { neg: true }], cinnamon: [0, 0, 0, 0, { neg: true }], paprika: [0, 0, 0, 0, { neg: true }],
  cumin: [0, 0, 0, 0, { neg: true }], oregano: [0, 0, 0, 0, { neg: true }], 'chili flakes': [0, 0, 0, 0, { neg: true }], 'red pepper flakes': [0, 0, 0, 0, { neg: true }], 'chili powder': [0, 0, 0, 0, { neg: true }], 'garlic powder': [0, 0, 0, 0, { neg: true }], 'onion powder': [0, 0, 0, 0, { neg: true }],
  turmeric: [0, 0, 0, 0, { neg: true }], 'curry powder': [0, 0, 0, 0, { neg: true }], 'garam masala': [0, 0, 0, 0, { neg: true }], 'italian seasoning': [0, 0, 0, 0, { neg: true }], thyme: [0, 0, 0, 0, { neg: true }], rosemary: [0, 0, 0, 0, { neg: true }],
  basil: [0, 0, 0, 0, { neg: true }], parsley: [0, 0, 0, 0, { neg: true }], cilantro: [0, 0, 0, 0, { neg: true }], dill: [0, 0, 0, 0, { neg: true }], mint: [0, 0, 0, 0, { neg: true }], chives: [0, 0, 0, 0, { neg: true }], 'green onion': [0, 0, 0, 0, { neg: true }], scallion: [0, 0, 0, 0, { neg: true }],
  ginger: [0, 0, 0, 0, { neg: true }], vinegar: [0, 0, 0, 0, { neg: true }], 'fish sauce': [0, 0, 0, 0, { neg: true }], mustard: [0, 0, 0, 0, { neg: true }], 'hot sauce': [0, 0, 0, 0, { neg: true }], sriracha: [0, 0, 0, 0, { neg: true }], 'bay leaves': [0, 0, 0, 0, { neg: true }], yeast: [0, 0, 0, 0, { neg: true }], nutmeg: [0, 0, 0, 0, { neg: true }], cayenne: [0, 0, 0, 0, { neg: true }], 'smoked paprika': [0, 0, 0, 0, { neg: true }], jalapeño: [0, 0, 0, 0, { neg: true }], jalapeno: [0, 0, 0, 0, { neg: true }], 'chili': [0, 0, 0, 0, { neg: true }], 'curry paste': [0, 0, 0, 0, { neg: true }],
};

const FOOD_ENTRIES = Object.keys(FOODS).map((k) => [k, [k]]);

function gramsFor(p, food) {
  const opts = food[4] || {};
  if (opts.neg || p.qty == null) return 0;
  const qty = p.qtyMax != null ? (p.qty + p.qtyMax) / 2 : p.qty;
  const u = UNITS[p.unit];
  if (u?.type === 'weight') return qty * u.g;
  if (u?.type === 'volume') return qty * u.ml * (opts.d ?? 0.8);
  if (p.unit && opts[p.unit]) return qty * opts[p.unit];
  const fallback = { pinch: 0.4, dash: 0.6, clove: 5, can: 400, jar: 300, stick: 113, slice: 30, bunch: 100, sprig: 1, handful: 30, piece: 50, head: 300, stalk: 40, fillet: 170, package: 300, bag: 300, scoop: 30, sheet: 20 };
  if (p.unit) return qty * (fallback[p.unit] ?? 50);
  return qty * (opts.each ?? 100);
}

// Returns per-serving estimate or null if too few ingredients are recognized.
export function estimateNutrition(lines, servings = 1) {
  let recognized = 0;
  let total = 0;
  const sum = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const line of lines || []) {
    const p = typeof line === 'string' ? parseIngredient(line) : line;
    if (p.isHeader || !p.name) continue;
    total++;
    const match = bestKeywordMatch(normalizeForFood(p.name), FOOD_ENTRIES);
    if (!match) continue;
    recognized++;
    const food = FOODS[match.value];
    const g = gramsFor(p, food);
    sum.calories += (food[0] * g) / 100;
    sum.protein += (food[1] * g) / 100;
    sum.carbs += (food[2] * g) / 100;
    sum.fat += (food[3] * g) / 100;
  }
  if (!total || recognized / total < 0.5) return null;
  const s = Math.max(1, servings || 1);
  return {
    calories: Math.round(sum.calories / s),
    protein: Math.round(sum.protein / s),
    carbs: Math.round(sum.carbs / s),
    fat: Math.round(sum.fat / s),
    coverage: recognized / total,
    estimated: true,
  };
}

function normalizeForFood(name) {
  return String(name).toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^a-zñé\s-]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Which ingredients are mentioned in a step (for cook mode).
export function ingredientsInStep(step, parsedIngredients) {
  const s = ` ${String(step).toLowerCase()} `;
  const hits = [];
  parsedIngredients.forEach((p, i) => {
    if (p.isHeader || !p.name) return;
    const words = normalizeName(p.name).split(' ').filter((w) => w.length > 2);
    if (!words.length) return;
    const head = words[words.length - 1];
    const stem = head.replace(/(es|s)$/, '');
    if (new RegExp(`[^a-z]${stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(s)) hits.push(i);
  });
  return hits;
}

// ---------- Recipe search & fallbacks ----------

// Maps a TheMealDB result (free recipe search API) to our recipe shape.
export function recipeFromMealDb(meal) {
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const name = (meal[`strIngredient${i}`] || '').trim();
    if (!name) continue;
    const measure = (meal[`strMeasure${i}`] || '').trim();
    ingredients.push(measure ? `${measure} ${name}` : name);
  }
  const lines = String(meal.strInstructions || '').split(/\r?\n/).map((l) => l.trim())
    .filter((l) => l && !/^(step\s*\d+|\d+\.?)$/i.test(l));
  const instructions = lines.flatMap((l) => (l.length > 260 ? splitSentences(l) : [cleanListLine(l) || l]));
  const tags = [meal.strCategory, meal.strArea, ...String(meal.strTags || '').split(',')]
    .map((t) => String(t || '').trim().toLowerCase()).filter((t, i, a) => t && a.indexOf(t) === i).slice(0, 6);
  return {
    title: String(meal.strMeal || '').trim(),
    description: [meal.strArea, meal.strCategory].filter(Boolean).join(' · '),
    image: meal.strMealThumb || '',
    servings: null,
    prepTime: null,
    cookTime: null,
    ingredients,
    instructions,
    tags,
    source: { url: meal.strSource || `https://www.themealdb.com/meal/${meal.idMeal}`, platform: 'web', name: 'TheMealDB' },
  };
}

const URL_NOISE = new Set(['reel', 'reels', 'share', 'watch', 'videos', 'video', 'posts', 'post', 'permalink', 'story', 'groups', 'photo', 'photos', 'p', 'r', 'v', 'tv', 'shorts', 'pin', 'status', 'www', 'm']);

// Best guess at a dish name from a link, e.g. ".../videos/easy-beef-lasagna/1234" -> "easy beef lasagna".
export function guessDishFromUrl(url) {
  let path;
  try { path = new URL(url).pathname; } catch { return ''; }
  const candidates = path.split('/').map((seg) => decodeURIComponent(seg).toLowerCase())
    .filter((seg) => /[a-z]/.test(seg) && seg.includes('-') && !URL_NOISE.has(seg))
    .map((seg) => seg.replace(/\.(html?|php)$/, '').replace(/[-_]+/g, ' ').replace(/\b\d{4,}\b/g, '').replace(/\s+/g, ' ').trim())
    .filter((seg) => seg.split(' ').length >= 2 && !/^[a-z0-9]{1,3}( [a-z0-9]{1,3})*$/.test(seg));
  return candidates.sort((a, b) => b.length - a.length)[0] || '';
}

// Text of a post from Facebook's public embed page (plugins/post.php), which
// keeps the message in <p> tags and doesn't require a login for public posts.
export function textFromEmbedHtml(html) {
  const paras = [...String(html).matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => stripTags(m[1].replace(/<br\s*\/?>/gi, '\n')))
    .filter(Boolean);
  return paras.join('\n').trim();
}

// Login walls come back as a successful page with no post content in it.
export function looksLikeLoginWall(html) {
  const title = stripTags(String(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').toLowerCase();
  return /^(log in|log into|login|sign up|facebook|instagram)\b/.test(title) && !/og:description/i.test(html);
}

// ---------- Instagram ----------

export function instagramShortcode(url) {
  return String(url).match(/instagram\.com\/(?:[\w.]+\/)?(?:p|reels?|tv)\/([A-Za-z0-9_-]{5,})/)?.[1] || null;
}

// Undo one level of JSON string escaping (\" \n é …) without throwing.
function unescapeJsonString(s) {
  try { return JSON.parse(`"${s}"`); } catch { return s.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\'); }
}

// Instagram's public embed page (/p/<code>/embed/captioned/) carries the full caption
// without a login: in a <div class="Caption"> block and/or a JSON blob.
export function parseInstagramEmbed(html) {
  const h = String(html);
  let caption = '';
  let author = '';
  const block = h.match(/<div[^>]+class="[^"]*\bCaption\b[^"]*"[^>]*>([\s\S]*?)(?:<div[^>]+class="[^"]*CaptionComments|<\/div>\s*<\/div>|$)/i);
  if (block) {
    author = stripTags(block[1].match(/<a[^>]+class="[^"]*CaptionUsername[^"]*"[^>]*>([\s\S]*?)<\/a>/i)?.[1] || '');
    const body = block[1].replace(/<a[^>]+class="[^"]*CaptionUsername[^"]*"[^>]*>[\s\S]*?<\/a>/i, '');
    caption = stripTags(body.replace(/<br\s*\/?>/gi, '\n')).replace(/\n{3,}/g, '\n\n').trim();
  }
  // JSON shapes seen in embed pages, possibly escaped a second time inside a string.
  const sources = [h, unescapeJsonString(h.match(/"contextJSON"\s*:\s*"((?:[^"\\]|\\.)*)"/)?.[1] || '')];
  if (!caption) {
    for (const src of sources) {
      const m = src.match(/"edge_media_to_caption"\s*:\s*\{\s*"edges"\s*:\s*\[\s*\{\s*"node"\s*:\s*\{\s*"text"\s*:\s*"((?:[^"\\]|\\.)*)"/)
        || src.match(/"caption"\s*:\s*\{[^{}]*?"text"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      if (m) { caption = unescapeJsonString(m[1]).trim(); break; }
    }
  }
  for (const src of sources) {
    if (author) break;
    author = src.match(/"owner"\s*:\s*\{[^{}]*?"username"\s*:\s*"([\w.]+)"/)?.[1] || '';
  }
  const img = h.match(/<img[^>]+class="[^"]*EmbeddedMediaImage[^"]*"[^>]+src="([^"]+)"/i)?.[1]
    || h.match(/<img[^>]+src="([^"]+)"[^>]+class="[^"]*EmbeddedMediaImage/i)?.[1]
    || h.match(/"display_url"\s*:\s*"((?:[^"\\]|\\.)*)"/)?.[1];
  return { caption, author, image: img ? decodeEntities(unescapeJsonString(img)) : '' };
}

// One-line summary of a fetched page, for the import "Details" view.
export function describePage(html) {
  const h = String(html);
  const title = stripTags(h.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').slice(0, 60);
  const og = (() => {
    const tag = h.match(/<meta[^>]+(?:property|name)=["']og:description["'][^>]*>/i)?.[0];
    const c = tag?.match(/content=(["'])([\s\S]*?)\1/i)?.[2];
    return c ? decodeEntities(c).slice(0, 80) : '';
  })();
  const parts = [`${Math.round(h.length / 1024)} KB`];
  if (title) parts.push(`title "${title}"`);
  parts.push(og ? `preview text "${og}${og.length >= 80 ? '…' : ''}"` : 'no preview text');
  if (looksLikeLoginWall(h)) parts.push('looks like a login page');
  return parts.join(', ');
}

// Removes social-app clutter that text recognition picks up from screenshots.
const SCREENSHOT_NOISE = [
  /^(liked by|view all|view \d+|add a comment|see translation|see more|see less|follow(ing)?|sponsored|suggested for you|reply|replies|send|share|like|comment|save|more|original audio|audio|reels?|paid partnership)\b/i,
  /^\d+([.,]\d+)?[kKmM]?\s*(likes?|comments?|shares?|views?|plays?|reactions?)\b/i,
  /^\d+\s*[smhdw]( ago)?$/i,
  /^(\d+\s*(minutes?|hours?|days?|weeks?)\s*ago|yesterday|just now)$/i,
  /^[@#]?[\w.]{2,30}\s*[•·]\s*(follow|following|original audio)/i,
  /^\d{1,2}:\d{2}(\s*[ap]m)?$/i,
];

export function cleanScreenshotText(text) {
  const lines = String(text ?? '').split('\n').map((l) => l.replace(/\s*[.…]{1,3}\s*more$/i, '').trim());
  // Usernames seen on "name • Follow" lines; Instagram also prefixes the caption with the username.
  const handles = new Set(lines.map((l) => l.match(/^@?([\w.]{2,30})\s*[•·]/)?.[1]).filter(Boolean));
  const isHandle = (w) => handles.has(w.replace(/^@/, '')) || /^@?(?=[a-z0-9._]*[._\d])[a-z0-9._]{3,30}$/.test(w);
  return lines
    .filter((l) => l.length > 2 && !SCREENSHOT_NOISE.some((re) => re.test(l)) && /[a-z]{2}/i.test(l))
    .map((l) => {
      const [first, ...rest] = l.split(/\s+/);
      return rest.length && isHandle(first) && /^[A-Z0-9"“(]/.test(rest[0]) ? rest.join(' ') : l;
    })
    .join('\n');
}


// ---------- Recipe pages without structured data ----------

function listItemsWithClass(html, classRe) {
  const out = [];
  const re = /<li\b([^>]*)>([\s\S]*?)<\/li>/gi;
  let m;
  while ((m = re.exec(html))) {
    const cls = m[1].match(/class=["']([^"']*)["']/i)?.[1] || '';
    if (!classRe.test(cls)) continue;
    const text = stripTags(m[2].replace(/<\/(p|div|span)>/gi, ' $&')).replace(/\s+/g, ' ').trim();
    if (text.length > 1 && text.length < 600 && !out.includes(text)) out.push(text);
  }
  return out;
}

// Reads ingredients and steps from common recipe-card markup (WP Recipe Maker, Tasty
// Recipes, Mediavine Create, and sites that name their lists "ingredients"/"instructions").
export function recipeFromMarkup(html, baseUrl = '') {
  const h = String(html);
  const ingredients = listItemsWithClass(h, /ingredient(?!s?-?(group|list|section|header|title|name)\b)/i)
    .filter((t) => !/^(ingredients?|deselect all|select all)$/i.test(t));
  let instructions = listItemsWithClass(h, /(instruction|direction|method|step)(?!s?-?(group|list|section|header|title)\b)/i);
  if (!instructions.length) {
    const block = h.match(/<(ol|ul|div)\b[^>]*class=["'][^"']*(instructions|directions|method|preparation)[^"']*["'][^>]*>([\s\S]*?)<\/\1>/i)?.[3] || '';
    instructions = [...block.matchAll(/<(li|p)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((m) => stripTags(m[2]).replace(/\s+/g, ' ').trim()).filter((t) => t.length > 8);
  }
  if (ingredients.length < 2) return null;
  const title = metaContent(h, 'og:title') || stripTags(h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '') || stripTags(h.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
  const meta = extractMeta(stripTags(h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')).slice(0, 20000));
  return {
    title: cleanTitle(title.replace(/\s*[|–—-]\s*[^|–—-]{2,40}$/, '')),
    description: metaContent(h, 'og:description').slice(0, 400),
    image: resolveUrl(metaContent(h, 'og:image'), baseUrl),
    servings: meta.servings || null,
    prepTime: meta.prepTime || null,
    cookTime: meta.cookTime || null,
    ingredients,
    instructions: instructions.map((t) => cleanListLine(t) || t),
    tags: [],
    nutrition: null,
    author: '',
  };
}

// Reads a recipe out of a page converted to Markdown (the r.jina.ai reader's text mode):
// takes the "Ingredients" and "Instructions/Directions/Method" sections.
export function parseMarkdownRecipe(md) {
  const text = String(md ?? '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*\*|__/g, '');
  const title = text.match(/^Title:\s*(.+)$/m)?.[1]?.trim() || text.match(/^#\s+(.+)$/m)?.[1]?.trim() || '';
  const lines = text.split('\n');
  const sections = [];
  let cur = null;
  for (const raw of lines) {
    const line = raw.trim();
    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*$/) || (/^[A-Z][A-Za-z &']{2,30}:?$/.test(line) && headingKind(line) ? [null, '###', line] : null);
    if (heading) {
      cur = { level: heading[1].length, name: heading[2].replace(/:$/, ''), lines: [] };
      sections.push(cur);
    } else if (cur && line) {
      cur.lines.push(line);
    }
  }
  const pick = (kind) => {
    const i = sections.findIndex((sec) => headingKind(sec.name) === kind || (kind === 'ingredients' && /^ingredients?\b/i.test(sec.name)));
    if (i < 0) return [];
    const out = [...sections[i].lines];
    // Include sub-sections ("For the sauce") until a heading at the same or higher level.
    for (let j = i + 1; j < sections.length && sections[j].level > sections[i].level; j++) {
      out.push(`## ${sections[j].name}`, ...sections[j].lines);
    }
    return out;
  };
  const ing = pick('ingredients').filter((l) => /^##|^\s*([-*•]|\d+[.)])\s+/.test(l) || readQuantity(cleanListLine(l)));
  const steps = pick('steps').filter((l) => /^##|^\s*([-*•]|\d+[.)])\s+/.test(l) || l.length > 30);
  if (ing.filter((l) => !l.startsWith('##')).length < 2) return null;
  const parsed = parseRecipeText([title, 'Ingredients:', ...ing.map((l) => l.replace(/^##\s*/, '').replace(/^([^:]+)$/, (x) => (l.startsWith('##') ? `${x}:` : x))), 'Instructions:', ...steps.filter((l) => !l.startsWith('##'))].join('\n'));
  return { ...parsed, title: cleanTitle(title) || parsed.title };
}

// ---------- Web search results ----------

const NOT_RECIPE_HOSTS = /(^|\.)(youtube\.com|youtu\.be|pinterest\.[a-z.]+|facebook\.com|instagram\.com|tiktok\.com|reddit\.com|x\.com|twitter\.com|amazon\.[a-z.]+|wikipedia\.org|quora\.com|bing\.com|duckduckgo\.com|google\.[a-z.]+|msn\.com)$/i;

export function isLikelyRecipeUrl(url) {
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol) || NOT_RECIPE_HOSTS.test(u.hostname)) return false;
    const path = u.pathname.toLowerCase();
    if (path === '/' || /\/(tag|tags|category|categories|collections?|search|gallery|galleries|videos?)\//.test(path)) return false;
    return true;
  } catch {
    return false;
  }
}

// Parses Bing RSS (format=rss) or DuckDuckGo's HTML results page into [{ title, url, snippet }].
export function parseSearchResults(body) {
  const b = String(body);
  const out = [];
  const add = (title, url, snippet = '') => {
    url = decodeEntities(url).trim();
    if (!isLikelyRecipeUrl(url) || out.some((r) => r.url === url)) return;
    out.push({ title: stripTags(title), url, snippet: stripTags(snippet).slice(0, 160), site: hostFromUrl(url) });
  };
  for (const m of b.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const item = m[1];
    const title = item.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '';
    const link = item.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || '';
    add(title.replace(/^<!\[CDATA\[|\]\]>$/g, ''), link.replace(/^<!\[CDATA\[|\]\]>$/g, ''), item.match(/<description>([\s\S]*?)<\/description>/i)?.[1] || '');
  }
  for (const m of b.matchAll(/<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    let href = decodeEntities(m[1]);
    const uddg = href.match(/[?&]uddg=([^&]+)/)?.[1];
    if (uddg) href = decodeURIComponent(uddg);
    if (href.startsWith('//')) href = `https:${href}`;
    add(m[2], href);
  }
  return out;
}
