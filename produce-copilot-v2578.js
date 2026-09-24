// ACC OS X — BUILD 257.8 PRODUCTION + PUBLISHING STABLE
// One client authority for single + batch K/P/C/N, durable poster media, and per-item publishing.
(() => {
  "use strict";
  if (window.__ACC_PRODUCE_COPILOT_V2578__) return;
  window.__ACC_PRODUCE_COPILOT_V2578__ = true;

  const REVISION = "BUILD257_8_PRODUCTION_PUBLISHING_STABLE";
  const MAIN_STATE_KEY = "acc_os_x_ecosystem_v214";
  const COPILOT_KEY = "acc_os_x_produce_copilot_v1";
  const AI_ACCESS_KEY = "acc_os_x_ai_access_v1";
  const PUBLISH_ENDPOINT_KEY = "acc_os_x_publish_endpoint_v1";
  const PUBLISH_ACCESS_KEY = "acc_os_x_publish_access_v1";
  const DEFAULT_PUBLISH_ENDPOINT = "https://acc-publish-connectorv2.ardarawk.workers.dev/api/acc-publish";
  const PANEL_ID = "acc-produce-copilot-panel";
  const STYLE_ID = "acc-produce-copilot-style-v2578";
  const MEDIA_DB_NAME = "acc-os-x-produce-media-v1";
  const MEDIA_DB_STORE = "poster-media";
  const FALLBACK_TARGETS = {
    "ch-tukang-tambang": {connector:"META_FACEBOOK",pageId:"101420769205689",pageName:"Tukang Tambang",source:"VERIFIED_BASELINE"}
  };

  const txt = v => typeof v === "string" ? v.trim() : "";
  const esc = v => String(v ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const now = () => new Date().toISOString();
  const id = prefix => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  let runtimeBusy=false;
  const mediaMemory=new Map();

  function readMain(){try{return JSON.parse(localStorage.getItem(MAIN_STATE_KEY)||"{}");}catch{return {};}}
  function emptyPackage(){return {
    generationId:"",material:"",caption:"",posterMediaKey:"",posterHeadline:"",posterSubhead:"",
    batchCount:1,batchLabels:[],batchPosters:[],batchCaptions:[],batchPublished:[],
    publishedPostId:"",publishedAt:"",publishState:"IDLE",lastPublishError:"",lastPublishErrorIndex:-1
  };}
  function normalizePackage(raw={}){
    const p={...emptyPackage(),...(raw&&typeof raw==="object"?raw:{})};
    p.batchCount=Math.max(1,Math.min(8,Number(p.batchCount)||1));
    p.batchLabels=Array.isArray(p.batchLabels)?p.batchLabels.map(txt).slice(0,p.batchCount):[];
    p.batchPosters=Array.isArray(p.batchPosters)?p.batchPosters.slice(0,8).map((x,i)=>({
      index:Number(x?.index)||i+1,label:txt(x?.label)||p.batchLabels[i]||`Item ${i+1}`,
      mediaKey:txt(x?.mediaKey),headline:txt(x?.headline),subhead:txt(x?.subhead),subjectAnchor:txt(x?.subjectAnchor)
    })):[];
    p.batchCaptions=Array.isArray(p.batchCaptions)?p.batchCaptions.slice(0,8).map((x,i)=>({
      index:Number(x?.index)||i+1,label:txt(x?.label)||p.batchLabels[i]||`Item ${i+1}`,caption:txt(x?.caption)
    })):[];
    p.batchPublished=Array.isArray(p.batchPublished)?p.batchPublished.slice(0,8).map(x=>{
      if(typeof x==="string") return x?{postId:x,publishedAt:""}:null;
      return x&&typeof x==="object"&&txt(x.postId)?{postId:txt(x.postId),publishedAt:txt(x.publishedAt)}:null;
    }):[];
    return p;
  }
  function readStore(){
    try{
      const s=JSON.parse(localStorage.getItem(COPILOT_KEY)||"{}");
      if(!s.channels||typeof s.channels!=="object")s.channels={};
      for(const row of Object.values(s.channels)){
        if(row&&typeof row==="object"){
          row.messages=Array.isArray(row.messages)?row.messages:[];
          row.package=normalizePackage(row.package);
        }
      }
      return s;
    }catch{return {channels:{}};}
  }
  let store=readStore();
  function sanitizedStore(){
    const clone=structuredClone(store);
    for(const row of Object.values(clone.channels||{})){
      row.package=normalizePackage(row.package);
      delete row.package.posterBase64; delete row.package.posterDataUrl;
      row.package.batchPosters=row.package.batchPosters.map(x=>{const y={...x};delete y.base64;delete y.image;delete y.dataUrl;return y;});
      row.messages=(Array.isArray(row.messages)?row.messages:[]).slice(-40).map(m=>{const y={...m};delete y.image;return y;});
    }
    return clone;
  }
  function saveStore(){try{localStorage.setItem(COPILOT_KEY,JSON.stringify(sanitizedStore()));}catch(error){console.warn("[PRODUCE STORE]",error);}}

  function lane(channelId){
    if(!store.channels[channelId])store.channels[channelId]={messages:[],package:emptyPackage(),updatedAt:now()};
    const row=store.channels[channelId];
    row.package=normalizePackage(row.package);
    row.messages=Array.isArray(row.messages)?row.messages:[];
    return row;
  }
  function addMessage(channelId,role,content,type="text",extra={}){
    const row=lane(channelId);
    row.messages.push({id:id("msg"),role,content:txt(content),type,at:now(),...extra});
    row.messages=row.messages.slice(-40);row.updatedAt=now();saveStore();
  }

  function openMediaDb(){
    return new Promise((resolve,reject)=>{
      if(!("indexedDB" in window)) return reject(new Error("INDEXEDDB_UNAVAILABLE"));
      const request=indexedDB.open(MEDIA_DB_NAME,1);
      request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(MEDIA_DB_STORE))db.createObjectStore(MEDIA_DB_STORE,{keyPath:"key"});};
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error||new Error("MEDIA_DB_OPEN_FAILED"));
    });
  }
  async function mediaPut(key,base64,mimeType="image/jpeg"){
    if(!key||!txt(base64))throw new Error("POSTER_MEDIA_EMPTY");
    mediaMemory.set(key,{base64,mimeType});
    try{
      const db=await openMediaDb();
      await new Promise((resolve,reject)=>{const tx=db.transaction(MEDIA_DB_STORE,"readwrite");tx.objectStore(MEDIA_DB_STORE).put({key,base64,mimeType,updatedAt:now()});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
      db.close();
    }catch(error){console.warn("[POSTER MEDIA PUT]",error);}
    return key;
  }
  async function mediaGet(key){
    if(!key)return null;
    if(mediaMemory.has(key))return mediaMemory.get(key);
    try{
      const db=await openMediaDb();
      const value=await new Promise((resolve,reject)=>{const tx=db.transaction(MEDIA_DB_STORE,"readonly"),req=tx.objectStore(MEDIA_DB_STORE).get(key);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);});
      db.close();
      if(value)mediaMemory.set(key,{base64:value.base64,mimeType:value.mimeType||"image/jpeg"});
      return value?{base64:value.base64,mimeType:value.mimeType||"image/jpeg"}:null;
    }catch{return null;}
  }
  async function mediaDelete(key){
    if(!key)return;mediaMemory.delete(key);
    try{const db=await openMediaDb();await new Promise((resolve,reject)=>{const tx=db.transaction(MEDIA_DB_STORE,"readwrite");tx.objectStore(MEDIA_DB_STORE).delete(key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();}catch{}
  }
  async function clearPackageMedia(pkg){
    const keys=[txt(pkg?.posterMediaKey),...(Array.isArray(pkg?.batchPosters)?pkg.batchPosters.map(x=>txt(x?.mediaKey)):[])].filter(Boolean);
    await Promise.all(keys.map(mediaDelete));
  }
  async function migrateLegacyMedia(channelId,row){
    const original=row.package||{},p=row.package=normalizePackage(original);let changed=false;
    const single=txt(original.posterBase64);
    if(single&&!p.posterMediaKey){p.posterMediaKey=`${channelId}:legacy:single`;await mediaPut(p.posterMediaKey,single);changed=true;}
    if(Array.isArray(original.batchPosters)){
      const migrated=[];
      for(let i=0;i<original.batchPosters.length;i++){
        const old=original.batchPosters[i]||{};let key=txt(old.mediaKey),b64=txt(old.base64);
        if(!key&&b64){key=`${channelId}:legacy:batch:${i+1}`;await mediaPut(key,b64);changed=true;}
        migrated.push({index:i+1,label:txt(old.label)||`Item ${i+1}`,mediaKey:key,headline:txt(old.headline),subhead:txt(old.subhead),subjectAnchor:txt(old.subjectAnchor)});
      }
      p.batchPosters=migrated;
    }
    for(const m of row.messages){
      if(m?.type==="poster"&&txt(m.image)&&!txt(m.mediaKey)){
        const raw=txt(m.image),comma=raw.indexOf(","),b64=comma>=0?raw.slice(comma+1):raw,key=p.posterMediaKey||`${channelId}:legacy:message:${m.id}`;
        if(b64){await mediaPut(key,b64);m.mediaKey=key;delete m.image;changed=true;}
      }
    }
    delete p.posterBase64;delete p.posterDataUrl;if(changed)saveStore();
  }

  function parseMeta(){
    const meta=txt(document.querySelector(".mission-live-card .meta")?.textContent);
    const [code,platform]=meta.split("•").map(x=>txt(x));
    return {code,platform};
  }
  function currentProfile(){
    const main=readMain();
    const channelId=txt(main.activeChannelId)||txt(document.getElementById("channel-select")?.value);
    let option=null;
    try{option=document.querySelector(`#channel-select option[value="${CSS.escape(channelId)}"]`);}catch{}
    const name=txt(option?.textContent)||txt(document.querySelector(".mission-live-card .card-title")?.textContent)||channelId;
    const meta=parseMeta();
    const contexts=(Array.isArray(main?.ai?.contexts?.[channelId])?main.ai.contexts[channelId]:[])
      .filter(x=>x?.active!==false).slice(0,12)
      .map(x=>({type:x?.type||"",title:x?.title||"",version:x?.version||"",content:txt(x?.content).slice(0,2600),active:x?.active!==false}));
    const assets=Array.isArray(main.assets)?main.assets:[];
    const research=assets.find(a=>a?.channelId===channelId&&String(a?.stage||"").toUpperCase()==="RESEARCH"&&txt(a?.output));
    return {id:channelId,code:meta.code||"",name,platform:meta.platform||"Facebook",workspaceId:txt(main.activeWorkspaceId),contexts,research:txt(research?.output).slice(0,12000)};
  }
  function lane(channelId){
    if(!store.channels[channelId])store.channels[channelId]={messages:[],package:{material:"",caption:"",posterBase64:"",posterDataUrl:"",posterHeadline:"",posterSubhead:"",publishedPostId:"",publishedAt:""},updatedAt:now()};
    const row=store.channels[channelId];
    row.package=row.package||{material:"",caption:"",posterBase64:"",posterDataUrl:"",posterHeadline:"",posterSubhead:"",publishedPostId:"",publishedAt:""};
    row.messages=Array.isArray(row.messages)?row.messages:[];
    return row;
  }
  function addMessage(channelId,role,content,type="text",extra={}){
    const row=lane(channelId);
    row.messages.push({id:id("msg"),role,content:txt(content),type,at:now(),...extra});
    row.messages=row.messages.slice(-40);row.updatedAt=now();saveStore();
  }

  function ensureStyle(){
    if(document.getElementById(STYLE_ID))return;
    document.getElementById("acc-produce-copilot-style")?.remove();document.getElementById("acc-produce-copilot-style-v2577")?.remove();
    const style=document.createElement("style");style.id=STYLE_ID;style.textContent=`
      .acc-copilot-section{margin-bottom:14px;overflow:visible!important;contain:none!important;overflow-anchor:none!important}
      .acc-copilot-card{padding:14px!important;background:linear-gradient(180deg,rgba(8,12,23,.99),rgba(7,13,24,.99))!important;border:1px solid rgba(71,235,181,.28)!important;box-shadow:0 0 30px rgba(30,180,130,.08)!important;overflow:visible!important;contain:none!important}
      .acc-copilot-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap}.acc-copilot-channel{font-size:1.12rem;font-weight:900;margin-top:4px}
      .acc-copilot-badges{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.acc-copilot-badge{font-size:10px;font-weight:900;letter-spacing:.06em;padding:5px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.035);color:var(--muted,#9ca3af)}.acc-copilot-badge.ok{color:#69efb3;border-color:rgba(105,239,179,.25);background:rgba(31,110,82,.13)}
      .acc-copilot-chat{margin-top:12px;max-height:none!important;height:auto!important;overflow:visible!important;padding:10px;border:1px solid rgba(255,255,255,.07);border-radius:14px;background:#030712;scroll-behavior:auto!important;overscroll-behavior:auto!important;touch-action:pan-y!important;overflow-anchor:none!important}
      .acc-copilot-empty{padding:20px 12px;text-align:center;color:var(--muted,#8390aa);font-size:12px;line-height:1.55}.acc-copilot-msg{display:flex;margin:8px 0;overflow-anchor:none}.acc-copilot-msg.user{justify-content:flex-end}
      .acc-copilot-bubble{max-width:91%;padding:10px 12px;border-radius:14px;font-size:12px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere}.acc-copilot-msg.kai .acc-copilot-bubble{background:rgba(104,67,190,.15);border:1px solid rgba(173,124,255,.18);color:var(--text,#f8fafc);border-bottom-left-radius:5px}.acc-copilot-msg.user .acc-copilot-bubble{background:rgba(23,135,103,.20);border:1px solid rgba(70,235,181,.23);color:#eafff8;border-bottom-right-radius:5px}
      .acc-copilot-label{display:block;font-size:9px;font-weight:900;letter-spacing:.12em;color:#8b9bb4;margin-bottom:4px}.acc-copilot-poster{width:min(100%,360px);display:block;border-radius:13px;border:1px solid rgba(255,255,255,.12);margin-top:8px;cursor:zoom-in;background:#050914}
      .acc-copilot-tools{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:10px}.acc-copilot-quick{min-height:42px;border-radius:11px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.035);color:#f4f7fb;font-weight:900;font-size:12px}.acc-copilot-quick:active{transform:scale(.98)}
      .acc-copilot-compose{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:9px}.acc-copilot-input{width:100%;min-width:0;border-radius:12px;border:1px solid rgba(255,255,255,.11);background:#070c18;color:#fff;padding:11px 12px;font:inherit;outline:none}.acc-copilot-input:focus{border-color:rgba(105,239,179,.55);box-shadow:0 0 0 2px rgba(105,239,179,.08)}.acc-copilot-send{min-width:58px;border:0;border-radius:12px;background:#10a77c;color:white;font-weight:900}
      .acc-copilot-status{font-size:10px;color:#8b9bb4;margin-top:8px;min-height:16px}.acc-copilot-publish{width:100%;margin-top:10px;min-height:50px;border:1px solid rgba(105,239,179,.42);border-radius:13px;background:#0daa7b;color:#fff;font-weight:950;letter-spacing:.08em}.acc-copilot-publish:disabled{opacity:.35;filter:saturate(.4)}.acc-copilot-note{margin-top:8px;font-size:10px;color:#7f8ca3;line-height:1.45}
      .acc-copilot-modal{position:fixed;z-index:99999;inset:0;background:rgba(0,0,0,.92);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:14px}.acc-copilot-modal img{max-width:100%;max-height:88vh;object-fit:contain;border-radius:10px}.acc-copilot-modal button{margin-top:10px;border:1px solid rgba(255,255,255,.2);background:#111827;color:#fff;border-radius:10px;padding:10px 18px;font-weight:800}
      .acc-copilot-batch{display:grid;gap:9px;margin-top:10px}.acc-copilot-batch-item{border:1px solid rgba(255,255,255,.09);border-radius:12px;padding:10px;background:rgba(255,255,255,.025)}.acc-copilot-batch-head{display:flex;justify-content:space-between;gap:8px;align-items:center}.acc-copilot-batch-label{font-size:11px;font-weight:900}.acc-copilot-batch-state{font-size:9px;color:#8b9bb4}.acc-copilot-batch-actions{display:flex;gap:7px;margin-top:8px;flex-wrap:wrap}.acc-copilot-batch-actions button{min-height:34px;border-radius:9px;border:1px solid rgba(255,255,255,.12);background:#0b1323;color:#f8fafc;font:800 10px ui-monospace,monospace;padding:7px 9px}.acc-copilot-batch-actions button[data-ready="1"]{border-color:rgba(105,239,179,.35);color:#69efb3}.acc-copilot-batch-postid{margin-top:6px;font-size:9px;color:#69efb3;overflow-wrap:anywhere}
      @media(max-width:420px){.acc-copilot-card{padding:12px!important}.acc-copilot-chat{max-height:none!important;overflow:visible!important}.acc-copilot-tools{gap:5px}.acc-copilot-quick{font-size:11px}}
    `;document.head.appendChild(style);
  }
  function contractSpec(channelId){
    try{
      const c=window.ACCProductionContracts?.get?.(channelId),count=Math.max(1,Math.min(8,Number(c?.batch?.count)||1));
      const labels=Array.isArray(c?.batch?.series)?c.batch.series.map(txt).filter(Boolean).slice(0,count):[];
      return {count,labels:labels.length===count?labels:[]};
    }catch{return {count:1,labels:[]};}
  }
  function effectiveSpec(profile,row){
    const c=contractSpec(profile.id),pkg=row.package,count=Math.max(1,Number(pkg.batchCount)||1,c.count||1);
    const labels=Array.from({length:count},(_,i)=>txt(pkg.batchLabels?.[i])||txt(pkg.batchPosters?.[i]?.label)||txt(pkg.batchCaptions?.[i]?.label)||txt(c.labels?.[i])||`Item ${i+1}`);
    return {count,labels};
  }
  function itemReady(pkg,index){return Boolean(txt(pkg?.batchPosters?.[index]?.mediaKey)&&txt(pkg?.batchCaptions?.[index]?.caption)&&!txt(pkg?.batchPublished?.[index]?.postId));}
  function canPublishSingle(row){return Boolean(txt(row.package?.posterMediaKey)&&txt(row.package?.caption)&&!txt(row.package?.publishedPostId));}
  function contractPublishAllowed(channelId){try{const state=window.ACCProductionContracts?.state?.();return state?.channels?.[channelId]?.publishBlocked!==true;}catch{return true;}}

  function messageHtml(m){
    const label=m.role==="user"?"OWNER":"KAI";
    if(m.type==="poster")return `<div class="acc-copilot-msg kai" data-copilot-message-id="${esc(m.id)}"><div class="acc-copilot-bubble"><span class="acc-copilot-label">KAI // POSTER</span>${esc(m.content||"Poster siap.")}<img class="acc-copilot-poster" data-copilot-poster="${esc(m.id)}" data-media-key="${esc(m.mediaKey||"")}" alt="Poster ${esc(m.channelName||"")}" style="display:none"></div></div>`;
    return `<div class="acc-copilot-msg ${m.role==="user"?"user":"kai"}" data-copilot-message-id="${esc(m.id)}"><div class="acc-copilot-bubble"><span class="acc-copilot-label">${label}</span>${esc(m.content)}</div></div>`;
  }
  function batchHtml(profile,row){
    const spec=effectiveSpec(profile,row);if(spec.count<=1)return "";
    return spec.labels.map((label,i)=>{
      const poster=row.package.batchPosters?.[i],caption=row.package.batchCaptions?.[i],published=row.package.batchPublished?.[i],ready=itemReady(row.package,i);
      const state=published?.postId?"PUBLISHED":poster?.mediaKey&&caption?.caption?"READY":poster?.mediaKey?"P READY":caption?.caption?"C READY":"WAITING";
      return `<div class="acc-copilot-batch-item" data-batch-index="${i}">
        <div class="acc-copilot-batch-head"><div class="acc-copilot-batch-label">${i+1}. ${esc(label)}</div><div class="acc-copilot-batch-state">${state}</div></div>
        <div class="acc-copilot-batch-actions">
          ${poster?.mediaKey?`<button type="button" data-preview-media="${esc(poster.mediaKey)}">VIEW POSTER</button>`:""}
          ${caption?.caption?`<button type="button" data-view-caption="${i}">VIEW CAPTION</button>`:""}
          ${published?.postId?"":`<button type="button" data-publish-item="${i}" data-ready="${ready?"1":"0"}" ${ready?"":"disabled"}>PUBLISH ITEM</button>`}
        </div>
        ${published?.postId?`<div class="acc-copilot-batch-postid">POST ID: ${esc(published.postId)}</div>`:""}
      </div>`;
    }).join("");
  }
  function shellHtml(profile,row){
    const spec=effectiveSpec(profile,row),published=txt(row.package?.publishedPostId);
    return `<div class="card acc-copilot-card mono">
      <div class="acc-copilot-head"><div><div class="eyebrow">KAI PRODUCE COPILOT // PRODUCTION STABLE</div><div class="acc-copilot-channel" id="acc-copilot-channel-name">${esc(profile.name)}</div><div class="meta" id="acc-copilot-channel-meta">${esc(profile.code||profile.id)} • ${esc(profile.platform)}</div><div class="acc-copilot-badges"><span class="acc-copilot-badge ok">CHANNEL AUTO-READ</span><span class="acc-copilot-badge ${profile.contexts.length?"ok":""}" id="acc-copilot-context-count">${profile.contexts.length} MASTER CONTEXT</span><span class="acc-copilot-badge">${spec.count>1?`${spec.count} ITEM BATCH`:"K • P • C • N"}</span></div></div><span class="badge">MANUAL CONTROL</span></div>
      <div class="acc-copilot-chat" id="acc-copilot-chat"></div>
      <div class="acc-copilot-tools"><button class="acc-copilot-quick" data-copilot-command="K">K • KONTEN</button><button class="acc-copilot-quick" data-copilot-command="P">P • POSTER</button><button class="acc-copilot-quick" data-copilot-command="C">C • CAPTION</button><button class="acc-copilot-quick" data-copilot-command="N">N • NEXT</button></div>
      <form class="acc-copilot-compose" id="acc-copilot-form"><input class="acc-copilot-input" id="acc-copilot-input" autocomplete="off" placeholder="Ketik K, P, C, N atau chat seperti biasa…"><button class="acc-copilot-send" type="submit">SEND</button></form>
      <div class="acc-copilot-status" id="acc-copilot-status"></div>
      <div class="acc-copilot-batch" id="acc-copilot-batch">${batchHtml(profile,row)}</div>
      <button class="acc-copilot-publish" id="acc-copilot-publish">${spec.count>1?"PUBLISH PER ITEM":published?`PUBLISHED ✅ ${esc(published)}`:"⚡ PUBLISH APPROVED PACKAGE"}</button>
      <div class="acc-copilot-note">Single + batch memakai satu runtime. Poster disimpan di IndexedDB; publish batch dilakukan per item.</div></div>`;
  }
  function bindPoster(img){if(!img||img.dataset.bound==="1")return;img.dataset.bound="1";img.addEventListener("click",()=>openPoster(img.src));}
  async function hydratePosterImage(img,key){
    if(!img||!key||img.dataset.hydrated==="1")return;img.dataset.hydrated="1";
    const media=await mediaGet(key);if(!media?.base64)return;img.src=`data:${media.mimeType||"image/jpeg"};base64,${media.base64}`;img.style.display="block";bindPoster(img);
  }
  function syncMessages(row){
    const chat=document.getElementById("acc-copilot-chat");if(!chat)return;
    const validIds=new Set(row.messages.map(m=>m.id));
    chat.querySelectorAll("[data-copilot-message-id]").forEach(node=>{if(!validIds.has(node.dataset.copilotMessageId))node.remove();});
    if(!row.messages.length){if(!chat.querySelector(".acc-copilot-empty"))chat.innerHTML='<div class="acc-copilot-empty">Chat KAI membaca channel yang sedang dipilih.<br>K = konten • P = poster • C = caption • N = next.</div>';return;}
    chat.querySelector(".acc-copilot-empty")?.remove();
    for(const m of row.messages){
      let node=chat.querySelector(`[data-copilot-message-id="${CSS.escape(m.id)}"]`);
      if(!node){chat.insertAdjacentHTML("beforeend",messageHtml(m));node=chat.querySelector(`[data-copilot-message-id="${CSS.escape(m.id)}"]`);}
      if(m.type==="poster"&&m.mediaKey)hydratePosterImage(node?.querySelector("img[data-copilot-poster]"),m.mediaKey);
    }
  }
  function syncControls(profile,row){
    const spec=effectiveSpec(profile,row),publish=document.getElementById("acc-copilot-publish");
    document.querySelectorAll("#acc-produce-copilot-panel button,#acc-produce-copilot-panel input").forEach(el=>{if(runtimeBusy)el.disabled=true;else if(!el.matches("[data-publish-item]"))el.disabled=false;});
    if(publish){
      const published=txt(row.package?.publishedPostId);
      publish.textContent=spec.count>1?"PUBLISH PER ITEM":published?`PUBLISHED ✅ ${published}`:"⚡ PUBLISH APPROVED PACKAGE";
      publish.disabled=runtimeBusy||spec.count>1||!canPublishSingle(row)||!contractPublishAllowed(profile.id);
    }
    document.querySelectorAll("[data-publish-item]").forEach(btn=>{const i=Number(btn.dataset.publishItem);btn.disabled=runtimeBusy||!itemReady(row.package,i)||!contractPublishAllowed(profile.id);});
  }
  function syncMeta(profile,row){
    const name=document.getElementById("acc-copilot-channel-name"),meta=document.getElementById("acc-copilot-channel-meta"),count=document.getElementById("acc-copilot-context-count"),batch=document.getElementById("acc-copilot-batch");
    if(name)name.textContent=profile.name;if(meta)meta.textContent=`${profile.code||profile.id} • ${profile.platform}`;if(count){count.textContent=`${profile.contexts.length} MASTER CONTEXT`;count.classList.toggle("ok",Boolean(profile.contexts.length));}
    if(batch)batch.innerHTML=batchHtml(profile,row);syncControls(profile,row);
  }
  function bindPanel(){
    const section=document.getElementById(PANEL_ID);if(!section||section.dataset.bound==="1")return;section.dataset.bound="1";
    section.querySelectorAll("[data-copilot-command]").forEach(btn=>btn.addEventListener("click",()=>execute(btn.dataset.copilotCommand)));
    section.querySelector("#acc-copilot-form")?.addEventListener("submit",e=>{e.preventDefault();const input=section.querySelector("#acc-copilot-input"),value=txt(input?.value);if(input)input.value="";execute(value);});
    section.querySelector("#acc-copilot-publish")?.addEventListener("click",publishApproved);
    section.addEventListener("click",async e=>{
      const pub=e.target.closest?.("[data-publish-item]");if(pub){e.preventDefault();await publishBatchItem(Number(pub.dataset.publishItem));return;}
      const preview=e.target.closest?.("[data-preview-media]");if(preview){e.preventDefault();const media=await mediaGet(preview.dataset.previewMedia);if(media?.base64)openPoster(`data:${media.mimeType};base64,${media.base64}`);return;}
      const cap=e.target.closest?.("[data-view-caption]");if(cap){const row=lane(currentProfile().id),item=row.package.batchCaptions?.[Number(cap.dataset.viewCaption)];if(item?.caption)alert(item.caption);}
    });
  }
  async function mount(){
    ensureStyle();const mission=document.querySelector(".mission-live-card");if(!mission)return;
    const missionSection=mission.closest("section.section")||mission.parentElement;if(!missionSection?.parentElement)return;
    const profile=currentProfile();if(!profile.id)return;const row=lane(profile.id);await migrateLegacyMedia(profile.id,row);
    let section=document.getElementById(PANEL_ID);
    if(!section){section=document.createElement("section");section.id=PANEL_ID;section.className="section mono acc-copilot-section";section.dataset.channelId=profile.id;section.innerHTML=shellHtml(profile,row);missionSection.parentElement.insertBefore(section,missionSection);bindPanel();syncMessages(row);syncControls(profile,row);return;}
    if(section.dataset.channelId!==profile.id){section.dataset.channelId=profile.id;section.dataset.bound="";section.innerHTML=shellHtml(profile,row);if(section.nextElementSibling!==missionSection)missionSection.parentElement.insertBefore(section,missionSection);bindPanel();syncMessages(row);syncControls(profile,row);return;}
    if(section.nextElementSibling!==missionSection)missionSection.parentElement.insertBefore(section,missionSection);
    syncMeta(profile,row);syncMessages(row);
  }
  function refresh(){mount();}
  function setStatus(value,error=false){const el=document.getElementById("acc-copilot-status");if(el){el.textContent=value||"";el.style.color=error?"#ff8095":"#8b9bb4";}}
  function setBusy(busy,label="KAI sedang bekerja…"){runtimeBusy=Boolean(busy);if(runtimeBusy)setStatus(label);const profile=currentProfile();if(profile.id)syncControls(profile,lane(profile.id));}
  function requestContext(profile,row,command){
    const spec=effectiveSpec(profile,row);return {
      workerTask:{id:id("copilot"),stage:"COPILOT",workerType:"KAI_PRODUCE_COPILOT",workerName:"KAI PRODUCE COPILOT",goal:"Owner production",source:"OWNER_CHAT",autoApply:false},
      profile:{id:profile.id,code:profile.code,name:profile.name,platform:profile.platform},contexts:profile.contexts,
      masterRuntime:{batchCount:spec.count,series:spec.labels,workflowAuthority:"CHANNEL_MASTER_LOCK",globalEngineRole:"EXECUTION_ONLY",brainId:`acc-brain:${profile.id}`},
      brainLock:{channelId:profile.id,brainId:`acc-brain:${profile.id}`,isolation:"HARD_1_TO_1",workflowAuthority:"CHANNEL_MASTER_LOCK"},
      copilot:{command,brainId:`acc-brain:${profile.id}`,packageChannelId:profile.id,research:profile.research,material:row.package?.material||"",caption:row.package?.caption||"",history:row.messages.slice(-8).filter(m=>m.type!=="poster").map(m=>({role:m.role==="user"?"user":"assistant",content:m.content}))},
      client:{revision:REVISION,language:"id-ID",timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||"Asia/Makassar"}
    };
  }
  async function callCopilot(profile,row,command){
    const body={messages:[{role:"user",content:command}],context:requestContext(profile,row,command)},access=localStorage.getItem(AI_ACCESS_KEY)||"",headers={"Content-Type":"application/json","Accept":"application/json"};if(access)headers["X-ACC-Access-Code"]=access;
    const response=await fetch("/api/acc-ai",{method:"POST",headers,body:JSON.stringify(body)}),data=await response.json().catch(()=>({}));
    if(!response.ok||!data.ok)throw new Error(data?.error||data?.errorDetail?.message||data?.detail?.message||`HTTP ${response.status}`);return data;
  }
  function loadImage(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error("POSTER_IMAGE_DECODE_FAILED"));img.src=src;});}
  function wrapLines(ctx,value,maxWidth,maxLines){const words=txt(value).split(/\s+/).filter(Boolean),lines=[];let line="";for(const word of words){const test=line?`${line} ${word}`:word;if(line&&ctx.measureText(test).width>maxWidth){lines.push(line);line=word;if(lines.length>=maxLines-1)break;}else line=test;}if(line&&lines.length<maxLines)lines.push(line);return lines;}
  async function composePoster(profile,data,index=0,count=1,label=""){
    if(!txt(data?.imageBase64))throw new Error("POSTER_IMAGE_EMPTY");const hero=`data:image/jpeg;base64,${data.imageBase64}`,img=await loadImage(hero),canvas=document.createElement("canvas");canvas.width=1080;canvas.height=1920;
    const ctx=canvas.getContext("2d",{alpha:false});ctx.fillStyle="#050914";ctx.fillRect(0,0,1080,1920);const targetH=1220,scale=Math.max(1080/img.width,targetH/img.height),w=img.width*scale,h=img.height*scale;ctx.drawImage(img,(1080-w)/2,(targetH-h)/2,w,h);
    let g=ctx.createLinearGradient(0,600,0,1500);g.addColorStop(0,"rgba(3,7,18,.02)");g.addColorStop(.48,"rgba(3,7,18,.60)");g.addColorStop(1,"rgba(3,7,18,.99)");ctx.fillStyle=g;ctx.fillRect(0,0,1080,1530);ctx.fillStyle="rgba(4,8,18,.96)";ctx.fillRect(0,1180,1080,740);
    ctx.fillStyle="#62efba";ctx.fillRect(54,70,8,132);ctx.fillStyle="#fff";ctx.font="900 46px Arial,sans-serif";ctx.fillText(profile.name.toUpperCase(),84,84);ctx.fillStyle="#9cb0c8";ctx.font="800 22px Arial,sans-serif";ctx.fillText(`${profile.code||profile.id} • ${profile.platform}`.toUpperCase(),86,146);
    const badge=txt(data.plan?.badge)||txt(label)||"ACC STUDIO";ctx.font="900 22px Arial,sans-serif";const bw=Math.min(460,ctx.measureText(badge).width+40);ctx.fillStyle="#62efba";ctx.fillRect(58,1080,bw,50);ctx.fillStyle="#04100d";ctx.fillText(badge.toUpperCase(),78,1093);if(count>1){ctx.fillStyle="#9cb0c8";ctx.font="800 18px Arial,sans-serif";ctx.fillText(`ITEM ${index+1}/${count}`,58,1160);}
    const headline=txt(data.plan?.headline)||txt(label)||profile.name;ctx.fillStyle="#fff";ctx.font="900 68px Arial,sans-serif";wrapLines(ctx,headline,950,4).forEach((line,i)=>ctx.fillText(line,58,1245+i*80));const sub=txt(data.plan?.subhead);if(sub){ctx.fillStyle="#b8c4d3";ctx.font="600 30px Arial,sans-serif";wrapLines(ctx,sub,950,3).forEach((line,i)=>ctx.fillText(line,58,1590+i*42));}
    ctx.fillStyle="#62efba";ctx.fillRect(58,1810,250,4);ctx.fillStyle="#8ea0b8";ctx.font="800 19px Arial,sans-serif";ctx.fillText("ACC OS X • KAI PRODUCE COPILOT",58,1840);ctx.fillStyle="#fff";ctx.font="800 18px Arial,sans-serif";ctx.textAlign="right";ctx.fillText("AM STUDIO",1022,1840);ctx.textAlign="left";return canvas.toDataURL("image/jpeg",.88).split(",")[1]||"";
  }
  async function resetForMaterial(row,data){
    await clearPackageMedia(row.package);const count=Math.max(1,Math.min(8,Number(data?.masterRuntime?.batchCount)||1)),labels=Array.isArray(data?.masterRuntime?.series)?data.masterRuntime.series.map(txt).filter(Boolean).slice(0,count):[];
    row.package=emptyPackage();row.package.generationId=id("pkg");row.package.material=txt(data.reply);row.package.batchCount=count;row.package.batchLabels=labels.length===count?labels:Array.from({length:count},(_,i)=>`Item ${i+1}`);
  }
  async function storeSinglePoster(profile,row,data){
    await clearPackageMedia(row.package);const generation=row.package.generationId||id("pkg"),key=`${profile.id}:${generation}:single`,base64=await composePoster(profile,data);await mediaPut(key,base64);
    row.package.posterMediaKey=key;row.package.posterHeadline=txt(data.plan?.headline);row.package.posterSubhead=txt(data.plan?.subhead);row.package.batchCount=1;row.package.batchLabels=[];row.package.batchPosters=[];row.package.batchCaptions=[];row.package.batchPublished=[];row.package.publishedPostId="";row.package.publishedAt="";row.package.publishState="READY";row.package.lastPublishError="";addMessage(profile.id,"kai",data.reply||"Poster siap.","poster",{mediaKey:key,channelName:profile.name});
  }
  async function storePosterBatch(profile,row,data){
    const posters=Array.isArray(data.posters)?data.posters:[];if(!posters.length)throw new Error("BATCH_POSTER_EMPTY");await clearPackageMedia(row.package);const generation=row.package.generationId||id("pkg"),built=[];
    for(let i=0;i<posters.length;i++){const p=posters[i],label=txt(p.label)||txt(data?.masterRuntime?.series?.[i])||`Item ${i+1}`,key=`${profile.id}:${generation}:batch:${i+1}`,base64=await composePoster(profile,p,i,posters.length,label);await mediaPut(key,base64);built.push({index:i+1,label,mediaKey:key,headline:txt(p.plan?.headline),subhead:txt(p.plan?.subhead),subjectAnchor:txt(p.plan?.subjectAnchor)});}
    row.package.batchCount=built.length;row.package.batchLabels=built.map(x=>x.label);row.package.batchPosters=built;row.package.batchPublished=Array.from({length:built.length},()=>null);row.package.posterMediaKey="";row.package.publishedPostId="";row.package.publishedAt="";row.package.publishState="READY";row.package.lastPublishError="";addMessage(profile.id,"kai",`${built.length} POSTER BATCH SIAP ✅`);
  }
  async function execute(command){
    const profile=currentProfile();if(!profile.id)return;const row=lane(profile.id),clean=txt(command);if(!clean)return;addMessage(profile.id,"user",clean);refresh();
    const op=/^(k|konten|content)\b/i.test(clean)?"K":/^(p|poster)\b/i.test(clean)?"P":/^(c|caption)\b/i.test(clean)?"C":/^(n|next|lanjut)\b/i.test(clean)?"N":"CHAT";
    if((op==="P"||op==="C")&&!txt(row.package.material)){addMessage(profile.id,"kai","K belum ada. Buat/approve konten dulu dengan K.");refresh();return;}
    setBusy(true,op==="P"?"KAI sedang membuat poster…":op==="C"?"KAI sedang membuat caption…":"KAI sedang menyusun output…");
    try{
      const data=await callCopilot(profile,row,clean);
      if(data.kind==="material"){await resetForMaterial(row,data);addMessage(profile.id,"kai",data.reply);}
      else if(data.kind==="poster"){await storeSinglePoster(profile,row,data);}
      else if(data.kind==="poster_batch"){await storePosterBatch(profile,row,data);}
      else if(data.kind==="caption"){row.package.caption=txt(data.reply);row.package.batchCount=1;row.package.batchCaptions=[];row.package.publishedPostId="";row.package.publishedAt="";row.package.publishState="READY";row.package.lastPublishError="";addMessage(profile.id,"kai",data.reply);}
      else if(data.kind==="caption_batch"){
        const captions=Array.isArray(data.captions)?data.captions:[];if(!captions.length)throw new Error("BATCH_CAPTION_EMPTY");
        row.package.batchCount=captions.length;row.package.batchLabels=captions.map((x,i)=>txt(x.label)||row.package.batchLabels?.[i]||`Item ${i+1}`);row.package.batchCaptions=captions.map((x,i)=>({index:i+1,label:row.package.batchLabels[i],caption:txt(x.caption)}));row.package.batchPublished=Array.from({length:captions.length},(_,i)=>row.package.batchPublished?.[i]||null);row.package.caption="";row.package.publishState="READY";row.package.lastPublishError="";addMessage(profile.id,"kai",`${captions.length} CAPTION BATCH SIAP ✅`);
      }else addMessage(profile.id,"kai",data.reply||"Siap.");
      row.updatedAt=now();saveStore();window.dispatchEvent(new CustomEvent("acc-produce-package-updated",{detail:{channelId:profile.id,kind:data.kind,revision:REVISION}}));setStatus("");
    }catch(error){const message=String(error?.message||error);addMessage(profile.id,"kai",`ERROR // ${message}`);setStatus(`ERROR // ${message}`,true);}
    finally{setBusy(false);refresh();}
  }

  function publishTarget(main,channelId){return main?.settings?.publishMappings?.[channelId]||FALLBACK_TARGETS[channelId]||null;}
  function publishEndpoint(){const configured=txt(localStorage.getItem(PUBLISH_ENDPOINT_KEY));if(!configured)return DEFAULT_PUBLISH_ENDPOINT;return configured.replace("acc-publish-connector.ardarawk.workers.dev","acc-publish-connectorv2.ardarawk.workers.dev");}
  async function publishRequest(profile,target,message,mediaKey,idempotencyKey,sourceWorkflowId){
    const access=localStorage.getItem(PUBLISH_ACCESS_KEY)||localStorage.getItem(AI_ACCESS_KEY)||"";if(!access)throw new Error("Connector access belum tersimpan di perangkat.");const media=await mediaGet(mediaKey);if(!media?.base64)throw new Error("POSTER_MEDIA_MISSING");
    const platform=String(profile.platform||"Facebook").toUpperCase(),payload={id:id("copilot_publish"),sourceWorkflowId,sourceWorkflowRunKey:idempotencyKey,sourceTaskId:null,channelId:profile.id,channelName:profile.name,workspaceId:profile.workspaceId||readMain().activeWorkspaceId||"acc-enterprise",platform,status:"QUEUED",attempts:1,idempotencyKey,createdAt:now(),updatedAt:now(),connector:target.connector||"META_FACEBOOK",target,pageId:target.pageId||null,pageName:target.pageName||null,instagramAccountId:target.instagramAccountId||null,content:{message:txt(message),mediaUrl:null,imageBase64:media.base64,mimeType:media.mimeType||"image/jpeg"},clientRevision:REVISION,mediaSource:"PRODUCE_MEDIA_DB"};
    const response=await fetch(publishEndpoint(),{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json","X-ACC-Access-Code":access},body:JSON.stringify(payload)}),data=await response.json().catch(()=>({}));
    if(!response.ok||!data.ok){const e=data?.error||{};throw new Error(e.message||e.code||data.message||`HTTP ${response.status}`);}const postId=txt(data.externalPostId||data.postId||data.id||data.result?.id);if(!postId)throw new Error("PUBLISH_RESPONSE_MISSING_POST_ID");return{postId,publishedAt:now()};
  }
  async function publishApproved(){
    const profile=currentProfile(),row=lane(profile.id),spec=effectiveSpec(profile,row);if(spec.count>1)return setStatus("Batch dipublish per item.",true);const pkg=row.package;if(!canPublishSingle(row))return setStatus("Poster + caption harus siap dulu.",true);if(!contractPublishAllowed(profile.id))return setStatus("PUBLISH BLOCKED // SAFETY GUARD",true);
    const target=publishTarget(readMain(),profile.id);if(!target)return setStatus("Meta Page channel ini belum di-map di Publishing Hub.",true);setBusy(true,"Publishing approved package…");pkg.publishState="PUBLISHING";pkg.lastPublishError="";saveStore();
    try{const generation=pkg.generationId||"legacy",result=await publishRequest(profile,target,pkg.caption,pkg.posterMediaKey,`copilot:${profile.id}:${generation}:single`,`COPILOT:${profile.id}`);pkg.publishedPostId=result.postId;pkg.publishedAt=result.publishedAt;pkg.publishState="PUBLISHED";addMessage(profile.id,"kai",`PUBLISH SUCCESS ✅\n${profile.name}\nPOST ID: ${result.postId}`);saveStore();setStatus(`PUBLISHED ✅ ${result.postId}`);}
    catch(error){const message=String(error?.message||error);pkg.publishState="FAILED";pkg.lastPublishError=message;saveStore();addMessage(profile.id,"kai",`PUBLISH FAILED // ${message}`);setStatus(`PUBLISH FAILED // ${message}`,true);}
    finally{setBusy(false);refresh();}
  }
  async function publishBatchItem(index){
    const profile=currentProfile(),row=lane(profile.id),pkg=row.package,spec=effectiveSpec(profile,row);if(!(spec.count>1)||index<0||index>=spec.count)return;if(!itemReady(pkg,index))return setStatus(`Item ${index+1} belum punya poster + caption lengkap.`,true);if(!contractPublishAllowed(profile.id))return setStatus("PUBLISH BLOCKED // SAFETY GUARD",true);
    const target=publishTarget(readMain(),profile.id);if(!target)return setStatus("Meta Page channel ini belum di-map di Publishing Hub.",true);runtimeBusy=true;syncControls(profile,row);setStatus(`Publishing item ${index+1}/${spec.count}…`);
    try{const poster=pkg.batchPosters[index],caption=pkg.batchCaptions[index],generation=pkg.generationId||"legacy",result=await publishRequest(profile,target,caption.caption,poster.mediaKey,`copilot:${profile.id}:${generation}:item:${index+1}`,`COPILOT_BATCH:${profile.id}`);pkg.batchPublished[index]={postId:result.postId,publishedAt:result.publishedAt};pkg.publishState=pkg.batchPublished.filter(Boolean).length===spec.count?"PUBLISHED":"PARTIAL";pkg.lastPublishError="";addMessage(profile.id,"kai",`PUBLISH ITEM ${index+1} SUCCESS ✅\n${spec.labels[index]}\nPOST ID: ${result.postId}`);saveStore();setStatus(`ITEM ${index+1} PUBLISHED ✅ ${result.postId}`);}
    catch(error){const message=String(error?.message||error);pkg.publishState="PARTIAL";pkg.lastPublishError=message;pkg.lastPublishErrorIndex=index;saveStore();addMessage(profile.id,"kai",`PUBLISH ITEM ${index+1} FAILED // ${message}`);setStatus(`ITEM ${index+1} FAILED // ${message}`,true);}
    finally{runtimeBusy=false;refresh();}
  }
  function openPoster(src){if(!src)return;const modal=document.createElement("div");modal.className="acc-copilot-modal";modal.innerHTML=`<img src="${src}" alt="Poster preview"><button type="button">TUTUP</button>`;modal.addEventListener("click",e=>{if(e.target===modal||e.target.tagName==="BUTTON")modal.remove();});document.body.appendChild(modal);}
  function onCoreRendered(event){if(event?.detail?.tab&&event.detail.tab!=="production")return;refresh();}
  window.addEventListener("acc-core-rendered",onCoreRendered);
  window.addEventListener("storage",e=>{if(e.key===MAIN_STATE_KEY||e.key===COPILOT_KEY){store=readStore();refresh();}});
  window.addEventListener("acc-production-contract-updated",refresh);
  ensureStyle();refresh();
  window.ACCProduceCopilot=Object.freeze({revision:REVISION,refresh,publishMode:"SINGLE_OR_PER_ITEM",mediaStore:"INDEXEDDB"});
})();
