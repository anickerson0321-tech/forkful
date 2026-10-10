// Forkful import server: a tiny Cloudflare Worker (free plan) that fetches recipe pages
// and social posts for the app. Browsers can't read other sites directly (CORS) or set
// their own User-Agent; a Worker can. Social posts are requested the way link-preview
// crawlers request them, which is often how a public post's caption can be read without
// a login.
//
// Setup: Cloudflare dashboard → Workers & Pages → Create → Worker → "Edit code",
// replace everything with this file, Deploy, then paste the worker's URL into
// Forkful → Profile → "Your import server".

// Sites allowed to use this server. Add yours if you host Forkful somewhere else.
const ALLOWED_ORIGINS = ['https://anickerson0321-tech.github.io'];

const USER_AGENTS = {
  // Link-preview crawler: social sites serve post previews (with caption) to it.
  bot: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  browser: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36',
};

const SOCIAL_HOST = /(^|\.)(facebook\.com|fb\.watch|fb\.com|instagram\.com)$/i;

function isAllowedOrigin(origin) {
  return ALLOWED_ORIGINS.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

function looksLikeLoginWall(html) {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim().toLowerCase();
  return /^(log in|log into|login|sign up)\b/.test(title) && !/og:description/i.test(html);
}

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Expose-Headers': 'X-Final-Url, X-Fetched-As',
      Vary: 'Origin',
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (!isAllowedOrigin(origin)) return new Response('This import server only works from the Forkful app.', { status: 403, headers: cors });

    const params = new URL(request.url).searchParams;
    let target;
    try {
      target = new URL(params.get('url') || '');
    } catch {
      return new Response('Missing or invalid ?url=', { status: 400, headers: cors });
    }
    if (!/^https?:$/.test(target.protocol) || /^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(target.hostname)) {
      return new Response('That address is not allowed.', { status: 400, headers: cors });
    }

    const social = SOCIAL_HOST.test(target.hostname);
    const want = params.get('ua');
    const first = want === 'bot' || want === 'browser' ? want : social ? 'bot' : 'browser';
    const order = [first, first === 'bot' ? 'browser' : 'bot'];
    let last = { status: 502, body: 'Fetch failed' };
    for (const ua of order) {
      try {
        const res = await fetch(target.href, {
          redirect: 'follow',
          headers: { 'User-Agent': USER_AGENTS[ua], Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8', 'Accept-Language': 'en-US,en;q=0.9' },
        });
        // Recipe sites and search engines: pass the page straight through (keeps CPU use
        // tiny on the free plan). Social sites: check for a login page and retry.
        if (res.ok && !social) {
          return new Response(res.body, {
            headers: { ...cors, 'Content-Type': res.headers.get('Content-Type') || 'text/html; charset=utf-8', 'X-Final-Url': res.url, 'X-Fetched-As': ua },
          });
        }
        const body = await res.text();
        if (res.ok && body.length > 300 && !looksLikeLoginWall(body)) {
          return new Response(body, {
            headers: { ...cors, 'Content-Type': res.headers.get('Content-Type') || 'text/html; charset=utf-8', 'X-Final-Url': res.url, 'X-Fetched-As': ua },
          });
        }
        last = { status: res.ok ? 422 : res.status, body: res.ok ? 'Got a login page instead of the post' : body.slice(0, 500) };
      } catch (e) {
        last = { status: 502, body: String(e?.message || e) };
      }
    }
    return new Response(last.body, { status: last.status, headers: cors });
  },
};
