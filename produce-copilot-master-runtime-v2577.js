// ACC OS X — BUILD 257.7 CHANNEL MASTER RUNTIME BRIDGE
// Enriches Produce Copilot requests with the full active channel master packet.
// Also fail-closes stale publish packages after K/N until a fresh P + C exist.
// Does not mutate Automatic Mission, Meta mapping, tokens, or channel canon.
(() => {
  "use strict";
  if (window.__ACC_CHANNEL_MASTER_RUNTIME_V2577__) return;
  window.__ACC_CHANNEL_MASTER_RUNTIME_V2577__ = true;

  const REVISION = "BUILD257_7_CHANNEL_MASTER_RUNTIME";
  const MAIN_STATE_KEY = "acc_os_x_ecosystem_v214";
  const COPILOT_KEY = "acc_os_x_produce_copilot_v1";
  const RUNTIME_KEY = "acc_os_x_copilot_master_runtime_v2577";
  const originalFetch = window.fetch.bind(window);
  const txt = v => typeof v === "string" ? v.trim() : "";

  const SERIES = Object.freeze({
    "ch-warisan-bali":["Edukasi","Kalender Bali & Rahinan","Filosofi","Tradisi & Kehidupan Bali","Inspirasi Bali"],
    "ch-semesta-berbisik":["Pesan Semesta","Tarot Harian","Energi Zodiak","Afirmasi Harian","Pesan Semesta Penutup"],
    "ch-konten-islami":["Prayer Reminder","Heart Reflection","One-Minute Learning","Stories of Prophets/Companions","Daily Dua & Dzikir"],
    "ch-putri-ayah":["Ayah → Putri","Putri → Ayah","Momen Ayah & Putri","Pelajaran Hidup","Quotes & Renungan"],
    "ch-yolo":["Series 1","Series 2","Series 3","Series 4","Series 5"],
    "ch-serigala-senja":["Night Series 1","Night Series 2","Night Series 3","Night Series 4","Night Series 5"]
  });

  const VISUAL_POLICY = Object.freeze({
    "ch-techverse":{
      identity:"Premium futuristic technology editorial; Electric Blue, Carbon Black, Titanium Silver; clean professional lighting; technology-first subject.",
      avoid:"generic stock lifestyle portrait unrelated to the technology topic; fantasy styling; unrelated humans as hero subject"
    },
    "ch-warisan-bali":{
      identity:"Respectful Balinese Hindu cultural editorial. The HERO SUBJECT must be the actual temple, ritual, object, landscape, tradition, or Balinese cultural action named by the material. Use authentic Balinese architectural and cultural cues, warm natural light, ceremonial dignity and documentary credibility.",
      avoid:"random tourist portrait; unrelated model portrait; generic Western lifestyle scene; fake sacred ritual; costume stereotypes; using a person as hero when the topic is a pura/temple/object"
    },
    "ch-yolo":{
      identity:"Premium black-and-gold discussion visual with clear two-sided conceptual contrast; modern editorial, not preachy.",
      avoid:"generic corporate stock photo; one-sided moralizing imagery"
    },
    "ch-jejak-nusantara":{
      identity:"Documentary historical visual with gold-brown parchment character, archival atmosphere and evidence-first framing.",
      avoid:"modern stock portrait unless historically required; fantasy presented as documentary fact"
    },
    "ch-balinightlife":{
      identity:"Premium international Bali nightlife media; authentic venue/event atmosphere, nightlife lighting and editorial polish.",
      avoid:"invented DJ identity; unrelated club stock portrait; fake venue branding"
    }
  });

  function readJson(key,fallback={}){
    try{return JSON.parse(localStorage.getItem(key)||"")||fallback;}catch{return fallback;}
  }
  function writeRuntime(value){try{localStorage.setItem(RUNTIME_KEY,JSON.stringify(value));}catch{}}
  function runtimeState(){const s=readJson(RUNTIME_KEY,{channels:{}});if(!s.channels)s.channels={};return s;}
  function readMain(){return readJson(MAIN_STATE_KEY,{});}

  function contextRank(op,row){
    const s=`${txt(row?.type)} ${txt(row?.title)}`.toUpperCase();
    const match = (...xs) => xs.some(x=>s.includes(x));
    if(op==="P"){
      if(match("VISUAL","BRAND","CANON","DESIGN","POSTER","CHARACTER","STYLE"))return 100;
      if(match("CURRENT_STATE"))return 85;
      if(match("WORKFLOW"))return 75;
      if(match("PASSPORT"))return 70;
    }
    if(op==="C"){
      if(match("BRAND","CANON","CAPTION","COMMUNICATION"))return 100;
      if(match("WORKFLOW"))return 90;
      if(match("PASSPORT"))return 80;
      if(match("CURRENT_STATE"))return 75;
    }
    if(op==="N"){
      if(match("CURRENT_STATE","CONTINUITY","ARC","EPISODE"))return 100;
      if(match("WORKFLOW"))return 95;
      if(match("BRAND","CANON"))return 90;
      if(match("PASSPORT"))return 85;
    }
    if(match("WORKFLOW"))return 100;
    if(match("CURRENT_STATE"))return 95;
    if(match("BRAND","CANON"))return 90;
    if(match("PASSPORT"))return 85;
    if(match("RESEARCH","EDITORIAL"))return 80;
    return 40;
  }

  function fullContexts(channelId,op){
    const main=readMain();
    return (Array.isArray(main?.ai?.contexts?.[channelId])?main.ai.contexts[channelId]:[])
      .filter(x=>x?.active!==false)
      .map(x=>({
        id:txt(x?.id),type:txt(x?.type),title:txt(x?.title),version:x?.version??null,
        active:x?.active!==false,content:txt(x?.content).slice(0,8000)
      }))
      .sort((a,b)=>contextRank(op,b)-contextRank(op,a))
      .slice(0,16);
  }

  function valueFrom(content,label){
    const re=new RegExp(`(?:^|\\n)\\s*${label}\\s*:\\s*([^\\n]+)`,`i`);
    return txt(String(content||"").match(re)?.[1]);
  }
  function afterLabel(content,label){
    const re=new RegExp(`${label}\\s*:\\s*([\\s\\S]*?)(?=\\n[A-Z][A-Za-z _&/-]{2,30}\\s*:|$)`,`i`);
    return txt(String(content||"").match(re)?.[1]);
  }

  function profileFromContexts(channelId,existing,contexts){
    const passport=contexts.find(x=>String(x.type).toUpperCase()==="CHANNEL_PASSPORT")?.content||"";
    const workflowCtx=contexts.find(x=>String(x.type).toUpperCase()==="WORKFLOW_RULES")?.content||"";
    const brand=contexts.find(x=>String(x.type).toUpperCase()==="BRAND_CANON")?.content||"";
    const productionFormat=valueFrom(workflowCtx,"Production format")||afterLabel(workflowCtx,"Production format");
    const workflow=valueFrom(workflowCtx,"Production workflow")||txt(existing?.workflow);
    const communication=valueFrom(brand,"Communication")||txt(existing?.communication);
    const canon=txt(brand.replace(/\s*Never overwrite locked data without owner approval\.?\s*$/i,""))||txt(existing?.canon);
    return {
      ...(existing||{}),
      id:channelId,
      name:txt(existing?.name)||valueFrom(passport,"Name")||channelId,
      code:txt(existing?.code)||valueFrom(passport,"Code"),
      platform:txt(existing?.platform)||valueFrom(passport,"Platform")||"Facebook",
      department:txt(existing?.department)||txt(existing?.dept)||valueFrom(passport,"Department"),
      category:txt(existing?.category)||valueFrom(passport,"Category"),
      cadence:txt(existing?.cadence)||valueFrom(passport,"Cadence"),
      mission:txt(existing?.mission)||valueFrom(passport,"Mission"),
      workflow,
      productionFormat:txt(existing?.productionFormat)||productionFormat,
      communication,
      canon
    };
  }

  function inferBatch(profile,channelId){
    if(SERIES[channelId])return {count:SERIES[channelId].length,series:SERIES[channelId]};
    const s=`${profile?.cadence||""}\n${profile?.workflow||""}\n${profile?.productionFormat||""}`.toLowerCase();
    const m=s.match(/(?:batch|series|materials?|posters?|captions?)[^\d]{0,20}([2-9])|([2-9])[^\d]{0,12}(?:series|materials?|posters?|captions?)/i);
    const count=Number(m?.[1]||m?.[2]||1);
    return {count:Number.isFinite(count)&&count>1?count:1,series:[]};
  }

  function defaultVisual(profile,channelId){
    if(VISUAL_POLICY[channelId])return VISUAL_POLICY[channelId];
    const cat=`${profile?.category||""} ${profile?.department||""}`.toLowerCase();
    if(/culture|religion|history|hindu|heritage/.test(cat))return {
      identity:"Documentary cultural editorial grounded in the actual subject named by the material; authentic environment and respectful visual details.",
      avoid:"unrelated stock portrait; random tourist/model; invented sacred detail"
    };
    if(/news|media|editorial/.test(cat))return {
      identity:"Credible current-affairs editorial visual centered on the actual event/object/place named by the material.",
      avoid:"generic stock portrait unrelated to the story; fabricated logos or people"
    };
    return {
      identity:"Channel-specific premium social editorial. The hero subject must directly represent the current material.",
      avoid:"unrelated stock portrait; random subject; visual that contradicts the material"
    };
  }

  function opFrom(body){
    const c=txt(body?.context?.copilot?.command)||txt(body?.messages?.slice(-1)?.[0]?.content);
    if(/^(k|konten|content)\b/i.test(c))return"K";
    if(/^(p|poster)\b/i.test(c))return"P";
    if(/^(c|caption)\b/i.test(c))return"C";
    if(/^(n|next|lanjut)\b/i.test(c))return"N";
    return"CHAT";
  }

  function enrichBody(body){
    if(!body||typeof body!=="object")return body;
    const stage=String(body?.context?.workerTask?.stage||"").toUpperCase();
    if(stage!=="COPILOT"&&stage!=="PRODUCE_COPILOT")return body;
    const channelId=txt(body?.context?.profile?.id)||txt(readMain()?.activeChannelId);
    if(!channelId)return body;
    const op=opFrom(body),contexts=fullContexts(channelId,op);
    const profile=profileFromContexts(channelId,body?.context?.profile||{},contexts);
    const batch=inferBatch(profile,channelId),visual=defaultVisual(profile,channelId);
    return {
      ...body,
      context:{
        ...(body.context||{}),
        profile,
        contexts,
        masterRuntime:{
          revision:REVISION,
          channelId,op,
          authoritativeContexts:true,
          contextCount:contexts.length,
          batchCount:batch.count,
          series:batch.series,
          visualIdentity:visual.identity,
          visualAvoid:visual.avoid,
          currentTime:new Date().toISOString(),
          policy:"CHANNEL_MASTER_FIRST_EXECUTE_NOT_INTERVIEW"
        },
        client:{...(body?.context?.client||{}),masterRuntimeRevision:REVISION}
      }
    };
  }

  function updateGate(channelId,op,ok){
    if(!channelId||!op)return;
    const s=runtimeState(),row=s.channels[channelId]||{};
    if(op==="K"||op==="N"){
      row.publishBlocked=true;row.posterReady=false;row.captionReady=false;row.reason=ok?"FRESH_MATERIAL_REQUIRES_P_C":"LATEST_K_N_FAILED";
    }else if(ok&&op==="P")row.posterReady=true;
    else if(ok&&op==="C")row.captionReady=true;
    if(row.posterReady&&row.captionReady){row.publishBlocked=false;row.reason="FRESH_P_C_READY";}
    row.updatedAt=new Date().toISOString();s.channels[channelId]=row;writeRuntime(s);
  }

  window.fetch = async function(input,init){
    let url="";
    try{url=typeof input==="string"?input:(input?.url||"");}catch{}
    if(!/\/api\/acc-ai(?:$|\?)/.test(url)||!init?.body)return originalFetch(input,init);
    let body=null;
    try{body=JSON.parse(init.body);}catch{return originalFetch(input,init);}
    const stage=String(body?.context?.workerTask?.stage||"").toUpperCase();
    if(stage!=="COPILOT"&&stage!=="PRODUCE_COPILOT")return originalFetch(input,init);
    const enriched=enrichBody(body),channelId=txt(enriched?.context?.profile?.id),op=opFrom(enriched);
    if(op==="K"||op==="N")updateGate(channelId,op,false);
    const response=await originalFetch(input,{...init,body:JSON.stringify(enriched)});
    try{
      const data=await response.clone().json();
      updateGate(channelId,op,Boolean(response.ok&&data?.ok));
    }catch{}
    return response;
  };

  function enforceUi(){
    const panel=document.getElementById("acc-produce-copilot-panel");if(!panel)return;
    const channelId=txt(panel.dataset.channelId);if(!channelId)return;
    const row=runtimeState()?.channels?.[channelId]||{};
    const publish=document.getElementById("acc-copilot-publish");
    if(publish&&row.publishBlocked){publish.disabled=true;publish.title=`Blocked: ${row.reason||"fresh K/P/C required"}`;}
    const badges=[...panel.querySelectorAll(".acc-copilot-badge")];
    const master=badges.find(x=>/MASTER CONTEXT/i.test(x.textContent||""));
    if(master){master.textContent=`MASTER RUNTIME • ${fullContexts(channelId,"K").length} CONTEXT`;master.classList.add("ok");}
  }

  const observer=new MutationObserver(()=>requestAnimationFrame(enforceUi));
  observer.observe(document.documentElement,{childList:true,subtree:true});
  setInterval(enforceUi,900);
  window.ACCChannelMasterRuntime=Object.freeze({revision:REVISION,enrichBody,fullContexts});
})();
