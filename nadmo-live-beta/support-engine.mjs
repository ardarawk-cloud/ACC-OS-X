import {getAccount, urlOK} from './account.mjs';

// NADMO LIVE Universal Support Engine v1 (staging-only).
// Provider-authenticated events are not settlement/withdrawal evidence.
const enc = new TextEncoder();
const allowedProviders = new Set(['saweria','sociabuzz','dana_qris']);
const safe = (v,max=120) => String(v??'').replace(/[<>\x00-\x1f\x7f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
const respond = (data,status=200) => new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const error = (status,code) => respond({ok:false,code},status);
const basePrefs = () => ({alertEnabled:false,providers:['saweria'],animation:'pulse',sound:'off',durationSeconds:6,showName:true,showAmount:true,showMessage:true,socialBuzzUrl:''});
const handleValid = h => /^[a-z][a-z0-9_]{2,23}$/.test(h);
const constantEqual = (a,b) => {
 if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;
 let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);
 return n===0;
};
export async function verifySaweriaSignature(body,signature,key){
 if(!body||typeof body!=='object'||typeof key!=='string'||!key||!/^[a-f0-9]{64}$/i.test(signature||''))return false;
 const {version,id,amount_raw,donator_name,donator_email}=body;
 if(typeof version!=='string'||typeof id!=='string'||!Number.isSafeInteger(amount_raw)||amount_raw<=0||typeof donator_name!=='string'||typeof donator_email!=='string')return false;
 const payload=String(version)+String(id)+String(amount_raw)+String(donator_name)+String(donator_email);
 const hkey=await crypto.subtle.importKey('raw',enc.encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const mac=new Uint8Array(await crypto.subtle.sign('HMAC',hkey,enc.encode(payload)));
 const expected=[...mac].map(b=>b.toString(16).padStart(2,'0')).join('');
 return constantEqual(expected,signature.toLowerCase());
}
export function normaliseVerifiedSupport({provider,hostId,providerRef,amount,name,message,occurredAt,viewerId=null,anonymous=false}){
 if(!allowedProviders.has(provider)||!safe(hostId,80)||!safe(providerRef,128)||!/^[a-zA-Z0-9_-]{1,128}$/.test(String(providerRef)))throw Error('INVALID_REFERENCE');
 if(!Number.isSafeInteger(amount)||amount<1||amount>1000000000)throw Error('INVALID_AMOUNT');
 const timestamp=Date.parse(occurredAt||'');
 if(!Number.isFinite(timestamp)||timestamp>Date.now()+300000||timestamp<946684800000)throw Error('INVALID_TIME');
 return {eventId:crypto.randomUUID(),provider,hostId:safe(hostId,80),viewerId:viewerId?safe(viewerId,80):null,
  supporterName:anonymous?'Anonim':(safe(name,70)||'Pendukung'),amount,currency:'IDR',
  message:safe(message,220),occurredAt:new Date(timestamp).toISOString(),
  verificationStatus:'provider_authenticated',settlementStatus:'not_confirmed',providerRef:safe(providerRef,128),
  alertStatus:'queued',anonymous:anonymous===true,createdAt:new Date().toISOString()};
}
export async function recordVerifiedSupport(storage,event){
 if(!event||event.verificationStatus!=='provider_authenticated'||event.currency!=='IDR'||!Number.isSafeInteger(event.amount)||event.amount<1)throw Error('NOT_VERIFIED');
 if(typeof storage.transaction!=='function')throw Error('TRANSACTION_STORAGE_REQUIRED');
 const id='support-event:'+event.hostId+':'+event.provider+':'+event.providerRef;
 return storage.transaction(async tx=>{
  const existing=await tx.get(id);
  if(existing)return {created:false,event:existing};
  const wallKey='support-wall:'+event.hostId;
  const list=await tx.get(wallKey)||[];
  const next=[event,...list].slice(0,60);
  await tx.put(id,event);
  await tx.put(wallKey,next);
  return {created:true,event};
 });
}
export function publicSupport(event,prefs=basePrefs()){
 if(!event||event.verificationStatus!=='provider_authenticated')return null;
 return {eventId:event.eventId,provider:event.provider,hostId:event.hostId,
  supporterName:event.anonymous||prefs.showName===false?'Anonim':event.supporterName,
  amount:prefs.showAmount===false?null:event.amount,currency:'IDR',
  message:prefs.showMessage===false?'':event.message,occurredAt:event.occurredAt,
  verified:true,verificationStatus:'provider_authenticated',settlementStatus:event.settlementStatus,
  alertStatus:event.alertStatus};
}
const parse = async request => {
 const length=Number(request.headers.get('Content-Length')||0);
 if(length>12000)throw Error('LARGE');
 const raw=await request.text();if(raw.length>12000)throw Error('LARGE');
 const data=JSON.parse(raw);if(!data||typeof data!=='object'||Array.isArray(data))throw Error('INVALID');
 return data;
};
const originAllowed = req=>{const o=req.headers.get('Origin');return o===new URL(req.url).origin||o==='https://appassets.androidplatform.net'};
const userForHandle=async(storage,handle)=>{
 if(!handleValid(handle))return null;
 const id=await storage.get('auth-handle:'+handle);
 return id?await storage.get('auth-user:'+id):null;
};
const prefsFor=async(storage,userId)=>({...basePrefs(),...(await storage.get('support-prefs:'+userId)||{})});
const validSociaBuzz=raw=>{
 if(!raw)return '';
 const url=urlOK(raw);if(!url)return '';
 const u=new URL(url);
 return u.hostname==='sociabuzz.com'||u.hostname==='www.sociabuzz.com'?url:'';
};
export async function supportEndpoint(storage,request,env,emit=async()=>false){
 const url=new URL(request.url),p=url.pathname,method=request.method;
 if(p.startsWith('/api/support/webhooks/')){
  if(method!=='POST')return error(405,'METHOD');
  const m=p.match(/^\/api\/support\/webhooks\/(saweria|sociabuzz|dana_qris)\/([a-z][a-z0-9_]{2,23})$/);
  if(!m)return error(404,'WEBHOOK_UNKNOWN');
  const [,provider,handle]=m;
  if(provider!=='saweria')return error(501,'PROVIDER_NOT_VERIFIED');
  const host=await userForHandle(storage,handle);
  if(!host||host.disabled)return error(404,'HOST_NOT_FOUND');
  // Only an existing server-held Saweria streaming key can authenticate a callback.
  const key=host.saweriaStreamingKey;
  if(typeof key!=='string'||key.length<8)return error(503,'SAWERIA_NOT_CONNECTED');
  let body;try{body=await parse(request)}catch{return error(400,'BAD_PAYLOAD')}
  const ok=await verifySaweriaSignature(body,request.headers.get('Saweria-Callback-Signature'),key);
  if(!ok)return error(401,'BAD_PROVIDER_SIGNATURE');
  if(body.type&&body.type!=='donation')return error(422,'NOT_DONATION');
  let event;try{
   event=normaliseVerifiedSupport({provider:'saweria',hostId:host.id,providerRef:body.id,
    amount:body.amount_raw,name:body.donator_name,message:body.message,occurredAt:body.created_at});
  }catch{return error(422,'BAD_DONATION')}
  // No donor emails or raw webhook body are stored.
  const result=await recordVerifiedSupport(storage,event);
  const prefs=await prefsFor(storage,host.id);
  if(result.created&&prefs.alertEnabled&&prefs.providers.includes('saweria')){
   try{await emit(host.id,publicSupport(result.event,prefs))}catch(e){console.error('support alert dispatch deferred',e?.name)}
  }
  return respond({ok:true,duplicate:!result.created,eventId:result.event.eventId,verified:true});
 }
 if(p==='/api/support/wall'&&method==='GET'){
  const host=await userForHandle(storage,safe(url.searchParams.get('handle'),24).replace(/^@/,'').toLowerCase());
  if(!host||host.disabled)return error(404,'HOST_NOT_FOUND');
  const prefs=await prefsFor(storage,host.id),list=await storage.get('support-wall:'+host.id)||[];
  const filtered=list.filter(x=>x?.verificationStatus==='provider_authenticated');
  return respond({ok:true,hostHandle:host.handle,events:filtered.slice(0,30).map(x=>publicSupport(x,prefs)).filter(Boolean),
   verifiedCount:filtered.length,visibleTotalIdr:prefs.showAmount===false?null:filtered.reduce((sum,e)=>sum+e.amount,0),
   scope:'recent-records-only',settlementConfirmed:false});
 }
 if(!['/api/support/me','/api/support/settings','/api/support/test-alert'].includes(p))return error(404,'NOT_FOUND');
 const principal=await getAccount(storage,request);if(!principal)return error(401,'LOGIN_REQUIRED');
 const host=await storage.get('auth-user:'+principal.id);if(!host||host.disabled)return error(401,'ACCOUNT_INACTIVE');
 if(p==='/api/support/me'&&method==='GET'){
  return respond({ok:true,config:await prefsFor(storage,host.id),host:{id:host.id,handle:host.handle},
   links:{saweria:host.supportUrl||'',sociabuzz:(await prefsFor(storage,host.id)).socialBuzzUrl,qris:host.supportQrisUrl||''},
   providers:{saweria:{link:!!host.supportUrl,webhookConnected:typeof host.saweriaStreamingKey==='string'&&host.saweriaStreamingKey.length>7},
    sociabuzz:{link:!!(await prefsFor(storage,host.id)).socialBuzzUrl,webhookConnected:false},
    dana_qris:{link:!!host.supportQrisUrl,webhookConnected:false}},
   paymentMode:'provider-direct',autoVerifiedQris:false});
 }
 if(!originAllowed(request))return error(403,'ORIGIN_REQUIRED');
 if(p==='/api/support/settings'&&method==='POST'){
  let body;try{body=await parse(request)}catch{return error(400,'BAD_JSON')}
  const prev=await prefsFor(storage,host.id);
  const providerList=Array.isArray(body.providers)?[...new Set(body.providers)]:prev.providers;
  if(providerList.length>3||providerList.some(x=>!allowedProviders.has(x)))return error(400,'BAD_PROVIDERS');
  const socialBuzzUrl=body.socialBuzzUrl===undefined?prev.socialBuzzUrl:validSociaBuzz(body.socialBuzzUrl);
  if(body.socialBuzzUrl&&!socialBuzzUrl)return error(400,'BAD_SOCIALBUZZ_URL');
  const duration=body.durationSeconds===undefined?prev.durationSeconds:body.durationSeconds;
  if(!Number.isInteger(duration)||duration<4||duration>8)return error(400,'BAD_DURATION');
  const animation=body.animation??prev.animation,sound=body.sound??prev.sound;
  if(!['pulse','slide','minimal'].includes(animation)||!['off','chime','soft'].includes(sound))return error(400,'BAD_PRESET');
  const flag=(name)=>body[name]===undefined?prev[name]:body[name];
  for(const name of ['alertEnabled','showName','showAmount','showMessage'])if(typeof flag(name)!=='boolean')return error(400,'BAD_PRIVACY');
  const updated={providers:providerList,alertEnabled:flag('alertEnabled'),showName:flag('showName'),showAmount:flag('showAmount'),showMessage:flag('showMessage'),
   animation,sound,durationSeconds:duration,socialBuzzUrl};
  await storage.put('support-prefs:'+host.id,updated);
  return respond({ok:true,config:updated});
 }
 if(p==='/api/support/test-alert'&&method==='POST'){
  let body;try{body=await parse(request)}catch{return error(400,'BAD_JSON')}
  const prefs=await prefsFor(storage,host.id);
  const demo={eventId:crypto.randomUUID(),provider:'demo',hostId:host.id,viewerId:null,
   supporterName:safe(body.name,70)||'Demo Pendukung',amount:null,currency:'IDR',message:safe(body.message,220),
   occurredAt:new Date().toISOString(),verificationStatus:'DEMO',settlementStatus:'not_applicable',alertStatus:'DEMO',demo:true};
  // Not persisted; not in financial reports or Support Wall.
  if(prefs.alertEnabled){try{await emit(host.id,demo)}catch(e){console.error('demo dispatch unavailable',e?.name)}}
  return respond({ok:true,DEMO:true,persisted:false,counted:false,event:demo});
 }
 return error(405,'METHOD');
}
