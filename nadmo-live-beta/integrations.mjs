import {getAccount} from './account.mjs';

const enc=new TextEncoder();
const clean=(v,max=500)=>typeof v==='string'?v.trim().slice(0,max):'';
const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}});
const fail=(status,error,code)=>json({ok:false,error,code:code||'INTEGRATION_ERROR'},status);
const originOK=req=>{const origin=req.headers.get('Origin');return !origin||origin===new URL(req.url).origin||origin==='https://appassets.androidplatform.net'};
function safeCompare(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0}
const hex=bytes=>[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
const token=()=>crypto.randomUUID().replace(/-/g,'')+crypto.randomUUID().replace(/-/g,'').slice(0,16);

async function ensureTokens(storage,record){
 let changed=false;
 if(!record.integrationOverlayToken){record.integrationOverlayToken=token();changed=true}
 if(!record.integrationSaweriaToken){record.integrationSaweriaToken=token();changed=true}
 await storage.put('integration-overlay:'+record.integrationOverlayToken,record.id);
 await storage.put('integration-saweria:'+record.integrationSaweriaToken,record.id);
 if(changed){record.updatedAt=Date.now();await storage.put('auth-user:'+record.id,record)}
 return record;
}
async function rotateTokens(storage,record){
 if(record.integrationOverlayToken)await storage.delete('integration-overlay:'+record.integrationOverlayToken);
 if(record.integrationSaweriaToken)await storage.delete('integration-saweria:'+record.integrationSaweriaToken);
 record.integrationOverlayToken=token();
 record.integrationSaweriaToken=token();
 record.updatedAt=Date.now();
 await storage.put('integration-overlay:'+record.integrationOverlayToken,record.id);
 await storage.put('integration-saweria:'+record.integrationSaweriaToken,record.id);
 await storage.put('auth-user:'+record.id,record);
 return record;
}
function publicUrls(origin,record){
 const overlay=origin+'/overlay/support/?token='+encodeURIComponent(record.integrationOverlayToken);
 return {
  saweriaWebhook:origin+'/api/integrations/saweria/'+record.integrationSaweriaToken,
  alertOverlay:overlay,
  alertTtsOverlay:overlay+'&tts=1'
 };
}
async function parseJSON(request,max=12000){
 const raw=await request.text();if(raw.length>max)throw Error('TOO_LARGE');
 const data=JSON.parse(raw);if(!data||Array.isArray(data)||typeof data!=='object')throw Error('INVALID');
 return {raw,data};
}
async function hmacHex(key,message){
 const cryptoKey=await crypto.subtle.importKey('raw',enc.encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return hex(await crypto.subtle.sign('HMAC',cryptoKey,enc.encode(message)));
}
async function recordSaweriaEvent(storage,record,data){
 const id=clean(String(data.id||''),160);if(!id)throw Error('BAD_EVENT_ID');
 const dedupe='integration-saweria-event:'+record.id+':'+id;
 if(await storage.get(dedupe))return {duplicate:true,id};
 const created=Date.parse(String(data.created_at||'')),now=Date.now();
 const event={
  id,provider:'saweria',createdAt:Number.isFinite(created)?created:now,
  receivedAt:now,amountRaw:Math.max(0,Number(data.amount_raw)||0),
  donor:clean(String(data.donator_name||'Anonim'),80)||'Anonim',
  message:clean(String(data.message||''),500)
 };
 await storage.put(dedupe,now);
 await storage.put('integration-latest:'+record.id,event);
 return {duplicate:false,event};
}

export async function integrationEndpoint(storage,request){
 const u=new URL(request.url),p=u.pathname,method=request.method,origin=u.origin;

 if(p==='/api/integrations/me'&&method==='GET'){
  const user=await getAccount(storage,request);if(!user)return fail(401,'Login diperlukan','LOGIN_REQUIRED');
  let record=await storage.get('auth-user:'+user.id);if(!record)return fail(404,'Akun tidak ditemukan','ACCOUNT_NOT_FOUND');
  record=await ensureTokens(storage,record);
  return json({ok:true,urls:publicUrls(origin,record),appearance:{
   themeId:['nadmo','cyberbw','noir','retro','electric'].includes(record.themeId)?record.themeId:'nadmo',
   fontId:['system','mono','editorial'].includes(record.fontId)?record.fontId:'system',
   coverId:['grid','waves','dots'].includes(record.coverId)?record.coverId:'grid'
  },saweria:{configured:!!record.saweriaStreamingKey}});
 }

 if(p==='/api/integrations/saweria-key'&&method==='POST'){
  if(!originOK(request))return fail(403,'Permintaan harus dari NADMO LIVE','ORIGIN_REQUIRED');
  const user=await getAccount(storage,request);if(!user)return fail(401,'Login diperlukan','LOGIN_REQUIRED');
  let body;try{({data:body}=await parseJSON(request))}catch{return fail(400,'Data tidak valid','INVALID_INPUT')}
  const key=clean(body.streamingKey,300);
  if(key.length<8)return fail(400,'Streaming Key Saweria tidak valid','BAD_STREAMING_KEY');
  let record=await storage.get('auth-user:'+user.id);if(!record)return fail(404,'Akun tidak ditemukan','ACCOUNT_NOT_FOUND');
  record=await ensureTokens(storage,record);record.saweriaStreamingKey=key;record.updatedAt=Date.now();
  await storage.put('auth-user:'+record.id,record);
  return json({ok:true,saweria:{configured:true},urls:publicUrls(origin,record),appearance:{
   themeId:['nadmo','cyberbw','noir','retro','electric'].includes(record.themeId)?record.themeId:'nadmo',
   fontId:['system','mono','editorial'].includes(record.fontId)?record.fontId:'system',
   coverId:['grid','waves','dots'].includes(record.coverId)?record.coverId:'grid'
  }});
 }

 if(p==='/api/integrations/test-alert'&&method==='POST'){
  if(!originOK(request))return fail(403,'Permintaan harus dari NADMO LIVE','ORIGIN_REQUIRED');
  const user=await getAccount(storage,request);if(!user)return fail(401,'Login diperlukan','LOGIN_REQUIRED');
  let record=await storage.get('auth-user:'+user.id);if(!record)return fail(404,'Akun tidak ditemukan','ACCOUNT_NOT_FOUND');
  record=await ensureTokens(storage,record);
  const event={id:'test-'+crypto.randomUUID(),provider:'nadmo-test',createdAt:Date.now(),receivedAt:Date.now(),amountRaw:10000,donor:'NADMO TEST',message:'Alert berhasil terhubung.'};
  await storage.put('integration-latest:'+record.id,event);
  return json({ok:true,event});
 }

 if(p==='/api/integrations/rotate'&&method==='POST'){
  if(!originOK(request))return fail(403,'Permintaan harus dari NADMO LIVE','ORIGIN_REQUIRED');
  const user=await getAccount(storage,request);if(!user)return fail(401,'Login diperlukan','LOGIN_REQUIRED');
  let record=await storage.get('auth-user:'+user.id);if(!record)return fail(404,'Akun tidak ditemukan','ACCOUNT_NOT_FOUND');
  record=await rotateTokens(storage,record);
  return json({ok:true,urls:publicUrls(origin,record),appearance:{
   themeId:['nadmo','cyberbw','noir','retro','electric'].includes(record.themeId)?record.themeId:'nadmo',
   fontId:['system','mono','editorial'].includes(record.fontId)?record.fontId:'system',
   coverId:['grid','waves','dots'].includes(record.coverId)?record.coverId:'grid'
  },saweria:{configured:!!record.saweriaStreamingKey}});
 }

 const saweria=p.match(/^\/api\/integrations\/saweria\/([a-f0-9]{48})$/);
 if(saweria&&method==='POST'){
  const userId=await storage.get('integration-saweria:'+saweria[1]);if(!userId)return fail(404,'Integration tidak ditemukan','NOT_FOUND');
  const record=await storage.get('auth-user:'+userId);if(!record||!record.saweriaStreamingKey)return fail(409,'Saweria belum dikonfigurasi','SAWERIA_NOT_CONFIGURED');
  let raw,data;try{({raw,data}=await parseJSON(request,20000))}catch{return fail(400,'Payload Saweria tidak valid','BAD_SAWERIA_PAYLOAD')}
  const signature=clean(request.headers.get('Saweria-Callback-Signature'),200).toLowerCase();
  const message=[data.version,data.id,data.amount_raw,data.donator_name,data.donator_email].map(v=>String(v??'')).join('');
  const expected=await hmacHex(record.saweriaStreamingKey,message);
  if(!safeCompare(signature,expected))return fail(401,'Signature Saweria tidak valid','BAD_SAWERIA_SIGNATURE');
  const result=await recordSaweriaEvent(storage,record,data);
  return json({ok:true,duplicate:result.duplicate===true});
 }

 const overlay=p.match(/^\/api\/integrations\/overlay\/([a-f0-9]{48})$/);
 if(overlay&&method==='GET'){
  const userId=await storage.get('integration-overlay:'+overlay[1]);if(!userId)return fail(404,'Overlay tidak ditemukan','NOT_FOUND');
  const event=await storage.get('integration-latest:'+userId);
  const after=clean(u.searchParams.get('after'),180);
  return json({ok:true,event:event&&event.id!==after?event:null,appearance:{
   themeId:['nadmo','cyberbw','noir','retro','electric'].includes(record?.themeId)?record.themeId:'nadmo',
   fontId:['system','mono','editorial'].includes(record?.fontId)?record.fontId:'system'
  }},200,{'Access-Control-Allow-Origin':'*'});
 }

 return fail(404,'Integration endpoint tidak ditemukan','NOT_FOUND');
}
