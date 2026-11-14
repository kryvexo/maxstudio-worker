// MAX STUDIO - web UI (liquid glass). Pure string templates, no dependencies.

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const ICON = {
  note: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg>',
  copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16h-9V7h9v14z"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>',
  open: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>',
  yt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 14.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9zm-1.5-6.9v4.8l4-2.4-4-2.4z"/></svg>',
  dl: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z"/></svg>',
  headphones: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3a9 9 0 0 0-9 9v7a2 2 0 0 0 2 2h2v-8H5v-1a7 7 0 0 1 14 0v1h-2v8h2a2 2 0 0 0 2-2v-7a9 9 0 0 0-9-9z"/></svg>',
  mic: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/></svg>',
  list: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 6h12v2H3V6zm0 4h12v2H3v-2zm0 4h8v2H3v-2zm14-4v6.18A3 3 0 1 0 19 19v-9h3V8h-5z"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z"/></svg>',
};

const CSS = `
:root{
  color-scheme:dark;
  --bg:#0d0a14;--fg:#f6f1ff;--mut:rgba(246,241,255,.66);--faint:rgba(246,241,255,.42);
  --a:#a78bfa;--b:#f0abfc;--c:#7c3aed;--ok:#4ade80;
  --glass:rgba(255,255,255,.085);--glass2:rgba(255,255,255,.035);--edge:rgba(255,255,255,.2);
  --tint:rgba(124,58,237,.22);--shadow:rgba(4,0,12,.55);
  --head:"Bricolage Grotesque","Inter",system-ui,sans-serif;
  --display:"Gasoek One","Bricolage Grotesque","Inter",system-ui,sans-serif;
  --body:Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  --mono:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace;
}
@media (prefers-color-scheme:light){:root{
  color-scheme:light;
  --bg:#f3eefc;--fg:#1c1230;--mut:rgba(28,18,48,.66);--faint:rgba(28,18,48,.45);
  --a:#7c3aed;--b:#c026d3;--c:#6d28d9;--ok:#16a34a;
  --glass:rgba(255,255,255,.5);--glass2:rgba(255,255,255,.22);--edge:rgba(255,255,255,.9);
  --tint:rgba(167,139,250,.28);--shadow:rgba(76,29,149,.28);
}}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;min-height:100%}
body{min-height:100vh;min-height:100dvh;background:var(--bg);color:var(--fg);font-family:var(--body);-webkit-font-smoothing:antialiased;overflow-x:hidden;position:relative}

/* ---- backdrop: this is what the glass refracts ---- */
.bg{position:fixed;inset:0;z-index:-1;overflow:hidden;background:
  radial-gradient(120% 70% at 85% 8%,rgba(124,58,237,.55),transparent 60%),
  radial-gradient(90% 60% at 0% 100%,rgba(190,24,93,.38),transparent 65%),
  linear-gradient(180deg,var(--bg),var(--bg))}
.orb{position:absolute;border-radius:50%;filter:blur(2px);opacity:.9;will-change:transform;animation:drift 18s ease-in-out infinite alternate}
.o1{width:46vmax;height:46vmax;left:-14vmax;top:34%;background:radial-gradient(circle at 30% 30%,#c4b5fd,#7c3aed 55%,transparent 72%);opacity:.55}
.o2{width:34vmax;height:34vmax;right:-12vmax;top:-8vmax;background:radial-gradient(circle at 40% 40%,#f0abfc,#a21caf 55%,transparent 72%);opacity:.5;animation-delay:-5s}
.o3{width:26vmax;height:26vmax;right:6%;bottom:-8vmax;background:radial-gradient(circle at 50% 50%,#67e8f9,#0891b2 55%,transparent 72%);opacity:.32;animation-delay:-9s}
@keyframes drift{to{transform:translate3d(5vmax,-4vmax,0) scale(1.14)}}
.grain{position:absolute;inset:0;opacity:.07;mix-blend-mode:overlay;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")}

/* ---- layout ---- */
.wrap{width:min(100%,520px);margin:0 auto;padding:max(22px,env(safe-area-inset-top)) 22px max(34px,env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:18px}
.top{display:flex;align-items:center;justify-content:space-between;gap:12px}
.brand{display:inline-flex;align-items:center;gap:10px;padding:7px 14px 7px 8px;border-radius:99px;font:700 12px var(--body);letter-spacing:.2em;text-transform:uppercase}
.brand i{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,var(--c),var(--b));box-shadow:0 6px 16px -6px var(--b)}
.brand i svg{width:15px;height:15px}
.eyebrow{margin:14px 0 0;font:600 14px var(--body);letter-spacing:.28em;text-transform:uppercase;color:var(--a)}
h1{margin:8px 0 0;font:400 clamp(46px,14vw,80px)/1 var(--display);letter-spacing:-.01em;overflow-wrap:anywhere;background:linear-gradient(100deg,#ddd0ff 5%,#f0abfc 60%,#fbcfe8);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 8px 30px rgba(167,139,250,.35))}
@media (prefers-color-scheme:light){h1{background-image:linear-gradient(100deg,#6d28d9 5%,#c026d3 65%,#db2777);filter:none}}
.lead{margin:6px 0 4px;font-size:clamp(17px,4.6vw,20px);line-height:1.55;color:var(--mut);max-width:34ch}

/* ---- liquid glass ---- */
.glass{position:relative;isolation:isolate;border-radius:30px;
  background:
    radial-gradient(120% 90% at var(--mx,20%) var(--my,0%),rgba(255,255,255,.16),transparent 55%),
    linear-gradient(145deg,var(--glass),var(--glass2)),var(--tint);
  -webkit-backdrop-filter:blur(22px) saturate(190%) brightness(1.06);
  backdrop-filter:blur(22px) saturate(190%) brightness(1.06);
  box-shadow:
    inset 0 1.5px 0 rgba(255,255,255,.45),
    inset 0 -1.5px 0 rgba(255,255,255,.08),
    inset 1.5px 0 0 rgba(255,255,255,.12),
    inset 0 0 38px rgba(255,255,255,.06),
    0 1px 2px rgba(0,0,0,.2),
    0 26px 60px -26px var(--shadow);
  animation:rise .7s cubic-bezier(.2,.8,.2,1) both}
.glass::before{content:"";position:absolute;inset:0;border-radius:inherit;padding:1.2px;pointer-events:none;z-index:2;
  background:linear-gradient(135deg,rgba(255,255,255,.85),rgba(255,255,255,.08) 28%,rgba(255,255,255,0) 55%,rgba(255,255,255,.12) 78%,rgba(255,255,255,.55));
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0)}
.glass::after{content:"";position:absolute;left:8%;right:8%;top:0;height:42%;border-radius:0 0 50% 50%/0 0 100% 100%;pointer-events:none;z-index:-1;
  background:linear-gradient(180deg,rgba(255,255,255,.14),transparent)}
.refract .glass{-webkit-backdrop-filter:blur(8px) saturate(190%) url(#lg);backdrop-filter:blur(8px) saturate(190%) url(#lg)}
.pad{padding:26px 26px 28px}
.d2{animation-delay:.08s}.d3{animation-delay:.16s}.d4{animation-delay:.24s}
@keyframes rise{from{opacity:0;transform:translateY(22px) scale(.97)}}

.label{margin:0;font:600 13px var(--body);letter-spacing:.24em;text-transform:uppercase;color:var(--mut)}
.row{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-top:14px}
.code{display:flex;gap:2px;font:700 clamp(28px,8.6vw,40px)/1 var(--mono);letter-spacing:.14em;text-shadow:0 2px 18px rgba(167,139,250,.55)}
.code span{display:inline-block;animation:pop .5s cubic-bezier(.2,1.4,.4,1) both}
@keyframes pop{from{opacity:0;transform:translateY(10px) scale(.7)}}

/* buttons */
.btn{appearance:none;border:0;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:10px;text-decoration:none;font:700 17px var(--body);color:var(--fg);padding:16px 26px;border-radius:99px;position:relative;isolation:isolate;transition:transform .25s cubic-bezier(.3,1.5,.5,1),box-shadow .25s,filter .2s}
.btn svg{width:22px;height:22px;flex:none}
.btn:active{transform:scale(.95)}
.btn.glassy{background:linear-gradient(145deg,rgba(255,255,255,.22),rgba(255,255,255,.07));-webkit-backdrop-filter:blur(14px) saturate(180%);backdrop-filter:blur(14px) saturate(180%);box-shadow:inset 0 1.5px 0 rgba(255,255,255,.5),inset 0 -1px 0 rgba(255,255,255,.1),0 10px 26px -12px var(--shadow)}
.btn.primary{color:#241046;background:linear-gradient(160deg,#efe7ff,#cdb8ff 55%,#bda2ff);box-shadow:inset 0 2px 0 rgba(255,255,255,.85),inset 0 -3px 8px rgba(124,58,237,.25),0 14px 34px -10px rgba(167,139,250,.75),0 0 0 1px rgba(255,255,255,.25)}
.btn.primary:hover,.btn.glassy:hover{transform:translateY(-2px);filter:brightness(1.06)}
.btn.block{width:100%}
.btn.sm{padding:13px 22px;font-size:16px}
.stack{display:flex;flex-direction:column;gap:12px;margin-top:22px}
.btn.ok{color:#052e16;background:linear-gradient(160deg,#dcfce7,#86efac)}

/* open card */
.ico{width:72px;height:72px;border-radius:24px;display:grid;place-items:center;color:var(--a);background:linear-gradient(145deg,rgba(255,255,255,.2),rgba(255,255,255,.06));box-shadow:inset 0 1.5px 0 rgba(255,255,255,.45),inset 0 0 20px rgba(255,255,255,.05),0 10px 26px -12px var(--shadow)}
.ico svg{width:34px;height:34px}
h2{margin:22px 0 0;font:800 clamp(26px,7vw,32px)/1.1 var(--head);letter-spacing:-.02em}
.sub{margin:14px 0 0;font-size:17px;line-height:1.65;color:var(--mut)}
.sub b,.steps b{color:var(--fg);font-weight:600}
ol.steps{margin:18px 0 0;padding:0;list-style:none;counter-reset:s;display:flex;flex-direction:column;gap:12px;color:var(--mut);font-size:16.5px;line-height:1.55}
ol.steps li{counter-increment:s;display:grid;grid-template-columns:30px 1fr;gap:10px;align-items:start}
ol.steps li::before{content:counter(s);width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font:700 13px var(--body);color:var(--fg);background:rgba(255,255,255,.12);box-shadow:inset 0 1px 0 rgba(255,255,255,.35)}
.arr{color:var(--a);padding:0 2px}

/* stats / chips */
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:20px}
.stat{padding:16px 6px 14px;border-radius:22px;text-align:center;background:linear-gradient(145deg,rgba(255,255,255,.12),rgba(255,255,255,.03));box-shadow:inset 0 1.5px 0 rgba(255,255,255,.35),inset 0 0 18px rgba(255,255,255,.04)}
.stat b{display:block;font:800 30px var(--head);letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.stat small{display:block;margin-top:2px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--mut)}
.tags{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px}
.tags span{padding:7px 13px;border-radius:99px;font-size:13px;font-weight:500;color:var(--mut);background:rgba(255,255,255,.08);box-shadow:inset 0 1px 0 rgba(255,255,255,.3)}
.live{display:inline-flex;align-items:center;gap:9px;font-size:14px;font-weight:600;color:var(--ok)}
.live i{width:9px;height:9px;border-radius:50%;background:var(--ok);animation:pulse 1.9s infinite}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(74,222,128,.6)}70%,100%{box-shadow:0 0 0 11px rgba(74,222,128,0)}}
.endpoint{margin-top:18px;padding:13px 14px;border-radius:18px;font:500 12px var(--mono);word-break:break-all;color:var(--mut);background:rgba(0,0,0,.22);box-shadow:inset 0 1px 3px rgba(0,0,0,.35),inset 0 -1px 0 rgba(255,255,255,.1);overflow-wrap:anywhere}
.foot{margin-top:6px;text-align:center;font-size:12.5px;color:var(--faint)}
.center{text-align:center}.center .ico{margin:0 auto}

@media (min-width:700px){.wrap{padding-top:56px}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
`;

const JS = `
(function(){
  var d=document,r=d.documentElement;
  // SVG refraction inside backdrop-filter only works on Chromium; others keep the blur glass
  try{if(/Chrome\\//.test(navigator.userAgent)&&!/Firefox|FxiOS/.test(navigator.userAgent)){r.classList.add('refract')}}catch(e){}
  // light follows the finger / cursor across each glass panel
  d.querySelectorAll('.glass').forEach(function(g){
    function mv(e){var b=g.getBoundingClientRect(),p=e.touches?e.touches[0]:e;g.style.setProperty('--mx',((p.clientX-b.left)/b.width*100)+'%');g.style.setProperty('--my',((p.clientY-b.top)/b.height*100)+'%')}
    g.addEventListener('pointermove',mv);g.addEventListener('touchmove',mv,{passive:true});
  });
  // copy
  d.querySelectorAll('[data-copy]').forEach(function(b){
    b.addEventListener('click',function(){
      var t=b.getAttribute('data-copy'),l=b.querySelector('span'),ic=b.querySelector('.i-copy'),ck=b.querySelector('.i-check');
      function done(){b.classList.add('ok');if(l)l.textContent='Copied';if(ic)ic.style.display='none';if(ck)ck.style.display='block';setTimeout(function(){b.classList.remove('ok');if(l)l.textContent='Copy';if(ic)ic.style.display='block';if(ck)ck.style.display='none'},1800)}
      function fb(){var x=d.createElement('textarea');x.value=t;x.style.position='fixed';x.style.opacity='0';d.body.appendChild(x);x.select();try{d.execCommand('copy')}catch(e){}d.body.removeChild(x);done()}
      if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(done,fb)}else{fb()}
    });
  });
  // live stats on the status page
  var s=d.getElementById('stats');
  if(s){
    var set=function(k,v){var e=s.querySelector('[data-k="'+k+'"]');if(e)e.textContent=v};
    var tick=function(){fetch('/api/status',{cache:'no-store'}).then(function(r){return r.json()}).then(function(j){set('rooms',j.rooms);set('online',j.online);set('users',j.users)}).catch(function(){})};
    setInterval(tick,8000);
  }
})();
`;

const REFRACT_SVG = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
  <filter id="lg" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.008 0.012" numOctaves="2" seed="7" result="n"/>
    <feGaussianBlur in="n" stdDeviation="2" result="nb"/>
    <feDisplacementMap in="SourceGraphic" in2="nb" scale="38" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
</svg>`;

function page(title, body, { desc = 'Listen together with friends in real time.' } = {}) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0d0a14">
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Gasoek+One&family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body>
<div class="bg"><div class="orb o1"></div><div class="orb o2"></div><div class="orb o3"></div><div class="grain"></div></div>
${REFRACT_SVG}
<div class="wrap">
  <div class="top"><span class="brand glass" style="border-radius:99px;animation:none">${'<i>' + ICON.headphones + '</i>'}MAX STUDIO</span></div>
  ${body}
</div>
<script>${JS}</script></body></html>`;
}

const html = (body, status = 200) => new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });

export function renderShare(url, first, { appPackage, apkUrl }) {
  const clean = (s) => String(s || '').replace(/[^A-Za-z0-9_\-]/g, '');
  const parts = url.pathname.split('/').filter(Boolean);
  const id = clean(url.searchParams.get('v') || url.searchParams.get('list') || parts[1]);
  const code = clean(url.searchParams.get('code')).toUpperCase();

  let web = 'https://music.youtube.com/';
  let eyebrow = 'Shared with you';
  let h1 = 'Open in the app';
  let lead = 'Open this link on a device with MAX STUDIO to start listening.';
  let kind = 'link';
  let icon = ICON.note;
  let webLabel = 'Open in YouTube Music';
  if (first === 'watch') { web = `https://music.youtube.com/watch?v=${id}`; eyebrow = 'Song shared with you'; h1 = 'Play this song'; lead = 'Someone sent you a track. Open it in MAX STUDIO to play it right away.'; kind = 'song'; icon = ICON.note; }
  if (first === 'playlist') { web = `https://music.youtube.com/playlist?list=${id}`; eyebrow = 'Playlist shared with you'; h1 = 'Play this playlist'; lead = 'A whole playlist is waiting. Open it in MAX STUDIO to start listening.'; kind = 'playlist'; icon = ICON.list; }
  if (first === 'channel') { web = `https://music.youtube.com/channel/${id}`; eyebrow = 'Artist shared with you'; h1 = 'Meet this artist'; lead = 'Open this artist in MAX STUDIO to see songs, albums and more.'; kind = 'artist'; icon = ICON.mic; }
  if (first === 'listen') { eyebrow = 'Join the room'; h1 = 'Listen together'; lead = 'Open this link on a device with MAX STUDIO to sync playback with friends in real time.'; kind = 'room'; icon = ICON.note; }

  const intent = `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=https;package=${appPackage};S.browser_fallback_url=${encodeURIComponent(apkUrl)};end`;
  const open = first === 'listen' && code ? `maxstudio://listen?code=${encodeURIComponent(code)}` : intent;

  const codeCard = first === 'listen' && code ? `
  <section class="glass pad d2">
    <p class="label">Room code</p>
    <div class="row">
      <div class="code" aria-label="Room code ${esc(code)}">${[...code].map((c, i) => `<span style="animation-delay:${0.25 + i * 0.05}s">${esc(c)}</span>`).join('')}</div>
      <button class="btn glassy sm" type="button" data-copy="${esc(code)}">
        ${ICON.copy.replace('<svg ', '<svg class="i-copy" style="display:block" ')}${ICON.check.replace('<svg ', '<svg class="i-check" style="display:none" ')}<span>Copy</span>
      </button>
    </div>
  </section>` : '';

  const openCard = `
  <section class="glass pad d3">
    <div class="ico">${icon}</div>
    <h2>Open in MAX STUDIO</h2>
    <p class="sub">Set MAX STUDIO as the default for <b>${esc(url.host)}</b> so ${esc(kind === 'room' ? 'Listen' : 'shared')} links open straight in the app.</p>
    <ol class="steps">
      <li><span>Tap <b>Open in MAX STUDIO</b> below${kind === 'room' ? ' (or any Listen link)' : ''}.</span></li>
      <li><span>Choose <b>MAX STUDIO</b><span class="arr">→</span><b>Always</b>.</span></li>
      <li><span>Or: <b>Settings</b><span class="arr">→</span><b>Apps</b><span class="arr">→</span><b>MAX STUDIO</b><span class="arr">→</span><b>Open by default</b><span class="arr">→</span>enable for this domain.</span></li>
    </ol>
    <div class="stack">
      <a class="btn primary block" href="${esc(open)}">${ICON.open}Open in MAX STUDIO</a>
      ${first !== 'listen' ? `<a class="btn glassy block" href="${esc(web)}">${ICON.yt}${esc(webLabel)}</a>` : ''}
      <a class="btn glassy block" href="${esc(apkUrl)}">${ICON.dl}Get the app</a>
    </div>
  </section>`;

  const body = `
  <header>
    <p class="eyebrow">${esc(eyebrow)}</p>
    <h1>${esc(h1)}</h1>
    <p class="lead">${esc(lead)}</p>
  </header>
  ${codeCard}
  ${openCard}
  <p class="foot">MAX STUDIO &middot; ${esc(url.host)}</p>`;

  return html(page(`${h1} - MAX STUDIO`, body, { desc: lead }));
}

export function renderLanding(url, st, { apkUrl }) {
  const tags = ['Listen Together', 'Live chat', 'Reactions', 'Replies', '@Mentions', 'Seen by', 'Unsend', 'Photos', 'View once', 'Avatars'];
  const body = `
  <header>
    <p class="eyebrow">Server status</p>
    <h1>MAX STUDIO</h1>
    <p class="lead">Backend for Listen Together, invites and share links.</p>
  </header>
  <section class="glass pad d2">
    <span class="live"><i></i>All systems operational</span>
    <div class="stats" id="stats">
      <div class="stat"><b data-k="rooms">${esc(st.rooms)}</b><small>Rooms</small></div>
      <div class="stat"><b data-k="online">${esc(st.online)}</b><small>Online</small></div>
      <div class="stat"><b data-k="users">${esc(st.users)}</b><small>Users</small></div>
    </div>
    <div class="tags">${tags.map((t) => `<span>${esc(t)}</span>`).join('')}</div>
  </section>
  <section class="glass pad d3">
    <p class="label">WebSocket endpoint</p>
    <div class="endpoint">wss://${esc(url.host)}/ws</div>
    <div class="stack"><a class="btn primary block" href="${esc(apkUrl)}">${ICON.dl}Get the app</a></div>
  </section>
  <p class="foot">Updates live &middot; <a href="/api/status" style="color:inherit">/api/status</a></p>`;
  return html(page('MAX STUDIO', body, { desc: 'Listen Together server for the MAX STUDIO app.' }));
}

export function renderNotFound() {
  const body = `
  <section class="glass pad d2 center" style="margin-top:12vh">
    <div class="ico">${ICON.search}</div>
    <h2>Page not found</h2>
    <p class="sub">This link doesn't lead anywhere.</p>
    <div class="stack"><a class="btn primary block" href="/">Back home</a></div>
  </section>`;
  return html(page('Not found - MAX STUDIO', body), 404);
}
