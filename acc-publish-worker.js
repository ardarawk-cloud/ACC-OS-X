// ACC OS X R6.10A.1 — Standalone Cloudflare Worker Connector API
// Stage: SERVER_MOCK proof-of-life. Facebook credentials are NOT used yet.
const json=(body,status=200,origin="*")=>new Response(JSON.stringify(body),{
  status,
  headers:{
    "content-type":"application/json;charset=UTF-8",
    "cache-control":"no-store",
    "access-control-allow-origin":origin,
    "access-control-allow-methods":"GET,POST,OPTIONS",
    "access-control-allow-headers":"Content-Type,X-ACC-Access-Code",
    "vary":"Origin"
  }
});
const safeEq=(a,b)=>{a=String(a||"");b=String(b||"");if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0};
const allowedOrigin=(request,env)=>{
  const incoming=request.headers.get("Origin")||"*";
  const configured=String(env.ACC_ALLOWED_ORIGIN||"").trim();
  if(!configured)return "*"; // SERVER_MOCK only; lock this before real social credentials.
  return incoming===configured?incoming:"null";
};
export default {
  async fetch(request,env){
    const origin=allowedOrigin(request,env);
    if(request.method==="OPTIONS"){
      if(origin==="null") return json({ok:false,error:{code:"ORIGIN_DENIED",message:"Origin is not allowed"}},403,"null");
      return new Response(null,{status:204,headers:{
        "access-control-allow-origin":origin,
        "access-control-allow-methods":"GET,POST,OPTIONS",
        "access-control-allow-headers":"Content-Type,X-ACC-Access-Code",
        "access-control-max-age":"86400",
        "vary":"Origin"
      }});
    }
    if(origin==="null") return json({ok:false,error:{code:"ORIGIN_DENIED",message:"Origin is not allowed"}},403,"null");
    if(request.method==="GET") return json({ok:true,service:"ACC Connector API",revision:"R6.10A.1",mode:env.ACC_PUBLISH_MODE||"SERVER_MOCK"},200,origin);
    if(request.method!=="POST") return json({ok:false,error:{code:"METHOD_NOT_ALLOWED",message:"POST required"}},405,origin);

    const expected=env.ACC_PUBLISH_ACCESS_CODE;
    if(expected&&!safeEq(request.headers.get("X-ACC-Access-Code"),expected)) return json({ok:false,error:{code:"UNAUTHORIZED",message:"Invalid ACC access code"}},401,origin);

    let job;
    try{job=await request.json()}catch{return json({ok:false,error:{code:"INVALID_JSON",message:"Invalid JSON body"}},400,origin)}
    if(!job?.id||!job?.channelId||!job?.platform) return json({ok:false,error:{code:"INVALID_JOB",message:"id, channelId and platform are required"}},400,origin);

    const mode=env.ACC_PUBLISH_MODE||"SERVER_MOCK";
    if(mode==="SERVER_MOCK") return json({
      ok:true,
      connector:"SERVER_MOCK",
      externalPostId:`server_mock_${Date.now()}`,
      publishedAt:new Date().toISOString(),
      idempotencyKey:job.idempotencyKey||null
    },200,origin);

    if(mode==="FACEBOOK") return json({ok:false,error:{code:"FACEBOOK_NOT_CONFIGURED",message:"Facebook adapter unlocks after server proof passes."}},503,origin);
    return json({ok:false,error:{code:"INVALID_MODE",message:"Unsupported ACC_PUBLISH_MODE"}},500,origin);
  }
};
