# Forkful: a ReciMe-style recipe app

Forkful is an installable web app (PWA) that copies ReciMe's core features. You can save recipes from social media and websites, cook step by step, plan the week, and shop from a grocery list sorted by aisle. There's no build step, no backend and no account. Everything runs in the browser and is saved on the device.

## Features

| ReciMe feature | Forkful |
| --- | --- |
| Import from Instagram / TikTok / YouTube / Facebook / Pinterest / websites | Paste a link, use **Paste what you copied**, or share it to the installed app (Android share target). Recipe sites are read from their schema.org data. TikTok and YouTube captions are parsed into ingredients and steps. Instagram captions are read from the post's public embed page; public Facebook posts from Facebook's embed page. |
| Screenshots of posts | Share a screenshot to the installed app (Android), or pick one under **Scan a screenshot or photo**. Text is read on the device, with dark-mode screenshots inverted first, and social-app clutter ("Liked by…", "View all comments", usernames) is removed before parsing. This works even when a post can't be read from its link. |
| When a link can't be read | The error screen offers **Use the caption we found** (when part of a caption came through), **Scan a screenshot of the caption**, **Find a matching recipe** and **Paste the caption instead**, plus a **Details** list of every attempt that can be copied for troubleshooting. **Find a matching recipe** searches a free recipe database by dish name and shows photos, so you can pick the one that looks like the post. The original link is kept in the recipe's notes. There's also a Google search button and a box to paste the recipe link you find. Search is also available from the ＋ menu as **Find by dish name**. |
| Recipe search | **Search recipes** (＋ menu, or from a Discover search) finds pages on cooking websites, loads each one in the background and shows cards with photo, rating and time; one tap saves the full recipe. Classic recipes from TheMealDB show underneath. In Chrome on Android, **Share → Forkful** on any recipe page saves it too. |
| Import from captions & notes | Paste any text. The parser finds the title, servings, times, ingredients, steps and hashtags, even in one-line captions. |
| Scan recipes from photos | Text is read on the device with Tesseract.js, then parsed the same way as pasted text. |
| Recipe library & cookbooks | Search across titles, ingredients and tags. Sort by recent, A–Z, quickest or most cooked. Includes favorites and custom cookbooks with emoji covers. |
| Recipe page | Change servings, switch between original, US and metric units, tick off ingredients you have, rate the recipe, add notes and log each time you cook it. |
| Cook mode | One step per screen, with swipe and arrow-key navigation. Each step shows the ingredients it uses. Durations in a step become timer buttons. The screen stays awake (Wake Lock). |
| Timers | Several timers can run at once in a floating tray. When one ends you get a sound, vibration and a notification. |
| Nutrition | Uses the source's nutrition data when available. Otherwise it's estimated per serving from the ingredient list. |
| Meal planner | Weekly calendar with breakfast, lunch, dinner and snack slots, plus free-text notes. One tap adds the week's ingredients to the grocery list. |
| Grocery list | Matching items are merged with unit conversion (2 tbsp + 1 cup butter = 1⅛ cups). Items are grouped by aisle or by recipe. You can check items off, share the list and add items by hand. |
| Discover | A built-in feed of recipes with categories and a recipe of the day. |
| Offline & install | A service worker keeps a copy of the app for offline use. It loads fresh files when online, so updates show up right away. It can be installed to the home screen on iOS and Android. |
| Backup | Export or import all data as JSON. Supports light and dark themes. |

## Run it

```bash
# from the repository root
python3 -m http.server 8000
# open http://localhost:8000/
```

The app uses ES modules, so it has to be served over HTTP. Opening `index.html` straight from disk won't work. Every push to `main` publishes it with GitHub Pages (`.github/workflows/pages.yml`) at `https://<user>.github.io/forkful/`.

## Tests

```bash
node --test tests/*.test.mjs
```

The tests cover ingredient parsing, scaling, unit and temperature conversion, durations and timers, caption parsing, schema.org extraction, aisle sorting, grocery merging and the nutrition estimate.

## Notes and limits

- **Recipe pages with no structured data** are read from common recipe-card markup, and as a last resort through the `r.jina.ai` reader's text version of the page.
- **Link imports need a relay for most sites.** Most sites don't allow a browser page on another domain to read them (CORS), so the app first tries a direct fetch. If that fails, it tries three free public services at the same time (`r.jina.ai`, `api.codetabs.com`, `api.allorigins.win`) and uses whichever answers first. These services only see the link being imported. You can turn this off under **Profile → Import helper**.
- **Facebook and Instagram often hide posts from logged-out visitors**, and the public relays get the login page. The most reliable route for those is a screenshot of the caption. Setting up the optional import server (below) improves link imports.

## Optional: your own import server

`worker/import-server.js` is a small [Cloudflare Worker](https://workers.cloudflare.com/) (the free plan is plenty) that fetches pages for the app. Unlike the browser, it can identify itself the way link-preview crawlers do (which social sites often answer with a public post's caption), follow Facebook share links to the post, and retry as a normal browser. It only accepts requests from the Forkful site.

It also makes recipe-site imports (Allrecipes and similar sites block the free public relays) and recipe search much more reliable.

**One click:** [![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/anickerson0321-tech/forkful/tree/main/worker) — sign up or log in, connect GitHub when asked, and deploy. Then paste the worker's address (like `https://forkful-import.yourname.workers.dev`) into Forkful → **Profile → Your import server** and tap **Test**.

**By hand:**
1. Sign up at [dash.cloudflare.com](https://dash.cloudflare.com/sign-up) (free).
2. Go to **Workers & Pages → Create → Create Worker**, give it a name such as `forkful-import`, and click **Deploy**.
3. Click **Edit code**, delete everything, paste in the contents of `worker/import-server.js` (Profile → **Copy server code** copies it), and click **Deploy**.
4. Copy the worker's address into Forkful → **Profile → Your import server** and tap **Test**.

If you host Forkful somewhere other than `anickerson0321-tech.github.io`, add that address to `ALLOWED_ORIGINS` at the top of the worker.
- **Recipe search** uses [TheMealDB](https://www.themealdb.com/)'s free API (about 300 recipes, mostly classic dishes). The public test key is meant for personal and educational use.
- **Photo scanning** loads Tesseract.js from jsDelivr the first time it's used, so the first scan needs a connection.
- **Data lives in `localStorage`** on each device. Use Export/Import backup to move it between devices.

## Code layout

```
forkful/
  index.html            app shell + tab bar
  css/app.css           styles (light/dark tokens)
  js/parse.js           pure parsing/formatting (ingredients, units, captions, schema.org, aisles, nutrition)
  js/store.js           state + localStorage persistence
  js/import.js          link import, OCR, image compression
  js/samples.js         Discover recipes + starter library
  js/app.js             routing, views, cook mode, timers, sheets
  sw.js                 offline cache + Android share target (links, text, screenshots)
  worker/               optional Cloudflare Worker import server
  manifest.webmanifest  PWA manifest (icons, share target, shortcuts)
  tests/                node:test unit tests
```
