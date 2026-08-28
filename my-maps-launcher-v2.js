// KAI ONE — ACC OS X MY MAPS launcher v7
// Android WebView-safe sprite rendering: uses a real <img> element with inline data URL instead of CSS background-image.
(() => {
  "use strict";
  const REVISION="KAI_ONE_MY_MAPS_V7_IMG_DATA_SPRITE";
  const ROOT_ID="acc-my-maps";
  const STYLE_ID="acc-my-maps-v7-style";
  const SPRITE_DATA_SCRIPT="./my-maps-sprite-data-v1.js?rev=KAI_ONE_MY_MAPS_V7_IMG_DATA_SPRITE";
  const SPRITE_JPG_FALLBACK="./assets/app-icons/my-maps-icons-sprite.jpg?rev=KAI_ONE_MY_MAPS_V7_IMG_DATA_SPRITE";

  const MAPS=[
    {key:"bbya-social-hub",title:"BBYA Social Hub",placeId:"131894120482837",accent:"#d946ef",fallback:"BBYA",cx:0,cy:0},
    {key:"zona-perang",title:"Zona Perang",placeId:"85866320744490",accent:"#ef4444",fallback:"ZP",cx:1,cy:0},
    {key:"after-school-city",title:"After School City",placeId:"121603385909425",accent:"#facc15",fallback:"ASC",cx:2,cy:0},
    {key:"becak-e-bike",title:"Becak E-bike",placeId:"80994730522893",accent:"#f59e0b",fallback:"BE",cx:3,cy:0},
    {key:"wonderpocket",title:"WONDERPOCKET",placeId:"124843214013484",accent:"#a78bfa",fallback:"WP",cx:0,cy:1},
    {key:"track-01",title:"Track 01",placeId:"79748872921213",accent:"#dc2626",fallback:"T01",cx:1,cy:1},
    {key:"gunung-bbya",title:"Gunung BBYA",placeId:"82661754996018",accent:"#22c55e",fallback:"GB",cx:2,cy:1},
    {key:"lost-found-night-shift",title:"Lost & Found: Night Shift",placeId:"93699016600671",accent:"#f97316",fallback:"LF",cx:3,cy:1}
  ];

  let spriteReady=false;
  let spriteSource="";

  function ensureSpriteData(){
    if(spriteReady) return;
    if(window.ACCMyMapsSpriteDataUrl){
      spriteSource=window.ACCMyMapsSpriteDataUrl;
      spriteReady=true;
      schedule();
      return;
    }
    if(document.querySelector('script[data-acc-my-maps-sprite-data="v1"]')){
      setTimeout(()=>{
        if(window.ACCMyMapsSpriteDataUrl){
          spriteSource=window.ACCMyMapsSpriteDataUrl;
          spriteReady=true;
          schedule();
        }
      },120);
      return;
    }
    const script=document.createElement("script");
    script.src=SPRITE_DATA_SCRIPT;
    script.dataset.accMyMapsSpriteData="v1";
    script.async=false;
    script.onload=()=>{
      spriteSource=window.ACCMyMapsSpriteDataUrl || SPRITE_JPG_FALLBACK;
      spriteReady=true;
      schedule();
    };
    script.onerror=()=>{
      spriteSource=SPRITE_JPG_FALLBACK;
      spriteReady=true;
      schedule();
    };
    document.head.appendChild(script);
  }

  function ensureStyle(){
    let style=document.getElementById(STYLE_ID);
    if(!style){style=document.createElement("style");style.id=STYLE_ID;document.head.appendChild(style);}
    style.textContent=`
      #${ROOT_ID}{margin:18px 0 8px;padding:12px 4px 10px;border:0;background:transparent;box-shadow:none}
      #${ROOT_ID} .acc-map-head{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;padding:0 4px 13px}
      #${ROOT_ID} .acc-map-head .card-title{font-size:1rem;letter-spacing:.05em}
      #${ROOT_ID} .acc-map-grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:16px 7px!important;align-items:start}
      #${ROOT_ID} .acc-map-card{appearance:none!important;border:0!important;background:transparent!important;color:var(--text,#f8fafc)!important;padding:3px 1px 6px!important;min-width:0!important;text-align:center!important;border-radius:16px!important;touch-action:manipulation!important;-webkit-tap-highlight-color:transparent!important}
      #${ROOT_ID} .acc-map-card:active{transform:scale(.94)}
      #${ROOT_ID} .acc-map-icon{width:min(16.5vw,68px)!important;height:min(16.5vw,68px)!important;min-width:55px!important;min-height:55px!important;margin:0 auto!important;display:block!important;overflow:hidden!important;border-radius:20px!important;border:1px solid color-mix(in srgb,var(--map-accent) 38%,#25324a)!important;background:linear-gradient(145deg,color-mix(in srgb,var(--map-accent) 18%,#071023),#050b16)!important;box-shadow:0 9px 22px rgba(0,0,0,.28)!important;position:relative!important}
      #${ROOT_ID} .acc-map-fallback{position:absolute;inset:0;display:grid;place-items:center;color:var(--map-accent);font-size:.92rem;font-weight:950;letter-spacing:-.04em;z-index:0}
      #${ROOT_ID} .acc-map-sprite-img{position:absolute!important;z-index:2!important;max-width:none!important;width:400%!important;height:200%!important;object-fit:fill!important;display:block!important;pointer-events:none!important}
      #${ROOT_ID} .acc-map-title{margin-top:8px!important;font-size:.67rem!important;font-weight:900!important;line-height:1.15!important;min-height:1.6em!important;overflow:hidden!important;text-overflow:ellipsis!important;display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important}
      #${ROOT_ID} .acc-map-status{margin-top:4px!important;color:var(--muted,#8390aa)!important;font-size:.5rem!important;font-weight:800!important;letter-spacing:.07em!important}
      @media(max-width:345px){#${ROOT_ID} .acc-map-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}}
      @media(min-width:700px){#${ROOT_ID} .acc-map-grid{grid-template-columns:repeat(6,minmax(0,1fr))!important;gap:18px 12px!important}#${ROOT_ID} .acc-map-icon{width:74px!important;height:74px!important}#${ROOT_ID} .acc-map-title{font-size:.75rem!important}}
    `;
  }

  const robloxUrl=map=>`https://www.roblox.com/games/${encodeURIComponent(map.placeId)}`;

  function tile(map){
    const button=document.createElement("button");
    button.type="button";
    button.className="acc-map-card mono";
    button.dataset.ownerMap=map.key;
    button.style.setProperty("--map-accent",map.accent);
    button.setAttribute("aria-label",`Open ${map.title} on Roblox`);

    const icon=document.createElement("div");
    icon.className="acc-map-icon";
    const fallback=document.createElement("span");
    fallback.className="acc-map-fallback";
    fallback.textContent=map.fallback;
    icon.appendChild(fallback);

    const img=document.createElement("img");
    img.className="acc-map-sprite-img";
    img.alt="";
    img.decoding="sync";
    img.draggable=false;
    img.style.left=`-${map.cx*100}%`;
    img.style.top=`-${map.cy*100}%`;
    let triedFallback=false;
    img.onerror=()=>{
      if(!triedFallback && img.src!==SPRITE_JPG_FALLBACK){
        triedFallback=true;
        img.src=SPRITE_JPG_FALLBACK;
      }else{
        img.remove();
      }
    };
    img.src=spriteSource || SPRITE_JPG_FALLBACK;
    icon.appendChild(img);

    const title=document.createElement("div");
    title.className="acc-map-title";
    title.textContent=map.title;
    const status=document.createElement("div");
    status.className="acc-map-status";
    status.textContent="ROBLOX";
    button.append(icon,title,status);
    button.addEventListener("click",event=>{event.preventDefault();location.href=robloxUrl(map);});
    return button;
  }

  function render(){
    if(!spriteReady){ensureSpriteData();return false;}
    ensureStyle();
    const apps=document.getElementById("acc-home-launchpad");
    if(!apps) return false;
    let root=document.getElementById(ROOT_ID);
    if(!root){root=document.createElement("section");root.id=ROOT_ID;root.className="card";apps.insertAdjacentElement("afterend",root);}
    root.dataset.mapsRevision=REVISION;
    root.innerHTML=`<div class="acc-map-head"><div><div class="eyebrow">ACC ROBLOX COMMAND</div><h2 class="card-title" style="margin:3px 0 0">MY MAPS</h2></div><span class="badge">${MAPS.length} MAPS</span></div><div class="acc-map-grid"></div>`;
    const grid=root.querySelector(".acc-map-grid");
    MAPS.forEach(map=>grid.appendChild(tile(map)));
    return true;
  }

  let queued=false;
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;render();});}
  new MutationObserver(()=>{const root=document.getElementById(ROOT_ID);if(!root||root.dataset.mapsRevision!==REVISION)schedule();}).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener("pageshow",schedule);
  window.addEventListener("focus",schedule);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)schedule();});
  window.ACCMyMaps={revision:REVISION,maps:MAPS.map(({key,title,placeId})=>({key,title,placeId})),render:schedule};
  ensureSpriteData();
})();
