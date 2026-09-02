// KAI ONE — ACC OS X MY MAPS launcher v15
// Source-level renderer: decode the committed sprite base64 to one Blob URL, then crop it with real <img> elements.
// This avoids Android WebView background-image/data-URI rendering failures.
// Legacy deployment marker retained intentionally: KAI_ONE_MY_MAPS_V10_NATIVE_ANDROID_ASSET
(() => {
  "use strict";

  const REVISION = "KAI_ONE_MY_MAPS_V15_BLOB_IMG_SPRITE";
  const ROOT_ID = "acc-my-maps";
  const STYLE_ID = "acc-my-maps-v15-style";
  const SPRITE_CACHE_KEY = "acc_os_x_my_maps_sprite_b64_v15";
  const B64_URL = "./assets/app-icons/my-maps-icons-sprite.jpg.b64?rev=KAI_ONE_MY_MAPS_V15_BLOB_IMG_SPRITE";

  const MAPS = [
    {key:"bbya-social-hub",title:"BBYA Social Hub",placeId:"131894120482837",accent:"#d946ef",fallback:"BBYA",col:0,row:0},
    {key:"zona-perang",title:"Zona Perang",placeId:"85866320744490",accent:"#ef4444",fallback:"ZP",col:1,row:0},
    {key:"after-school-city",title:"After School City",placeId:"121603385909425",accent:"#facc15",fallback:"ASC",col:2,row:0},
    {key:"becak-e-bike",title:"Becak E-bike",placeId:"80994730522893",accent:"#f59e0b",fallback:"BE",col:3,row:0},
    {key:"wonderpocket",title:"WONDERPOCKET",placeId:"124843214013484",accent:"#a78bfa",fallback:"WP",col:0,row:1},
    {key:"track-01",title:"Track 01",placeId:"79748872921213",accent:"#dc2626",fallback:"T01",col:1,row:1},
    {key:"gunung-bbya",title:"Gunung BBYA",placeId:"82661754996018",accent:"#22c55e",fallback:"GB",col:2,row:1},
    {key:"lost-found-night-shift",title:"Lost & Found: Night Shift",placeId:"93699016600671",accent:"#f97316",fallback:"LF",col:3,row:1}
  ];

  let spritePromise = null;
  let spriteBlobUrl = "";

  function normalizeB64(raw){
    const clean = String(raw || "").replace(/[^A-Za-z0-9+/=]/g, "");
    return clean.length > 10000 && clean.startsWith("/9j/") ? clean : "";
  }

  function readCachedB64(){
    try { return normalizeB64(localStorage.getItem(SPRITE_CACHE_KEY) || ""); }
    catch { return ""; }
  }

  function persistB64(clean){
    if(!clean) return;
    try { localStorage.setItem(SPRITE_CACHE_KEY, clean); } catch {}
  }

  function b64ToBlobUrl(clean){
    if(spriteBlobUrl) return spriteBlobUrl;
    try {
      const binary = atob(clean);
      const bytes = new Uint8Array(binary.length);
      for(let i=0;i<binary.length;i++) bytes[i] = binary.charCodeAt(i);
      spriteBlobUrl = URL.createObjectURL(new Blob([bytes], {type:"image/jpeg"}));
      return spriteBlobUrl;
    } catch {
      return "";
    }
  }

  function validateImage(url){
    return new Promise(resolve => {
      if(!url){ resolve(false); return; }
      const probe = new Image();
      probe.onload = () => resolve(Boolean(probe.naturalWidth && probe.naturalHeight));
      probe.onerror = () => resolve(false);
      probe.src = url;
    });
  }

  function loadSprite(){
    if(spritePromise) return spritePromise;
    spritePromise = (async () => {
      let clean = readCachedB64();
      if(!clean){
        try {
          const response = await fetch(B64_URL, {cache:"reload", credentials:"same-origin"});
          if(!response.ok) throw new Error(`sprite ${response.status}`);
          clean = normalizeB64(await response.text());
          if(clean) persistB64(clean);
        } catch {
          clean = "";
        }
      }
      if(!clean) return "";
      const url = b64ToBlobUrl(clean);
      return await validateImage(url) ? url : "";
    })().finally(() => { spritePromise = null; });
    return spritePromise;
  }

  function ensureStyle(){
    let style = document.getElementById(STYLE_ID);
    if(!style){ style = document.createElement("style"); style.id = STYLE_ID; document.head.appendChild(style); }
    style.textContent = `
      #${ROOT_ID}{margin:18px 0 8px;padding:12px 4px 10px;border:0;background:transparent;box-shadow:none}
      #${ROOT_ID} .acc-map-head{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;padding:0 4px 13px}
      #${ROOT_ID} .acc-map-head .card-title{font-size:1rem;letter-spacing:.05em}
      #${ROOT_ID} .acc-map-grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:16px 7px!important;align-items:start}
      #${ROOT_ID} .acc-map-card{appearance:none!important;border:0!important;background:transparent!important;color:var(--text,#f8fafc)!important;padding:3px 1px 6px!important;min-width:0!important;text-align:center!important;border-radius:16px!important;touch-action:manipulation!important;-webkit-tap-highlight-color:transparent!important}
      #${ROOT_ID} .acc-map-card:active{transform:scale(.94);background:color-mix(in srgb,var(--map-accent) 7%,transparent)!important}
      #${ROOT_ID} .acc-map-icon{width:min(16.5vw,68px)!important;height:min(16.5vw,68px)!important;min-width:55px!important;min-height:55px!important;margin:0 auto!important;display:grid!important;place-items:center!important;overflow:hidden!important;border-radius:20px!important;border:1px solid color-mix(in srgb,var(--map-accent) 38%,#25324a)!important;background:linear-gradient(145deg,color-mix(in srgb,var(--map-accent) 18%,#071023),#050b16)!important;box-shadow:0 9px 22px rgba(0,0,0,.28)!important;position:relative!important}
      #${ROOT_ID} .acc-map-fallback-v15{position:absolute;inset:0;display:grid;place-items:center;color:var(--map-accent);font-size:.92rem;font-weight:950;letter-spacing:-.04em;z-index:0}
      #${ROOT_ID} .acc-map-logo-img-v15{position:absolute!important;z-index:2!important;width:400%!important;height:200%!important;max-width:none!important;object-fit:fill!important;display:block!important;opacity:0!important;pointer-events:none!important}
      #${ROOT_ID}[data-logo-mode="IMG_SPRITE_V15"] .acc-map-logo-img-v15{opacity:1!important}
      #${ROOT_ID}[data-logo-mode="IMG_SPRITE_V15"] .acc-map-fallback-v15{opacity:0!important}
      #${ROOT_ID} .acc-map-title{margin-top:8px!important;font-size:.67rem!important;font-weight:900!important;line-height:1.15!important;min-height:1.6em!important;overflow:hidden!important;text-overflow:ellipsis!important;display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important}
      #${ROOT_ID} .acc-map-status{margin-top:4px!important;color:var(--muted,#8390aa)!important;font-size:.5rem!important;font-weight:800!important;letter-spacing:.07em!important}
      @media(max-width:345px){#${ROOT_ID} .acc-map-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}}
      @media(min-width:700px){#${ROOT_ID} .acc-map-grid{grid-template-columns:repeat(6,minmax(0,1fr))!important;gap:18px 12px!important}#${ROOT_ID} .acc-map-icon{width:74px!important;height:74px!important}#${ROOT_ID} .acc-map-title{font-size:.75rem!important}}
    `;
  }

  const robloxUrl = map => `https://www.roblox.com/games/${encodeURIComponent(map.placeId)}`;

  function tile(map){
    const button = document.createElement("button");
    button.type = "button";
    button.className = "acc-map-card mono";
    button.dataset.ownerMap = map.key;
    button.style.setProperty("--map-accent", map.accent);
    button.setAttribute("aria-label", `Open ${map.title} on Roblox`);
    button.innerHTML = `
      <div class="acc-map-icon">
        <span class="acc-map-fallback-v15">${map.fallback}</span>
        <img class="acc-map-logo-img-v15" alt="" style="left:${-map.col*100}%;top:${-map.row*100}%">
      </div>
      <div class="acc-map-title">${map.title}</div>
      <div class="acc-map-status">ROBLOX</div>
    `;
    button.addEventListener("click", event => { event.preventDefault(); location.href = robloxUrl(map); });
    return button;
  }

  function applySprite(root, url){
    if(!root || !url) return false;
    const images = [...root.querySelectorAll(".acc-map-logo-img-v15")];
    if(!images.length) return false;
    images.forEach(img => { if(img.src !== url) img.src = url; });
    root.dataset.logoMode = "IMG_SPRITE_V15";
    return true;
  }

  function render(){
    ensureStyle();
    const apps = document.getElementById("acc-home-launchpad");
    if(!apps) return false;

    let root = document.getElementById(ROOT_ID);
    if(!root){ root = document.createElement("section"); root.id = ROOT_ID; root.className = "card"; apps.insertAdjacentElement("afterend", root); }

    if(root.dataset.mapsRevision !== REVISION){
      root.dataset.mapsRevision = REVISION;
      root.dataset.logoMode = "FALLBACK_V15";
      root.innerHTML = `<div class="acc-map-head"><div><div class="eyebrow">ACC ROBLOX COMMAND</div><h2 class="card-title" style="margin:3px 0 0">MY MAPS</h2></div><span class="badge">${MAPS.length} MAPS</span></div><div class="acc-map-grid"></div>`;
      const grid = root.querySelector(".acc-map-grid");
      MAPS.forEach(map => grid.appendChild(tile(map)));
    }

    loadSprite().then(url => {
      const current = document.getElementById(ROOT_ID);
      if(current?.dataset?.mapsRevision !== REVISION) return;
      if(url) applySprite(current, url);
      else current.dataset.logoMode = "FALLBACK_V15";
    });
    return true;
  }

  let queued = false;
  function schedule(){
    if(queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; render(); });
    setTimeout(render, 120);
    setTimeout(render, 520);
  }

  new MutationObserver(() => {
    const root = document.getElementById(ROOT_ID);
    if(!root || root.dataset.mapsRevision !== REVISION) schedule();
  }).observe(document.documentElement, {childList:true, subtree:true});

  window.addEventListener("pageshow", schedule);
  window.addEventListener("focus", schedule);
  document.addEventListener("visibilitychange", () => { if(!document.hidden) schedule(); });

  window.ACCMyMaps = {
    revision: REVISION,
    spriteSource: "BLOB_IMG_SPRITE_V15",
    maps: MAPS.map(({key,title,placeId}) => ({key,title,placeId})),
    render: schedule,
    reloadLogos: async () => {
      try { localStorage.removeItem(SPRITE_CACHE_KEY); } catch {}
      if(spriteBlobUrl){ try { URL.revokeObjectURL(spriteBlobUrl); } catch {} spriteBlobUrl = ""; }
      const root = document.getElementById(ROOT_ID);
      if(root) root.dataset.logoMode = "FALLBACK_V15";
      const url = await loadSprite();
      if(root && url) applySprite(root, url);
      return Boolean(url);
    }
  };

  schedule();
})();