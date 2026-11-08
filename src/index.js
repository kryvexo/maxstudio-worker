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

    if (path === '/api/status' || path === '/health') {
      return Response.json(await getStatus(env), { headers: { 'cache-control': 'no-store', 'access-control-allow-origin': '*' } });
    }

    if (path === '/' || path === '/index.html') {
      return new Response(landingPage(url, await getStatus(env)), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
    }

    return new Response(notFoundPage(), { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } });
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

  const icon = first === 'listen' ? '🎧' : first === 'playlist' ? '🎶' : first === 'channel' ? '🎤' : '🎵';
  const html = page(`${title} - MAX STUDIO`, `
<main class="card">
  <div class="logo">${icon}</div>
  <span class="chip">MAX STUDIO</span>
  <h1>${esc(title)}</h1>
  ${first === 'listen' && code ? `<p class="muted">Room code</p><div class="code" id="code">${[...esc(code)].map((c) => `<span>${c}</span>`).join('')}</div><button class="copy" onclick="navigator.clipboard&&navigator.clipboard.writeText('${esc(code)}');this.textContent='Copied ✓'">Copy code</button>` : `<p class="muted">${esc(sub)}</p>`}
  <a class="btn primary" href="${esc(open)}">Open in MAX STUDIO</a>
  ${first !== 'listen' ? `<a class="btn ghost" href="${esc(web)}">Open in YouTube Music</a>` : ''}
  <a class="btn ghost" href="${esc(APK_URL)}">Get the app</a>
</main>`);
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

// ---------- UI ----------
async function getStatus(env) {
  let hub = { rooms: 0, users: 0, online: 0 };
  try { hub = await (await env.HUB.get(env.HUB.idFromName('main')).fetch('https://hub/stats')).json(); } catch (_) { /* hub abhi cold hai */ }
  return {
    ok: true, service: 'MAX STUDIO', package: APP_PACKAGE, ...hub,
    features: ['listen-together', 'chat', 'reactions', 'replies', 'mentions', 'seen', 'unsend', 'images', 'view-once', 'avatars'],
    time: new Date().toISOString(),
  };
}

const CSS = `
:root{--bg:#07070c;--fg:#f4f4f8;--mut:rgba(244,244,248,.62);--card:rgba(255,255,255,.06);--line:rgba(255,255,255,.12);--a:#8b5cf6;--b:#ec4899;--c:#22d3ee;--ok:#34d399}
@media (prefers-color-scheme:light){:root{--bg:#f5f4fb;--fg:#14141c;--mut:rgba(20,20,28,.6);--card:rgba(255,255,255,.75);--line:rgba(20,20,28,.12)}}
*{box-sizing:border-box}html,body{margin:0;min-height:100%}
body{min-height:100vh;display:grid;place-items:center;padding:24px;background:var(--bg);color:var(--fg);font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;overflow-x:hidden;position:relative}
body::before,body::after{content:"";position:fixed;width:60vmax;height:60vmax;border-radius:50%;filter:blur(90px);opacity:.35;z-index:-1;animation:float 14s ease-in-out infinite alternate}
body::before{background:var(--a);top:-25vmax;left:-20vmax}
body::after{background:var(--b);bottom:-28vmax;right:-22vmax;animation-delay:-6s}
@keyframes float{to{transform:translate(6vmax,4vmax) scale(1.12)}}
.card{width:min(92vw,420px);padding:34px 26px 26px;border-radius:30px;background:var(--card);border:1px solid var(--line);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);text-align:center;box-shadow:0 30px 80px -30px rgba(0,0,0,.6);animation:rise .6s cubic-bezier(.2,.8,.2,1) both}
@keyframes rise{from{opacity:0;transform:translateY(18px) scale(.98)}}
.logo{width:76px;height:76px;margin:0 auto 14px;border-radius:24px;display:grid;place-items:center;font-size:36px;background:linear-gradient(135deg,var(--a),var(--b));box-shadow:0 14px 34px -10px var(--a)}
.chip{display:inline-block;padding:4px 12px;border-radius:99px;border:1px solid var(--line);font-size:11px;font-weight:700;letter-spacing:.18em}
h1{font-size:24px;line-height:1.2;margin:14px 0 6px;letter-spacing:-.02em}
.muted{color:var(--mut);margin:0 0 20px;font-size:14px}
.code{display:flex;gap:6px;justify-content:center;margin:6px 0 14px}
.code span{width:34px;height:46px;display:grid;place-items:center;border-radius:12px;background:var(--card);border:1px solid var(--line);font:700 22px ui-monospace,SFMono-Regular,Menlo,monospace}
.copy{margin:0 auto 18px;padding:7px 16px;border-radius:99px;border:1px solid var(--line);background:transparent;color:var(--fg);font:600 13px inherit;cursor:pointer}
a.btn{display:block;padding:15px;border-radius:18px;font-weight:700;text-decoration:none;margin-top:10px;transition:transform .15s,box-shadow .15s}
a.btn:active{transform:scale(.97)}
a.primary{color:#fff;background:linear-gradient(135deg,var(--a),var(--b));box-shadow:0 12px 30px -12px var(--b)}
a.ghost{color:var(--fg);border:1px solid var(--line);background:transparent}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:22px 0 18px}
.stat{padding:14px 6px;border-radius:18px;background:var(--card);border:1px solid var(--line)}
.stat b{display:block;font-size:24px;letter-spacing:-.02em}.stat small{color:var(--mut);font-size:11px;text-transform:uppercase;letter-spacing:.1em}
.live{display:inline-flex;align-items:center;gap:8px;margin-top:12px;font-size:13px;font-weight:600;color:var(--ok)}
.live i{width:9px;height:9px;border-radius:50%;background:var(--ok);box-shadow:0 0 0 0 var(--ok);animation:pulse 1.8s infinite}
@keyframes pulse{70%{box-shadow:0 0 0 10px transparent}100%{box-shadow:0 0 0 0 transparent}}
.tags{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:6px}
.tags span{padding:5px 10px;border-radius:99px;background:var(--card);border:1px solid var(--line);font-size:11.5px;color:var(--mut)}
footer{margin-top:20px;font-size:11.5px;color:var(--mut)}
`;

function page(title, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#07070c"><title>${esc(title)}</title>
<style>${CSS}</style></head><body>${body}</body></html>`;
}

function landingPage(url, st) {
  const tags = ['Listen Together', 'Live chat', 'Reactions', 'Replies', '@Mentions', 'Seen by', 'Unsend', 'Photos', 'View once', 'Avatars'];
  return page('MAX STUDIO', `
<main class="card">
  <div class="logo">🎧</div>
  <span class="chip">MAX STUDIO</span>
  <h1>Backend is live</h1>
  <p class="muted">Listen Together server for the MAX STUDIO app</p>
  <div class="grid">
    <div class="stat"><b>${st.rooms}</b><small>Rooms</small></div>
    <div class="stat"><b>${st.online}</b><small>Online</small></div>
    <div class="stat"><b>${st.users}</b><small>Users</small></div>
  </div>
  <div class="tags">${tags.map((t) => `<span>${t}</span>`).join('')}</div>
  <div class="live"><i></i> Operational</div>
  <a class="btn primary" style="margin-top:20px" href="${esc(APK_URL)}">Get the app</a>
  <footer>wss://${esc(url.host)}/ws</footer>
</main>`);
}

function notFoundPage() {
  return page('Not found - MAX STUDIO', `<main class="card"><div class="logo">🔍</div><h1>Page not found</h1><p class="muted">This link doesn't lead anywhere.</p><a class="btn primary" href="/">Home</a></main>`);
}
