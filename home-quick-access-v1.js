// KAI ONE — ACC OS X HOME QUICK ACCESS v1
// HOME-only launcher history: recent + frequent apps, maps and ChatGPT projects.
// Keeps WORKSPACE / PROFILE / ROLE selectors available on non-HOME tabs.
(() => {
  "use strict";
  if (window.__ACC_HOME_QUICK_ACCESS_V1__) return;
  window.__ACC_HOME_QUICK_ACCESS_V1__ = true;

  const REVISION = "KAI_ONE_HOME_QUICK_ACCESS_V1";
  const STORE_KEY = "acc_os_x_home_quick_access_v1";
  const PANEL_ID = "acc-home-quick-access";
  const STYLE_ID = "acc-home-quick-access-style";
  const LIMIT = 4;

  const txt = value => String(value ?? "").trim();
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));

  function readHistory(){
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
      return Array.isArray(raw) ? raw.filter(item => item && item.key && item.type) : [];
    } catch { return []; }
  }

  function saveHistory(items){
    try { localStorage.setItem(STORE_KEY, JSON.stringify(items.slice(0,60))); } catch {}
  }

  function titleFrom(button,type){
    const selector = type === "APP" ? ".acc-launch-title" : type === "MAP" ? ".acc-map-title" : ".acc-project-title";
    return txt(button.querySelector(selector)?.textContent) || txt(button.getAttribute("aria-label")).replace(/^Open\s+/i,"") || button.dataset.ownerApp || button.dataset.ownerMap || button.dataset.ownerProject;
  }

  function accentFrom(button,type){
    const prop = type === "APP" ? "--launch-accent" : type === "MAP" ? "--map-accent" : "--project-accent";
    return txt(button.style.getPropertyValue(prop)) || "#a855f7";
  }

  function keyFrom(button,type){
    return type === "APP" ? txt(button.dataset.ownerApp) : type === "MAP" ? txt(button.dataset.ownerMap) : txt(button.dataset.ownerProject);
  }

  function record(button,type){
    const key = keyFrom(button,type);
    if(!key) return;
    const items = readHistory();
    const index = items.findIndex(item => item.type === type && item.key === key);
    const previous = index >= 0 ? items.splice(index,1)[0] : null;
    items.unshift({
      type,
      key,
      title:titleFrom(button,type),
      accent:accentFrom(button,type),
      count:Number(previous?.count || 0) + 1,
      lastUsed:Date.now()
    });
    saveHistory(items);
    schedule();
  }

  function ranked(){
    const now = Date.now();
    return readHistory().map(item => {
      const ageHours = Math.max(0,(now - Number(item.lastUsed || 0))/3600000);
      const recency = Math.max(0,30 - ageHours/3);
      const frequency = Math.min(40,Math.log2(Math.max(1,Number(item.count || 1))+1)*10);
      return {...item,_score:recency+frequency};
    }).sort((a,b) => b._score-a._score || Number(b.lastUsed||0)-Number(a.lastUsed||0)).slice(0,LIMIT);
  }

  function signatureFor(items){
    return items.map(item=>`${item.type}:${item.key}:${item.count}:${item.lastUsed}`).join("|") || "EMPTY";
  }

  function sourceButton(item){
    const nodes = item.type === "APP" ? document.querySelectorAll("[data-owner-app]") : item.type === "MAP" ? document.querySelectorAll("[data-owner-map]") : document.querySelectorAll("[data-owner-project]");
    return [...nodes].find(node => keyFrom(node,item.type) === item.key) || null;
  }

  function cloneVisual(item){
    const source = sourceButton(item);
    if(source){
      const selector = item.type === "APP" ? ".acc-launch-icon" : item.type === "MAP" ? ".acc-map-icon" : ".acc-project-icon";
      const visual = source.querySelector(selector)?.cloneNode(true);
      if(visual){
        visual.querySelectorAll("img").forEach(img => { img.loading="eager"; });
        return visual.outerHTML;
      }
    }
    const letters = txt(item.title).split(/\s+/).filter(Boolean).slice(0,2).map(word=>word[0]).join("").toUpperCase().slice(0,2) || item.type.slice(0,2);
    return `<div class="acc-quick-fallback">${esc(letters)}</div>`;
  }

  function ensureStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID}{margin-top:18px;padding:14px 0 2px;border-top:1px solid color-mix(in srgb,var(--accent,#a855f7) 18%,transparent)}
      #${PANEL_ID} .acc-quick-head{display:flex;align-items:end;justify-content:space-between;gap:10px;margin-bottom:11px}
      #${PANEL_ID} .acc-quick-title{font-size:.83rem;font-weight:950;letter-spacing:.08em}
      #${PANEL_ID} .acc-quick-sub{font-size:.52rem;color:var(--muted,#8390aa);letter-spacing:.08em;margin-top:3px}
      #${PANEL_ID} .acc-quick-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
      #${PANEL_ID} .acc-quick-item{appearance:none;border:0;background:transparent;color:var(--text,#f8fafc);padding:4px 1px 6px;min-width:0;text-align:center;border-radius:14px;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
      #${PANEL_ID} .acc-quick-item:active{transform:scale(.94);background:rgba(255,255,255,.035)}
      #${PANEL_ID} .acc-launch-icon,#${PANEL_ID} .acc-map-icon,#${PANEL_ID} .acc-project-icon,#${PANEL_ID} .acc-quick-fallback{width:min(14vw,58px)!important;height:min(14vw,58px)!important;min-width:48px!important;min-height:48px!important;margin:0 auto!important;border-radius:17px!important;display:grid!important;place-items:center!important;overflow:hidden!important;position:relative!important}
      #${PANEL_ID} .acc-quick-fallback{border:1px solid color-mix(in srgb,var(--quick-accent) 44%,#25324a);background:linear-gradient(145deg,color-mix(in srgb,var(--quick-accent) 20%,#071023),#050b16);color:var(--quick-accent);font-weight:950}
      #${PANEL_ID} .acc-project-icon{border:1px solid color-mix(in srgb,var(--quick-accent) 44%,#25324a)!important;background:linear-gradient(145deg,color-mix(in srgb,var(--quick-accent) 20%,#071023),#050b16)!important}
      #${PANEL_ID} .acc-project-glyph{width:62%;height:62%;position:relative;z-index:1;color:var(--quick-accent)}
      #${PANEL_ID} .acc-project-glyph svg{width:100%;height:100%;display:block;fill:none;stroke:currentColor;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
      #${PANEL_ID} .acc-project-glyph svg .fill{fill:currentColor;stroke:none}
      #${PANEL_ID} .acc-map-logo-v18,#${PANEL_ID} .acc-launch-icon img{width:100%!important;height:100%!important;object-fit:cover!important;display:block!important}
      #${PANEL_ID} .acc-quick-name{margin-top:6px;font-size:.58rem;font-weight:900;line-height:1.12;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      #${PANEL_ID} .acc-quick-kind{margin-top:3px;font-size:.45rem;color:var(--muted,#8390aa);font-weight:900;letter-spacing:.08em}
      #${PANEL_ID} .acc-quick-empty{grid-column:1/-1;padding:12px;border:1px dashed rgba(255,255,255,.11);border-radius:12px;color:var(--muted,#8390aa);font-size:.58rem;line-height:1.5;text-align:center}
      @media(min-width:700px){#${PANEL_ID} .acc-launch-icon,#${PANEL_ID} .acc-map-icon,#${PANEL_ID} .acc-project-icon,#${PANEL_ID} .acc-quick-fallback{width:62px!important;height:62px!important}}
    `;
    document.head.appendChild(style);
  }

  function itemHtml(item){
    return `<button type="button" class="acc-quick-item mono" data-quick-type="${esc(item.type)}" data-quick-key="${esc(item.key)}" style="--quick-accent:${esc(item.accent||"#a855f7")}">${cloneVisual(item)}<div class="acc-quick-name">${esc(item.title)}</div><div class="acc-quick-kind">${esc(item.type)}</div></button>`;
  }

  function buildPanel(items){
    const panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.dataset.revision = REVISION;
    panel.dataset.signature = signatureFor(items);
    panel.innerHTML = `<div class="acc-quick-head"><div><div class="acc-quick-title">QUICK ACCESS</div><div class="acc-quick-sub">RECENT + FREQUENT</div></div><span class="badge">${items.length}/${LIMIT}</span></div><div class="acc-quick-grid">${items.length?items.map(itemHtml).join(""):`<div class="acc-quick-empty">Belum ada history. Buka APP, MAP, atau PROJECT dari launcher di bawah — shortcut yang paling baru/sering dipakai akan muncul otomatis di sini.</div>`}</div>`;
    panel.addEventListener("click",event => {
      const button = event.target.closest?.("[data-quick-type][data-quick-key]");
      if(!button) return;
      const item = {type:txt(button.dataset.quickType),key:txt(button.dataset.quickKey)};
      const source = sourceButton(item);
      if(source) source.click();
    });
    return panel;
  }

  function isHome(){
    return Boolean(document.querySelector('.tab.active[data-value="enterprise"]'));
  }

  function patch(){
    ensureStyle();
    const home = isHome();
    const header = document.querySelector("header.header");
    const selects = header?.querySelector(".select-grid");
    const existing = document.getElementById(PANEL_ID);

    if(!home){
      if(selects) selects.style.display = "";
      existing?.remove();
      return;
    }

    if(selects) selects.style.display = "none";

    const hero = document.querySelector("main.main > .tabs + section.section .acc250-hero") || document.querySelector("main .section .acc250-hero");
    if(hero) hero.style.setProperty("display","none","important");

    if(!header) return;
    const items = ranked();
    const signature = signatureFor(items);
    if(existing?.dataset.signature === signature && existing.parentElement === header) return;

    const panel = buildPanel(items);
    if(existing?.parentElement === header){
      existing.replaceWith(panel);
    }else if(selects){
      selects.insertAdjacentElement("beforebegin",panel);
    }else{
      header.appendChild(panel);
    }
  }

  document.addEventListener("click",event => {
    const app = event.target.closest?.("[data-owner-app]");
    if(app){record(app,"APP");return;}
    const map = event.target.closest?.("[data-owner-map]");
    if(map){record(map,"MAP");return;}
    const project = event.target.closest?.("[data-owner-project]");
    if(project){record(project,"PROJECT");}
  },true);

  let queued = false;
  function schedule(){
    if(queued) return;
    queued = true;
    requestAnimationFrame(()=>{queued=false;patch();});
  }

  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener("pageshow",schedule);
  window.addEventListener("focus",schedule);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)schedule();});

  window.ACCQuickAccess = Object.freeze({revision:REVISION,clear:()=>{localStorage.removeItem(STORE_KEY);schedule();},render:schedule});
  schedule();
})();

// KAI ONE — CHANNEL INFO COMPACT v1
// CHANNEL stays fully functional, but no longer occupies a primary navigation slot.
// Access moves into PRODUCE as a compact CHANNEL INFO shortcut; CHANNEL view gets a back-to-PRODUCE control.
(() => {
  "use strict";
  if (window.__ACC_CHANNEL_INFO_COMPACT_V1__) return;
  window.__ACC_CHANNEL_INFO_COMPACT_V1__ = true;

  const REVISION = "KAI_ONE_CHANNEL_INFO_COMPACT_V1";
  const HELPER_ID = "acc-channel-info-helper";
  const STYLE_ID = "acc-channel-info-compact-style";
  const norm = value => String(value ?? "").replace(/\s+/g," ").trim().toUpperCase();

  function navContext(){
    const groups = [...document.querySelectorAll(".tabs")];
    for (const group of groups) {
      const buttons = [...group.querySelectorAll(".tab,button")];
      const home = buttons.find(button => /\bHOME\b/.test(norm(button.textContent)));
      const channel = buttons.find(button => /\bCHANNEL\b/.test(norm(button.textContent)));
      const produce = buttons.find(button => /\bPRODUCE\b/.test(norm(button.textContent)));
      if (home && channel && produce) return {group,home,channel,produce};
    }
    return null;
  }

  function ensureStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${HELPER_ID}{margin:12px 0 4px;display:flex;justify-content:flex-end}
      #${HELPER_ID} .acc-channel-info-btn{appearance:none;min-height:38px;padding:8px 12px;border:1px solid var(--line2,#40506a);border-radius:12px;background:var(--panel2,#071023);color:var(--text,#f8fafc);font:inherit;font-size:.72rem;font-weight:900;letter-spacing:.04em;touch-action:manipulation}
      #${HELPER_ID} .acc-channel-info-btn:active{transform:scale(.98)}
      @media(max-width:430px){#${HELPER_ID}{justify-content:stretch}#${HELPER_ID} .acc-channel-info-btn{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function contentSection(group){
    let node = group.nextElementSibling;
    while(node && !node.matches?.("section.section,.section")) node = node.nextElementSibling;
    return node || document.querySelector("main.main section.section") || document.querySelector("main .section");
  }

  function helper(section,mode,channelButton,produceButton){
    let box = document.getElementById(HELPER_ID);
    if(!box){
      box = document.createElement("div");
      box.id = HELPER_ID;
      box.dataset.revision = REVISION;
    }
    const label = mode === "CHANNEL" ? "← BACK TO PRODUCE" : "CHANNEL INFO";
    const action = mode === "CHANNEL" ? "produce" : "channel";
    if(box.dataset.mode !== mode){
      box.dataset.mode = mode;
      box.innerHTML = `<button type="button" class="acc-channel-info-btn" data-channel-info-action="${action}">${label}</button>`;
    }
    if(box.parentElement !== section) section.insertAdjacentElement("afterbegin",box);
    const button = box.querySelector("[data-channel-info-action]");
    if(button && !button.dataset.bound){
      button.dataset.bound = "1";
      button.addEventListener("click",()=>{
        if(button.dataset.channelInfoAction === "channel") channelButton.click();
        else produceButton.click();
        queuePatch();
      });
    }
  }

  function patchChannelNav(){
    ensureStyle();
    const ctx = navContext();
    const existing = document.getElementById(HELPER_ID);
    if(!ctx){ existing?.remove(); return; }

    ctx.channel.style.setProperty("display","none","important");
    ctx.channel.setAttribute("aria-hidden","true");
    ctx.channel.dataset.accCompactChannel = REVISION;

    const section = contentSection(ctx.group);
    if(!section){ existing?.remove(); return; }

    if(ctx.produce.classList.contains("active")){
      helper(section,"PRODUCE",ctx.channel,ctx.produce);
    }else if(ctx.channel.classList.contains("active")){
      helper(section,"CHANNEL",ctx.channel,ctx.produce);
    }else{
      existing?.remove();
    }
  }

  let queued = false;
  function queuePatch(){
    if(queued) return;
    queued = true;
    requestAnimationFrame(()=>{queued=false;patchChannelNav();});
  }

  new MutationObserver(queuePatch).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
  window.addEventListener("pageshow",queuePatch);
  window.addEventListener("focus",queuePatch);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)queuePatch();});
  document.addEventListener("click",event=>{if(event.target.closest?.(".tab"))setTimeout(queuePatch,0);},true);

  window.ACCChannelInfoCompact = Object.freeze({revision:REVISION,render:queuePatch});
  queuePatch();
})();
