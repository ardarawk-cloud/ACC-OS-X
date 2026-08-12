// ACC OS X — BUILD 253 KAI CREATIVE CLIENT BRIDGE
// Captures server creative-director metadata and binds it to Studio Poster QC proof.
(() => {
  "use strict";
  if (window.__ACC_KAI_CREATIVE_CLIENT__) return;
  const REVISION = "BUILD253_KAI_CREATIVE_CLIENT_V1";
  const STATE_KEY = "acc_os_x_ecosystem_v214";
  const upstreamFetch = window.fetch.bind(window);
  const state = { editorial:null, poster:null };
  const txt = v => typeof v === "string" ? v.trim() : "";

  const stageOf = body => {
    const s=String(body?.context?.workerTask?.stage||"").toUpperCase();
    if(s==="MATERIAL")return "SCRIPT";
    if(s==="PUBLISH")return "PUBLISHING";
    if(["RESEARCH","SCRIPT","POSTER","CAPTION","QC","PUBLISHING"].includes(s))return s;
    const joined=(Array.isArray(body?.messages)?body.messages:[]).map(m=>txt(m?.content)).join("\n");
    const m=joined.match(/(?:^|\n)STAGE:\s*(RESEARCH|SCRIPT|POSTER|CAPTION|QC|PUBLISHING)\b/i);
    return m?String(m[1]).toUpperCase():"";
  };

  const readLocal = () => {
    try{return JSON.parse(localStorage.getItem(STATE_KEY)||"{}");}catch{return {};}
  };
  const latestResearch = channelId => {
    const assets=Array.isArray(readLocal()?.assets)?readLocal().assets:[];
    return assets.find(a=>a?.channelId===channelId&&String(a?.stage||"").toUpperCase()==="RESEARCH"&&txt(a?.output))||null;
  };
  const researchUrls = channelId => {
    const raw=txt(latestResearch(channelId)?.output);
    const found=[];
    for(const m of raw.matchAll(/https?:\/\/[^\s<>"')\]]+/gi)){
      const u=String(m[0]||"").replace(/[.,;:!?]+$/g,"");
      if(u&&!found.includes(u))found.push(u);
    }
    return found.slice(0,8);
  };
  const hosts = urls => {
    const out=[];
    for(const raw of urls){try{const h=new URL(raw).hostname.replace(/^www\./i,"");if(h&&!out.includes(h))out.push(h);}catch{}}
    return out;
  };

  const augmentStudioMeta = channelId => {
    const meta=window.__ACC_STUDIO_POSTER_LAST__;
    if(!meta||meta.channelId!==channelId)return meta||null;
    const urls=researchUrls(channelId);
    const poster=state.poster;
    const editorial=state.editorial;
    meta.sourceCount=Math.max(Number(meta.sourceCount||0),urls.length);
    meta.verifiedSourceHosts=hosts(urls).slice(0,4);
    meta.kaiCreativeEngineRevision=txt(poster?.revision)||txt(editorial?.revision)||null;
    meta.kaiCreativeClientRevision=REVISION;
    meta.kaiEditorialScore=Number(editorial?.editorialScore||0);
    meta.kaiCreativeScore=Number(poster?.creativeScore||0);
    meta.kaiArtDirectionScore=Number(poster?.artDirectionScore||0);
    meta.kaiCreativeRole=txt(poster?.role)||null;
    meta.intelligenceGate="KAI_CREATIVE_CRITIC_V1";
    meta.evidenceScore=Math.min(10,Math.max(0,Number(meta.factsCount||0)*1.5)+Math.min(4,urls.length*2));
    window.__ACC_STUDIO_POSTER_LAST__=meta;
    return meta;
  };

  window.fetch = async (input,init={}) => {
    let parsedBody=null, stage="", channelId="";
    try{
      const url=typeof input==="string"?input:input?.url||"";
      const method=String(init?.method||(typeof input!=="string"?input?.method:"GET")||"GET").toUpperCase();
      if(method==="POST"&&/\/api\/acc-ai(?:\?|$)/.test(url)&&typeof init?.body==="string"){
        parsedBody=JSON.parse(init.body); stage=stageOf(parsedBody); channelId=txt(parsedBody?.context?.profile?.id);
        if(stage==="QC"&&channelId){
          const meta=augmentStudioMeta(channelId);
          if(meta){
            parsedBody.context=parsedBody.context||{};
            parsedBody.context.studioPosterQuality=meta;
            parsedBody.context.kaiCreativeQuality={editorial:state.editorial,poster:state.poster,clientRevision:REVISION};
            init={...init,body:JSON.stringify(parsedBody)};
          }
        }
      }
    }catch{}

    const response=await upstreamFetch(input,init);
    try{
      if((stage==="SCRIPT"||stage==="POSTER")&&response?.ok){
        const data=await response.clone().json();
        if(data?.kaiCreative&&typeof data.kaiCreative==="object"){
          if(stage==="SCRIPT")state.editorial={...data.kaiCreative,capturedAt:new Date().toISOString(),channelId};
          if(stage==="POSTER")state.poster={...data.kaiCreative,capturedAt:new Date().toISOString(),channelId};
          window.__ACC_KAI_CREATIVE_LAST__={...state,revision:REVISION};
        }
      }
    }catch{}
    return response;
  };

  window.__ACC_KAI_CREATIVE_CLIENT__={revision:REVISION,getState:()=>JSON.parse(JSON.stringify(state)),augmentStudioMeta};
})();
