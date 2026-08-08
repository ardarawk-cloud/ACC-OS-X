// ACC OS X R6.10A — Connector Backend Foundation (Cloudflare Pages Function)
// No social credentials are exposed to the browser.
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json;charset=UTF-8","cache-control":"no-store"}});
const safeEq=(a,b)=>{a=String(a||"");b=String(b||"");if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0};
export async function onRequest(context){
  const {request,env}=context;
  if(request.method==="GET") return json({ok:true,service:"ACC Connector API",revision:"R6.10A",mode:env.ACC_PUBLISH_MODE||"SERVER_MOCK"});
  if(request.method!=="POST") return json({ok:false,error:{code:"METHOD_NOT_ALLOWED",message:"POST required"}},405);
  const expected=env.ACC_PUBLISH_ACCESS_CODE;
  if(expected&&!safeEq(request.headers.get("X-ACC-Access-Code"),expected)) return json({ok:false,error:{code:"UNAUTHORIZED",message:"Invalid ACC access code"}},401);
  let job;try{job=await request.json()}catch{return json({ok:false,error:{code:"INVALID_JSON",message:"Invalid JSON body"}},400)}
  if(!job?.id||!job?.channelId||!job?.platform) return json({ok:false,error:{code:"INVALID_JOB",message:"id, channelId and platform are required"}},400);
  const mode=env.ACC_PUBLISH_MODE||"SERVER_MOCK";
  if(mode==="SERVER_MOCK") return json({ok:true,connector:"SERVER_MOCK",externalPostId:`server_mock_${Date.now()}`,publishedAt:new Date().toISOString(),idempotencyKey:job.idempotencyKey||null});
  if(mode==="FACEBOOK") return json({ok:false,error:{code:"FACEBOOK_NOT_CONFIGURED",message:"Facebook adapter is reserved for R6.10B after credentials are configured."}},503);
  return json({ok:false,error:{code:"INVALID_MODE",message:"Unsupported ACC_PUBLISH_MODE"}},500);
}
