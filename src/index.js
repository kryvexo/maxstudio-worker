import { Hub } from './hub.js';
import canvas from './canvas.json';
import { renderShare, renderLanding, renderNotFound } from './ui.js';

export { Hub };

const APP_PACKAGE = 'com.max.music';
const APK_URL = 'https://github.com/kryvexo/MAX-STUDIO-/releases/latest';
// Apni release keystore ka SHA-256 yahan daalo (keytool -list -v -keystore your.jks)
const CERT_SHA256 = [
  '05:32:c9:4b:16:b3:ec:45:0a:2f:33:b5:6f:59:91:02:29:92:7d:ca:a0:35:24:fb:da:b3:2f:fc:ee:79:0a',
  '98:0b:9f:d2:b1:6f:ce:70:63:9d:bc:cd:7d:ad:ca:e2:3e:34:85:67:8e:37:c8:2f:b4:e9:4f:eb:bd:03:9b:11'
];

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
    if (['watch', 'playlist', 'channel', 'listen'].includes(first)) return renderShare(url, first, { appPackage: APP_PACKAGE, apkUrl: APK_URL });

    if (path === '/api/status' || path === '/health') {
      return Response.json(await getStatus(env), { headers: { 'cache-control': 'no-store', 'access-control-allow-origin': '*' } });
    }

    if (path === '/' || path === '/index.html') {
      return renderLanding(url, await getStatus(env), { apkUrl: APK_URL });
    }

    return renderNotFound();
  },
};

// ---------- status ----------
async function getStatus(env) {
  let hub = { rooms: 0, users: 0, online: 0 };
  try { hub = await (await env.HUB.get(env.HUB.idFromName('main')).fetch('https://hub/stats')).json(); } catch (_) { /* hub abhi cold hai */ }
  return {
    ok: true, service: 'MAX STUDIO', package: APP_PACKAGE, ...hub,
    features: ['listen-together', 'chat', 'reactions', 'replies', 'mentions', 'seen', 'unsend', 'images', 'view-once', 'avatars'],
    time: new Date().toISOString(),
  };
}
