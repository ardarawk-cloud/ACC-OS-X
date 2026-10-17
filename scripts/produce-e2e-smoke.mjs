import worker from "../worker-roblox-publish-probe-v1.js";

const ACCESS="smoke-owner-access";
const jpg=Buffer.from([0xff,0xd8,0xff,0xd9]).toString("base64");

function textOf(args){
  return (args?.messages||[]).map(x=>String(x?.content||"")).join("\n");
}
function batchText(count){
  return Array.from({length:count},(_,i)=>`ITEM ${i+1}\nJudul: Smoke Item ${i+1}\nMateri: Isi aman untuk item ${i+1}.`).join("\n\n");
}
const env={
  ACC_AI_ACCESS_CODE:ACCESS,
  AI:{
    async run(model,args={}){
      const all=textOf(args);
      if(String(model).includes("flux")) return {image:jpg};
      const schema=args.guided_json;
      if(schema?.required?.includes("items")){
        const count=Number(schema?.properties?.items?.minItems||schema?.properties?.items?.maxItems||5);
        return {items:Array.from({length:count},(_,i)=>`ITEM ${i+1}\nJudul: Split ${i+1}\nMateri: Materi ${i+1}.`)};
      }
      if(schema?.required?.includes("headline")&&schema?.required?.includes("visual_prompt")){
        return {headline:"Smoke Headline",subhead:"Smoke Subhead",badge:"SMOKE",subject_anchor:"calm night sky",visual_prompt:"cinematic calm night sky, no text"};
      }
      if(schema?.required?.includes("pass")&&schema?.required?.includes("subject_match")){
        return {pass:true,subject_match:true,master_match:true,unrelated_portrait_risk:false,issues:"",repaired_visual_prompt:"cinematic calm night sky, no text"};
      }
      if(/exactly\s+5|5-item|five locked|five-series|five independent/i.test(all)) return {response:batchText(5)};
      if(/caption/i.test(all)) return {response:"Caption smoke siap. #ACC"};
      if(/QUERY:\s*<query>|research query router/i.test(all)) return {response:"QUERY: reflection"};
      if(/TOPIC_QUERY:/i.test(all)) return {response:"TOPIC_QUERY: reflection; PRIMARY_URL: https://example.com/story"};
      if(/strict JSON only/i.test(all)) return {response:JSON.stringify({headline:"Smoke Headline",subhead:"Smoke Subhead",badge:"SMOKE",subject_anchor:"calm night sky",visual_prompt:"cinematic calm night sky, no text"})};
      return {response:"Judul: Pertanyaan malam\nMateri: Apa yang sebenarnya kita cari ketika semua terasa cepat?"};
    }
  }
};

function body(channelId,name,command,{material="",batchCount=1,series=[]}={}){
  return {
    messages:[{role:"user",content:command}],
    context:{
      workerTask:{id:"smoke",stage:"COPILOT",workerType:"KAI_PRODUCE_COPILOT",workerName:"KAI PRODUCE COPILOT",goal:"Smoke",source:"CI",autoApply:false},
      profile:{id:channelId,code:"SMOKE",name,platform:"Facebook"},
      contexts:[],
      masterRuntime:{batchCount,series,workflowAuthority:"CHANNEL_MASTER_LOCK",globalEngineRole:"EXECUTION_ONLY",brainId:`acc-brain:${channelId}`},
      brainLock:{channelId,brainId:`acc-brain:${channelId}`,isolation:"HARD_1_TO_1",workflowAuthority:"CHANNEL_MASTER_LOCK"},
      copilot:{command,brainId:`acc-brain:${channelId}`,packageChannelId:channelId,research:"",material,caption:"",history:[]},
      client:{revision:"SMOKE",language:"id-ID",timezone:"Asia/Makassar"}
    }
  };
}
async function call(payload,authorized=true){
  const headers={"Content-Type":"application/json"};
  if(authorized) headers["X-ACC-Access-Code"]=ACCESS;
  const req=new Request("https://acc.test/api/acc-ai",{method:"POST",headers,body:JSON.stringify(payload)});
  const res=await worker.fetch(req,env,{waitUntil(){}});
  const data=await res.json().catch(()=>({}));
  return {res,data};
}
function ok(condition,message){if(!condition)throw new Error(message);}

const denied=await call(body("ch-titik-tanya","Titik Tanya","P",{material:"Judul: X\nMateri: Y"}),false);
ok(denied.res.status===401,"P without owner access must be 401");
ok(String(denied.data.produceAccessGuard||"").includes("PRODUCE_OWNER_ACCESS_GUARD_V1"),"outer auth guard marker missing");

const singleK=await call(body("ch-titik-tanya","Titik Tanya","K"));
ok(singleK.res.ok&&singleK.data.ok&&singleK.data.kind==="material","single K failed");
const singleMaterial=String(singleK.data.reply||"");
ok(singleMaterial.length>10,"single K material empty");

const singleP=await call(body("ch-titik-tanya","Titik Tanya","P",{material:singleMaterial}));
ok(singleP.res.ok&&singleP.data.ok&&singleP.data.kind==="poster"&&singleP.data.imageBase64,"single P failed");

const singleC=await call(body("ch-titik-tanya","Titik Tanya","C",{material:singleMaterial}));
ok(singleC.res.ok&&singleC.data.ok&&singleC.data.kind==="caption"&&String(singleC.data.reply||"").length>3,"single C failed");

const labels=["Ayah → Putri","Putri → Ayah","Momen Ayah & Putri","Pelajaran Hidup","Quotes & Renungan"];
const batchK=await call(body("ch-putri-ayah","Putri Ayah","K",{batchCount:5,series:labels}));
ok(batchK.res.ok&&batchK.data.ok&&batchK.data.kind==="material","batch K failed");
const batchMaterial=String(batchK.data.reply||"");
for(let i=1;i<=5;i++)ok(batchMaterial.includes(`ITEM ${i}`),`batch K missing ITEM ${i}`);

const batchP=await call(body("ch-putri-ayah","Putri Ayah","P",{material:batchMaterial,batchCount:5,series:labels}));
ok(batchP.res.ok&&batchP.data.ok&&batchP.data.kind==="poster_batch"&&batchP.data.posters?.length===5,"batch P failed");

const batchC=await call(body("ch-putri-ayah","Putri Ayah","C",{material:batchMaterial,batchCount:5,series:labels}));
ok(batchC.res.ok&&batchC.data.ok&&batchC.data.kind==="caption_batch"&&batchC.data.captions?.length===5,"batch C failed");

console.log(JSON.stringify({
  pass:true,
  guard:"PRODUCE_OWNER_ACCESS_GUARD_V1",
  single:{K:singleK.data.kind,P:singleP.data.kind,C:singleC.data.kind},
  batch:{K:batchK.data.kind,P:batchP.data.posters.length,C:batchC.data.captions.length}
},null,2));
