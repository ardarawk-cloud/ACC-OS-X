// ACC OS X — BUILD 257.8 PRODUCE + PUBLISH STABLE
// One client authority for single and batch K/P/C/N, durable poster media, and per-item publishing.
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
  const uid = prefix => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  let runtimeBusy = false;
  const mediaMemory = new Map();

  function readMain(){try{return JSON.parse(localStorage.getItem(MAIN_STATE_KEY)||"{}");}catch{return {};}}
  function emptyPackage(){
    return {
      generationId:"",material:"",caption:"",posterMediaKey:"",posterHeadline:"",posterSubhead:"",
      batchCount:1,batchLabels:[],batchPosters:[],batchCaptions:[],batchPublished:[],
      publishedPostId:"",publishedAt:"",publishState:"IDLE",lastPublishError:"",lastPublishErrorIndex:-1
    };
  }
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
      if(typeof x==="string")return x?{postId:x,publishedAt:""}:null;
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
      delete row.package.posterBase64;
      delete row.package.posterDataUrl;
      if(Array.isArray(row.package.batchPosters)){
        row.package.batchPosters=row.package.batchPosters.map(x=>{const y={...x};delete y.base64;delete y.image;delete y.dataUrl;return y;});
      }
      if(Array.isArray(row.messages))row.messages=row.messages.slice(-40).map(m=>{const y={...m};delete y.image;return y;});
    }
    return clone;
  }
  function saveStore(){try{localStorage.setItem(COPILOT_KEY,JSON.stringify(sanitizedStore()));}catch(error){console.warn("[PRODUCE STORE]",error);}}
  function lane(channelId){
    if(!store.channels[channelId])store.channels[channelId]={messages:[],package:emptyPackage(),updatedAt:now()};
    const row=store.channels[channelId];row.messages=Array.isArray(row.messages)?row.messages:[];row.package=normalizePackage(row.package);return row;
  }
  function addMessage(channelId,role,content,type="text",extra={}){
    const row=lane(channelId);row.messages.push({id:uid("msg"),role,content:txt(content),type,at:now(),...extra});row.messages=row.messages.slice(-40);row.updatedAt=now();saveStore();return row.messages[row.messages.length-1];
  }

  function openMediaDb(){
    return new Promise((resolve,reject)=>{
      if(!("indexedDB" in window))return reject(new Error("INDEXEDDB_UNAVAILABLE"));
    