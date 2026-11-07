import { Hub } from './hub.js';
import canvas from './canvas.json';

export { Hub };

const APP_PACKAGE = 'com.max.music';
const APK_URL = 'https://github.com/kryvexo/MAX-STUDIO-/releases/latest';
// Apni release keystore ka SHA-256 yahan daalo (keytool -list -v -keystore your.jks)
const CERT_SHA256 = [
  '05:32:c9:4b:16:b3:ec:45:0a:2f:33:b5:6f:59:91:02:29:92:7d:ca:a0:35:24:fb:da:b3:2f:fc:ee:79:0a',
  '98:0b:9f:d2:b1:6f:ce:70:63:9d:bc:cd:7d:ad:ca:e2:3e:34:85:67:8e:37:c8:2f:b4:e9:4f:eb:bd:03:9b:11'
];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname;

    if (path === '/ws') {
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('Expected WebSocket', { status: 426 });
      return env.HUB.get(env.HUB.idFromName('main')).fetch(req);
    }

    if (path === '/canvas.json') {
      return new Response(JSON.stringify(canvas), {
        headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=60', 'access-control-allow-origin': '*' },
      });
    }

    if (path === '/.well-known/assetlinks.json') {
      return Response.json([{
        relation: ['delegate_permission/common.handle_all_urls'],
        target: { namespace: 'android_app', package_name: APP_PACKAGE, sha256_cert_fingerprints: CERT_SHA256 },
      }]);
    }

    const first = path.split('/').filter(Boolean)[0] || '';
    if (['watch', 'playlist', 'channel', 'listen'].includes(first)) return sharePage(url, first);

    return new Response('MAX STUDIO backend OK\n', { headers: { 'content-type': 'text/plain' } });
  },
};

function sharePage(url, first) {
  const clean = (s) => String(s || '').replace(/[^A-Za-z0-9_\-]/g, '');
  const parts = url.pathname.split('/').filter(Boolean);
  const id = clean(url.searchParams.get('v') || url.searchParams.get('list') || parts[1]);
  const code = clean(url.searchParams.get('code')).toUpperCase();

  let web = 'https://music.youtube.com/';
  let title = 'MAX STUDIO';
  let sub = 'Open this link in the MAX STUDIO app';
  if (first === 'watch') { web = `https://music.youtube.com/watch?v=${id}`; title = 'Song shared with you'; }
  if (first === 'playlist') { web = `https://music.youtube.com/playlist?list=${id}`; title = 'Playlist shared with you'; }
  if (first === 'channel') { web = `https://music.youtube.com/channel/${id}`; title = 'Artist shared with you'; }
  if (first === 'listen') { title = 'Listen Together'; sub = code ? '' : 'Join a room'; }

  const intent = `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=https;package=${APP_PACKAGE};S.browser_fallback_url=${encodeURIComponent(APK_URL)};end`;
  const open = first === 'listen' && code ? `maxstudio://listen?code=${encodeURIComponent(code)}` : intent;

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} - MAX STUDIO</title>
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0b10;color:#fff;font-family:system-ui,sans-serif}
.card{width:min(92vw,380px);padding:32px 24px;border-radius:28px;background:rgba(255,255,255,.07);text-align:center}
h1{font-size:22px;margin:0 0 6px}p{opacity:.7;margin:0 0 22px}code{font-size:28px;letter-spacing:4px}
a.btn{display:block;padding:14px;border-radius:16px;background:#fff;color:#000;font-weight:600;text-decoration:none;margin-top:10px}
a.alt{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.3)}
</style></head><body><div class="card"><h1>${esc(title)}</h1>
<p>${first === 'listen' && code ? `<code>${esc(code)}</code>` : esc(sub)}</p>
<a class="btn" href="${esc(open)}">Open in MAX STUDIO</a>
${first !== 'listen' ? `<a class="btn alt" href="${esc(web)}">Open in YouTube Music</a>` : ''}
<a class="btn alt" href="${esc(APK_URL)}">Get the app</a></div></body></html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}
