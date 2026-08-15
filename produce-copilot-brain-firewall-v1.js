// ACC OS X — PRODUCE COPILOT BRAIN FIREWALL V1
// One selected division = one isolated brain. Locked master contexts are authoritative.
(() => {
  "use strict";
  if (window.__ACC_PRODUCE_BRAIN_FIREWALL_V1__) return;
  window.__ACC_PRODUCE_BRAIN_FIREWALL_V1__ = true;

  const REVISION = "PRODUCE_BRAIN_FIREWALL_V1_R1";
  const STATE_KEY = "acc_os_x_ecosystem_v214";
  const PANEL_ID = "acc-produce-copilot-panel";
  const originalFetch = window.fetch.bind(window);
  const txt = v => typeof v === "string" ? v.trim() : "";
  const brainId = channelId => `acc-brain:${channelId}`;

  function readMain(){try{return JSON.parse(localStorage.getItem(STATE_KEY)||"{}");}catch{return {};}}
  function field(content,label){
    const re=new RegExp(`^\\s*${label.replace(/[.*+?^${}()|[\\]\\]/g,"\\$&")}\\s*:\\s*(.+)$`,"im");
    return txt(String(content||"").match(re)?.[1]);
  }
  function lockedContexts(channelId,incoming){
    const main=readMain();
    const source=Array.isArray(main?.ai?.contexts?.[channelId])?main.ai.contexts[channelId]:(Array.isArray(incoming)?incoming:[]);
    const expectedBrain=brainId(channelId),out=[];
    for(const row of source){
      if(!row||row.active===false)continue;
      const owner=txt(row.channelId||row.profileId);
      const ownerBrain=txt(row.brainId);
      if(owner&&owner!==channelId)continue;
      if(ownerBrain&&ownerBrain!==expectedBrain)continue;
      out.push({...row,channelId,profileId:channelId,brainId:expectedBrain,locked:true,authority:"CHANNEL_MASTER",active:true});
      if(out.length>=16)break;
    }
    return out;
  }
  function parseMaster(channelId,contexts,profile){
    const passport=contexts.find(x=>String(x?.type||"").toUpperCase()==="CHANNEL_PASSPORT");
    const workflow=contexts.find(x=>String(x?.type||"").toUpperCase()==="WORKFLOW_RULES");
    const canon=contexts.find(x=>String(x?.type||"").toUpperCase()==="BRAND_CANON");
    const ptxt=txt(passport?.content),wtxt=txt(workflow?.content),ctxt=txt(canon?.content);
    const workflowValue=field(wtxt,"Production workflow")||txt(profile?.workflow);
    const productionFormat=field(wtxt,"Production format")||txt(profile?.productionFormat);
    const communication=field(ctxt,"Communication")||txt(profile?.communication);
    let canonValue=txt(profile?.canon);
    if(ctxt){canonValue=txt(ctxt.split(/\n\s*Communication\s*:/i)[0])||canonValue;}
    const next={...profile};
    next.id=channelId;
    next.code=field(ptxt,"Code")||txt(profile?.code);
    next.name=field(ptxt,"Name")||txt(profile?.name)||channelId;
    next.platform=field(ptxt,"Platform")||txt(profile?.platform)||"Facebook";
    next.department=field(ptxt,"Department")||txt(profile?.department||profile?.dept);
    next.dept=next.department;
    next.category=field(ptxt,"Category")||txt(profile?.category);
    next.cadence=field(ptxt,"Cadence")||txt(profile?.cadence);
    next.mission=field(ptxt,"Mission")||txt(profile?.mission);
    next.workflow=workflowValue;
    next.productionFormat=productionFormat;
    next.communication=communication;
    next.canon=canonValue;
    return next;
  }
  const WORD_NUM={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,satu:1,dua:2,tiga:3,empat:4,lima:5,enam:6,tujuh:7,delapan:8};
  function deriveBatch(contexts){
    const row=contexts.find(x=>String(x?.type||"").toUpperCase()==="WORKFLOW_RULES");
    const s=txt(row?.content);if(!s)return null;
    let count=Number(s.match(/\bK\s*=\s*(\d+)\b/i)?.[1]||0);
    if(!count)count=Number(s.match(/\b(\d+)\s*(?:series|seri|contents?|konten|posts?|reels?|slots?|sessions?)\b/i)?.[1]||0);
    if(!count){const m=s.match(/\b(one|two|three|four|five|six|seven|eight|satu|dua|tiga|empat|lima|enam|tujuh|delapan)[-\s]*(?:series|seri|contents?|konten|posts?|reels?|slots?|sessions?)\b/i);if(m)count=WORD_NUM[m[1].toLowerCase()]||0;}
    if(!(count>=1&&count<=8))return null;
    let series=[];
    const numbered=[...s.matchAll(/(?:^|[,;:]\s*)\d+\)\s*([^,;\n.]+)/g)].map(m=>txt(m[1])).filter(Boolean);
    if(numbered.length>=count)series=numbered.slice(0,count);
    if(series.length!==count){
      const m=s.match(/(?:series|seri|slots?|contents?|konten)\s*:\s*([^\n.]+)/i);
      if(m){const parts=m[1].split(/\s*;\s*/).map(txt).filter(Boolean);if(parts.length>=count)series=parts.slice(0,count);}
    }
    return {count,series};
  }
  function hardenBody(body){
    const stage=String(body?.context?.workerTask?.stage||"").toUpperCase();
    if(stage!=="COPILOT"&&stage!=="PRODUCE_COPILOT")return body;
    const channelId=txt(body?.context?.profile?.id);if(!channelId)return body;
    const expectedBrain=brainId(channelId),next=structuredClone(body),ctx=next.context=next.context||{};
    const contexts=lockedContexts(channelId,ctx.contexts);
    ctx.contexts=contexts;
    ctx.profile=parseMaster(channelId,contexts,ctx.profile||{});
    const batch=deriveBatch(contexts),mr=ctx.masterRuntime=ctx.masterRuntime||{};
    if(batch?.count)mr.batchCount=batch.count;
    if(batch?.series?.length===batch?.count)mr.series=batch.series;
    mr.workflowAuthority="CHANNEL_MASTER_LOCK";
    mr.globalEngineRole="EXECUTION_ONLY";
    mr.brainId=expectedBrain;
    ctx.brainLock={revision:REVISION,channelId,brainId:expectedBrain,isolation:"HARD_1_TO_1",workflowAuthority:"CHANNEL_MASTER_LOCK",contextAuthority:"LOCKED_MASTER_CONTEXTS",globalEngineRole:"EXECUTION_ONLY",contextCount:contexts.length};
    ctx.copilot=ctx.copilot||{};
    ctx.copilot.brainId=expectedBrain;
    ctx.copilot.packageChannelId=channelId;
    return next;
  }
  window.fetch=async(input,init={})=>{
    const url=typeof input==="string"?input:input?.url||"",method=String(init?.method||(typeof input!=="string"?input?.method:"GET")||"GET").toUpperCase();
    if(method==="POST"&&/\/api\/acc-ai(?:$|\?)/.test(url)&&typeof init?.body==="string"){
      try{const body=JSON.parse(init.body),next=hardenBody(body);init={...init,body:JSON.stringify(next)};}catch{}
    }
    return originalFetch(input,init);
  };
  function paint(){
    const panel=document.getElementById(PANEL_ID);if(!panel)return;
    let badge=panel.querySelector("[data-brain-firewall]");
    if(!badge){badge=document.createElement("span");badge.dataset.brainFirewall="1";badge.className="acc-copilot-badge ok";panel.querySelector(".acc-copilot-badges")?.prepend(badge);}
    badge.textContent="BRAIN LOCK • 1:1";
  }
  const obs=new MutationObserver(()=>requestAnimationFrame(paint));obs.observe(document.documentElement,{childList:true,subtree:true});
  setInterval(paint,1000);paint();
  window.ACCProduceBrainFirewall=Object.freeze({revision:REVISION,brainId,harden:hardenBody});
})();
