// ACC OS X — BUILD 257.6 PRODUCE COPILOT PANEL
// Semi-automatic K/P/C/N chat lane mounted directly above Automatic Mission.
// Reads the currently selected channel + locked contexts from ACC local state.
// Automatic mission state is not modified.

(() => {
  "use strict";
  if (window.__ACC_PRODUCE_COPILOT_V2576__) return;
  window.__ACC_PRODUCE_COPILOT_V2576__ = true;

  const REVISION = "BUILD257_6_PRODUCE_COPILOT";
  const MAIN_STATE_KEY = "acc_os_x_ecosystem_v214";
  const COPILOT_KEY = "acc_os_x_produce_copilot_v1";
  const AI_ACCESS_KEY = "acc_os_x_ai_access_v1";
  const PUBLISH_ENDPOINT_KEY = "acc_os_x_publish_endpoint_v1";
  const PUBLISH_ACCESS_KEY = "acc_os_x_publish_access_v1";
  const DEFAULT_PUBLISH_ENDPOINT = "https://acc-publish-connector.ardarawk.workers.dev/api/acc-publish";
  const PANEL_ID = "acc-produce-copilot-panel";
  const STYLE_ID = "acc-produce-copilot-style";
  const FALLBACK_TARGETS = {
    "ch-tukang-tambang": {connector:"META_FACEBOOK",pageId:"101420769205689",pageName:"Tukang Tambang",source:"VERIFIED_BASELINE"}
  };

  const txt = v => typeof v === "string" ? v.trim() : "";
  const esc = v => String(v ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const now = () => new Date().toISOString();
  const id = prefix => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;

  function readMain(){
    try{return JSON.parse(localStorage.getItem(MAIN_STATE_KEY)||"{}");}catch{return {};}
  }
  function readStore(){
    try{
      const s=JSON.parse(localStorage.getItem(COPILOT_KEY)||"{}");
      if(!s.channels||typeof s.channels!=="object")s.channels={};
      return s;
    }catch{return {channels:{}};}
  }
  let store=readStore();
  function saveStore(){
    try{localStorage.setItem(COPILOT_KEY,JSON.stringify(store));}
    catch{
      for(const row of Object.values(store.channels||{})){
        if(Array.isArray(row.messages)) row.messages=row.messages.slice(-14).map(m=>m.type==="poster"?{...m,image:null}:m);
      }
      try{localStorage.setItem(COPILOT_KEY,JSON.stringify(store));}catch{}
    }
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
      .filter(x=>x?.active!==false)
      .slice(0,12)
      .map(x=>({type:x?.type||"",title:x?.title||"",version:x?.version||"",content:txt(x?.content).slice(0,2600),active:x?.active!==false}));
    const assets=Array.isArray(main.assets)?main.assets:[];
    const research=assets.find(a=>a?.channelId===channelId&&String(a?.stage||"").toUpperCase()==="RESEARCH"&&txt(a?.output));
    return {
      id:channelId,
      code:meta.code||"",
      name,
      platform:meta.platform||"Facebook",
      workspaceId:txt(main.activeWorkspaceId),
      contexts,
      research:txt(research?.output).slice(0,12000)
    };
  }
  function lane(channelId){
    if(!store.channels[channelId]) store.channels[channelId]={
      messages:[],
      package:{material:"",caption:"",posterBase64:"",posterDataUrl:"",posterHeadline:"",posterSubhead:"",publishedPostId:"",publishedAt:""},
      updatedAt:now()
    };
    const row=store.channels[channelId];
    row.package=row.package||{material:"",caption:"",posterBase64:"",posterDataUrl:"",posterHeadline:"",posterSubhead:"",publishedPostId:"",publishedAt:""};
    row.messages=Array.isArray(row.messages)?row.messages:[];
    return row;
  }
  function addMessage(channelId,role,content,type="text",extra={}){
    const row=lane(channelId);
    row.messages.push({id:id("msg"),role,content:txt(content),type,at:now(),...extra});
    row.messages=row.messages.slice(-40);
    row.updatedAt=now();
    saveStore();
  }
  function ensureStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement("style");
    style.id=STYLE_ID;
    style.textContent=`
      .acc-copilot-section{margin-bottom:14px}
      .acc-copilot-card{padding:14px!important;background:linear-gradient(180deg,rgba(8,12,23,.99),rgba(7,13,24,.99))!important;border:1px solid rgba(71,235,181,.28)!important;box-shadow:0 0 30px rgba(30,180,130,.08)!important}
      .acc-copilot-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap}
      .acc-copilot-channel{font-size:1.12rem;font-weight:900;margin-top:4px}
      .acc-copilot-badges{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}
      .acc-copilot-badge{font-size:10px;font-weight:900;letter-spacing:.06em;padding:5px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.035);color:var(--muted,#9ca3af)}
      .acc-copilot-badge.ok{color:#69efb3;border-color:rgba(105,239,179,.25);background:rgba(31,110,82,.13)}
      .acc-copilot-chat{margin-top:12px;max-height:520px;overflow:auto;padding:10px;border:1px solid rgba(255,255,255,.07);border-radius:14px;background:#030712;scroll-behavior:smooth}
      .acc-copilot-empty{padding:20px 12px;text-align:center;color:var(--muted,#8390aa);font-size:12px;line-height:1.55}
      .acc-copilot-msg{display:flex;margin:8px 0}.acc-copilot-msg.user{justify-content:flex-end}
      .acc-copilot-bubble{max-width:91%;padding:10px 12px;border-radius:14px;font-size:12px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere}
      .acc-copilot-msg.kai .acc-copilot-bubble{background:rgba(104,67,190,.15);border:1px solid rgba(173,124,255,.18);color:var(--text,#f8fafc);border-bottom-left-radius:5px}
      .acc-copilot-msg.user .acc-copilot-bubble{background:rgba(23,135,103,.20);border:1px solid rgba(70,235,181,.23);color:#eafff8;border-bottom-right-radius:5px}
      .acc-copilot-label{display:block;font-size:9px;font-weight:900;letter-spacing:.12em;color:#8b9bb4;margin-bottom:4px}
      .acc-copilot-poster{width:min(100%,360px);display:block;border-radius:13px;border:1px solid rgba(255,255,255,.12);margin-top:8px;cursor:zoom-in;background:#050914}
      .acc-copilot-tools{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:10px}
      .acc-copilot-quick{min-height:42px;border-radius:11px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.035);color:#f4f7fb;font-weight:900;font-size:12px}.acc-copilot-quick:active{transform:scale(.98)}
      .acc-copilot-compose{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:9px}
      .acc-copilot-input{width:100%;min-width:0;border-radius:12px;border:1px solid rgba(255,255,255,.11);background:#070c18;color:#fff;padding:11px 12px;font:inherit;outline:none}
      .acc-copilot-input:focus{border-color:rgba(105,239,179,.55);box-shadow:0 0 0 2px rgba(105,239,179,.08)}
      .acc-copilot-send{min-width:58px;border:0;border-radius:12px;background:#10a77c;color:white;font-weight:900}
      .acc-copilot-status{font-size:10px;color:#8b9bb4;margin-top:8px;min-height:16px}
      .acc-copilot-publish{width:100%;margin-top:10px;min-height:50px;border:1px solid rgba(105,239,179,.42);border-radius:13px;background:#0daa7b;color:#fff;font-weight:950;letter-spacing:.08em}.acc-copilot-publish:disabled{opacity:.35;filter:saturate(.4)}
      .acc-copilot-note{margin-top:8px;font-size:10px;color:#7f8ca3;line-height:1.45}
      .acc-copilot-modal{position:fixed;z-index:99999;inset:0;background:rgba(0,0,0,.92);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:14px}.acc-copilot-modal img{max-width:100%;max-height:88vh;object-fit:contain;border-radius:10px}.acc-copilot-modal button{margin-top:10px;border:1px solid rgba(255,255,255,.2);background:#111827;color:#fff;border-radius:10px;padding:10px 18px;font-weight:800}
      @media(max-width:420px){.acc-copilot-card{padding:12px!important}.acc-copilot-chat{max-height:460px}.acc-copilot-tools{gap:5px}.acc-copilot-quick{font-size:11px}}
    `;
    document.head.appendChild(style);
  }
  function messageHtml(m){
    if(m.type==="poster"&&m.image){
      return `<div class="acc-copilot-msg kai"><div class="acc-copilot-bubble"><span class="acc-copilot-label">KAI // POSTER</span>${esc(m.content||"Poster siap.")}<img class="acc-copilot-poster" data-copilot-poster="${esc(m.id)}" src="${m.image}" alt="Poster ${esc(m.channelName||"")}"></div></div>`;
    }
    const label=m.role==="user"?"OWNER":"KAI";
    return `<div class="acc-copilot-msg ${m.role==="user"?"user":"kai"}"><div class="acc-copilot-bubble"><span class="acc-copilot-label">${label}</span>${esc(m.content)}</div></div>`;
  }
  function canPublish(row){return Boolean(txt(row.package?.posterBase64)&&txt(row.package?.caption)&&!txt(row.package?.publishedPostId));}
  function panelHtml(profile,row){
    const masterCount=profile.contexts.length,published=txt(row.package?.publishedPostId);
    return `<div class="card acc-copilot-card mono">
      <div class="acc-copilot-head"><div><div class="eyebrow">KAI PRODUCE COPILOT // SEMI AUTO</div><div class="acc-copilot-channel">${esc(profile.name)}</div><div class="meta">${esc(profile.code||profile.id)} • ${esc(profile.platform)}</div><div class="acc-copilot-badges"><span class="acc-copilot-badge ok">CHANNEL AUTO-READ</span><span class="acc-copilot-badge ${masterCount?"ok":""}">${masterCount} MASTER CONTEXT</span><span class="acc-copilot-badge">K • P • C • N</span></div></div><span class="badge">MANUAL CONTROL</span></div>
      <div class="acc-copilot-chat" id="acc-copilot-chat">${row.messages.length?row.messages.map(messageHtml).join(""):`<div class="acc-copilot-empty">Chat KAI membaca channel yang sedang dipilih.<br>K = konten • P = poster • C = caption • N = next.<br>Kamu juga bisa ngobrol / revisi dengan kalimat biasa.</div>`}</div>
      <div class="acc-copilot-tools"><button class="acc-copilot-quick" data-copilot-command="K">K • KONTEN</button><button class="acc-copilot-quick" data-copilot-command="P">P • POSTER</button><button class="acc-copilot-quick" data-copilot-command="C">C • CAPTION</button><button class="acc-copilot-quick" data-copilot-command="N">N • NEXT</button></div>
      <form class="acc-copilot-compose" id="acc-copilot-form"><input class="acc-copilot-input" id="acc-copilot-input" autocomplete="off" placeholder="Ketik K, P, C, N atau chat seperti biasa…" /><button class="acc-copilot-send" type="submit">SEND</button></form>
      <div class="acc-copilot-status" id="acc-copilot-status"></div>
      <button class="acc-copilot-publish" id="acc-copilot-publish" ${canPublish(row)?"":"disabled"}>${published?`PUBLISHED ✅ ${esc(published)}`:"⚡ PUBLISH APPROVED PACKAGE"}</button>
      <div class="acc-copilot-note">Panel ini berdiri di samping Automatic Mission. K/P/C/N di sini tidak menjalankan atau mengubah mission otomatis.</div>
    </div>`;
  }
  function mount(){
    ensureStyle();
    const mission=document.querySelector(".mission-live-card");if(!mission)return;
    const missionSection=mission.closest("section.section")||mission.parentElement;if(!missionSection?.parentElement)return;
    const profile=currentProfile();if(!profile.id)return;
    let section=document.getElementById(PANEL_ID);
    if(!section){section=document.createElement("section");section.id=PANEL_ID;section.className="section mono acc-copilot-section";missionSection.parentElement.insertBefore(section,missionSection);}else if(section.nextElementSibling!==missionSection){missionSection.parentElement.insertBefore(section,missionSection);}
    section.dataset.channelId=profile.id;
    const row=lane(profile.id),signature=`${profile.id}:${row.updatedAt}:${row.messages.length}:${row.package?.publishedPostId||""}`;
    if(section.dataset.signature!==signature){section.innerHTML=panelHtml(profile,row);section.dataset.signature=signature;bindPanel();requestAnimationFrame(()=>{const chat=document.getElementById("acc-copilot-chat");if(chat)chat.scrollTop=chat.scrollHeight;});}
  }
  function setStatus(value,error=false){const el=document.getElementById("acc-copilot-status");if(el){el.textContent=value||"";el.style.color=error?"#ff8095":"#8b9bb4";}}
  function setBusy(busy,label="KAI sedang bekerja…"){document.querySelectorAll("#acc-produce-copilot-panel button,#acc-produce-copilot-panel input").forEach(el=>el.disabled=busy);if(busy)setStatus(label);}
  function requestContext(profile,row,command){
    return {workerTask:{id:id("copilot"),stage:"COPILOT",workerType:"KAI_PRODUCE_COPILOT",workerName:"KAI PRODUCE COPILOT",goal:"Semi-automatic owner production",source:"OWNER_CHAT",autoApply:false},profile:{id:profile.id,code:profile.code,name:profile.name,platform:profile.platform},contexts:profile.contexts,copilot:{command,research:profile.research,material:row.package?.material||"",caption:row.package?.caption||"",history:row.messages.slice(-8).filter(m=>m.type!=="poster").map(m=>({role:m.role==="user"?"user":"assistant",content:m.content}))},client:{revision:REVISION,language:"id-ID",timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||"Asia/Makassar"}};
  }
  async function callCopilot(profile,row,command){
    const body={messages:[{role:"user",content:command}],context:requestContext(profile,row,command)};
    const access=localStorage.getItem(AI_ACCESS_KEY)||"",headers={"Content-Type":"application/json","Accept":"application/json"};if(access)headers["X-ACC-Access-Code"]=access;
    const response=await fetch("/api/acc-ai",{method:"POST",headers,body:JSON.stringify(body)}),data=await response.json().catch(()=>({}));
    if(!response.ok||!data.ok)throw new Error(data?.error||data?.errorDetail?.message||`HTTP ${response.status}`);return data;
  }
  function loadImage(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error("POSTER_IMAGE_DECODE_FAILED"));img.src=src;});}
  function wrapLines(ctx,value,maxWidth,maxLines){const words=txt(value).split(/\s+/).filter(Boolean),lines=[];let line="";for(const word of words){const test=line?`${line} ${word}`:word;if(line&&ctx.measureText(test).width>maxWidth){lines.push(line);line=word;if(lines.length>=maxLines-1)break;}else line=test;}if(line&&lines.length<maxLines)lines.push(line);return lines;}
  async function composePoster(profile,data){
    const hero=`data:image/jpeg;base64,${data.imageBase64}`,img=await loadImage(hero),canvas=document.createElement("canvas");canvas.width=1080;canvas.height=1920;const ctx=canvas.getContext("2d",{alpha:false});
    ctx.fillStyle="#050914";ctx.fillRect(0,0,1080,1920);const targetH=1220,scale=Math.max(1080/img.width,targetH/img.height),w=img.width*scale,h=img.height*scale;ctx.drawImage(img,(1080-w)/2,(targetH-h)/2,w,h);
    let g=ctx.createLinearGradient(0,600,0,1500);g.addColorStop(0,"rgba(3,7,18,.02)");g.addColorStop(.48,"rgba(3,7,18,.60)");g.addColorStop(1,"rgba(3,7,18,.99)");ctx.fillStyle=g;ctx.fillRect(0,0,1080,1530);ctx.fillStyle="rgba(4,8,18,.96)";ctx.fillRect(0,1180,1080,740);
    ctx.fillStyle="#62efba";ctx.fillRect(54,70,8,132);ctx.fillStyle="#ffffff";ctx.font="900 46px Arial,sans-serif";ctx.fillText(profile.name.toUpperCase(),84,84);ctx.fillStyle="#9cb0c8";ctx.font="800 22px Arial,sans-serif";ctx.fillText(`${profile.code||profile.id} • ${profile.platform}`.toUpperCase(),86,146);
    const badge=txt(data.plan?.badge)||"ACC STUDIO";ctx.font="900 22px Arial,sans-serif";const bw=Math.min(460,ctx.measureText(badge).width+40);ctx.fillStyle="#62efba";ctx.fillRect(58,1080,bw,50);ctx.fillStyle="#04100d";ctx.fillText(badge.toUpperCase(),78,1093);
    const headline=txt(data.plan?.headline)||profile.name;ctx.fillStyle="#ffffff";ctx.font="900 68px Arial,sans-serif";wrapLines(ctx,headline,950,4).forEach((line,i)=>ctx.fillText(line,58,1245+i*80));const sub=txt(data.plan?.subhead);if(sub){ctx.fillStyle="#b8c4d3";ctx.font="600 30px Arial,sans-serif";wrapLines(ctx,sub,950,3).forEach((line,i)=>ctx.fillText(line,58,1590+i*42));}
    ctx.fillStyle="#62efba";ctx.fillRect(58,1810,250,4);ctx.fillStyle="#8ea0b8";ctx.font="800 19px Arial,sans-serif";ctx.fillText("ACC OS X • KAI PRODUCE COPILOT",58,1840);ctx.fillStyle="#ffffff";ctx.font="800 18px Arial,sans-serif";ctx.textAlign="right";ctx.fillText("AM STUDIO",1022,1840);ctx.textAlign="left";
    return canvas.toDataURL("image/jpeg",.88);
  }
  function refresh(){const section=document.getElementById(PANEL_ID);if(section)section.dataset.signature="";mount();}
  async function execute(command){
    const profile=currentProfile();if(!profile.id)return;const row=lane(profile.id),clean=txt(command);if(!clean)return;addMessage(profile.id,"user",clean);refresh();
    const op=/^(k|konten|content)\b/i.test(clean)?"K":/^(p|poster)\b/i.test(clean)?"P":/^(c|caption)\b/i.test(clean)?"C":/^(n|next|lanjut)\b/i.test(clean)?"N":"CHAT";
    if(op==="P"&&!txt(row.package.material)){addMessage(profile.id,"kai","K belum ada. Buat/approve konten dulu dengan K.");refresh();return;}if(op==="C"&&!txt(row.package.material)){addMessage(profile.id,"kai","K belum ada. Buat/approve konten dulu dengan K.");refresh();return;}
    setBusy(true,op==="P"?"KAI sedang membuat poster asli…":"KAI sedang menyusun output…");
    try{
      const data=await callCopilot(profile,row,clean);
      if(data.kind==="poster"){
        const dataUrl=await composePoster(profile,data);row.package.posterDataUrl=dataUrl;row.package.posterBase64=dataUrl.split(",")[1]||"";row.package.posterHeadline=txt(data.plan?.headline);row.package.posterSubhead=txt(data.plan?.subhead);row.package.publishedPostId="";row.package.publishedAt="";addMessage(profile.id,"kai",data.reply||"Poster siap.","poster",{image:dataUrl,channelName:profile.name});
      }else if(data.kind==="caption"){row.package.caption=txt(data.reply);row.package.publishedPostId="";row.package.publishedAt="";addMessage(profile.id,"kai",data.reply);}else if(data.kind==="material"){row.package.material=txt(data.reply);row.package.caption="";row.package.posterBase64="";row.package.posterDataUrl="";row.package.posterHeadline="";row.package.posterSubhead="";row.package.publishedPostId="";row.package.publishedAt="";addMessage(profile.id,"kai",data.reply);}else addMessage(profile.id,"kai",data.reply||"Siap.");
      row.updatedAt=now();saveStore();
    }catch(error){addMessage(profile.id,"kai",`ERROR // ${String(error?.message||error)}`);}finally{refresh();setBusy(false);}
  }
  function publishTarget(main,channelId){return main?.settings?.publishMappings?.[channelId]||FALLBACK_TARGETS[channelId]||null;}
  async function publishApproved(){
    const profile=currentProfile(),row=lane(profile.id),pkg=row.package||{};if(!txt(pkg.posterBase64)||!txt(pkg.caption))return setStatus("Poster + caption harus siap dulu.",true);if(txt(pkg.publishedPostId))return;
    const main=readMain(),target=publishTarget(main,profile.id);if(!target)return setStatus("Meta Page channel ini belum di-map di Publishing Hub.",true);const access=localStorage.getItem(PUBLISH_ACCESS_KEY)||localStorage.getItem(AI_ACCESS_KEY)||"";if(!access)return setStatus("Connector access belum tersimpan di perangkat.",true);const endpoint=localStorage.getItem(PUBLISH_ENDPOINT_KEY)||DEFAULT_PUBLISH_ENDPOINT,jobId=id("copilot_publish"),stamp=Date.now(),platform=String(profile.platform||"Facebook").toUpperCase();
    const job={id:jobId,sourceWorkflowId:`COPILOT:${profile.id}`,sourceWorkflowRunKey:`copilot:${profile.id}:${stamp}`,sourceTaskId:null,channelId:profile.id,channelName:profile.name,workspaceId:profile.workspaceId||main.activeWorkspaceId||"acc-enterprise",platform,status:"QUEUED",attempts:1,idempotencyKey:`copilot:${profile.id}:${stamp}:${platform.toLowerCase()}`,externalPostId:null,publishedAt:null,error:null,createdAt:now(),updatedAt:now(),connector:target.connector||"META_FACEBOOK",sourceAssetId:null};
    const payload={...job,target,pageId:target.pageId||null,pageName:target.pageName||null,instagramAccountId:target.instagramAccountId||null,content:{message:pkg.caption,mediaUrl:null,imageBase64:pkg.posterBase64,mimeType:"image/jpeg"},clientRevision:REVISION,mediaSource:"PRODUCE_COPILOT_BASE64"};
    setBusy(true,"Mengirim approved package ke Meta connector…");
    try{const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json","X-ACC-Access-Code":access},body:JSON.stringify(payload)}),data=await response.json().catch(()=>({}));if(!response.ok||!data.ok){const e=data?.error||{};throw new Error(e.message||e.code||data.message||`HTTP ${response.status}`);}const postId=txt(data.externalPostId||data.postId||data.id||data.result?.id)||"PUBLISHED";pkg.publishedPostId=postId;pkg.publishedAt=now();row.updatedAt=now();addMessage(profile.id,"kai",`PUBLISH SUCCESS ✅\n${profile.name}\nPOST ID: ${postId}`);saveStore();}catch(error){addMessage(profile.id,"kai",`PUBLISH FAILED // ${String(error?.message||error)}`);}finally{refresh();setBusy(false);}
  }
  function openPoster(src){if(!src)return;const modal=document.createElement("div");modal.className="acc-copilot-modal";modal.innerHTML=`<img src="${src}" alt="Poster preview"><button type="button">TUTUP</button>`;modal.addEventListener("click",e=>{if(e.target===modal||e.target.tagName==="BUTTON")modal.remove();});document.body.appendChild(modal);}
  function bindPanel(){document.querySelectorAll("[data-copilot-command]").forEach(btn=>btn.addEventListener("click",()=>execute(btn.dataset.copilotCommand)));document.getElementById("acc-copilot-form")?.addEventListener("submit",e=>{e.preventDefault();const input=document.getElementById("acc-copilot-input"),value=txt(input?.value);if(input)input.value="";execute(value);});document.getElementById("acc-copilot-publish")?.addEventListener("click",publishApproved);document.querySelectorAll("[data-copilot-poster]").forEach(img=>img.addEventListener("click",()=>openPoster(img.src)));}

  let scheduled=false;const observer=new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;mount();});});observer.observe(document.documentElement,{childList:true,subtree:true});document.addEventListener("change",e=>{if(e.target?.id==="channel-select")setTimeout(mount,0);});window.addEventListener("storage",e=>{if(e.key===MAIN_STATE_KEY||e.key===COPILOT_KEY)mount();});setInterval(()=>{const section=document.getElementById(PANEL_ID),active=currentProfile().id;if(section&&section.dataset.channelId!==active){section.dataset.signature="";section.dataset.channelId=active;mount();}else if(!section)mount();},800);ensureStyle();mount();
})();
