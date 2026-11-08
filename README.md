# MAX STUDIO - Cloudflare backend

Ek Worker, ek domain, sab kuch free plan par:
- `wss://DOMAIN/ws` - Listen Together (Durable Object)
- `https://DOMAIN/watch|playlist|channel|listen` - share/invite page
- `https://DOMAIN/.well-known/assetlinks.json` - app links
- `https://DOMAIN/canvas.json` - canvas (file: `src/canvas.json`)

## Deploy (laptop ya Termux, Node 18+)
```bash
cd maxstudio-cloudflare
npm install
npx wrangler login
npx wrangler deploy
```
Deploy ke baad URL milega: `https://maxstudio.<tumhara-naam>.workers.dev`

## Setup
1. Release SHA-256 `src/index.js` mein pehle se set hai (v1.5.18 signer). Key badle to wahin update karo.
2. Canvas videos: `src/canvas.json` edit karo (`url` direct mp4 ho), phir deploy.
3. Custom domain: domain Cloudflare par add karo, `wrangler.toml` mein `routes` uncomment karo.
4. App patch:
   ```bash
   ./app-patch/apply.sh /path/to/MAX-STUDIO-v1.5 maxstudio.<naam>.workers.dev
   ```
   Phir `app/server.json` GitHub (`kryvexo/MAX-STUDIO-`, main) par push karo, kyunki app wahin se server URL fetch karta hai. Phir app build karo.

## Test
`npx wscat -c wss://DOMAIN/ws` -> `{"type":"ping"}` bhejo -> `{"type":"pong"}`.
Live logs: `npx wrangler tail`.

## Limits / notes
- Free plan: Durable Object ke daily limits hain (requests aur duration). Hobby use ke liye theek hai; bahut zyada users ho to Workers Paid ($5/mo).
- Rooms memory mein hain; Cloudflare kabhi-kabhi DO restart karta hai, tab active rooms toot sakte hain (app auto-rejoin try karta hai).
- Sab rooms ek hi Hub instance mein chalte hain (hobby scale ke liye kaafi).

## Chat (app v2.4 / code 204)
App chat ke saare features (reply, mention, avatar, seen, reaction, image, view-once, unsend) `chat` frame ke andar
hidden zero-width markers se chalte hain. Server unhe **bilkul waise hi relay** karta hai (sender ko bhi):
- message trim/edit nahi hota, limit 2000 chars (pehle 1500)
- marker frames (`\u200B[IMG2:`, `[SEEN1:`, `[OPEN1:`, `[RX1]`, `\u2063` unsend/mention) ka alag rate-limit: 450 / 10s
  (image = 600-char chunks x max 100, isliye pehle 80/10s pe image beech mein ruk jaati thi)
- `reply_to {username, message}` bhi forward hota hai

Status page: `https://DOMAIN/` , JSON: `/api/status`.
