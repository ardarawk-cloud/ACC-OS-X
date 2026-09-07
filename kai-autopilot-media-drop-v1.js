// ACC OS X — KAI AUTOPILOT MEDIA DROP v1
// Standalone global media inbox + channel router. Does not depend on the active channel selector.
// Reuses the existing per-channel KAI Produce Copilot by handing routed jobs into its channel lane.
(() => {
  "use strict";
  if (window.__ACC_KAI_AUTOPILOT_MEDIA_DROP_V1__) return;
  window.__ACC_KAI_AUTOPILOT_MEDIA_DROP_V1__ = true;

  const REVISION = "KAI_AUTOPILOT_MEDIA_DROP_V1";
  const PANEL_ID = "acc-kai-autopilot-panel";
  const STYLE_ID = "acc-kai-autopilot-style";
  const STORE_KEY = "acc_os_x_kai_autopilot_v1";
  const COPILOT_KEY = "acc_os_x_produce_copilot_v1";
  const AI_ACCESS_KEY = "acc_os_x_ai_access_v1";
  const DB_NAME = "acc_os_x_kai_autopilot_media_v1";
  const DB_VERSION = 1;
  const MEDIA_STORE = "media";
  const KV_STORE = "kv";

  const txt = value => typeof value === "string" ? value.trim() : "";
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const now = () => new Date().toISOString();
  const uid = prefix => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const bytes = value => {
    const n = Number(value || 0);
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n/1024).toFixed(1)} KB`;
    return `${(n/1024/1024).toFixed(1)} MB`;
  };

  function readStore(){
    try {
      const value = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
      return {
        jobs: Array.isArray(value.jobs) ? value.jobs : [],
        instruction: txt(value.instruction),
        updatedAt: value.updatedAt || now()
      };
    } catch { return {jobs:[],instruction:"",updatedAt:now()}; }
  }
  let state = readStore();
  function save(){
    state.jobs = state.jobs.slice(-120);
    state.updatedAt = now();
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {}
  }

  function openDb(){
    return new Promise((resolve,reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(MEDIA_STORE)) db.createObjectStore(MEDIA_STORE, {keyPath:"id"});
        if (!db.objectStoreNames.contains(KV_STORE)) db.createObjectStore(KV_STORE, {keyPath:"key"});
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("INDEXEDDB_OPEN_FAILED"));
    });
  }
  async function dbPut(storeName,value){
    const db = await openDb();
    return new Promise((resolve,reject) => {
      const tx = db.transaction(storeName,"readwrite");
      tx.objectStore(storeName).put(value);
      tx.oncomplete = () => { db.close(); resolve(true); };
      tx.onerror = () => { db.close(); reject(tx.error || new Error("INDEXEDDB_WRITE_FAILED")); };
    });
  }
  async function dbGet(storeName,key){
    const db = await openDb();
    return new Promise((resolve,reject) => {
      const tx = db.transaction(storeName,"readonly"), request = tx.objectStore(storeName).get(key);
      request.onsuccess = () => { const value=request.result; db.close(); resolve(value); };
      request.onerror = () => { db.close(); reject(request.error || new Error("INDEXEDDB_READ_FAILED")); };
    });
  }
  async function dbDelete(storeName,key){
    const db = await openDb();
    return new Promise((resolve,reject) => {
      const tx = db.transaction(storeName,"readwrite");
      tx.objectStore(storeName).delete(key);
      tx.oncomplete = () => { db.close(); resolve(true); };
      tx.onerror = () => { db.close(); reject(tx.error || new Error("INDEXEDDB_DELETE_FAILED")); };
    });
  }

  function channels(){
    const select = document.getElementById("channel-select");
    if (!select) return [];
    return [...select.options]
      .map(option => ({id:txt(option.value),name:txt(option.textContent)}))
      .filter(row => row.id && row.name && !/select|pilih/i.test(row.name));
  }

  async function probeFile(file){
    const base = {width:0,height:0,duration:0};
    const url = URL.createObjectURL(file);
    try {
      if ((file.type || "").startsWith("image/")) {
        const image = await new Promise((resolve,reject) => {
          const el = new Image();
          el.onload=()=>resolve(el); el.onerror=()=>reject(new Error("IMAGE_PROBE_FAILED")); el.src=url;
        });
        base.width=image.naturalWidth||0; base.height=image.naturalHeight||0;
      } else if ((file.type || "").startsWith("video/")) {
        const video = await new Promise((resolve,reject) => {
          const el=document.createElement("video");
          el.preload="metadata"; el.muted=true;
          el.onloadedmetadata=()=>resolve(el); el.onerror=()=>reject(new Error("VIDEO_PROBE_FAILED")); el.src=url;
        });
        base.width=video.videoWidth||0; base.height=video.videoHeight||0; base.duration=Number(video.duration||0);
      }
    } catch {} finally { URL.revokeObjectURL(url); }
    return base;
  }

  function fingerprint(file,path=""){
    return `${path||file.name}:${file.size}:${file.lastModified}`;
  }
  async function ingestFiles(files, source="DROP", paths=new Map()){
    const input = [...files].filter(file => /^image\//.test(file.type||"") || /^video\//.test(file.type||""));
    if (!input.length) return;
    setStatus(`Menyimpan ${input.length} media ke ACC Inbox…`);
    for (const file of input) {
      const path = paths.get(file) || file.webkitRelativePath || file.name;
      const fp = fingerprint(file,path);
      if (state.jobs.some(job => job.fingerprint === fp)) continue;
      const meta = await probeFile(file);
      const job = {
        id:uid("auto"), fileName:file.name, path, fingerprint:fp,
        mimeType:file.type||"application/octet-stream", size:file.size||0,
        width:meta.width||0, height:meta.height||0, duration:meta.duration||0,
        source, status:"INBOX", channelId:"", channelName:"", confidence:0, reason:"",
        handoffAt:"", createdAt:now(), updatedAt:now()
      };
      await dbPut(MEDIA_STORE,{id:job.id,file,path,storedAt:now()}).catch(()=>{});
      state.jobs.push(job);
    }
    save(); render(); setStatus(`${input.length} media diproses. Siap ROUTE.`);
  }

  function exactInstructionRoute(job,list,instruction){
    const hay = `${instruction} ${job.fileName} ${job.path}`.toLowerCase();
    const named = list.find(channel => {
      const clean = channel.name.replace(/^CH-\d+\s*[•-]?\s*/i,"").trim().toLowerCase();
      return clean.length > 3 && hay.includes(clean);
    });
    if (named) return {channelId:named.id,channelName:named.name,confidence:.99,reason:"Owner instruction / filename mentions channel directly."};
    return null;
  }

  const HEURISTICS = [
    {id:"ch-techverse", words:["tech","technology","ai ","artificial intelligence","gadget","iphone","android","smartphone","laptop","chip","robot"]},
    {id:"ch-balinightlife", words:["bali nightlife","bali club","party bali","savaya","atlas beach","night club bali","canggu party","seminyak club"]},
    {id:"ch-bali-wedding-dj", words:["wedding","bride","groom","ceremony","reception","wedding dj","villa wedding"]},
    {id:"ch-aku-cinta-malam", words:["nightlife indonesia","jakarta club","bandung club","surabaya club","event malam","party jakarta"]},
    {id:"ch-arda-gaming", words:["honor of kings","hok ","ranked","hero hok","gaming hok"]},
    {id:"ch-nadya-gaming", words:["club roblox","roblox lifestyle","gunung roblox","nadya gaming"]},
    {id:"ch-dunia-bintang", words:["roblox kids","kids roblox","anak roblox","dunia bintang"]},
    {id:"ch-motocamp", words:["motocamp","motor camping","camping motor","touring","tenda motor","camp ride"]}
  ];
  function fallbackRoute(job,list,instruction){
    const direct = exactInstructionRoute(job,list,instruction); if (direct) return direct;
    const hay = ` ${instruction} ${job.fileName} ${job.path} `.toLowerCase();
    let best=null;
    for (const rule of HEURISTICS) {
      let score=0;
      for (const word of rule.words) if (hay.includes(word)) score += word.length > 8 ? 3 : 1;
      if (!best || score > best.score) best={rule,score};
    }
    if (!best || best.score < 1) return {channelId:"",channelName:"",confidence:.25,reason:"Belum cukup konteks untuk menentukan channel."};
    const channel=list.find(row=>row.id===best.rule.id);
    if (!channel) return {channelId:"",channelName:"",confidence:.25,reason:"Channel kandidat tidak ditemukan di registry UI."};
    return {channelId:channel.id,channelName:channel.name,confidence:Math.min(.86,.62+best.score*.06),reason:"Fallback router matched media/instruction keywords."};
  }

  function extractJson(value){
    const raw=txt(value).replace(/^```(?:json)?/i,"").replace(/```$/i,"").trim();
    try{return JSON.parse(raw);}catch{}
    const start=raw.indexOf("{"),end=raw.lastIndexOf("}");
    if(start>=0&&end>start){try{return JSON.parse(raw.slice(start,end+1));}catch{}}
    return null;
  }
  async function kaiRoute(pending,list,instruction){
    const access=localStorage.getItem(AI_ACCESS_KEY)||"";
    const headers={"Content-Type":"application/json","Accept":"application/json"};
    if(access)headers["X-ACC-Access-Code"]=access;
    const fileRows=pending.map(job=>({id:job.id,name:job.fileName,path:job.path,mimeType:job.mimeType,size:job.size,width:job.width,height:job.height,duration:Math.round(job.duration||0)}));
    const channelRows=list.map(row=>({id:row.id,name:row.name}));
    const prompt=`You are KAI ONE, ACC OS X global media router. Route each media item to exactly one ACC channel only when reasonably confident. Do not use the currently selected UI channel. Use owner instruction, file name/path and media metadata. If uncertain, use an empty channelId and confidence below 0.60. Return JSON only in this exact shape: {"routes":[{"fileId":"...","channelId":"...","confidence":0.0,"reason":"short reason"}]}. Owner instruction: ${instruction||"(none)"}. Files: ${JSON.stringify(fileRows)}. Available channels: ${JSON.stringify(channelRows)}`;
    const body={messages:[{role:"user",content:prompt}],context:{workerTask:{id:uid("router"),stage:"ROUTING",workerType:"KAI_AUTOPILOT_ROUTER",workerName:"KAI ONE",goal:"Route global media inbox independently of active channel",source:"MEDIA_DROP",autoApply:false},autopilot:{revision:REVISION,files:fileRows,channels:channelRows,instruction},client:{revision:REVISION,language:"id-ID",timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||"Asia/Makassar"}}};
    const response=await fetch("/api/acc-ai",{method:"POST",headers,body:JSON.stringify(body)});
    const data=await response.json().catch(()=>({}));
    if(!response.ok||!data.ok) throw new Error(data?.error||data?.errorDetail?.message||`HTTP ${response.status}`);
    const parsed=extractJson(data.reply||data.output||data.text||"");
    if(!parsed||!Array.isArray(parsed.routes)) throw new Error("ROUTER_JSON_INVALID");
    return parsed.routes;
  }

  function handoff(job,instruction){
    if(!job.channelId) return false;
    let store;
    try{store=JSON.parse(localStorage.getItem(COPILOT_KEY)||"{}");}catch{store={};}
    if(!store.channels||typeof store.channels!=="object")store.channels={};
    if(!store.channels[job.channelId])store.channels[job.channelId]={messages:[],package:{material:"",caption:"",posterBase64:"",posterDataUrl:"",posterHeadline:"",posterSubhead:"",publishedPostId:"",publishedAt:""},updatedAt:now()};
    const lane=store.channels[job.channelId];
    lane.messages=Array.isArray(lane.messages)?lane.messages:[];
    const marker=`AUTOPILOT_ASSET:${job.id}`;
    if(!lane.messages.some(message=>String(message.content||"").includes(marker))){
      lane.messages.push({id:uid("msg"),role:"user",type:"text",at:now(),content:`[KAI AUTOPILOT HANDOFF]\n${marker}\nMedia: ${job.fileName}\nPath: ${job.path}\nType: ${job.mimeType}\nSize: ${bytes(job.size)}\nDimensions: ${job.width||0}x${job.height||0}${job.duration?`\nDuration: ${Math.round(job.duration)}s`:""}\nRouter confidence: ${Math.round((job.confidence||0)*100)}%\nRouter reason: ${job.reason||"-"}\nOwner instruction: ${instruction||"Urus sesuai passport channel ini."}\n\nTreat this as routed source material. Do not publish automatically from this handoff. Continue with the channel's own K/P/C/N rules and owner controls.`});
      lane.messages=lane.messages.slice(-40);
    }
    lane.updatedAt=now();
    try{localStorage.setItem(COPILOT_KEY,JSON.stringify(store));}catch{return false;}
    job.status="HANDOFF";job.handoffAt=now();job.updatedAt=now();save();
    window.dispatchEvent(new StorageEvent("storage",{key:COPILOT_KEY,newValue:JSON.stringify(store)}));
    return true;
  }

  async function routeAll(){
    const pending=state.jobs.filter(job=>job.status==="INBOX"||job.status==="NEED_OWNER"||job.status==="ROUTED");
    if(!pending.length)return setStatus("Tidak ada media baru untuk di-route.");
    const list=channels(); if(!list.length)return setStatus("Channel registry belum terbaca.",true);
    const instruction=txt(document.getElementById("acc-autopilot-instruction")?.value)||state.instruction;
    state.instruction=instruction;save();
    setBusy(true);setStatus(`KAI ONE routing ${pending.length} media tanpa membaca selector channel atas…`);
    let aiRoutes=[];
    try{aiRoutes=await kaiRoute(pending,list,instruction);}catch(error){setStatus(`KAI router fallback aktif: ${String(error?.message||error)}`);}
    for(const job of pending){
      const ai=aiRoutes.find(row=>txt(row.fileId)===job.id||txt(row.fileName)===job.fileName);
      let routed=null;
      if(ai&&txt(ai.channelId)&&list.some(channel=>channel.id===txt(ai.channelId))){
        const channel=list.find(row=>row.id===txt(ai.channelId));
        routed={channelId:channel.id,channelName:channel.name,confidence:Math.max(0,Math.min(1,Number(ai.confidence||0))),reason:txt(ai.reason)||"KAI router"};
      }else routed=fallbackRoute(job,list,instruction);
      Object.assign(job,routed,{updatedAt:now()});
      job.status=job.channelId&&job.confidence>=.65?"ROUTED":"NEED_OWNER";
      if(job.status==="ROUTED")handoff(job,instruction);
    }
    save();render();setBusy(false);
    const handoffCount=state.jobs.filter(job=>job.status==="HANDOFF").length;
    const need=state.jobs.filter(job=>job.status==="NEED_OWNER").length;
    setStatus(`Routing selesai. ${handoffCount} job sudah dikirim ke KAI channel • ${need} NEED OWNER.`);
  }

  async function linkOrImportFolder(){
    if(typeof window.showDirectoryPicker==="function"){
      try{
        const handle=await window.showDirectoryPicker({mode:"read"});
        await dbPut(KV_STORE,{key:"folderHandle",handle,name:handle.name,linkedAt:now()});
        await scanLinkedFolder();return;
      }catch(error){if(error?.name!=="AbortError")setStatus(`Folder API gagal: ${String(error?.message||error)}`,true);return;}
    }
    document.getElementById("acc-autopilot-folder-input")?.click();
  }
  async function collectDirectory(handle,prefix="",depth=0,files=[],paths=new Map()){
    if(depth>3)return {files,paths};
    for await(const [name,entry] of handle.entries()){
      if(entry.kind==="file"){
        const file=await entry.getFile();
        if(/^image\//.test(file.type||"")||/^video\//.test(file.type||"")){files.push(file);paths.set(file,`${prefix}${name}`);}
      }else if(entry.kind==="directory")await collectDirectory(entry,`${prefix}${name}/`,depth+1,files,paths);
    }
    return {files,paths};
  }
  async function scanLinkedFolder(){
    let record;try{record=await dbGet(KV_STORE,"folderHandle");}catch{}
    const handle=record?.handle;if(!handle)return linkOrImportFolder();
    try{
      let permission=await handle.queryPermission?.({mode:"read"});
      if(permission!=="granted")permission=await handle.requestPermission?.({mode:"read"});
      if(permission!=="granted")return setStatus("Akses folder belum diberikan.",true);
      setStatus(`Scan folder ${record.name||handle.name}…`);
      const result=await collectDirectory(handle);
      await ingestFiles(result.files,"LINKED_FOLDER",result.paths);
    }catch(error){setStatus(`Scan folder gagal: ${String(error?.message||error)}`,true);}
  }

  function ensureStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement("style");style.id=STYLE_ID;
    style.textContent=`
      .acc-auto-section{margin-bottom:14px}.acc-auto-card{padding:14px!important;border:1px solid rgba(86,190,255,.26)!important;background:linear-gradient(180deg,rgba(5,13,28,.99),rgba(4,10,21,.99))!important}
      .acc-auto-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap}.acc-auto-title{font-size:1.18rem;font-weight:950;margin-top:4px}.acc-auto-desc{font-size:11px;color:var(--muted,#8390aa);line-height:1.5;margin-top:5px;max-width:720px}
      .acc-auto-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-top:12px}.acc-auto-stat{padding:9px;border-radius:11px;border:1px solid rgba(255,255,255,.08);background:#030712}.acc-auto-stat b{display:block;font-size:18px}.acc-auto-stat span{font-size:9px;color:#8796ad;letter-spacing:.08em}
      .acc-auto-drop{margin-top:12px;border:1px dashed rgba(98,180,255,.45);border-radius:14px;padding:16px;text-align:center;background:rgba(37,99,235,.055)}.acc-auto-drop.drag{border-color:#69efb3;background:rgba(29,140,99,.08)}
      .acc-auto-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:10px}.acc-auto-btn{min-height:42px;border:1px solid rgba(255,255,255,.10);border-radius:11px;background:#0b1424;color:#f8fafc;font-weight:900;font-size:11px}.acc-auto-btn.primary{background:#126aa5;border-color:#55bdf4}.acc-auto-btn.green{background:#0b8e69;border-color:#55e6a5}
      .acc-auto-instruction{width:100%;min-height:76px;margin-top:10px;padding:10px 11px;border-radius:12px;border:1px solid rgba(255,255,255,.10);background:#050b17;color:#fff;resize:vertical}.acc-auto-status{min-height:16px;margin-top:8px;font-size:10px;color:#8796ad}
      .acc-auto-list{display:grid;gap:7px;margin-top:11px}.acc-auto-job{padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:#050a14}.acc-auto-job-top{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.acc-auto-file{font-weight:900;font-size:11px;overflow-wrap:anywhere}.acc-auto-meta{font-size:9px;color:#8796ad;margin-top:3px;line-height:1.45}.acc-auto-route{font-size:10px;margin-top:7px}.acc-auto-job-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.acc-auto-mini{min-height:30px;padding:5px 9px;border-radius:9px;border:1px solid rgba(255,255,255,.10);background:#0b1424;color:#fff;font-size:9px;font-weight:900}.acc-auto-badge{display:inline-flex;align-items:center;padding:4px 7px;border-radius:99px;border:1px solid rgba(255,255,255,.10);font-size:8px;font-weight:950;letter-spacing:.06em}.acc-auto-badge.handoff{color:#69efb3;border-color:rgba(105,239,179,.25)}.acc-auto-badge.need{color:#fbbf24;border-color:rgba(251,191,36,.25)}
      @media(max-width:430px){.acc-auto-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.acc-auto-actions{grid-template-columns:1fr}.acc-auto-card{padding:12px!important}}
    `;document.head.appendChild(style);
  }

  function stats(){
    return {
      inbox:state.jobs.filter(j=>j.status==="INBOX").length,
      handoff:state.jobs.filter(j=>j.status==="HANDOFF").length,
      need:state.jobs.filter(j=>j.status==="NEED_OWNER").length,
      total:state.jobs.length
    };
  }
  function jobHtml(job){
    const statusClass=job.status==="HANDOFF"?"handoff":job.status==="NEED_OWNER"?"need":"";
    return `<div class="acc-auto-job" data-auto-job="${esc(job.id)}"><div class="acc-auto-job-top"><div><div class="acc-auto-file">${esc(job.fileName)}</div><div class="acc-auto-meta">${esc(job.mimeType)} • ${bytes(job.size)}${job.width?` • ${job.width}×${job.height}`:""}${job.duration?` • ${Math.round(job.duration)}s`:""}<br>${esc(job.path||"")}</div></div><span class="acc-auto-badge ${statusClass}">${esc(job.status)}</span></div>${job.channelId?`<div class="acc-auto-route">→ <b>${esc(job.channelName||job.channelId)}</b> • ${Math.round((job.confidence||0)*100)}%<br><span class="muted">${esc(job.reason||"")}</span></div>`:`<div class="acc-auto-route muted">Belum ada channel route.</div>`}<div class="acc-auto-job-actions">${job.channelId?`<button class="acc-auto-mini" data-auto-open="${esc(job.id)}">OPEN KAI CHANNEL</button>`:""}<button class="acc-auto-mini" data-auto-remove="${esc(job.id)}">REMOVE</button></div></div>`;
  }
  function panelHtml(){
    const s=stats();
    return `<div class="card acc-auto-card mono"><div class="acc-auto-head"><div><div class="eyebrow">KAI ONE // STANDALONE AUTOPILOT</div><div class="acc-auto-title">MEDIA DROP</div><div class="acc-auto-desc">Tidak membaca channel yang sedang dipilih. Media masuk ke inbox global → KAI ONE route → handoff ke KAI per-channel. Manual Produce tetap terpisah dan aman.</div></div><span class="badge">BETA V1</span></div><div class="acc-auto-stats"><div class="acc-auto-stat"><b>${s.inbox}</b><span>INBOX</span></div><div class="acc-auto-stat"><b>${s.handoff}</b><span>TO KAI</span></div><div class="acc-auto-stat"><b>${s.need}</b><span>NEED OWNER</span></div><div class="acc-auto-stat"><b>${s.total}</b><span>TOTAL</span></div></div><div class="acc-auto-drop" id="acc-autopilot-drop"><b>DROP FOTO / VIDEO DI SINI</b><div class="acc-auto-desc" style="margin:5px auto 0">Atau link/import satu folder. File disimpan lokal di device (IndexedDB), bukan dimasukkan ke channel selector.</div><input id="acc-autopilot-file-input" type="file" accept="image/*,video/*" multiple hidden><input id="acc-autopilot-folder-input" type="file" accept="image/*,video/*" webkitdirectory directory multiple hidden></div><div class="acc-auto-actions"><button class="acc-auto-btn" id="acc-autopilot-add">+ ADD MEDIA</button><button class="acc-auto-btn" id="acc-autopilot-folder">LINK / SCAN FOLDER</button><button class="acc-auto-btn green" id="acc-autopilot-route">⚡ KAI AUTO ROUTE</button></div><textarea class="acc-auto-instruction" id="acc-autopilot-instruction" placeholder="Opsional: kasih perintah global. Contoh: 'Ini video gaming dan motocamp, pilih channel sendiri lalu kirim ke KAI masing-masing.'">${esc(state.instruction)}</textarea><div class="acc-auto-status" id="acc-autopilot-status"></div><div class="acc-auto-list">${state.jobs.length?state.jobs.slice().reverse().map(jobHtml).join(""):`<div class="acc-auto-desc">ACC Inbox masih kosong.</div>`}</div></div>`;
  }

  function setStatus(value,error=false){const node=document.getElementById("acc-autopilot-status");if(node){node.textContent=value||"";node.style.color=error?"#ff8095":"#8796ad";}}
  function setBusy(value){document.querySelectorAll(`#${PANEL_ID} button,#${PANEL_ID} textarea`).forEach(node=>node.disabled=value);}
  function bind(){
    const drop=document.getElementById("acc-autopilot-drop"),fileInput=document.getElementById("acc-autopilot-file-input"),folderInput=document.getElementById("acc-autopilot-folder-input");
    document.getElementById("acc-autopilot-add")?.addEventListener("click",()=>fileInput?.click());
    document.getElementById("acc-autopilot-folder")?.addEventListener("click",linkOrImportFolder);
    document.getElementById("acc-autopilot-route")?.addEventListener("click",routeAll);
    fileInput?.addEventListener("change",async()=>{await ingestFiles(fileInput.files||[],"FILE_PICKER");fileInput.value="";});
    folderInput?.addEventListener("change",async()=>{await ingestFiles(folderInput.files||[],"FOLDER_IMPORT");folderInput.value="";});
    document.getElementById("acc-autopilot-instruction")?.addEventListener("input",event=>{state.instruction=txt(event.target.value);save();});
    if(drop){
      ["dragenter","dragover"].forEach(type=>drop.addEventListener(type,event=>{event.preventDefault();drop.classList.add("drag");}));
      ["dragleave","drop"].forEach(type=>drop.addEventListener(type,event=>{event.preventDefault();drop.classList.remove("drag");}));
      drop.addEventListener("drop",event=>ingestFiles(event.dataTransfer?.files||[],"DROP"));
    }
    document.querySelectorAll("[data-auto-open]").forEach(button=>button.addEventListener("click",()=>openChannel(button.dataset.autoOpen)));
    document.querySelectorAll("[data-auto-remove]").forEach(button=>button.addEventListener("click",()=>removeJob(button.dataset.autoRemove)));
  }
  function openChannel(jobId){
    const job=state.jobs.find(row=>row.id===jobId);if(!job?.channelId)return;
    const select=document.getElementById("channel-select");if(!select)return setStatus("Channel selector belum tersedia untuk manual view.",true);
    select.value=job.channelId;select.dispatchEvent(new Event("change",{bubbles:true}));
    setTimeout(()=>document.getElementById("acc-produce-copilot-panel")?.scrollIntoView({behavior:"smooth",block:"start"}),180);
  }
  async function removeJob(jobId){
    state.jobs=state.jobs.filter(row=>row.id!==jobId);save();await dbDelete(MEDIA_STORE,jobId).catch(()=>{});render();
  }
  function render(){
    const panel=document.getElementById(PANEL_ID);if(!panel)return mount();
    const savedStatus=document.getElementById("acc-autopilot-status")?.textContent||"";
    panel.innerHTML=panelHtml();bind();if(savedStatus)setStatus(savedStatus);
  }
  function mount(){
    ensureStyle();
    const manual=document.getElementById("acc-produce-copilot-panel");
    const mission=document.querySelector(".mission-live-card");
    const anchor=manual || mission?.closest?.("section.section") || mission?.parentElement;
    if(!anchor?.parentElement)return;
    let panel=document.getElementById(PANEL_ID);
    if(!panel){panel=document.createElement("section");panel.id=PANEL_ID;panel.className="section mono acc-auto-section";anchor.parentElement.insertBefore(panel,anchor);panel.innerHTML=panelHtml();bind();}
    else if(panel.nextElementSibling!==anchor)anchor.parentElement.insertBefore(panel,anchor);
  }

  let scheduled=false;
  const observer=new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;mount();});});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener("storage",event=>{if(event.key===STORE_KEY){state=readStore();render();}});
  window.ACCKaiAutopilot=Object.freeze({revision:REVISION,route:routeAll,scanFolder:scanLinkedFolder,getJobs:()=>state.jobs.map(job=>({...job}))});
  ensureStyle();mount();
})();
