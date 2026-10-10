import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/import-server.js';

const APP = 'https://anickerson0321-tech.github.io';
const call = (url, origin = APP) => worker.fetch(new Request(`https://srv.example/?${url}`, { headers: origin ? { Origin: origin } : {} }));

function mockFetch(handler) {
  const calls = [];
  globalThis.fetch = async (url, opts) => {
    calls.push({ url, ua: opts.headers['User-Agent'] });
    return handler(url, opts);
  };
  return calls;
}

test('rejects other sites and bad input', async () => {
  assert.equal((await call('url=https://example.com', 'https://evil.example')).status, 403);
  assert.equal((await call('url=https://example.com', '')).status, 403);
  assert.equal((await call('url=nope')).status, 400);
  assert.equal((await call('url=http://localhost/admin')).status, 400);
  const pre = await worker.fetch(new Request('https://srv.example/', { method: 'OPTIONS', headers: { Origin: APP } }));
  assert.equal(pre.status, 204);
  assert.equal(pre.headers.get('Access-Control-Allow-Origin'), APP);
});

test('asks social sites as a link-preview crawler first, then falls back', async () => {
  const page = `<html><head><title>Post</title><meta property="og:description" content="Recipe…"></head><body>${'x'.repeat(400)}</body></html>`;
  let calls = mockFetch((url, opts) => (opts.headers['User-Agent'].startsWith('facebookexternalhit')
    ? new Response(page, { headers: { 'Content-Type': 'text/html' } })
    : new Response('nope', { status: 500 })));
  let res = await call(`url=${encodeURIComponent('https://www.facebook.com/share/p/abc/')}`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('X-Fetched-As'), 'bot');
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), APP);
  assert.match(await res.text(), /og:description/);
  assert.equal(calls.length, 1);

  // Login wall for the crawler -> retry as a browser.
  calls = mockFetch((url, opts) => (opts.headers['User-Agent'].startsWith('facebookexternalhit')
    ? new Response(`<title>Log into Facebook</title>${'x'.repeat(400)}`)
    : new Response(page)));
  res = await call(`url=${encodeURIComponent('https://www.instagram.com/reel/abc/')}`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('X-Fetched-As'), 'browser');
  assert.equal(calls.length, 2);
});

test('recipe sites are fetched as a browser; failures report a status', async () => {
  let calls = mockFetch(() => new Response(`<html>${'y'.repeat(500)}</html>`));
  let res = await call(`url=${encodeURIComponent('https://blog.example/brownies')}`);
  assert.equal(res.status, 200);
  assert.ok(calls[0].ua.startsWith('Mozilla'));
  assert.match(await res.text(), /yyyy/);
  // Non-social pages are passed through even when short (e.g. search results).
  mockFetch(() => new Response('<rss><item/></rss>', { headers: { 'Content-Type': 'application/rss+xml' } }));
  res = await call(`url=${encodeURIComponent('https://www.bing.com/search?format=rss&q=x')}`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Content-Type'), 'application/rss+xml');
  calls = mockFetch(() => new Response(`<title>Log in</title>${'z'.repeat(400)}`));
  res = await call(`url=${encodeURIComponent('https://www.facebook.com/x')}`);
  assert.equal(res.status, 422);
  assert.equal(calls.length, 2);
  mockFetch(() => { throw new Error('network down'); });
  res = await call(`url=${encodeURIComponent('https://blog.example/x')}&ua=browser`);
  assert.equal(res.status, 502);
});
