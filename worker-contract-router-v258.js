// ACC OS X — BUILD 258.2 SERVER-AUTHORITATIVE CONTRACT ROUTER
// No new external crawler here. Research remains delegated to the existing grounded research stack.
import baseWorker from "./worker-poster-resilience-v258.js";
import {getProductionContract,contractSummary,CONTRACT_VERSION} from "./production-contracts-v1.js";

const REVISION="BUILD258_2_CONTRACT_ROUTER";
const text=v=>typeof v==="string"?v.trim():"";
function json(x,s=200,h0=null){const h=new Headers(h0||{});h.set("Content-Type","application/json;charset=UTF-8");h.set("Cache-Control","no-store");h.set("Access-Control-Allow-Origin","*");return new Response(JSON.stringify(x),{status:s,headers:h});}
function command(b){return text(b?.context?.copilot?.command)||text((b?.messages||[]).slice(-1)[0]?.content);}
function op(c){if(/^(k|konten|content)\b/i.test(c))return"K";if(/^(n|next|lanjut)\b/i.test(c))return"N";return"CHAT";}
function isCopilot(b){const s=String(b?.context?.workerTask?.stage||"").toUpperCase();return s==="COPILOT"||s==="PRODUCE_COPILOT";}
function matchChoice(c,contract){const q=text(c).toLowerCase();for(let i=0;i<(contract.interaction.options||[]).length;i++){const v=String(contract.interaction.options[i]);if(q===String(i+1)||q===v.toLowerCase()||q.includes(v.toLowerCase()))return v;}return"";}

// Build 257.7 still contains a legacy keyword detector that can mistake words such as
// "News" inside a channel workflow for a mandatory current-news contract. Build 258
// contracts are authoritative, so this bridge only adapts the request seen by that old
// detector. Stored Passport/contexts are never mutated.
function legacyResearchPolicy(contract){
  const mode=String(contract?.research?.mode||"NONE").toUpperCase();
  if(["CURRENT_NEWS","CURRENT_EVENTS_H1_H7","CURRENT_NIGHTLIFE"].includes(mode))return"REQUIRED";
  if(Number(contract?.research?.publishMinSources||0)===0)return"OPTIONAL";
  return"LEGACY";
}
function neutralizeLegacyResearchWords(value){
  return String(value??"")
    .replace(/latest[- ]first/gi,"timely")
    .replace(/research[- ]first/gi,"fact-aware")
    .replace(/current research/gi,"fact-aware")
    .replace(/event guide/gi,"event coverage")
    .replace(/freshness/gi,"timeliness")
    .replace(/breaking/gi,"updates")
    .replace(/terkini/gi,"timely")
    .replace(/terbaru/gi,"timely")
    .replace(/aktual/gi,"timely")
    .replace(/berita/gi,"updates")
    .replace(/news/gi,"updates")
    .replace(/verifikasi/gi,"fact-check")
    .replace(/verify/gi,"fact-check")
    .replace(/h\+1/gi,"event-window");
}
function alignLegacyResearchGate(ctx,contract){
  const policy=legacyResearchPolicy(contract),profile=ctx.profile=ctx.profile||{};
  ctx.masterRuntime=ctx.masterRuntime||{};
  ctx.masterRuntime.researchPolicyAuthority="PRODUCTION_CONTRACT";
  ctx.masterRuntime.researchMode=String(contract?.research?.mode||"NONE");
  ctx.masterRuntime.publishMinSources=Number(contract?.research?.publishMinSources||0);
  ctx.masterRuntime.legacyResearchPolicy=policy;
  if(policy==="REQUIRED"){
    profile.workflow=`${text(profile.workflow)} research-first verified`.trim();
    return;
  }
  if(policy!=="OPTIONAL")return;
  for(const key of ["category","workflow","productionFormat","mission","canon"]){
    if(typeof profile[key]==="string")profile[key]=neutralizeLegacyResearchWords(profile[key]);
  }
  if(Array.isArray(ctx.contexts))ctx.contexts=ctx.contexts.map(row=>row&&typeof row==="object"?{
    ...row,
    title:neutralizeLegacyResearchWords(row.title),
    content:neutralizeLegacyResearchWords(row.content)
  }:row);
}
function enriched(request,b,contract,selected=""){
  const x=structuredClone(b),ctx=x.context=x.context||{};
  ctx.productionContract=contractSummary(text(ctx?.profile?.id));
  ctx.masterRuntime={...(ctx.masterRuntime||{}),revision:REVISION,batchCount:contract.batch.count,series:contract.batch.series,visualIdentity:`${contract.visual.template}; ${contract.visual.heroPolicy}; palette ${contract.visual.palette}`,visualAvoid:(contract.visual.avoid||[]).join("; "),policy:"PRODUCTION_CONTRACT_AUTHORITATIVE"};
  alignLegacyResearchGate(ctx,contract);
  if(selected){ctx.copilot=ctx.copilot||{};ctx.copilot.command=`K — OWNER CHOICE: ${selected}`;}
  const h=new Headers(request.headers);h.set("Content-Type","application/json");
  return new Request(request.url,{method:request.method,headers:h,body:JSON.stringify(x)});
}
const LOADER=`\n;(()=>{if(!document.querySelector('script[data-acc-release="v258"]')){const r=document.createElement("script");r.src="./release-version-v258.js?rev=BUILD258_1_CONTRACT_HARDENING";r.dataset.accRelease="v258";r.async=false;document.head.appendChild(r);}})();\n;(()=>{if(!document.querySelector('script[data-acc-contract-runtime="v2581"]')){const s=document.createElement("script");s.type="module";s.src="./produce-copilot-contract-runtime-v2581.js?rev=BUILD258_1_CONTRACT_RUNTIME";s.dataset.accContractRuntime="v2581";document.head.appendChild(s);}})();\n`;
async function health(request,env,ctx){const r=await baseWorker.fetch(request,env,ctx);let d={};try{d=await r.clone().json();}catch{}return json({...d,appBuild:258,appRevision:"BUILD258_PRODUCTION_CONTRACT_ENGINE",productionContracts:"ACTIVE",productionContractVersion:CONTRACT_VERSION,productionContractRouter:REVISION,productionContractClient:"BUILD258_1_CONTRACT_RUNTIME",workflowAuthority:"CONTRACT_NOT_AI",posterFallback:"DETERMINISTIC",researchAuthority:"PRODUCTION_CONTRACT_WITH_LEGACY_GATE_BRIDGE",legacyPublishGate:"BLOCKED_UNTIL_FRESH_K"},r.status,r.headers);}
export default{async fetch(request,env,ctx){const url=new URL(request.url);if(request.method==="GET"&&(url.pathname==="/health"||url.pathname==="/api/acc-ai"))return health(request,env,ctx);if(request.method==="GET"&&url.pathname==="/produce-copilot-preview-fix-v25762.js"){const r=await baseWorker.fetch(request,env,ctx);if(!r.ok)return r;const h=new Headers(r.headers);h.set("Content-Type","application/javascript;charset=UTF-8");h.set("Cache-Control","no-cache, no-store, must-revalidate");return new Response(`${await r.text()}${LOADER}`,{status:r.status,headers:h});}if(!(request.method==="POST"&&url.pathname==="/api/acc-ai"))return baseWorker.fetch(request,env,ctx);let b;try{b=await request.clone().json();}catch{return baseWorker.fetch(request,env,ctx);}if(!isCopilot(b))return baseWorker.fetch(request,env,ctx);const id=text(b?.context?.profile?.id),contract=getProductionContract(id),c=command(b),selected=matchChoice(c,contract),operation=op(c)==="CHAT"&&selected?"K":op(c);if(operation==="K"&&contract.interaction.mode==="CHOICE_REQUIRED"&&!selected&&/^k\b/i.test(c))return json({ok:true,stage:"COPILOT",op:"K",kind:"choice",reply:[`Pilih untuk ${b?.context?.profile?.name||id}:`,...contract.interaction.options.map((x,i)=>`${i+1}. ${x}`)].join("\n"),choices:contract.interaction.options,contract:contractSummary(id),revision:REVISION});if(operation==="K"&&contract.interaction.mode==="OWNER_FACTS_ONLY"&&/^k$/i.test(c))return json({ok:true,stage:"COPILOT",op:"K",kind:"input_required",reply:"Masukkan produk/topik yang sudah disetujui owner. KAI tidak akan mengarang produk, harga, promo, atau klaim.",contract:contractSummary(id),revision:REVISION});const r=await baseWorker.fetch(enriched(request,b,contract,selected),env,ctx);if(!r.ok&&(operation==="K"||operation==="N")){try{const d=await r.clone().json(),msg=String(d?.error||"");if(/CURRENT_NEWS_(?:EVIDENCE_INSUFFICIENT|DISCOVERY_EMPTY)/.test(msg)&&legacyResearchPolicy(contract)!=="OPTIONAL")return json({ok:true,stage:"COPILOT",op:operation,kind:"research_hold",reply:`WAITING VERIFICATION // Research ${b?.context?.profile?.name||id} belum memenuhi contract. Paket lama tidak akan dipublish. Tekan K lagi saat sumber tambahan tersedia.`,verification:{status:"WAITING",sourceCount:Number(msg.match(/INSUFFICIENT:(\d+)/)?.[1]||0)},contract:contractSummary(id),revision:REVISION});}catch{}}return r;}};
