import * as P from './parse.js';
import * as S from './store.js';
import { SAMPLE_RECIPES, DISCOVER_CATEGORIES } from './samples.js';
import { importFromUrl, searchRecipes, webSearchUrl, ocrImage, compressImage, ImportError } from './import.js';

const state = S.state;
const $ = (sel, root = document) => root.querySelector(sel);
const view = $('#view');

const ui = {
  search: '', sort: 'recent', discoverCat: 'all', discoverSearch: '', detailTab: 'ingredients',
  servings: {}, have: {}, units: null, weekOffset: 0, draft: null,
};

// ---------- Utilities ----------

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="17" rx="2.5"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/>',
  cart: '<circle cx="9" cy="20" r="1.3"/><circle cx="18" cy="20" r="1.3"/><path d="M2 3h3l2.6 12.2a2 2 0 0 0 2 1.6h8.3a2 2 0 0 0 2-1.5L22 7H6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  fwd: '<path d="m9 18 6-6-6-6"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
  share: '<path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13"/>',
  more: '<circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/><circle cx="5" cy="12" r="1.2"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  play: '<path d="M7 4.5v15l12-7.5z"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  text: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  star: '<path d="m12 2.5 2.9 6 6.6 1-4.8 4.6 1.1 6.6L12 17.6l-5.8 3.1 1.1-6.6-4.8-4.6 6.6-1z"/>',
  bookmark: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  pause: '<path d="M7 4h3v16H7zM14 4h3v16h-3z"/>',
  sparkle: '<path d="M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2z"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  flame: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-3 2-4.1 5.4-3 7.5.5 1 1 1.6 1 3a2.5 2.5 0 0 1-5 0c-.6.7-1 1.9-1 3a7 7 0 0 0 7 7z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
};

function icon(name, cls = '') {
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
}

function hashHue(str) {
  let h = 0;
  for (const c of String(str)) h = (h * 31 + c.codePointAt(0)) % 360;
  return h;
}

const EMOJI_GUESS = [
  [/pasta|spaghetti|linguine|penne|orzo|carbonara|lasagn/i, '🍝'], [/noodle|ramen|pho|udon|lo mein/i, '🍜'], [/pizza/i, '🍕'],
  [/burger/i, '🍔'], [/taco|burrito|quesadilla|enchilada|fajita/i, '🌮'], [/salad|bowl/i, '🥗'], [/soup|stew|chili|broth/i, '🍲'],
  [/curry|dal|tikka|masala/i, '🍛'], [/sushi/i, '🍣'], [/shrimp|prawn/i, '🍤'], [/salmon|fish|cod|tuna/i, '🐟'], [/chicken|wings/i, '🍗'],
  [/steak|beef|brisket/i, '🥩'], [/pork|bacon|ham/i, '🥓'], [/egg|omelet|frittata|shakshuka/i, '🍳'], [/pancake|waffle|crepe/i, '🥞'],
  [/cookie/i, '🍪'], [/cake|cupcake|brownie/i, '🍰'], [/pie|tart/i, '🥧'], [/bread|loaf|focaccia|sourdough/i, '🍞'], [/smoothie|shake|latte|drink/i, '🥤'],
  [/oat|granola|porridge/i, '🥣'], [/potato|fries/i, '🥔'], [/avocado|guac/i, '🥑'], [/sandwich|toast|wrap/i, '🥪'], [/rice|risotto|paella/i, '🍚'],
  [/ice cream|gelato/i, '🍨'], [/chocolate/i, '🍫'], [/banana/i, '🍌'], [/dumpling|gyoza/i, '🥟'],
];

function emojiFor(r) {
  if (r.emoji) return r.emoji;
  const hit = EMOJI_GUESS.find(([re]) => re.test(r.title || ''));
  return hit ? hit[1] : '🍽️';
}

function thumb(r, cls = '') {
  const hue = hashHue(r.title || r.id || 'x');
  const img = r.image ? `<img src="${esc(r.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : '';
  return `<div class="thumb ${cls}" style="--h:${hue}"><span class="thumb-emoji">${emojiFor(r)}</span>${img}</div>`;
}

const PLATFORM_LABEL = { instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', pinterest: 'Pinterest', facebook: 'Facebook', forkful: 'Forkful', photo: 'Scanned', text: 'Pasted' };

function sourceLabel(r) {
  const s = r.source || {};
  if (s.platform && s.platform !== 'web') return PLATFORM_LABEL[s.platform] || s.platform;
  return s.name || (s.url ? P.hostFromUrl(s.url) : '');
}

function totalTime(r) {
  return (r.prepTime || 0) + (r.cookTime || 0);
}

function currentUnits() {
  return ui.units || state.settings.units || 'original';
}

function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function weekStart(offset = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + offset * 7);
  return d;
}

function fromYmd(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const fmtDay = (d, opts) => d.toLocaleDateString(undefined, opts);

function greeting() {
  const h = new Date().getHours();
  const g = h < 5 ? 'Late night cravings' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return state.settings.name ? `${g}, ${esc(state.settings.name)}` : g;
}

// ---------- Toasts, sheets, dialogs ----------

let toastTimer;
function toast(msg, { action, onAction } = {}) {
  let el = $('#toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.setAttribute('role', 'status');
    document.body.append(el);
  }
  el.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button">${esc(action)}</button>` : ''}`;
  if (action) el.querySelector('button').onclick = () => { el.classList.remove('show'); onAction?.(); };
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), action ? 5000 : 2600);
}

function openSheet(html, { onClose, className = '' } = {}) {
  const el = document.createElement('div');
  el.className = 'sheet-backdrop';
  el.innerHTML = `<div class="sheet ${className}" role="dialog" aria-modal="true"><div class="grabber"></div><div class="sheet-content">${html}</div></div>`;
  document.body.append(el);
  document.body.classList.add('noscroll');
  requestAnimationFrame(() => el.classList.add('open'));
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    el.classList.remove('open');
    setTimeout(() => {
      el.remove();
      if (!document.querySelector('.sheet-backdrop') && !cook) document.body.classList.remove('noscroll');
    }, 220);
    document.removeEventListener('keydown', onKey);
    onClose?.();
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  el.addEventListener('click', (e) => {
    if (e.target === el || e.target.closest('[data-close]')) close();
  });
  const content = el.querySelector('.sheet-content');
  return { el: content, close, set: (h) => { content.innerHTML = h; } };
}

function confirmSheet(title, message, { confirm = 'Delete', danger = true } = {}) {
  return new Promise((resolve) => {
    let result = false;
    const s = openSheet(`
      <h2 class="sheet-title">${esc(title)}</h2>
      <p class="muted">${esc(message)}</p>
      <div class="sheet-actions">
        <button class="btn ghost" data-close>Cancel</button>
        <button class="btn ${danger ? 'danger' : 'primary'}" id="confirmBtn">${esc(confirm)}</button>
      </div>`, { onClose: () => resolve(result) });
    s.el.querySelector('#confirmBtn').onclick = () => { result = true; s.close(); };
  });
}

const COOKBOOK_EMOJI = ['📒', '🌙', '🧁', '🥗', '🍝', '🌮', '🍲', '🥘', '🍳', '🎉', '💪', '🌱', '🔥', '❤️', '🍪', '🐟'];

function cookbookSheet(existing = null) {
  return new Promise((resolve) => {
    let result = null;
    let emoji = existing?.emoji || '📒';
    const s = openSheet(`
      <h2 class="sheet-title">${existing ? 'Edit cookbook' : 'New cookbook'}</h2>
      <form id="cbForm" class="stack">
        <label class="field"><span>Name</span><input id="cbName" required maxlength="40" placeholder="e.g. Meal prep" value="${esc(existing?.name || '')}"></label>
        <div class="emoji-grid">${COOKBOOK_EMOJI.map((e) => `<button type="button" class="emoji-opt ${e === emoji ? 'on' : ''}" data-emoji="${e}">${e}</button>`).join('')}</div>
        <div class="sheet-actions"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">${existing ? 'Save' : 'Create'}</button></div>
      </form>`, { onClose: () => resolve(result) });
    s.el.querySelectorAll('.emoji-opt').forEach((b) => {
      b.onclick = () => {
        emoji = b.dataset.emoji;
        s.el.querySelectorAll('.emoji-opt').forEach((x) => x.classList.toggle('on', x === b));
      };
    });
    s.el.querySelector('#cbForm').onsubmit = (e) => {
      e.preventDefault();
      const name = s.el.querySelector('#cbName').value.trim();
      if (!name) return;
      result = S.saveCookbook({ ...(existing || {}), name, emoji });
      s.close();
    };
    setTimeout(() => s.el.querySelector('#cbName').focus(), 250);
  });
}

// ---------- Routing ----------

const navStack = [];

function route() {
  const h = location.hash.replace(/^#\/?/, '');
  const [name = 'recipes', ...params] = h.split('/');
  return { name: name || 'recipes', params: params.map(decodeURIComponent), key: h };
}

let lastKey = null;
function render() {
  const r = route();
  const active = document.activeElement;
  const focusId = active && view.contains(active) ? active.id : null;
  const sel = focusId && 'selectionStart' in active ? [active.selectionStart, active.selectionEnd] : null;
  const sameRoute = r.key === lastKey;
  const scrollY = window.scrollY;

  const fn = VIEWS[r.name] || VIEWS.recipes;
  view.innerHTML = fn(...r.params);
  view.dataset.view = r.name;
  updateNav(r.name);

  if (focusId) {
    const el = document.getElementById(focusId);
    if (el) {
      el.focus({ preventScroll: true });
      if (sel) try { el.setSelectionRange(...sel); } catch { /* not a text input */ }
    }
  }
  if (sameRoute) window.scrollTo(0, scrollY);
  else window.scrollTo(0, 0);
  lastKey = r.key;
  mountHooks.splice(0).forEach((f) => f());
}

const mountHooks = [];
const onMount = (f) => mountHooks.push(f);

function updateNav(name) {
  const tab = { recipes: 'recipes', cookbook: 'recipes', recipe: 'recipes', edit: 'recipes', discover: 'discover', sample: 'discover', plan: 'plan', groceries: 'groceries', profile: 'recipes' }[name];
  document.querySelectorAll('.tabbar [data-tab]').forEach((a) => a.classList.toggle('active', a.dataset.tab === tab));
  const count = state.groceries.filter((g) => !g.checked).length;
  const badge = $('#groceryBadge');
  if (badge) {
    badge.textContent = count > 99 ? '99+' : count;
    badge.hidden = !count;
  }
  document.body.classList.toggle('hide-tabbar', name === 'edit');
}

function go(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

window.addEventListener('hashchange', () => {
  const h = location.hash;
  if (navStack.length > 1 && navStack[navStack.length - 2] === h) navStack.pop();
  else navStack.push(h);
  render();
});

// ---------- Shared pieces ----------

function topbar(title, { back, eyebrow, right = '' } = {}) {
  return `<header class="topbar">
    ${back ? `<button class="icon-btn" data-action="back" data-fallback="${esc(back)}" aria-label="Back">${icon('back')}</button>` : ''}
    <div class="topbar-title">${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}<h1>${title}</h1></div>
    <div class="topbar-right">${right}</div>
  </header>`;
}

function recipeCard(r, { sample = false } = {}) {
  const href = sample ? `#/sample/${r.id}` : `#/recipe/${r.id}`;
  const t = totalTime(r);
  const saved = sample && state.recipes.some((x) => x.sampleId === r.id);
  const corner = sample
    ? `<button class="card-fab ${saved ? 'on' : ''}" data-action="save-sample" data-id="${r.id}" aria-label="${saved ? 'Saved' : 'Save'}">${icon(saved ? 'check' : 'bookmark')}</button>`
    : `<button class="card-fab ${r.favorite ? 'on fav' : ''}" data-action="fav" data-id="${r.id}" aria-label="Favorite">${icon('heart')}</button>`;
  return `<a class="rcard" href="${href}">
    <div class="rcard-media">${thumb(r)}${corner}${t ? `<span class="time-pill">${icon('clock')}${P.formatMinutes(t)}</span>` : ''}</div>
    <div class="rcard-body"><h3>${esc(r.title)}</h3><p>${esc(sourceLabel(r) || `${r.ingredients.length} ingredients`)}</p></div>
  </a>`;
}

function emptyState(emoji, title, text, actions = '') {
  return `<div class="empty"><div class="empty-emoji">${emoji}</div><h3>${title}</h3><p>${text}</p>${actions}</div>`;
}

function filterRecipes(list, q) {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return list;
  return list.filter((r) => {
    const hay = [r.title, r.description, sourceLabel(r), ...(r.tags || []), ...(r.ingredients || [])].join(' ').toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
}

function sortRecipes(list, sort) {
  const l = [...list];
  if (sort === 'az') l.sort((a, b) => a.title.localeCompare(b.title));
  else if (sort === 'quick') l.sort((a, b) => (totalTime(a) || 999) - (totalTime(b) || 999));
  else if (sort === 'cooked') l.sort((a, b) => (b.cookedCount || 0) - (a.cookedCount || 0));
  else l.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return l;
}

// ---------- Views ----------

const VIEWS = {
  recipes() {
    const all = state.recipes;
    const list = sortRecipes(filterRecipes(all, ui.search), ui.sort);
    const initial = (state.settings.name || '').trim()[0];
    const covers = (ids) => ids.slice(0, 4).map((r) => `<span style="--h:${hashHue(r.title)}">${r.image ? `<img src="${esc(r.image)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}<i>${emojiFor(r)}</i></span>`).join('');
    const favs = all.filter((r) => r.favorite);
    const cbs = state.cookbooks.map((c) => {
      const rs = all.filter((r) => (r.cookbookIds || []).includes(c.id));
      return `<a class="cb-card" href="#/cookbook/${c.id}"><div class="cb-cover">${rs.length ? covers(rs) : `<b>${c.emoji || '📒'}</b>`}</div><h4>${c.emoji || ''} ${esc(c.name)}</h4><p>${rs.length} recipe${rs.length === 1 ? '' : 's'}</p></a>`;
    }).join('');
    const sorts = [['recent', 'Recent'], ['az', 'A–Z'], ['quick', 'Quickest'], ['cooked', 'Most cooked']];

    return `
      ${topbar('My Recipes', { eyebrow: greeting(), right: `<a class="avatar" href="#/profile" aria-label="Profile">${initial ? esc(initial.toUpperCase()) : icon('user')}</a>` })}
      <label class="search">${icon('search')}<input id="search" type="search" data-input="search" placeholder="Search recipes, ingredients, tags…" value="${esc(ui.search)}" autocomplete="off"></label>
      ${ui.search ? '' : `
      <section>
        <div class="section-head"><h2>Cookbooks</h2><button class="link-btn" data-action="new-cookbook">${icon('plus')} New</button></div>
        <div class="hscroll">
          <a class="cb-card" href="#/cookbook/all"><div class="cb-cover">${all.length ? covers(all) : '<b>📚</b>'}</div><h4>All recipes</h4><p>${all.length} recipe${all.length === 1 ? '' : 's'}</p></a>
          <a class="cb-card" href="#/cookbook/favorites"><div class="cb-cover">${favs.length ? covers(favs) : '<b>❤️</b>'}</div><h4>❤️ Favorites</h4><p>${favs.length} recipe${favs.length === 1 ? '' : 's'}</p></a>
          ${cbs}
          <button class="cb-card cb-new" data-action="new-cookbook"><div class="cb-cover"><b>${icon('plus')}</b></div><h4>New cookbook</h4><p>Organize your way</p></button>
        </div>
      </section>`}
      <section>
        <div class="section-head"><h2>${ui.search ? `${list.length} result${list.length === 1 ? '' : 's'}` : 'Recently saved'}</h2></div>
        <div class="chips">${sorts.map(([k, l]) => `<button class="chip ${ui.sort === k ? 'on' : ''}" data-action="sort" data-sort="${k}">${l}</button>`).join('')}</div>
        ${list.length ? `<div class="grid">${list.map((r) => recipeCard(r)).join('')}</div>`
          : all.length ? emptyState('🔎', 'No matches', `Nothing matches “${esc(ui.search)}”. Try an ingredient like “chicken”.`)
            : emptyState('📲', 'Save your first recipe', 'Import from Instagram, TikTok, YouTube, any website, a photo, or write your own.', `<button class="btn primary" data-action="import">${icon('plus')} Add a recipe</button>`)}
      </section>`;
  },

  cookbook(id) {
    const special = { all: { name: 'All recipes', emoji: '📚' }, favorites: { name: 'Favorites', emoji: '❤️' } }[id];
    const cb = special || S.getCookbook(id);
    if (!cb) return notFound();
    let list = id === 'all' ? state.recipes : id === 'favorites' ? state.recipes.filter((r) => r.favorite) : state.recipes.filter((r) => (r.cookbookIds || []).includes(id));
    list = sortRecipes(list, ui.sort);
    const right = special ? '' : `<button class="icon-btn" data-action="cookbook-menu" data-id="${id}" aria-label="Cookbook options">${icon('more')}</button>`;
    return `
      ${topbar(`${cb.emoji || ''} ${esc(cb.name)}`, { back: '#/recipes', eyebrow: `${list.length} recipe${list.length === 1 ? '' : 's'}`, right })}
      ${!special ? `<button class="btn soft full" data-action="cookbook-add" data-id="${id}">${icon('plus')} Add recipes</button>` : ''}
      ${list.length ? `<div class="grid">${list.map((r) => recipeCard(r)).join('')}</div>`
        : emptyState(cb.emoji || '📒', 'Nothing here yet', id === 'favorites' ? 'Tap the heart on any recipe to keep it here.' : 'Add recipes to this cookbook to find them faster.')}`;
  },

  recipe(id) {
    const r = S.getRecipe(id);
    if (!r) return notFound();
    return detail(r, { sample: false });
  },

  sample(id) {
    const r = SAMPLE_RECIPES.find((x) => x.id === id);
    if (!r) return notFound();
    const saved = state.recipes.find((x) => x.sampleId === id);
    if (saved) return detail(saved, { sample: false });
    return detail(r, { sample: true });
  },

  discover() {
    const q = ui.discoverSearch;
    let list = SAMPLE_RECIPES.filter((r) => ui.discoverCat === 'all' || r.categories.includes(ui.discoverCat));
    list = filterRecipes(list, q);
    const featured = !q && ui.discoverCat === 'all' ? SAMPLE_RECIPES[new Date().getDate() % SAMPLE_RECIPES.length] : null;
    return `
      ${topbar('Discover', { eyebrow: 'Fresh ideas for your next meal' })}
      <label class="search">${icon('search')}<input id="dsearch" type="search" data-input="discoverSearch" placeholder="Search ideas…" value="${esc(q)}" autocomplete="off"></label>
      ${featured ? `
        <a class="feature" href="#/sample/${featured.id}">
          ${thumb(featured, 'feature-img')}
          <div class="feature-body"><span class="kicker">${icon('sparkle')} Recipe of the day</span><h2>${esc(featured.title)}</h2><p>${esc(featured.description)}</p>
          <span class="meta">${icon('clock')} ${P.formatMinutes(totalTime(featured))} · ${featured.servings} servings</span></div>
        </a>
        <div class="promo">
          <div><h3>Save recipes from anywhere</h3><p>Share a Reel, TikTok, YouTube video or blog post to Forkful and we'll pull out the ingredients and steps for you.</p></div>
          <button class="btn primary sm" data-action="import">${icon('link')} Import</button>
        </div>` : ''}
      <div class="chips scroll">${DISCOVER_CATEGORIES.map((c) => `<button class="chip ${ui.discoverCat === c.id ? 'on' : ''}" data-action="discover-cat" data-cat="${c.id}">${c.label}</button>`).join('')}</div>
      ${list.length ? `<div class="grid">${list.map((r) => recipeCard(r, { sample: true })).join('')}</div>` : emptyState('🥄', 'No ideas found', 'Try another search or category.')}`;
  },

  edit(id) {
    let r;
    if (id === 'new') r = ui.draft || S.emptyRecipe();
    else r = S.getRecipe(id);
    if (!r) return notFound();
    return editForm(r, id === 'new');
  },

  plan() {
    const start = weekStart(ui.weekOffset);
    const end = addDays(start, 6);
    const today = ymd(new Date());
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    const entries = days.flatMap((d) => state.plan[ymd(d)] || []);
    const recipeCount = entries.filter((e) => e.recipeId && S.getRecipe(e.recipeId)).length;
    const mealOrder = { breakfast: 0, lunch: 1, dinner: 2, snack: 3 };
    const range = `${fmtDay(start, { month: 'short', day: 'numeric' })} – ${fmtDay(end, start.getMonth() === end.getMonth() ? { day: 'numeric' } : { month: 'short', day: 'numeric' })}`;

    const dayCards = days.map((d) => {
      const key = ymd(d);
      const list = [...(state.plan[key] || [])].sort((a, b) => mealOrder[a.meal] - mealOrder[b.meal]);
      const items = list.map((e) => {
        const rec = e.recipeId ? S.getRecipe(e.recipeId) : null;
        const title = rec ? rec.title : e.title || 'Removed recipe';
        const body = `${rec ? thumb(rec, 'mini') : `<div class="thumb mini note-thumb">📝</div>`}<div class="plan-text"><span class="meal-tag ${e.meal}">${e.meal}</span><strong>${esc(title)}</strong>${rec && e.servings ? `<small>${e.servings} servings</small>` : ''}</div>`;
        return `<div class="plan-item">${rec ? `<a href="#/recipe/${rec.id}" class="plan-link">${body}</a>` : `<div class="plan-link">${body}</div>`}
          <button class="icon-btn sm" data-action="plan-item-menu" data-date="${key}" data-id="${e.id}" aria-label="Options">${icon('more')}</button></div>`;
      }).join('');
      return `<div class="day ${key === today ? 'today' : ''} ${key < today ? 'past' : ''}">
        <div class="day-head"><div><span class="dow">${fmtDay(d, { weekday: 'long' })}</span><span class="dnum">${fmtDay(d, { month: 'short', day: 'numeric' })}</span></div>
        ${key === today ? '<span class="today-pill">Today</span>' : ''}
        <button class="icon-btn sm add" data-action="plan-add" data-date="${key}" aria-label="Add meal">${icon('plus')}</button></div>
        ${items || `<button class="day-empty" data-action="plan-add" data-date="${key}">Plan a meal</button>`}
      </div>`;
    }).join('');

    return `
      ${topbar('Meal Plan', { eyebrow: `${entries.length} meal${entries.length === 1 ? '' : 's'} planned` })}
      <div class="week-nav">
        <button class="icon-btn" data-action="week" data-d="-1" aria-label="Previous week">${icon('back')}</button>
        <div><strong>${range}</strong>${ui.weekOffset ? `<button class="link-btn" data-action="week" data-d="0">Back to this week</button>` : '<span class="muted">This week</span>'}</div>
        <button class="icon-btn" data-action="week" data-d="1" aria-label="Next week">${icon('fwd')}</button>
      </div>
      ${recipeCount ? `<button class="btn soft full" data-action="plan-to-groceries">${icon('cart')} Add ${recipeCount} recipe${recipeCount === 1 ? '' : 's'} to grocery list</button>` : ''}
      <div class="days">${dayCards}</div>`;
  },

  groceries() {
    const items = state.groceries;
    const open = items.filter((g) => !g.checked);
    const done = items.filter((g) => g.checked);
    const byRecipe = state.settings.groceryGroup === 'recipe';
    const groups = new Map();
    for (const g of open) {
      const keys = byRecipe ? (g.recipes.length ? g.recipes.map((r) => r.title) : ['Other items']) : [g.aisle || 'Other'];
      for (const k of keys) {
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(g);
      }
    }
    const order = byRecipe ? [...groups.keys()].sort((a, b) => (a === 'Other items') - (b === 'Other items') || a.localeCompare(b)) : P.AISLE_ORDER.filter((a) => groups.has(a));
    const row = (g) => `<li class="gitem ${g.checked ? 'done' : ''}">
      <button class="gcheck" data-action="grocery-toggle" data-id="${g.id}" aria-label="${g.checked ? 'Uncheck' : 'Check'} ${esc(g.name)}">${icon('check')}</button>
      <button class="gtext" data-action="grocery-toggle" data-id="${g.id}"><span class="gname">${P.groceryAmount(g) ? `<b>${esc(P.groceryAmount(g))}</b> ` : ''}${esc(g.name)}</span>
      ${!byRecipe && g.recipes.length ? `<small>${esc(g.recipes.map((r) => r.title).join(', '))}</small>` : ''}</button>
      <button class="icon-btn sm ghost" data-action="grocery-remove" data-id="${g.id}" aria-label="Remove">${icon('x')}</button></li>`;
    const pct = items.length ? Math.round((done.length / items.length) * 100) : 0;
    return `
      ${topbar('Groceries', { eyebrow: items.length ? `${open.length} to buy · ${done.length} in cart` : 'Your shopping list', right: items.length ? `<button class="icon-btn" data-action="grocery-menu" aria-label="List options">${icon('more')}</button>` : '' })}
      <form class="add-bar" data-submit="grocery-add">
        <input id="gadd" placeholder="Add an item, e.g. 2 lemons" autocomplete="off" enterkeyhint="done">
        <button class="btn primary sm" aria-label="Add item">${icon('plus')}</button>
      </form>
      ${items.length ? `
        <div class="progress"><div style="width:${pct}%"></div></div>
        <div class="seg sm"><button class="${!byRecipe ? 'on' : ''}" data-action="grocery-group" data-g="aisle">By aisle</button><button class="${byRecipe ? 'on' : ''}" data-action="grocery-group" data-g="recipe">By recipe</button></div>
        ${order.map((k) => `<section class="ggroup"><h3>${byRecipe ? '🍽️' : P.AISLE_EMOJI[k] || '🛒'} ${esc(k)} <span>${groups.get(k).length}</span></h3><ul>${groups.get(k).map(row).join('')}</ul></section>`).join('')}
        ${!open.length ? `<div class="all-done">🎉 All done! Everything's in the cart.</div>` : ''}
        ${done.length ? `<section class="ggroup done-group"><h3>✅ In cart <span>${done.length}</span><button class="link-btn" data-action="grocery-clear-checked">Clear</button></h3><ul>${done.map(row).join('')}</ul></section>` : ''}`
        : emptyState('🛒', 'Your list is empty', 'Add ingredients from any recipe or your meal plan. Matching items are combined automatically.', `<a class="btn soft" href="#/plan">${icon('calendar')} Open meal plan</a>`)}`;
  },

  profile() {
    const s = state.settings;
    const cooked = state.recipes.reduce((n, r) => n + (r.cookedCount || 0), 0);
    const wk = weekStart(0);
    const planned = Array.from({ length: 7 }, (_, i) => (state.plan[ymd(addDays(wk, i))] || []).length).reduce((a, b) => a + b, 0);
    const seg = (key, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${s[key] === v ? 'on' : ''}" data-action="setting" data-key="${key}" data-value="${v}">${l}</button>`).join('')}</div>`;
    const toggle = (key) => `<button class="switch ${s[key] ? 'on' : ''}" role="switch" aria-checked="${!!s[key]}" data-action="toggle-setting" data-key="${key}"><span></span></button>`;
    return `
      ${topbar('Profile', { back: '#/recipes' })}
      <div class="profile-card">
        <div class="avatar lg">${s.name ? esc(s.name.trim()[0].toUpperCase()) : icon('user')}</div>
        <input id="pname" class="name-input" data-change="name" placeholder="Your name" value="${esc(s.name)}" maxlength="30">
      </div>
      <div class="stats">
        <div><b>${state.recipes.length}</b><span>Recipes</span></div>
        <div><b>${state.cookbooks.length}</b><span>Cookbooks</span></div>
        <div><b>${cooked}</b><span>Times cooked</span></div>
        <div><b>${planned}</b><span>Planned</span></div>
      </div>
      <section class="settings">
        <h2>Preferences</h2>
        <div class="setting"><div><strong>Measurements</strong><small>How ingredient amounts are shown</small></div></div>
        ${seg('units', [['original', 'As written'], ['us', 'US'], ['metric', 'Metric']])}
        <div class="setting"><div><strong>Appearance</strong></div></div>
        ${seg('theme', [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']])}
        <div class="setting"><div><strong>Keep screen on in Cook Mode</strong><small>So your phone doesn't lock mid-recipe</small></div>${toggle('wakeLock')}</div>
        <label class="field server-field"><span>Your import server <small>optional · makes Instagram & Facebook imports more reliable</small></span>
          <input id="importServer" type="url" inputmode="url" data-change="import-server" placeholder="https://forkful-import.yourname.workers.dev" value="${esc(s.importServer || '')}"></label>
        <div class="setting"><div><strong>Import helper</strong><small>Uses a public relay to read sites that block direct access. The relay sees the link you import, nothing else.</small></div>${toggle('useProxy')}</div>
      </section>
      <section class="settings">
        <h2>Your data</h2>
        <p class="muted small">Everything is stored on this device only. Back it up to move between devices.</p>
        <button class="row-btn" data-action="export">${icon('download')} Export backup</button>
        <label class="row-btn">${icon('upload')} Import backup<input type="file" accept="application/json,.json" data-change="import-file" hidden></label>
        <button class="row-btn" data-action="install" id="installBtn" ${deferredInstall ? '' : 'hidden'}>${icon('sparkle')} Install app</button>
        <button class="row-btn danger" data-action="reset">${icon('trash')} Reset everything</button>
      </section>
      <p class="about">Forkful · a recipe keeper inspired by ReciMe.<br>Works offline · No account needed.</p>`;
  },
};

function notFound() {
  return `${topbar('Not found', { back: '#/recipes' })}${emptyState('🤷', 'Recipe not found', 'It may have been deleted.', '<a class="btn soft" href="#/recipes">Back to recipes</a>')}`;
}

// ---------- Recipe detail ----------

function detail(r, { sample }) {
  const key = r.id;
  const baseServ = r.servings || 1;
  const serv = ui.servings[key] ?? baseServ;
  const factor = serv / baseServ;
  const units = currentUnits();
  const parsed = r.ingredients.map(P.parseIngredient);
  const have = ui.have[key] || new Set();
  const tab = ui.detailTab;
  const t = totalTime(r);
  const src = r.source || {};

  const ingList = parsed.map((p, i) => {
    if (p.isHeader) return `<li class="ing-head">${esc(p.name)}</li>`;
    const d = P.displayIngredient(p, factor, units);
    return `<li class="ing ${have.has(i) ? 'have' : ''}" data-action="toggle-have" data-key="${key}" data-i="${i}">
      <span class="tick">${icon('check')}</span><span class="ing-text">${d.amount ? `<b>${esc(d.amount)}</b> ` : ''}${esc(d.name)}${d.note ? `<span class="note">, ${esc(d.note)}</span>` : ''}</span></li>`;
  }).join('');

  let stepN = 0;
  const steps = r.instructions.map((s) => {
    if (P.isHeaderLine(s) && s.trim().startsWith('#')) return `<li class="step-head">${esc(P.headerText(s))}</li>`;
    stepN++;
    return `<li class="step"><span class="step-n">${stepN}</span><p>${stepHtml(s, units, r.title)}</p></li>`;
  }).join('');

  const nut = r.nutrition && r.nutrition.calories ? { ...r.nutrition, estimated: false } : P.estimateNutrition(r.ingredients, baseServ);
  const nutHtml = nut ? (() => {
    const kcal = (nut.protein || 0) * 4 + (nut.carbs || 0) * 4 + (nut.fat || 0) * 9 || 1;
    const bar = (label, g, mult, cls) => `<div class="macro"><div class="macro-top"><span>${label}</span><b>${g ?? '–'} g</b></div><div class="mbar"><div class="${cls}" style="width:${Math.round((((g || 0) * mult) / kcal) * 100)}%"></div></div></div>`;
    return `<div class="nutrition">
      <div class="kcal"><b>${nut.calories}</b><span>calories per serving</span></div>
      ${bar('Protein', nut.protein, 4, 'p')}${bar('Carbs', nut.carbs, 4, 'c')}${bar('Fat', nut.fat, 9, 'f')}
      <p class="muted small">${nut.estimated ? 'Estimated from the ingredient list — actual values vary by brand and portion.' : 'Nutrition provided by the recipe source.'}</p></div>`;
  })() : emptyState('🥦', 'No nutrition info', 'We couldn\'t recognise enough ingredients to estimate this one.');

  const tabs = [['ingredients', `Ingredients`], ['steps', 'Steps'], ['nutrition', 'Nutrition'], ...(sample ? [] : [['notes', 'Notes']])];
  const tabBody = {
    ingredients: `
      <div class="ing-tools">
        <div class="stepper"><button data-action="serv" data-key="${key}" data-d="-1" aria-label="Fewer servings">${icon('minus')}</button><span><b>${serv}</b> serving${serv === 1 ? '' : 's'}</span><button data-action="serv" data-key="${key}" data-d="1" aria-label="More servings">${icon('plus')}</button></div>
        <div class="seg sm">${[['original', 'Original'], ['us', 'US'], ['metric', 'Metric']].map(([v, l]) => `<button class="${units === v ? 'on' : ''}" data-action="units" data-u="${v}">${l}</button>`).join('')}</div>
      </div>
      ${parsed.length ? `<ul class="ings">${ingList}</ul>
      ${sample ? '' : `<p class="muted small center">Tap what you already have — we'll add the rest.</p>
      <button class="btn soft full" data-action="to-groceries" data-id="${r.id}">${icon('cart')} Add ${Math.max(0, parsed.filter((p, i) => !p.isHeader && !have.has(i)).length)} to grocery list</button>`}`
        : emptyState('🧺', 'No ingredients yet', 'Edit the recipe to add some.')}`,
    steps: steps ? `<ol class="steps">${steps}</ol>` : emptyState('👩‍🍳', 'No steps yet', 'Edit the recipe to add instructions.'),
    nutrition: nutHtml,
    notes: `<label class="field"><span>Your notes</span><textarea id="notes" rows="5" data-change="notes" data-id="${r.id}" placeholder="Swaps, tweaks, what the family thought…">${esc(r.notes || '')}</textarea></label>
      <div class="cook-log">${icon('flame')} Cooked ${r.cookedCount || 0} time${r.cookedCount === 1 ? '' : 's'}${r.lastCooked ? ` · last on ${fmtDay(new Date(r.lastCooked), { month: 'short', day: 'numeric' })}` : ''}</div>
      <button class="btn soft full" data-action="mark-cooked" data-id="${r.id}">${icon('check')} I made this</button>`,
  }[tab] || '';

  const stars = [1, 2, 3, 4, 5].map((n) => `<button class="star ${n <= (r.rating || 0) ? 'on' : ''}" ${sample ? 'disabled' : `data-action="rate" data-id="${r.id}" data-n="${n}"`} aria-label="${n} star">${icon('star')}</button>`).join('');

  return `
    <div class="hero">
      ${thumb(r, 'hero-img')}
      <div class="hero-bar">
        <button class="icon-btn glass" data-action="back" data-fallback="${sample ? '#/discover' : '#/recipes'}" aria-label="Back">${icon('back')}</button>
        <div class="hero-actions">
          ${sample ? '' : `<button class="icon-btn glass ${r.favorite ? 'fav' : ''}" data-action="fav" data-id="${r.id}" aria-label="Favorite">${icon('heart')}</button>`}
          <button class="icon-btn glass" data-action="share" data-id="${r.id}" data-sample="${sample ? 1 : ''}" aria-label="Share">${icon('share')}</button>
          ${sample ? '' : `<button class="icon-btn glass" data-action="recipe-menu" data-id="${r.id}" aria-label="More">${icon('more')}</button>`}
        </div>
      </div>
    </div>
    <article class="detail">
      ${r.needsReview ? `<div class="review-banner">${icon('sparkle')}<div><strong>Imported!</strong> Give it a quick check.</div><a class="btn sm primary" href="#/edit/${r.id}">Review</a><button class="icon-btn sm ghost" data-action="dismiss-review" data-id="${r.id}" aria-label="Dismiss">${icon('x')}</button></div>` : ''}
      ${sourceLabel(r) ? `<div class="source">${src.url ? `<a href="${esc(src.url)}" target="_blank" rel="noopener">${icon('link')} ${esc(sourceLabel(r))}${src.name && src.platform !== 'web' && !src.name.includes('.') && src.name !== sourceLabel(r) ? ` · ${esc(src.name)}` : ''}</a>` : `<span>${esc(sourceLabel(r))}</span>`}</div>` : ''}
      <h1 class="detail-title">${esc(r.title)}</h1>
      <div class="stars">${stars}</div>
      ${r.description ? `<p class="desc">${esc(r.description)}</p>` : ''}
      ${r.tags?.length ? `<div class="tags">${r.tags.map((x) => `<button class="tag" data-action="tag-search" data-tag="${esc(x)}">#${esc(x)}</button>`).join('')}</div>` : ''}
      <div class="facts">
        <div><span>Prep</span><b>${r.prepTime ? P.formatMinutes(r.prepTime) : '–'}</b></div>
        <div><span>Cook</span><b>${r.cookTime ? P.formatMinutes(r.cookTime) : '–'}</b></div>
        <div><span>Total</span><b>${t ? P.formatMinutes(t) : '–'}</b></div>
        <div><span>Serves</span><b>${baseServ}</b></div>
      </div>
      <div class="cta">
        ${sample ? `<button class="btn primary" data-action="save-sample" data-id="${r.id}" data-open="1">${icon('bookmark')} Save recipe</button>` : ''}
        <button class="btn ${sample ? 'soft' : 'primary'}" data-action="cook" data-id="${r.id}" data-sample="${sample ? 1 : ''}" ${r.instructions.length ? '' : 'disabled'}>${icon('play')} Start cooking</button>
        ${sample ? '' : `<div class="cta-row">
          <button class="btn soft" data-action="plan-recipe" data-id="${r.id}">${icon('calendar')} Plan</button>
          <button class="btn soft" data-action="to-groceries" data-id="${r.id}">${icon('cart')} Shop</button>
          <button class="btn soft" data-action="recipe-cookbooks" data-id="${r.id}">${icon('folder')} Save to</button>
        </div>`}
      </div>
      <div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" aria-selected="${tab === k}" class="${tab === k ? 'on' : ''}" data-action="detail-tab" data-tab="${k}">${l}</button>`).join('')}</div>
      <div class="tab-body">${tabBody}</div>
    </article>`;
}

function stepHtml(text, units, recipeTitle = '') {
  const t = P.convertTemperatures(text, units);
  const timers = P.findTimers(t);
  let out = '';
  let pos = 0;
  for (const m of timers) {
    out += esc(t.slice(pos, m.index));
    out += `<button class="timer-chip" data-action="timer" data-seconds="${m.seconds}" data-label="${esc(m.label)}" data-recipe="${esc(recipeTitle)}">${icon('timer')}${esc(m.label)}</button>`;
    pos = m.index + m.length;
  }
  return out + esc(t.slice(pos));
}

// ---------- Edit form ----------

function editForm(r, isNew) {
  const cbIds = new Set(r.cookbookIds || []);
  return `
    <form class="edit" data-submit="save-recipe" data-id="${isNew ? '' : r.id}">
      <header class="topbar sticky">
        <button type="button" class="btn ghost sm" data-action="back" data-fallback="${isNew ? '#/recipes' : `#/recipe/${r.id}`}">Cancel</button>
        <div class="topbar-title center"><h1 class="sm">${isNew ? (ui.draft ? 'Review recipe' : 'New recipe') : 'Edit recipe'}</h1></div>
        <button class="btn primary sm">Save</button>
      </header>
      <div class="photo-edit">
        <div id="photoPreview">${thumb(r, 'edit-img')}</div>
        <input type="hidden" name="image" value="${esc(r.image || '')}">
        <div class="photo-actions">
          <label class="btn soft sm">${icon('camera')} ${r.image ? 'Change photo' : 'Add photo'}<input type="file" accept="image/*" data-change="photo" hidden></label>
          <button type="button" class="btn ghost sm" data-action="photo-remove" ${r.image ? '' : 'hidden'}>Remove</button>
        </div>
      </div>
      <label class="field"><span>Title</span><input name="title" required maxlength="120" value="${esc(r.title)}" placeholder="e.g. Grandma's lasagna"></label>
      <label class="field"><span>Description</span><textarea name="description" rows="2" placeholder="What makes it great?">${esc(r.description || '')}</textarea></label>
      <div class="row3">
        <label class="field"><span>Servings</span><input name="servings" type="number" min="1" max="100" inputmode="numeric" value="${esc(r.servings || '')}"></label>
        <label class="field"><span>Prep (min)</span><input name="prepTime" type="number" min="0" inputmode="numeric" value="${esc(r.prepTime ?? '')}"></label>
        <label class="field"><span>Cook (min)</span><input name="cookTime" type="number" min="0" inputmode="numeric" value="${esc(r.cookTime ?? '')}"></label>
      </div>
      <label class="field"><span>Ingredients <small>one per line · start a line with # for a section</small></span>
        <textarea name="ingredients" rows="9" placeholder="2 cups flour&#10;1 tsp salt&#10;# For the glaze&#10;1 cup powdered sugar">${esc(r.ingredients.join('\n'))}</textarea></label>
      <label class="field"><span>Steps <small>one per line</small></span>
        <textarea name="instructions" rows="9" placeholder="Preheat the oven to 350°F.&#10;Mix the dry ingredients…">${esc(r.instructions.join('\n'))}</textarea></label>
      <label class="field"><span>Tags <small>comma separated</small></span><input name="tags" value="${esc((r.tags || []).join(', '))}" placeholder="dinner, vegetarian"></label>
      ${state.cookbooks.length ? `<div class="field"><span>Cookbooks</span><div class="chips wrap" id="cbChips">${state.cookbooks.map((c) => `<button type="button" class="chip ${cbIds.has(c.id) ? 'on' : ''}" data-action="edit-cb" data-id="${c.id}">${c.emoji || ''} ${esc(c.name)}</button>`).join('')}</div></div>` : ''}
      <label class="field"><span>Source link</span><input name="sourceUrl" type="url" inputmode="url" value="${esc(r.source?.url || '')}" placeholder="https://"></label>
      <label class="field"><span>Notes</span><textarea name="notes" rows="3">${esc(r.notes || '')}</textarea></label>
      ${isNew ? '' : `<button type="button" class="row-btn danger" data-action="delete-recipe" data-id="${r.id}">${icon('trash')} Delete recipe</button>`}
    </form>`;
}

function collectForm(form, base) {
  const fd = new FormData(form);
  const lines = (v) => String(v || '').split('\n').map((l) => l.trim()).filter(Boolean)
    .map((l) => (/^#\s*/.test(l) ? `## ${l.replace(/^#+\s*/, '')}` : l));
  const num = (v) => (v === '' || v == null ? null : Math.max(0, Math.round(+v)) || null);
  const url = String(fd.get('sourceUrl') || '').trim();
  const cookbookIds = [...form.querySelectorAll('#cbChips .chip.on')].map((b) => b.dataset.id);
  const platform = url ? (base.source?.url === url ? base.source.platform : P.platformFromUrl(url)) : base.source?.platform || '';
  return {
    ...base,
    title: String(fd.get('title')).trim(),
    description: String(fd.get('description') || '').trim(),
    image: String(fd.get('image') || ''),
    servings: num(fd.get('servings')) || 1,
    prepTime: num(fd.get('prepTime')),
    cookTime: num(fd.get('cookTime')),
    ingredients: lines(fd.get('ingredients')),
    instructions: lines(fd.get('instructions')),
    tags: String(fd.get('tags') || '').split(',').map((t) => t.trim().replace(/^#/, '').toLowerCase()).filter(Boolean),
    cookbookIds,
    notes: String(fd.get('notes') || '').trim(),
    source: { ...(base.source || {}), url, platform, name: url && base.source?.url !== url ? P.hostFromUrl(url) : base.source?.name || '' },
    needsReview: false,
  };
}

// ---------- Import ----------

function importSheet(mode = 'menu', prefill = {}) {
  const s = openSheet('', { className: 'import-sheet' });
  const menu = () => {
    s.set(`
      <h2 class="sheet-title">Add a recipe</h2>
      ${navigator.clipboard?.readText ? `<button class="btn primary full paste-smart" id="smartPaste">${icon('sparkle')} Paste what you copied</button>
      <p class="muted small center paste-hint">Works with a copied link or a copied caption.</p>` : ''}
      <div class="import-options">
        <button class="import-opt" data-mode="link"><span class="io-ic">${icon('link')}</span><span><strong>Paste a link</strong><small>TikTok, YouTube, Facebook, Instagram or any recipe site</small></span>${icon('fwd')}</button>
        <button class="import-opt" data-mode="scan"><span class="io-ic">${icon('camera')}</span><span><strong>Scan a screenshot or photo</strong><small>Best for Instagram & Facebook: screenshot the caption</small></span>${icon('fwd')}</button>
        <button class="import-opt" data-mode="search"><span class="io-ic">${icon('search')}</span><span><strong>Find by dish name</strong><small>Search recipes with photos and pick the one that matches</small></span>${icon('fwd')}</button>
        <button class="import-opt" data-mode="text"><span class="io-ic">${icon('text')}</span><span><strong>Paste text</strong><small>A caption, a message from a friend, your notes</small></span>${icon('fwd')}</button>
        <button class="import-opt" data-mode="manual"><span class="io-ic">${icon('edit')}</span><span><strong>Write from scratch</strong><small>Type in your own creation</small></span>${icon('fwd')}</button>
      </div>`);
    s.el.querySelectorAll('.import-opt').forEach((b) => { b.onclick = () => show(b.dataset.mode); });
    s.el.querySelector('#smartPaste')?.addEventListener('click', async () => {
      let clip = '';
      try { clip = (await navigator.clipboard.readText()).trim(); } catch { /* blocked */ }
      if (!clip) { toast('Nothing to paste — copy a link or caption first'); return; }
      const url = clip.match(/https?:\/\/\S+/)?.[0];
      // A short text with a link is a shared link; a long text is a caption (even if it has a link in it).
      if (url && clip.length < url.length + 120) link(url, true);
      else text(clip);
    });
  };

  const backBtn = `<button type="button" class="link-btn back-link" data-back>${icon('back')} Back</button>`;
  const bindBack = () => { const b = s.el.querySelector('[data-back]'); if (b) b.onclick = menu; };

  const finishImport = (data, extra = {}) => {
    const saved = S.saveRecipe({ ...S.emptyRecipe(), ...data, servings: data.servings || 2, ...extra, needsReview: true });
    s.close();
    ui.detailTab = 'ingredients';
    go(`#/recipe/${saved.id}`);
    toast('Recipe saved 🎉');
  };

  const link = (value = '', autostart = false) => {
    s.set(`${backBtn}
      <h2 class="sheet-title">Import from a link</h2>
      <form id="linkForm" class="stack">
        <div class="paste-row"><input id="linkInput" type="text" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="https://www.tiktok.com/@chef/video/…" value="${esc(value)}" required>
        ${navigator.clipboard?.readText ? `<button type="button" class="btn ghost sm" id="pasteBtn">Paste</button>` : ''}</div>
        <div class="platforms"><span>TikTok</span><span>YouTube</span><span>Facebook</span><span>Instagram</span><span>Pinterest</span><span>Blogs & sites</span></div>
        <div id="linkStatus"></div>
        <button class="btn primary full" id="linkGo">${icon('sparkle')} Import recipe</button>
      </form>`);
    bindBack();
    const input = s.el.querySelector('#linkInput');
    const status = s.el.querySelector('#linkStatus');
    const btn = s.el.querySelector('#linkGo');
    s.el.querySelector('#pasteBtn')?.addEventListener('click', async () => {
      try { input.value = (await navigator.clipboard.readText()).trim(); } catch { toast('Clipboard access was blocked — long-press to paste'); }
    });
    s.el.querySelector('#linkForm').onsubmit = async (e) => {
      e.preventDefault();
      btn.disabled = true;
      status.innerHTML = `<div class="loading"><span class="spinner"></span> Finding the recipe…</div>`;
      try {
        const data = await importFromUrl(input.value, { useProxy: state.settings.useProxy !== false, server: state.settings.importServer || '' });
        finishImport(data);
      } catch (err) {
        btn.disabled = false;
        const partial = err instanceof ImportError ? err.partial : {};
        const social = ['instagram', 'facebook'].includes(partial.source?.platform);
        const log = partial.log || [];
        status.innerHTML = `<div class="error">${esc(err.message || 'Import failed')}</div>
          <div class="stack">
            ${partial.caption ? `<button type="button" class="btn primary full" id="toCaption">${icon('text')} Use the caption we found</button>` : ''}
            ${social ? `<button type="button" class="btn ${partial.caption ? 'soft' : 'primary'} full" id="toScan">${icon('camera')} Scan a screenshot of the caption</button>
            <p class="muted small">Take a screenshot of the post's caption (tap “more” first so the whole recipe shows), then pick it here.</p>` : ''}
            <button type="button" class="btn ${social || partial.caption ? 'soft' : 'primary'} full" id="toSearch">${icon('search')} Find a matching recipe</button>
            ${partial.caption ? '' : `<button type="button" class="btn soft full" id="toText">${icon('text')} Paste the caption instead</button>`}
            ${log.length ? `<details class="import-log"><summary>Details</summary><ol>${log.map((l) => `<li>${esc(l)}</li>`).join('')}</ol>
              <button type="button" class="btn ghost sm" id="copyLog">Copy details</button></details>` : ''}
          </div>`;
        btn.hidden = true;
        const origin = partial.source?.url || input.value;
        const extra = { source: partial.source, image: partial.image || '' };
        s.el.querySelector('#toSearch').onclick = () => search(partial.query || partial.title || '', origin);
        s.el.querySelector('#toText')?.addEventListener('click', () => text('', extra));
        s.el.querySelector('#toCaption')?.addEventListener('click', () => text(partial.caption, extra));
        s.el.querySelector('#toScan')?.addEventListener('click', () => scan(null, extra));
        s.el.querySelector('#copyLog')?.addEventListener('click', async () => {
          const report = [`Link: ${origin}`, `Error: ${err.message}`, ...log.map((l, i) => `${i + 1}. ${l}`)].join('\n');
          try { await navigator.clipboard.writeText(report); toast('Details copied'); } catch { toast('Couldn\'t copy — take a screenshot instead'); }
        });
      }
    };
    input.oninput = () => { btn.hidden = false; };
    if (!value) setTimeout(() => input.focus(), 250);
    else if (autostart) s.el.querySelector('#linkForm').requestSubmit();
  };

  // Recipe search, used when a link can't be read. Results show photos so the
  // person can pick the one that looks like the post they saw.
  const search = (query = '', originUrl = '') => {
    s.set(`${backBtn}
      <h2 class="sheet-title">Find a matching recipe</h2>
      <p class="muted">Search by the dish name, then tap the one whose photo looks like the post.</p>
      <form id="searchForm" class="paste-row">
        <input id="searchInput" type="search" placeholder="e.g. chicken alfredo" value="${esc(query)}" autocomplete="off" enterkeyhint="search">
        <button class="btn primary sm">${icon('search')}</button>
      </form>
      <div id="searchResults"></div>
      <div class="web-fallback">
        <p class="muted small">Not there? Search the whole web, copy a recipe link, then paste it here.</p>
        <a class="btn soft full" id="webSearch" target="_blank" rel="noopener">${icon('search')} Search Google</a>
        <form id="foundForm" class="paste-row">
          <input id="foundInput" type="text" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Paste a recipe link">
          <button class="btn primary sm">Import</button>
        </form>
      </div>`);
    bindBack();
    const input = s.el.querySelector('#searchInput');
    const results = s.el.querySelector('#searchResults');
    const web = s.el.querySelector('#webSearch');
    const syncWeb = () => { web.href = webSearchUrl(input.value.trim() || 'dinner'); };
    input.addEventListener('input', syncWeb);
    syncWeb();
    let seq = 0;
    const run = async () => {
      const q = input.value.trim();
      if (!q) { results.innerHTML = ''; input.focus(); return; }
      const mine = ++seq;
      results.innerHTML = `<div class="loading"><span class="spinner"></span> Searching…</div>`;
      try {
        const found = await searchRecipes(q);
        if (mine !== seq) return;
        if (!found.length) {
          results.innerHTML = `<p class="muted small center">No matches for “${esc(q)}”. Try a simpler name like “lasagna”, or search Google below.</p>`;
          return;
        }
        results.innerHTML = `<div class="result-grid">${found.map((r, i) => `<button type="button" class="result" data-i="${i}">
          ${thumb(r)}<span><strong>${esc(r.title)}</strong><small>${esc(r.description)} · ${r.ingredients.length} ingredients</small></span></button>`).join('')}</div>`;
        results.querySelectorAll('.result').forEach((b) => {
          b.onclick = () => {
            const r = found[+b.dataset.i];
            finishImport(r, originUrl ? { notes: `Matched from: ${originUrl}` } : {});
          };
        });
      } catch {
        if (mine === seq) results.innerHTML = `<div class="error">Recipe search isn't reachable right now. Try Google below.</div>`;
      }
    };
    s.el.querySelector('#searchForm').onsubmit = (e) => { e.preventDefault(); run(); };
    s.el.querySelector('#foundForm').onsubmit = (e) => {
      e.preventDefault();
      const v = s.el.querySelector('#foundInput').value.trim();
      if (v) link(v, true);
    };
    if (query) run();
    else setTimeout(() => input.focus(), 250);
  };

  const text = (value = '', partial = {}) => {
    s.set(`${backBtn}
      <h2 class="sheet-title">Paste recipe text</h2>
      <form id="textForm" class="stack">
        <textarea id="textInput" rows="10" placeholder="Paste a caption or recipe here. We'll find the title, ingredients and steps.">${esc(value)}</textarea>
        <div id="textStatus"></div>
        <button class="btn primary full">${icon('sparkle')} Extract recipe</button>
      </form>`);
    bindBack();
    const ta = s.el.querySelector('#textInput');
    s.el.querySelector('#textForm').onsubmit = (e) => {
      e.preventDefault();
      const parsed = parseInto(ta.value, partial);
      if (!parsed) {
        s.el.querySelector('#textStatus').innerHTML = `<div class="error">Paste some recipe text first.</div>`;
        return;
      }
      if (!parsed.ingredients.length && !parsed.instructions.length) {
        s.close();
        ui.draft = parsed;
        go('#/edit/new');
        toast('Couldn\'t spot ingredients — fill them in below');
        return;
      }
      finishImport(parsed);
    };
    setTimeout(() => ta.focus(), 250);
  };

  const scan = (sharedFile = null, origin = {}) => {
    s.set(`${backBtn}
      <h2 class="sheet-title">Scan a recipe</h2>
      <p class="muted">Pick a screenshot of a post's caption, or snap a cookbook page or recipe card. Text is read on your device.</p>
      <div class="stack">
        <label class="btn primary full">${icon('upload')} Choose a screenshot or photo<input type="file" accept="image/*" id="scanLib" hidden></label>
        <label class="btn soft full">${icon('camera')} Take a photo<input type="file" accept="image/*" capture="environment" id="scanCam" hidden></label>
        <div id="scanStatus"></div>
      </div>`);
    bindBack();
    const status = s.el.querySelector('#scanStatus');
    const handle = async (file) => {
      if (!file) return;
      const preview = URL.createObjectURL(file);
      status.innerHTML = `<img class="scan-preview" src="${preview}" alt=""><div class="loading"><span class="spinner"></span> <span id="ocrMsg">Loading scanner…</span></div><div class="progress"><div id="ocrBar" style="width:0%"></div></div>`;
      try {
        const [textOut, image] = await Promise.all([
          ocrImage(file, (p) => {
            const bar = s.el.querySelector('#ocrBar');
            const msg = s.el.querySelector('#ocrMsg');
            if (bar) bar.style.width = `${Math.round(p * 100)}%`;
            if (msg) msg.textContent = `Reading text… ${Math.round(p * 100)}%`;
          }),
          compressImage(file),
        ]);
        URL.revokeObjectURL(preview);
        const cleaned = P.cleanScreenshotText(textOut);
        const parsed = parseInto(cleaned, {
          image: origin.image || image,
          source: origin.source?.url ? origin.source : { platform: 'photo', name: 'Scanned photo', url: '' },
        });
        if (!parsed) throw new Error('No text found in that picture. Try a sharper screenshot or photo.');
        if (!parsed.ingredients.length && !parsed.instructions.length) {
          s.close();
          ui.draft = { ...parsed, notes: textOut.trim() };
          go('#/edit/new');
          toast('We read the text but couldn\'t split it — tidy it up below');
          return;
        }
        finishImport(parsed);
      } catch (err) {
        status.innerHTML = `<div class="error">${esc(err.message || 'Scan failed')}</div>`;
      }
    };
    s.el.querySelector('#scanCam').onchange = (e) => handle(e.target.files[0]);
    s.el.querySelector('#scanLib').onchange = (e) => handle(e.target.files[0]);
    if (sharedFile) handle(sharedFile);
  };

  const show = (m) => {
    if (m === 'link') link(prefill.url || '', !!prefill.autostart);
    else if (m === 'search') search(prefill.query || '');
    else if (m === 'text') text(prefill.text || '');
    else if (m === 'scan') scan(prefill.file || null);
    else if (m === 'manual') { s.close(); ui.draft = null; go('#/edit/new'); }
    else menu();
  };
  show(mode);
}

function parseInto(text, partial = {}) {
  if (!text || !text.trim()) return null;
  const p = P.parseRecipeText(text);
  return {
    ...S.emptyRecipe(),
    title: p.title || partial.title || 'Untitled recipe',
    description: p.description,
    image: partial.image || '',
    servings: p.servings || 2,
    prepTime: p.prepTime,
    cookTime: p.cookTime || (p.totalTime && p.prepTime ? p.totalTime - p.prepTime : p.totalTime) || null,
    ingredients: p.ingredients,
    instructions: p.instructions,
    tags: p.tags,
    notes: p.notes,
    source: partial.source || { url: '', platform: 'text', name: '' },
  };
}

// ---------- Planner sheets ----------

const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'];

function defaultMeal() {
  const h = new Date().getHours();
  return h < 10 ? 'breakfast' : h < 15 ? 'lunch' : 'dinner';
}

function planPickerSheet(date) {
  let meal = 'dinner';
  let q = '';
  const s = openSheet('', { className: 'tall' });
  const d = fromYmd(date);
  const draw = () => {
    const list = sortRecipes(filterRecipes(state.recipes, q), 'recent');
    s.set(`
      <h2 class="sheet-title">${fmtDay(d, { weekday: 'long', month: 'short', day: 'numeric' })}</h2>
      <div class="seg">${MEALS.map((m) => `<button class="${m === meal ? 'on' : ''}" data-meal="${m}">${m[0].toUpperCase() + m.slice(1)}</button>`).join('')}</div>
      <label class="search">${icon('search')}<input id="pq" type="search" placeholder="Search your recipes" value="${esc(q)}" autocomplete="off"></label>
      <ul class="pick-list">${list.map((r) => `<li><button data-rid="${r.id}">${thumb(r, 'mini')}<span><strong>${esc(r.title)}</strong><small>${totalTime(r) ? P.formatMinutes(totalTime(r)) : ''}</small></span>${icon('plus')}</button></li>`).join('') || '<li class="muted small center">No recipes match.</li>'}</ul>
      <form id="noteForm" class="add-bar"><input id="noteIn" placeholder="Or add a note: leftovers, eating out…" maxlength="60"><button class="btn soft sm">Add</button></form>`);
    s.el.querySelectorAll('[data-meal]').forEach((b) => { b.onclick = () => { meal = b.dataset.meal; draw(); }; });
    const pq = s.el.querySelector('#pq');
    pq.oninput = () => {
      q = pq.value;
      const pos = pq.selectionStart;
      draw();
      const n = s.el.querySelector('#pq');
      n.focus();
      n.setSelectionRange(pos, pos);
    };
    s.el.querySelectorAll('[data-rid]').forEach((b) => {
      b.onclick = () => {
        const r = S.getRecipe(b.dataset.rid);
        S.planAdd(date, { recipeId: r.id, meal, servings: r.servings });
        s.close();
        toast(`Added to ${fmtDay(d, { weekday: 'long' })}`);
      };
    });
    s.el.querySelector('#noteForm').onsubmit = (e) => {
      e.preventDefault();
      const v = s.el.querySelector('#noteIn').value.trim();
      if (!v) return;
      S.planAdd(date, { title: v, meal });
      s.close();
    };
  };
  draw();
}

function planRecipeSheet(recipe) {
  let meal = defaultMeal();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i));
  const s = openSheet('');
  const draw = () => {
    s.set(`
      <h2 class="sheet-title">Add to meal plan</h2>
      <div class="seg">${MEALS.map((m) => `<button class="${m === meal ? 'on' : ''}" data-meal="${m}">${m[0].toUpperCase() + m.slice(1)}</button>`).join('')}</div>
      <div class="day-pick">${days.map((d, i) => {
        const k = ymd(d);
        const n = (state.plan[k] || []).length;
        return `<button data-date="${k}"><span>${i === 0 ? 'Today' : i === 1 ? 'Tmrw' : fmtDay(d, { weekday: 'short' })}</span><b>${d.getDate()}</b>${n ? `<i>${n}</i>` : ''}</button>`;
      }).join('')}</div>`);
    s.el.querySelectorAll('[data-meal]').forEach((b) => { b.onclick = () => { meal = b.dataset.meal; draw(); }; });
    s.el.querySelectorAll('[data-date]').forEach((b) => {
      b.onclick = () => {
        const servings = ui.servings[recipe.id] ?? recipe.servings;
        S.planAdd(b.dataset.date, { recipeId: recipe.id, meal, servings });
        s.close();
        toast(`Planned for ${fmtDay(fromYmd(b.dataset.date), { weekday: 'long', month: 'short', day: 'numeric' })}`, { action: 'View', onAction: () => go('#/plan') });
      };
    });
  };
  draw();
}

function recipeCookbooksSheet(recipe) {
  const s = openSheet('');
  const draw = () => {
    const ids = new Set(recipe.cookbookIds || []);
    s.set(`
      <h2 class="sheet-title">Save to cookbook</h2>
      <ul class="pick-list">${state.cookbooks.map((c) => `<li><button data-cb="${c.id}" class="${ids.has(c.id) ? 'on' : ''}"><span class="cb-emoji">${c.emoji || '📒'}</span><span><strong>${esc(c.name)}</strong></span><span class="tickbox">${icon('check')}</span></button></li>`).join('')}</ul>
      <button class="btn soft full" id="newCb">${icon('plus')} New cookbook</button>`);
    s.el.querySelectorAll('[data-cb]').forEach((b) => { b.onclick = () => { S.toggleRecipeInCookbook(recipe.id, b.dataset.cb); draw(); }; });
    s.el.querySelector('#newCb').onclick = async () => {
      const cb = await cookbookSheet();
      if (cb) { S.toggleRecipeInCookbook(recipe.id, cb.id); draw(); }
    };
  };
  draw();
}

function menuSheet(items) {
  const s = openSheet(`<div class="menu">${items.map((it, i) => `<button class="menu-item ${it.danger ? 'danger' : ''}" data-i="${i}">${icon(it.icon)} ${esc(it.label)}</button>`).join('')}<button class="menu-item cancel" data-close>Cancel</button></div>`);
  s.el.querySelectorAll('[data-i]').forEach((b) => { b.onclick = () => { s.close(); items[+b.dataset.i].run(); }; });
}

// ---------- Cook mode ----------

let cook = null;
let wakeLock = null;

async function requestWake() {
  if (!state.settings.wakeLock || !('wakeLock' in navigator)) return;
  try { wakeLock = await navigator.wakeLock.request('screen'); } catch { /* not allowed */ }
}

document.addEventListener('visibilitychange', () => {
  if (cook && document.visibilityState === 'visible') requestWake();
});

function openCook(recipe, factor) {
  const steps = [];
  let section = '';
  for (const s of recipe.instructions) {
    if (P.isHeaderLine(s) && s.trim().startsWith('#')) section = P.headerText(s);
    else steps.push({ text: s, section });
  }
  if (!steps.length) return;
  const el = document.createElement('div');
  el.className = 'cook';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', `Cook mode: ${recipe.title}`);
  document.body.append(el);
  document.body.classList.add('noscroll', 'cooking');
  cook = { recipe, steps, step: 0, factor, el, parsed: recipe.ingredients.map(P.parseIngredient), showIngs: false };
  renderCook();
  requestWake();
  document.addEventListener('keydown', cookKeys);
  let x0 = null;
  el.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  el.addEventListener('touchend', (e) => {
    if (x0 == null || cook.showIngs) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 60) cookStep(dx < 0 ? 1 : -1);
    x0 = null;
  });
}

function closeCook() {
  if (!cook) return;
  cook.el.remove();
  cook = null;
  document.body.classList.remove('noscroll', 'cooking');
  document.removeEventListener('keydown', cookKeys);
  wakeLock?.release?.().catch(() => {});
  wakeLock = null;
}

function cookKeys(e) {
  if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); cookStep(1); }
  else if (e.key === 'ArrowLeft') cookStep(-1);
  else if (e.key === 'Escape') closeCook();
}

function cookStep(d) {
  if (!cook) return;
  cook.step = Math.max(0, Math.min(cook.steps.length, cook.step + d));
  renderCook();
}

function renderCook() {
  const { recipe, steps, step, factor, parsed } = cook;
  const units = currentUnits();
  const done = step >= steps.length;
  const progress = steps.map((_, i) => `<span class="${i < step ? 'past' : i === step ? 'cur' : ''}"></span>`).join('');
  let body;
  if (done) {
    const saved = !!S.getRecipe(recipe.id);
    body = `<div class="cook-done">
      <div class="big-emoji">🎉</div><h2>Bon appétit!</h2><p>You made ${esc(recipe.title)}.</p>
      ${saved ? `<div class="stars lg">${[1, 2, 3, 4, 5].map((n) => `<button class="star ${n <= (recipe.rating || 0) ? 'on' : ''}" data-action="rate" data-id="${recipe.id}" data-n="${n}" aria-label="${n} star">${icon('star')}</button>`).join('')}</div>
      <button class="btn primary full" data-action="cook-finish">${icon('check')} Mark as cooked</button>` : ''}
      <button class="btn ghost full" data-action="cook-close">Close</button></div>`;
  } else {
    const s = steps[step];
    const ingIdx = P.ingredientsInStep(s.text, parsed);
    const chips = ingIdx.map((i) => {
      const d = P.displayIngredient(parsed[i], factor, units);
      return `<li>${d.amount ? `<b>${esc(d.amount)}</b> ` : ''}${esc(d.name)}</li>`;
    }).join('');
    body = `<div class="cook-step">
      ${s.section ? `<p class="cook-section">${esc(s.section)}</p>` : ''}
      <p class="cook-count">Step ${step + 1} of ${steps.length}</p>
      <p class="cook-text">${stepHtml(s.text, units, recipe.title)}</p>
      ${chips ? `<div class="cook-ings"><h4>You'll need</h4><ul>${chips}</ul></div>` : ''}
    </div>`;
  }
  const ingPanel = cook.showIngs ? `<div class="cook-panel"><div class="cook-panel-head"><h3>Ingredients</h3><button class="icon-btn" data-action="cook-ings" aria-label="Close ingredients">${icon('x')}</button></div>
    <ul class="ings">${parsed.map((p) => {
      if (p.isHeader) return `<li class="ing-head">${esc(p.name)}</li>`;
      const d = P.displayIngredient(p, factor, units);
      return `<li class="ing static"><span class="ing-text">${d.amount ? `<b>${esc(d.amount)}</b> ` : ''}${esc(d.name)}${d.note ? `<span class="note">, ${esc(d.note)}</span>` : ''}</span></li>`;
    }).join('')}</ul></div>` : '';
  cook.el.innerHTML = `
    <header class="cook-head">
      <button class="icon-btn" data-action="cook-close" aria-label="Exit cook mode">${icon('x')}</button>
      <div class="cook-title">${esc(recipe.title)}</div>
      <button class="btn soft sm" data-action="cook-ings">${icon('list')} Ingredients</button>
    </header>
    <div class="cook-progress">${progress}</div>
    <main class="cook-main">${body}</main>
    ${done ? '' : `<footer class="cook-foot">
      <button class="btn soft" data-action="cook-prev" ${step === 0 ? 'disabled' : ''}>${icon('back')} Back</button>
      <button class="btn primary" data-action="cook-next">${step === steps.length - 1 ? `Finish ${icon('check')}` : `Next ${icon('fwd')}`}</button>
    </footer>`}
    ${ingPanel}`;
}

// ---------- Timers ----------

const timers = [];
let tickHandle = null;
let audioCtx = null;
let alarmHandle = null;

function startTimer(seconds, label, recipeTitle) {
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.resume?.();
  } catch { /* audio unavailable */ }
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
  timers.push({ id: P.uid('t'), label, recipeTitle, total: seconds, end: Date.now() + seconds * 1000, remaining: seconds, paused: false, done: false });
  if (!tickHandle) tickHandle = setInterval(tick, 500);
  tick();
  toast(`Timer started · ${P.formatClock(seconds)}`);
}

function tick() {
  const now = Date.now();
  for (const t of timers) {
    if (t.paused || t.done) continue;
    t.remaining = (t.end - now) / 1000;
    if (t.remaining <= 0) {
      t.done = true;
      t.remaining = 0;
      ring(t);
    }
  }
  if (!timers.length) { clearInterval(tickHandle); tickHandle = null; }
  renderTimers();
}

function beep() {
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime;
  [0, 0.25, 0.5].forEach((off) => {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.frequency.value = 880;
    o.type = 'sine';
    g.gain.setValueAtTime(0.0001, t0 + off);
    g.gain.exponentialRampToValueAtTime(0.3, t0 + off + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + off + 0.2);
    o.connect(g).connect(audioCtx.destination);
    o.start(t0 + off);
    o.stop(t0 + off + 0.22);
  });
}

function ring(t) {
  navigator.vibrate?.([400, 200, 400, 200, 400]);
  if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
    try { new Notification('⏰ Timer done', { body: `${t.label}${t.recipeTitle ? ` · ${t.recipeTitle}` : ''}` }); } catch { /* ignore */ }
  }
  beep();
  if (!alarmHandle) alarmHandle = setInterval(() => { if (timers.some((x) => x.done)) beep(); else { clearInterval(alarmHandle); alarmHandle = null; } }, 1500);
}

// Updates timer rows in place so taps on their buttons are never lost to a re-render.
function renderTimers() {
  let tray = $('#timers');
  if (!tray) {
    tray = document.createElement('div');
    tray.id = 'timers';
    tray.className = 'timer-tray';
    document.body.append(tray);
  }
  const ids = new Set(timers.map((t) => t.id));
  tray.querySelectorAll('.timer').forEach((n) => { if (!ids.has(n.dataset.tid)) n.remove(); });
  for (const t of timers) {
    let row = tray.querySelector(`[data-tid="${t.id}"]`);
    const mode = t.done ? 'done' : t.paused ? 'paused' : 'running';
    if (!row || row.dataset.mode !== mode) {
      const html = `${icon('timer')}<div class="timer-info"><b></b><small>${esc(t.label)}${t.recipeTitle ? ` · ${esc(t.recipeTitle)}` : ''}</small></div>
        ${t.done ? '' : `<button class="icon-btn sm" data-action="timer-pause" data-id="${t.id}" aria-label="${t.paused ? 'Resume' : 'Pause'}">${icon(t.paused ? 'play' : 'pause')}</button>`}
        <button class="icon-btn sm" data-action="timer-cancel" data-id="${t.id}" aria-label="Dismiss timer">${icon('x')}</button>`;
      if (!row) {
        row = document.createElement('div');
        row.dataset.tid = t.id;
        tray.append(row);
      }
      row.innerHTML = html;
      row.dataset.mode = mode;
      row.className = `timer ${t.done ? 'ringing' : ''} ${t.paused ? 'paused' : ''}`;
    }
    const label = t.done ? 'Done!' : P.formatClock(t.remaining);
    const b = row.querySelector('b');
    if (b.textContent !== label) b.textContent = label;
  }
}

// ---------- Actions ----------

function shareText(r) {
  const parsed = r.ingredients.map(P.parseIngredient);
  let n = 0;
  return [
    r.title, '',
    r.servings ? `Serves ${r.servings}${totalTime(r) ? ` · ${P.formatMinutes(totalTime(r))}` : ''}` : '',
    '', 'INGREDIENTS',
    ...parsed.map((p) => (p.isHeader ? `\n${p.name}:` : `• ${P.ingredientToString(p)}`)),
    '', 'STEPS',
    ...r.instructions.map((s) => (s.startsWith('#') ? `\n${P.headerText(s)}:` : `${++n}. ${s}`)),
    r.source?.url ? `\nSource: ${r.source.url}` : '',
    '\nSaved with Forkful',
  ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
}

async function shareOrCopy(title, text) {
  if (navigator.share) {
    try { await navigator.share({ title, text }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  try {
    await navigator.clipboard.writeText(text);
    toast('Copied to clipboard');
  } catch {
    toast('Sharing isn\'t available here');
  }
}

function download(name, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const actions = {
  back(el) {
    if (navStack.length > 1) history.back();
    else location.replace(el.dataset.fallback || '#/recipes');
  },
  import() { importSheet(); },
  sort(el) { ui.sort = el.dataset.sort; render(); },
  fav(el) {
    const r = S.getRecipe(el.dataset.id);
    if (!r) return;
    S.updateRecipe(r.id, { favorite: !r.favorite });
    toast(r.favorite ? 'Added to Favorites ❤️' : 'Removed from Favorites');
  },
  'save-sample'(el) {
    const sample = SAMPLE_RECIPES.find((x) => x.id === el.dataset.id);
    const existing = state.recipes.find((x) => x.sampleId === el.dataset.id);
    if (existing) {
      if (el.dataset.open) go(`#/recipe/${existing.id}`);
      else toast('Already in your recipes', { action: 'Open', onAction: () => go(`#/recipe/${existing.id}`) });
      return;
    }
    const r = S.saveSample(sample);
    toast('Saved to My Recipes', { action: 'Open', onAction: () => go(`#/recipe/${r.id}`) });
  },
  async 'new-cookbook'() {
    const cb = await cookbookSheet();
    if (cb) toast(`Created ${cb.name}`);
  },
  'cookbook-menu'(el) {
    const cb = S.getCookbook(el.dataset.id);
    menuSheet([
      { icon: 'edit', label: 'Edit cookbook', run: () => cookbookSheet(cb) },
      { icon: 'plus', label: 'Add recipes', run: () => actions['cookbook-add'](el) },
      { icon: 'trash', label: 'Delete cookbook', danger: true, run: async () => {
        if (await confirmSheet('Delete cookbook?', `"${cb.name}" will be removed. Your recipes stay in your library.`)) {
          S.deleteCookbook(cb.id);
          go('#/recipes');
        }
      } },
    ]);
  },
  'cookbook-add'(el) {
    const id = el.dataset.id;
    const s = openSheet('', { className: 'tall' });
    const draw = () => {
      s.set(`<h2 class="sheet-title">Add recipes</h2>
        <ul class="pick-list">${sortRecipes(state.recipes, 'az').map((r) => `<li><button data-rid="${r.id}" class="${(r.cookbookIds || []).includes(id) ? 'on' : ''}">${thumb(r, 'mini')}<span><strong>${esc(r.title)}</strong></span><span class="tickbox">${icon('check')}</span></button></li>`).join('')}</ul>
        <button class="btn primary full" data-close>Done</button>`);
      s.el.querySelectorAll('[data-rid]').forEach((b) => { b.onclick = () => { S.toggleRecipeInCookbook(b.dataset.rid, id); draw(); }; });
    };
    draw();
  },
  'detail-tab'(el) { ui.detailTab = el.dataset.tab; render(); },
  serv(el) {
    const r = S.getRecipe(el.dataset.key) || SAMPLE_RECIPES.find((x) => x.id === el.dataset.key);
    const cur = ui.servings[el.dataset.key] ?? r.servings ?? 1;
    ui.servings[el.dataset.key] = Math.max(1, Math.min(99, cur + +el.dataset.d));
    render();
  },
  units(el) { ui.units = el.dataset.u; render(); },
  'toggle-have'(el) {
    const set = (ui.have[el.dataset.key] ||= new Set());
    const i = +el.dataset.i;
    if (set.has(i)) set.delete(i);
    else set.add(i);
    render();
  },
  'to-groceries'(el) {
    const r = S.getRecipe(el.dataset.id);
    const have = ui.have[r.id] || new Set();
    const idx = r.ingredients.map((_, i) => i).filter((i) => !have.has(i));
    const n = S.addRecipeToGroceries(r, ui.servings[r.id] ?? r.servings, idx);
    toast(n ? `Added ${n} item${n === 1 ? '' : 's'} to your list` : 'Nothing to add', n ? { action: 'View', onAction: () => go('#/groceries') } : {});
  },
  'plan-recipe'(el) { planRecipeSheet(S.getRecipe(el.dataset.id)); },
  'recipe-cookbooks'(el) { recipeCookbooksSheet(S.getRecipe(el.dataset.id)); },
  'recipe-menu'(el) {
    const r = S.getRecipe(el.dataset.id);
    menuSheet([
      { icon: 'edit', label: 'Edit recipe', run: () => go(`#/edit/${r.id}`) },
      { icon: 'folder', label: 'Save to cookbook', run: () => recipeCookbooksSheet(r) },
      { icon: 'calendar', label: 'Add to meal plan', run: () => planRecipeSheet(r) },
      { icon: 'share', label: 'Share recipe', run: () => shareOrCopy(r.title, shareText(r)) },
      { icon: 'trash', label: 'Delete recipe', danger: true, run: () => actions['delete-recipe']({ dataset: { id: r.id } }) },
    ]);
  },
  async 'delete-recipe'(el) {
    const r = S.getRecipe(el.dataset.id);
    if (await confirmSheet('Delete recipe?', `"${r.title}" will be removed from your library and meal plan.`)) {
      S.deleteRecipe(r.id);
      location.replace('#/recipes');
      toast('Recipe deleted');
    }
  },
  share(el) {
    const r = el.dataset.sample ? SAMPLE_RECIPES.find((x) => x.id === el.dataset.id) : S.getRecipe(el.dataset.id);
    shareOrCopy(r.title, shareText(r));
  },
  rate(el) {
    const r = S.getRecipe(el.dataset.id);
    const n = +el.dataset.n;
    S.updateRecipe(r.id, { rating: r.rating === n ? 0 : n });
    if (cook) { cook.recipe = S.getRecipe(r.id); renderCook(); }
  },
  'tag-search'(el) { ui.search = el.dataset.tag; go('#/recipes'); },
  'dismiss-review'(el) { S.updateRecipe(el.dataset.id, { needsReview: false }); },
  'mark-cooked'(el) {
    const r = S.getRecipe(el.dataset.id);
    S.updateRecipe(r.id, { cookedCount: (r.cookedCount || 0) + 1, lastCooked: Date.now() });
    toast('Nice! Logged another cook 👩‍🍳');
  },
  cook(el) {
    const r = el.dataset.sample ? SAMPLE_RECIPES.find((x) => x.id === el.dataset.id) : S.getRecipe(el.dataset.id);
    const serv = ui.servings[r.id] ?? r.servings ?? 1;
    openCook(r, serv / (r.servings || 1));
  },
  'cook-next'() { cookStep(1); },
  'cook-prev'() { cookStep(-1); },
  'cook-close'() { closeCook(); },
  'cook-ings'() { cook.showIngs = !cook.showIngs; renderCook(); },
  'cook-finish'() {
    const r = S.getRecipe(cook.recipe.id);
    if (r) S.updateRecipe(r.id, { cookedCount: (r.cookedCount || 0) + 1, lastCooked: Date.now() });
    closeCook();
    toast('Logged! Enjoy your meal 🍽️');
  },
  timer(el) { startTimer(+el.dataset.seconds, el.dataset.label, el.dataset.recipe); },
  'timer-pause'(el) {
    const t = timers.find((x) => x.id === el.dataset.id);
    if (!t) return;
    if (t.paused) { t.end = Date.now() + t.remaining * 1000; t.paused = false; } else { t.paused = true; }
    renderTimers();
  },
  'timer-cancel'(el) {
    const i = timers.findIndex((x) => x.id === el.dataset.id);
    if (i >= 0) timers.splice(i, 1);
    renderTimers();
  },
  'discover-cat'(el) { ui.discoverCat = el.dataset.cat; render(); },
  week(el) { ui.weekOffset = el.dataset.d === '0' ? 0 : ui.weekOffset + +el.dataset.d; render(); },
  'plan-add'(el) { planPickerSheet(el.dataset.date); },
  'plan-item-menu'(el) {
    const { date, id } = el.dataset;
    const entry = (state.plan[date] || []).find((e) => e.id === id);
    const r = entry?.recipeId ? S.getRecipe(entry.recipeId) : null;
    const items = [];
    if (r) {
      items.push({ icon: 'play', label: 'Start cooking', run: () => openCook(r, (entry.servings || r.servings) / (r.servings || 1)) });
      items.push({ icon: 'cart', label: 'Add to grocery list', run: () => { const n = S.addRecipeToGroceries(r, entry.servings || r.servings); toast(`Added ${n} items`); } });
    }
    items.push({ icon: 'calendar', label: 'Move to tomorrow', run: () => S.planMove(date, id, ymd(addDays(fromYmd(date), 1))) });
    items.push({ icon: 'trash', label: 'Remove from plan', danger: true, run: () => S.planRemove(date, id) });
    menuSheet(items);
  },
  'plan-to-groceries'() {
    const start = weekStart(ui.weekOffset);
    let n = 0;
    let recipes = 0;
    for (let i = 0; i < 7; i++) {
      for (const e of state.plan[ymd(addDays(start, i))] || []) {
        const r = e.recipeId && S.getRecipe(e.recipeId);
        if (!r) continue;
        recipes++;
        n += S.addRecipeToGroceries(r, e.servings || r.servings);
      }
    }
    toast(`Added ${n} ingredients from ${recipes} recipe${recipes === 1 ? '' : 's'}`, { action: 'View', onAction: () => go('#/groceries') });
  },
  'grocery-toggle'(el) { S.toggleGrocery(el.dataset.id); },
  'grocery-remove'(el) { S.removeGrocery(el.dataset.id); },
  'grocery-clear-checked'() { S.clearGroceries(true); },
  'grocery-group'(el) { S.setSetting('groceryGroup', el.dataset.g); },
  'grocery-menu'() {
    menuSheet([
      { icon: 'share', label: 'Share list', run: () => {
        const open = state.groceries.filter((g) => !g.checked);
        const byAisle = P.AISLE_ORDER.map((a) => [a, open.filter((g) => g.aisle === a)]).filter(([, l]) => l.length);
        const text = ['🛒 Grocery list', ...byAisle.flatMap(([a, l]) => ['', `${P.AISLE_EMOJI[a]} ${a}`, ...l.map((g) => `☐ ${[P.groceryAmount(g), g.name].filter(Boolean).join(' ')}`)])].join('\n');
        shareOrCopy('Grocery list', text);
      } },
      { icon: 'check', label: 'Clear checked items', run: () => S.clearGroceries(true) },
      { icon: 'trash', label: 'Clear entire list', danger: true, run: async () => { if (await confirmSheet('Clear list?', 'All items will be removed.', { confirm: 'Clear' })) S.clearGroceries(false); } },
    ]);
  },
  setting(el) { S.setSetting(el.dataset.key, el.dataset.value); if (el.dataset.key === 'theme') applyTheme(); },
  'toggle-setting'(el) {
    const k = el.dataset.key;
    const cur = k === 'useProxy' ? state.settings.useProxy !== false : !!state.settings[k];
    S.setSetting(k, !cur);
  },
  export() { download(`forkful-backup-${ymd(new Date())}.json`, S.exportData()); },
  async reset() {
    if (await confirmSheet('Reset everything?', 'All recipes, cookbooks, plans and lists on this device will be erased.', { confirm: 'Reset' })) {
      S.resetAll();
      applyTheme();
      go('#/recipes');
      toast('Fresh start ✨');
    }
  },
  async install() {
    if (!deferredInstall) return;
    deferredInstall.prompt();
    await deferredInstall.userChoice.catch(() => {});
    deferredInstall = null;
    render();
  },
  'photo-remove'(el) {
    const form = el.closest('form');
    form.elements.image.value = '';
    $('#photoPreview').innerHTML = thumb({ title: form.elements.title.value }, 'edit-img');
    el.hidden = true;
  },
  'edit-cb'(el) { el.classList.toggle('on'); },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.action];
  if (!fn) return;
  e.preventDefault();
  e.stopPropagation();
  fn(el, e);
});

document.addEventListener('input', (e) => {
  const key = e.target.dataset?.input;
  if (key === 'search' || key === 'discoverSearch') {
    ui[key] = e.target.value;
    render();
  }
});

document.addEventListener('change', async (e) => {
  const el = e.target;
  const kind = el.dataset?.change;
  if (!kind) return;
  if (kind === 'notes') S.updateRecipe(el.dataset.id, { notes: el.value });
  else if (kind === 'name') S.setSetting('name', el.value.trim());
  else if (kind === 'import-server') {
    const v = el.value.trim().replace(/\/+$/, '');
    if (v && !/^https:\/\/[^\s/]+\.[^\s]+$/i.test(v)) { toast('That should be a link starting with https://'); return; }
    S.setSetting('importServer', v);
    toast(v ? 'Import server saved' : 'Import server removed');
  }
  else if (kind === 'photo') {
    const file = el.files[0];
    if (!file) return;
    try {
      const data = await compressImage(file);
      const form = el.closest('form');
      form.elements.image.value = data;
      $('#photoPreview').innerHTML = thumb({ title: form.elements.title.value, image: data }, 'edit-img');
      form.querySelector('[data-action="photo-remove"]').hidden = false;
    } catch (err) {
      toast(err.message);
    }
  } else if (kind === 'import-file') {
    const file = el.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      if (await confirmSheet('Restore backup?', 'This replaces everything currently on this device.', { confirm: 'Restore', danger: false })) {
        S.importData(text);
        applyTheme();
        toast('Backup restored');
      }
    } catch (err) {
      toast(err.message || 'Could not read that file');
    }
    el.value = '';
  }
});

document.addEventListener('submit', (e) => {
  const form = e.target;
  const kind = form.dataset?.submit;
  if (!kind) return;
  e.preventDefault();
  if (kind === 'grocery-add') {
    const input = form.querySelector('input');
    const v = input.value.trim();
    if (!v) return;
    v.split(/\s*,\s*(?=\d)|\n/).forEach((t) => S.addGroceryText(t));
    $('#gadd')?.focus();
  } else if (kind === 'save-recipe') {
    const id = form.dataset.id;
    const base = id ? S.getRecipe(id) : ui.draft || S.emptyRecipe();
    const data = collectForm(form, base);
    if (!data.title) { toast('Give your recipe a title'); return; }
    const saved = S.saveRecipe(id ? data : { ...data, id: null });
    ui.draft = null;
    location.replace(`#/recipe/${saved.id}`);
    toast(id ? 'Changes saved' : 'Recipe saved 🎉');
  }
});

// ---------- Boot ----------

function applyTheme() {
  const t = state.settings.theme;
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
  const dark = t === 'dark' || (t !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  $('meta[name="theme-color"]')?.setAttribute('content', dark ? '#16120f' : '#fbf6f0');
}

let deferredInstall = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstall = e;
  const b = $('#installBtn');
  if (b) b.hidden = false;
});

S.subscribe((evt) => {
  if (evt.error === 'storage') {
    toast('Storage is full — try removing some photos or exporting a backup');
    return;
  }
  render();
});

matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);

async function takeSharedFromServiceWorker() {
  try {
    const cache = await caches.open('forkful-share');
    const [imgRes, textRes] = await Promise.all([cache.match('shared-image'), cache.match('shared-text')]);
    await Promise.all([cache.delete('shared-image'), cache.delete('shared-text')]);
    const blob = imgRes ? await imgRes.blob() : null;
    return { file: blob && blob.size ? new File([blob], 'shared-image', { type: blob.type || 'image/jpeg' }) : null, text: textRes ? await textRes.text() : '' };
  } catch {
    return { file: null, text: '' };
  }
}

async function handleShareTarget() {
  const params = new URLSearchParams(location.search);
  let shared = [params.get('url'), params.get('text'), params.get('title')].filter(Boolean).join(' ');
  let file = null;
  if (params.has('shared')) ({ file, text: shared } = await takeSharedFromServiceWorker());
  if (!shared && !file && !params.has('shared')) return;
  history.replaceState(null, '', location.pathname + location.hash);
  if (file) { importSheet('scan', { file }); return; }
  if (!shared) { toast('Nothing came through from that share — try again'); return; }
  const url = shared.match(/https?:\/\/\S+/)?.[0];
  if (url) importSheet('link', { url, autostart: true });
  else importSheet('text', { text: shared });
}

applyTheme();
navStack.push(location.hash || '#/recipes');
render();
handleShareTarget();

if (!state.settings.onboarded) {
  S.setSetting('onboarded', true);
  setTimeout(() => {
    const s = openSheet(`
      <div class="welcome">
        <div class="big-emoji">🍳</div>
        <h2>Welcome to Forkful</h2>
        <p>All your recipes in one place — saved from social media, websites, photos or your own head.</p>
        <ul class="welcome-list">
          <li>${icon('link')}<span><strong>Import from anywhere</strong> Share a link or a screenshot of a post's caption to Forkful</span></li>
          <li>${icon('play')}<span><strong>Cook mode</strong> Step-by-step with built-in timers</span></li>
          <li>${icon('calendar')}<span><strong>Plan your week</strong> and get a grocery list sorted by aisle</span></li>
        </ul>
        <button class="btn primary full" data-close>Let's cook</button>
      </div>`);
    s.el.querySelector('.btn').focus();
  }, 400);
}

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
