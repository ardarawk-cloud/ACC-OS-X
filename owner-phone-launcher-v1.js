// KAI ONE — Owner Phone Launcher v2 / Build 10
// Finance, Social, Communication, Commercial, Health. Android shows installed apps only.
(() => {
  "use strict";
  if (window.__ACC_OWNER_PHONE_LAUNCHER_V1__) return;
  window.__ACC_OWNER_PHONE_LAUNCHER_V1__ = true;

  const REVISION = "KAI_ONE_OWNER_PHONE_LAUNCHER_V2_INSTALLED_ONLY_BUILD10";
  const ROOT_ID = "acc-owner-phone-sections";
  const STYLE_ID = "acc-owner-phone-sections-style";
  const STATE_KEY = "acc_owner_phone_sections_v1";

  const GROUPS = [
    { key:"finance", eyebrow:"ACC MONEY COMMAND", title:"MY FINANCE", accent:"#2dd4bf", apps:[
      ["myBCA","com.bca.mybca.omni.android","BCA","#2563eb"],
      ["blu","com.bcadigital.blu","blu","#22d3ee"],
      ["GoPay","com.gojek.gopay","GP","#22c1dc"],
      ["DANA","id.dana","D","#118eea"],
      ["ShopeePay","com.shopeepay.id","SP","#ee4d2d"],
      ["OVO","ovo.id","OVO","#7c3aed"],
      ["Honest","com.honestbank.android","H","#a855f7"],
      ["DOKU","com.dokuwallet.android","DK","#ef4444"],
      ["neobank","com.bnc.finance","neo","#facc15"],
      ["SeaBank","id.co.bankbkemobile.digitalbank","SB","#f97316"],
      ["Jago","com.jago.digitalBanking","JG","#f59e0b"],
      ["Allo Bank","com.alloapp.yump","AB","#f59e0b"],
      ["Treasury","com.treasury.apps","TR","#eab308"],
      ["Tokocrypto","com.binance.cloud.tokocrypto","TK","#14b8a6"],
      ["INDODAX","id.co.bitcoin","IX","#38bdf8"],
      ["Bibit","com.bibit.bibitid","BB","#16a34a"],
      ["MetaMask","io.metamask","MM","#f97316"],
      ["Superbank","id.co.bankfama.android","S","#84cc16"],
      ["PayPal","com.paypal.android.p2pmobile","P","#2563eb"]
    ]},
    { key:"social", eyebrow:"ACC SOCIAL COMMAND", title:"MY SOCIAL", accent:"#ec4899", apps:[
      ["Facebook","com.facebook.katana","f","#1877f2"],
      ["YouTube","com.google.android.youtube","YT","#ff0033"],
      ["YT Music","com.google.android.apps.youtube.music","YM","#ef4444"],
      ["YT Studio","com.google.android.apps.youtube.creator","YS","#ef4444"],
      ["Instagram","com.instagram.android","IG","#e1306c"],
      ["TikTok","com.zhiliaoapp.musically","TT","#25f4ee"],
      ["Threads","com.instagram.barcelona","@","#f8fafc"],
      ["X","com.twitter.android","X","#94a3b8"]
    ]},
    { key:"communication", eyebrow:"ACC COMMS COMMAND", title:"MY COMMUNICATION", accent:"#22c55e", apps:[
      ["WhatsApp","com.whatsapp","WA","#25d366"],
      ["WA Business","com.whatsapp.w4b","WB","#22c55e"],
      ["Telegram","org.telegram.messenger","TG","#229ed9"],
      ["Messenger","com.facebook.orca","MS","#0084ff"],
      ["bitchat","com.bitchat.droid","BIT","#f8fafc"],
      ["Discord","com.discord","DC","#5865f2"],
      ["Zoom","us.zoom.videomeetings","ZM","#2d8cff"]
    ]},
    { key:"commercial", eyebrow:"ACC DAILY COMMAND", title:"MY COMMERCIAL", accent:"#f59e0b", apps:[
      ["Gojek","com.gojek.app","GJ","#00aa13"],
      ["Grab","com.grabtaxi.passenger","GR","#00b14f"],
      ["Maxim","com.taxsee.taxsee","MX","#facc15"],
      ["Shopee","com.shopee.id","SH","#ee4d2d"],
      ["Shopee Seller","com.shopee.shopeeseller","SS","#f97316"],
      ["PLN Mobile","com.icon.pln123","PLN","#06b6d4"],
      ["MyPertamina","com.dafturn.mypertamina","MP","#2563eb"],
      ["Tokopedia","com.tokopedia.tkpd","TP","#16a34a"]
    ]},
    { key:"health", eyebrow:"ACC HEALTH COMMAND", title:"MY HEALTH", accent:"#fb7185", apps:[
      ["Mobile JKN","app.bpjs.mobile","JKN","#0ea5e9"],
      ["JMO","com.bpjstku","JMO","#22c55e"],
      ["Halodoc","com.linkdokter.halodoc.android","H","#f43f5e"]
    ]}
  ].map(group => ({...group, apps:group.apps.map(([name,pkg,fallback,accent])=>({name,pkg,fallback,accent}))}));

  function readState(){
    try { return JSON.parse(localStorage.getItem(STATE_KEY)||"{}"); } catch { return {}; }
  }
  function saveState(state){ try { localStorage.setItem(STATE_KEY,JSON.stringify(state)); } catch {} }
  const uiState = readState();

  function nativeBridge(){
    const bridge=window.ACCAndroid;
    return bridge && typeof bridge.isInstalled==="function" && typeof bridge.appIcon==="function" ? bridge : null;
  }

  function inspect(app){
    const bridge=nativeBridge();
    if(!bridge) return {installed:null,icon:""};
    try {
      const installed=Boolean(bridge.isInstalled(app.pkg));
      const icon=installed ? String(bridge.appIcon(app.pkg)||"") : "";
      return {installed,icon};
    } catch { return {installed:false,icon:""}; }
  }

  function visibleGroups(){
    const bridge=nativeBridge();
    if(!bridge) return GROUPS;
    return GROUPS
      .map(group => ({...group, apps:group.apps.filter(app=>inspect(app).installed===true)}))
      .filter(group => group.apps.length > 0);
  }

  function ensureStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const style=document.createElement("style");
    style.id=STYLE_ID;
    style.textContent=`
      #${ROOT_ID}{display:grid;gap:12px;margin:14px 0 8px}
      #${ROOT_ID} .acc-phone-group{margin:0;padding:0;overflow:hidden;background:linear-gradient(180deg,rgba(10,18,34,.98),rgba(5,11,24,.98));border:1px solid rgba(148,163,184,.16);border-radius:22px}
      #${ROOT_ID} summary{list-style:none;cursor:pointer;padding:15px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;-webkit-tap-highlight-color:transparent}
      #${ROOT_ID} summary::-webkit-details-marker{display:none}
      #${ROOT_ID} .acc-phone-headcopy{min-width:0}
      #${ROOT_ID} .acc-phone-title{font-size:1rem;font-weight:950;letter-spacing:.06em;margin-top:3px}
      #${ROOT_ID} .acc-phone-count{flex:0 0 auto;min-width:72px;text-align:center;padding:6px 10px;border:1px solid rgba(148,163,184,.28);border-radius:999px;color:#dbe5f5;font-size:.62rem;font-weight:900}
      #${ROOT_ID} .acc-phone-group[open] .acc-phone-count{border-color:color-mix(in srgb,var(--group-accent) 55%,#334155);color:var(--group-accent)}
      #${ROOT_ID} .acc-phone-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:17px 7px;padding:4px 10px 17px}
      #${ROOT_ID} .acc-phone-app{appearance:none;border:0;background:transparent;color:var(--text,#f8fafc);padding:2px 1px 5px;min-width:0;text-align:center;border-radius:15px;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
      #${ROOT_ID} .acc-phone-app:active{transform:scale(.94);background:rgba(255,255,255,.035)}
      #${ROOT_ID} .acc-phone-icon{width:min(16vw,66px);height:min(16vw,66px);min-width:54px;min-height:54px;margin:0 auto;position:relative;display:grid;place-items:center;overflow:hidden;border-radius:20px;border:1px solid color-mix(in srgb,var(--app-accent) 36%,#334155);background:linear-gradient(145deg,color-mix(in srgb,var(--app-accent) 17%,#0b1220),#050914);box-shadow:0 9px 20px rgba(0,0,0,.28)}
      #${ROOT_ID} .acc-phone-icon img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:none;z-index:2}
      #${ROOT_ID} .acc-phone-fallback{font-size:.82rem;font-weight:950;color:var(--app-accent);letter-spacing:-.04em;z-index:1}
      #${ROOT_ID} .acc-phone-name{margin-top:7px;font-size:.66rem;font-weight:900;line-height:1.12;min-height:1.55em;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
      #${ROOT_ID} .acc-phone-status{margin-top:4px;font-size:.48rem;font-weight:850;letter-spacing:.06em;color:#73829a}
      #${ROOT_ID} .acc-phone-app.ready .acc-phone-status{color:#5ee7ad}
      @media(max-width:345px){#${ROOT_ID} .acc-phone-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
      @media(min-width:700px){#${ROOT_ID} .acc-phone-grid{grid-template-columns:repeat(6,minmax(0,1fr));gap:18px 12px}#${ROOT_ID} .acc-phone-icon{width:72px;height:72px}}
    `;
    document.head.appendChild(style);
  }

  function appTile(app){
    const state=inspect(app);
    const button=document.createElement("button");
    button.type="button";
    button.className=`acc-phone-app mono ${state.installed===true?"ready":""}`;
    button.dataset.ownerPhonePackage=app.pkg;
    button.style.setProperty("--app-accent",app.accent);
    button.innerHTML=`<div class="acc-phone-icon"><span class="acc-phone-fallback">${app.fallback}</span><img alt=""></div><div class="acc-phone-name">${app.name}</div><div class="acc-phone-status">${state.installed===true?"INSTALLED":"APK"}</div>`;
    if(state.icon){
      const img=button.querySelector("img");
      img.onload=()=>{img.style.display="block";};
      img.onerror=()=>{img.style.display="none";};
      img.src=state.icon;
    }
    button.addEventListener("click",event=>{
      event.preventDefault();
      location.href=`accapp://launch?packages=${encodeURIComponent(app.pkg)}`;
    });
    return button;
  }

  function groupNode(group){
    const details=document.createElement("details");
    details.className="acc-phone-group";
    details.dataset.phoneGroup=group.key;
    details.style.setProperty("--group-accent",group.accent);
    if(uiState[group.key]===true) details.open=true;
    details.innerHTML=`<summary><div class="acc-phone-headcopy"><div class="eyebrow">${group.eyebrow}</div><div class="acc-phone-title">${group.title}</div></div><span class="acc-phone-count">${group.apps.length} APPS</span></summary><div class="acc-phone-grid"></div>`;
    const grid=details.querySelector(".acc-phone-grid");
    group.apps.forEach(app=>grid.appendChild(appTile(app)));
    details.addEventListener("toggle",()=>{uiState[group.key]=details.open;saveState(uiState);});
    return details;
  }

  function render(){
    ensureStyle();
    const apps=document.getElementById("acc-home-launchpad");
    if(!apps) return false;
    let root=document.getElementById(ROOT_ID);
    if(!root){
      root=document.createElement("section");
      root.id=ROOT_ID;
      root.className="mono";
    }
    const groups=visibleGroups();
    const signature=groups.map(group=>`${group.key}:${group.apps.map(app=>app.pkg).join(",")}`).join("|");
    if(root.dataset.revision!==REVISION || root.dataset.appSignature!==signature){
      root.dataset.revision=REVISION;
      root.dataset.appSignature=signature;
      root.replaceChildren(...groups.map(groupNode));
    }
    if(apps.nextElementSibling!==root) apps.insertAdjacentElement("afterend",root);
    return true;
  }

  let queued=false;
  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;render();});
    setTimeout(render,150);
    setTimeout(render,650);
  }
  new MutationObserver(()=>schedule()).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener("pageshow",schedule);
  window.addEventListener("focus",schedule);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)schedule();});
  window.ACCOwnerPhoneLauncher={revision:REVISION,groups:GROUPS.map(g=>({key:g.key,title:g.title,count:g.apps.length})),render:schedule};
  schedule();
})();
