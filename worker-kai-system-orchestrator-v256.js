// ACC OS X — BUILD 256 KAI SYSTEM ORCHESTRATOR
// Evidence-grounded SYSTEM/CTO mode for ACC OS X. Read-only by design.
// Production stages, Meta publishing, tokens and channel workflows are untouched.

const REVISION = "BUILD256_KAI_SYSTEM_ORCHESTRATOR";
const DIRECTOR_MODEL = "@cf/qwen/qwen3-30b-a3b-fp8";
const CRITIC_MODEL = "@cf/zai-org/glm-4.7-flash";
const REPO_RAW_BASE = "https://raw.githubusercontent.com/ardarawk-cloud/ACC-OS-X/main/";
const REPO_FILES = [
  "wrangler.jsonc",
  "acc-deploy-target.json",
  "version.json",
  "build-info.json",
  "package.json",
  "worker-build254-gate.js"
];
const text = v => typeof v === "string" ? v.trim() : "";

function json(payload,status=200,headersLike=null){
  const headers=new Headers(headersLike||{});
  headers.set("Content-Type","application/json;charset=UTF-8");
  headers.set("Cache-Control","no-store");
  headers.set("Access-Control-Allow-Origin","*");
  return new Response(JSON.stringify(payload,null,2),{status,headers});
}

function modelText(result){
  const candidates=[
    result?.response,result?.result?.response,result?.text,result?.result?.text,
    result?.choices?.[0]?.message?.content,result?.result?.choices?.[0]?.message?.content,
    result?.output_text,result?.result?.output_text
  ];
  for(const value of candidates){
    if(!text(value))continue;
    return text(value).replace(/<think>[\s\S]*?<\/think>/gi,"").replace(/^```(?:text)?\s*|\s*```$/gi,"").trim();
  }
  if(typeof result==="string")return text(result).replace(/<think>[\s\S]*?<\/think>/gi,"").trim();
  return "";
}

async function runOnce(env,model,system,user,max_tokens=2200,temperature=.2){
  if(!env?.AI)throw new Error("AI binding unavailable");
  const result=await env.AI.run(model,{messages:[{role:"system",content:system},{role:"user",content:user}],max_tokens,temperature});
  const out=modelText(result);
  if(!out)throw new Error(`${model} returned empty output`);
  return out;
}

async function runResilient(env,primary,fallback,system,user,max_tokens=2200,temperature=.2){
  let lastError=null;
  for(const model of [primary,fallback]){
    if(!model)continue;
    try{return await runOnce(env,model,system,user,max_tokens,temperature);}catch(error){lastError=error;}
  }
  throw lastError||new Error("AI model returned no usable output");
}

async function fetchEvidenceUrl(url,timeoutMs=3500){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch(url,{method:"GET",headers:{Accept:"application/json,text/plain,*/*","Cache-Control":"no-cache"},cache:"no-store",signal:controller.signal});
    const body=await response.text();
    return {ok:response.ok,status:response.status,body:body.slice(0,18000)};
  }catch(error){
    return {ok:false,status:0,error:String(error?.message||error).slice(0,240),body:""};
  }finally{clearTimeout(timer);}
}

function latestUserMessage(body){
  const rows=Array.isArray(body?.messages)?body.messages:[];
  for(let i=rows.length-1;i>=0;i--){
    if(String(rows[i]?.role||"").toLowerCase()==="user"&&text(rows[i]?.content))return text(rows[i].content);
  }
  return rows.map(x=>text(x?.content)).filter(Boolean).join("\n").slice(-8000);
}

function contextSummary(body){
  const context=body?.context||{};
  const profile=context?.profile||{};
  return {
    profile:{id:profile.id||"",name:profile.name||"",category:profile.category||"",platform:profile.platform||"",workflow:profile.workflow||"",canon:profile.canon||""},
    workerTask:context?.workerTask||null,
    contexts:(Array.isArray(context?.contexts)?context.contexts:[]).slice(0,6).map(x=>({title:x?.title||"",content:text(x?.content).slice(0,1600)}))
  };
}

async function collectEvidence(request,body){
  const repoResults=await Promise.all(REPO_FILES.map(async path=>{
    const result=await fetchEvidenceUrl(`${REPO_RAW_BASE}${encodeURI(path)}?t=${Date.now()}`);
    return {path,...result};
  }));

  let health={ok:false,status:0,error:"Live health not checked",body:""};
  try{
    const current=new URL(request.url);
    const healthUrl=new URL("/health",current.origin);
    health=await fetchEvidenceUrl(`${healthUrl.toString()}?system_probe=${Date.now()}`,3200);
  }catch(error){
    health={ok:false,status:0,error:String(error?.message||error).slice(0,240),body:""};
  }

  return {
    orchestrator:{revision:REVISION,mode:"READ_ONLY_EVIDENCE_GROUNDED",directorModel:DIRECTOR_MODEL,criticModel:CRITIC_MODEL},
    capabilities:{
      repoRead:"ACTIVE_PUBLIC_RAW_GITHUB",
      repoWrite:"UNAVAILABLE",
      liveHealthRead:health.ok?"ACTIVE":"UNAVAILABLE",
      deployWrite:"UNAVAILABLE",
      localAccContext:"ACTIVE_FROM_REQUEST",
      productionMutation:"UNAVAILABLE_IN_SYSTEM_MODE"
    },
    liveHealth:health,
    repoFiles:repoResults,
    accContext:contextSummary(body)
  };
}

function evidencePacket(evidence){
  const files=evidence.repoFiles.map(item=>[
    `FILE: ${item.path}`,
    `FETCH: ${item.ok?`OK HTTP ${item.status}`:`FAILED ${item.error||`HTTP ${item.status}`}`}`,
    item.body?`CONTENT:\n${item.body}`:"CONTENT: UNAVAILABLE"
  ].join("\n")).join("\n\n---\n\n");

  return [
    `ORCHESTRATOR:\n${JSON.stringify(evidence.orchestrator,null,2)}`,
    `CAPABILITIES:\n${JSON.stringify(evidence.capabilities,null,2)}`,
    `LIVE HEALTH:\n${evidence.liveHealth.ok?evidence.liveHealth.body:`UNAVAILABLE: ${evidence.liveHealth.error||evidence.liveHealth.status}`}`,
    `ACC REQUEST CONTEXT:\n${JSON.stringify(evidence.accContext,null,2)}`,
    `REPOSITORY EVIDENCE:\n${files}`
  ].join("\n\n========\n\n");
}

async function director(env,userRequest,evidence,critique=""){
  const system=[
    "You are KAI SYSTEM ORCHESTRATOR for ACC OS X, operating as an evidence-grounded CTO assistant.",
    "You are NOT a generic chatbot. Use only the supplied live/repository evidence for factual system claims.",
    "Hard rule: NO EVIDENCE = NO CLAIM. FACT BEFORE CONFIDENCE. VERIFY BEFORE READY.",
    "Current SYSTEM mode is READ-ONLY. repoWrite, deployWrite and productionMutation are UNAVAILABLE.",
    "Therefore you MUST NOT claim that you edited files, implemented patches, deployed changes, fixed code, or changed production state.",
    "If the user asks to implement something, separate what can be audited now from what requires an external write-capable operator.",
    "Do not call a subsystem healthy merely because no error appears in the user prompt. Health claims require evidence in LIVE HEALTH or repository evidence.",
    "When evidence conflicts, explicitly report the conflict instead of choosing the nicer answer.",
    "Distinguish VERIFIED, INFERRED and NOT VERIFIED statements.",
    "Be concise and useful for an owner working from a phone.",
    "Do not expose secrets, tokens, internal credentials or fabricate access.",
    "Finish with a CAPABILITY STATUS block showing REPO READ, REPO WRITE, LIVE HEALTH READ and DEPLOY WRITE."
  ].join("\n");
  const user=[
    `OWNER REQUEST:\n${userRequest}`,
    `SYSTEM EVIDENCE:\n${evidencePacket(evidence)}`,
    critique?`CRITIC REQUIRED CORRECTIONS:\n${critique}`:"",
    "Answer only from this evidence. If a requested action cannot actually be performed, say so explicitly."
  ].filter(Boolean).join("\n\n");
  return runResilient(env,DIRECTOR_MODEL,CRITIC_MODEL,system,user,2600,.18);
}

async function critic(env,userRequest,evidence,candidate){
  const system=[
    "You are the independent ACC OS X System Evidence Critic.",
    "Audit the candidate for unsupported technical claims, fake implementation claims, false deployment claims, invented access, and contradictions with evidence.",
    "The orchestrator is READ-ONLY: repoWrite=UNAVAILABLE, deployWrite=UNAVAILABLE, productionMutation=UNAVAILABLE.",
    "Any claim that files were changed, code implemented, deployment performed, or production mutated is an automatic REVISE unless explicit write evidence exists (none is provided in this mode).",
    "Return exactly two lines:",
    "VERDICT: PASS or REVISE",
    "ISSUES: concise list of unsupported/incorrect claims, or NONE"
  ].join("\n");
  return runResilient(env,CRITIC_MODEL,DIRECTOR_MODEL,system,[
    `REQUEST:\n${userRequest}`,
    `CAPABILITIES:\n${JSON.stringify(evidence.capabilities)}`,
    `LIVE HEALTH AVAILABLE: ${evidence.liveHealth.ok}`,
    `REPO FILES FETCHED: ${evidence.repoFiles.filter(x=>x.ok).map(x=>x.path).join(", ")||"NONE"}`,
    `CANDIDATE:\n${candidate}`
  ].join("\n\n"),900,.03);
}

function verdict(raw){
  const match=String(raw||"").match(/^\s*VERDICT\s*:\s*(PASS|REVISE)\b/im);
  const issueMatch=String(raw||"").match(/^\s*ISSUES\s*:\s*([\s\S]*)/im);
  return {pass:String(match?.[1]||"").toUpperCase()==="PASS",issues:text(issueMatch?.[1])||"Unspecified evidence issue"};
}

function capabilityFooter(evidence){
  const fetched=evidence.repoFiles.filter(x=>x.ok).map(x=>x.path);
  return [
    "",
    "SYSTEM VERIFICATION",
    `ORCHESTRATOR: ${REVISION}`,
    `REPO READ: ${evidence.capabilities.repoRead}`,
    `REPO WRITE: ${evidence.capabilities.repoWrite}`,
    `LIVE HEALTH READ: ${evidence.capabilities.liveHealthRead}`,
    `DEPLOY WRITE: ${evidence.capabilities.deployWrite}`,
    `EVIDENCE FILES: ${fetched.length?fetched.join(", "):"NONE"}`
  ].join("\n");
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(!(request.method==="POST"&&url.pathname==="/api/acc-ai")){
      return json({ok:false,status:"SYSTEM_ROUTE_ONLY",revision:REVISION},405);
    }

    let body;
    try{body=await request.clone().json();}catch{return json({ok:false,status:"INVALID_JSON",revision:REVISION},400);}
    const ownerRequest=latestUserMessage(body);
    if(!ownerRequest)return json({ok:false,status:"EMPTY_REQUEST",revision:REVISION},400);

    try{
      const evidence=await collectEvidence(request,body);
      let reply=await director(env,ownerRequest,evidence);
      const firstCritique=await critic(env,ownerRequest,evidence,reply);
      const firstVerdict=verdict(firstCritique);
      let boardPasses=1;
      let criticIssues=firstVerdict.issues;

      if(!firstVerdict.pass){
        reply=await director(env,ownerRequest,evidence,firstVerdict.issues);
        boardPasses=2;
        const secondCritique=await critic(env,ownerRequest,evidence,reply);
        const secondVerdict=verdict(secondCritique);
        criticIssues=secondVerdict.issues;
        if(!secondVerdict.pass){
          return json({
            ok:false,stage:"SYSTEM",status:"SYSTEM_EVIDENCE_BLOCKED",
            error:"KAI System response was blocked because the evidence critic still found unsupported claims.",
            errorDetail:{code:"SYSTEM_EVIDENCE_BLOCKED",revision:REVISION,issues:secondVerdict.issues},
            provider:"ACC OS X KAI System Orchestrator",
            model:DIRECTOR_MODEL
          },422);
        }
      }

      reply=`${reply.trim()}${capabilityFooter(evidence)}`;
      return json({
        ok:true,
        stage:"SYSTEM",
        reply,
        provider:"ACC OS X + KAI System Orchestrator 256",
        model:DIRECTOR_MODEL,
        criticModel:CRITIC_MODEL,
        kaiSystem:{
          revision:REVISION,
          mode:"READ_ONLY_EVIDENCE_GROUNDED",
          boardPasses,
          criticIssues,
          capabilities:evidence.capabilities,
          evidenceFiles:evidence.repoFiles.filter(x=>x.ok).map(x=>x.path),
          liveHealthVerified:evidence.liveHealth.ok
        }
      });
    }catch(error){
      return json({
        ok:false,stage:"SYSTEM",status:"SYSTEM_ORCHESTRATOR_FAILED",
        error:`SYSTEM_ORCHESTRATOR_FAILED: ${String(error?.message||error)}`,
        errorDetail:{code:"SYSTEM_ORCHESTRATOR_FAILED",revision:REVISION,message:String(error?.message||error)},
        provider:"ACC OS X KAI System Orchestrator",
        model:DIRECTOR_MODEL
      },500);
    }
  }
};
