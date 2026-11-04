import {getAccount,urlOK} from './account.mjs';

const PLAN={free:{price:0,limit:50},pro:{price:19900,limit:200},plus:{price:99900,limit:null}};
const SUBSCRIPTION_MS=30*86400000,GRACE_MS=24*3600000,GRACE_EXTRA=20,DEDUPE_MS=24*3600000;
const enc=new TextEncoder();
const clean=(v,max=120)=>typeof v==='string'?v.trim().slice(0,max):'';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const fail=(status,error,code)=>json({ok:false,error,code:code||'SUBSCRIPTION_ERROR'},status);
const APP_ORIGIN='https://appassets.androidplatform.net';
const originOK=req=>{const origin=req.headers.get('Origin');return origin===new URL(req.url).origin||origin===APP_ORIGIN};
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const digest=async value=>hex(await crypto.subtle.digest('SHA-256',enc.encode(value)));
function safeCompare(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0}
function tierOf(record,now=Date.now()){const tier=['pro','plus'].includes(record?.subscriptionTier)?record.subscriptionTier:'free';return tier!=='free'&&Number(record?.subscriptionExpiresAt)>now?tier:'free'}
function snapshot(record,now=Date.now()){
 const tier=tierOf(record,now),count=Math.max(0,Number(record?.supportActionCount)||0);
 const graceActive=Number(record?.subscriptionGraceUntil)>now&&!!record?.subscriptionPendingOrderId;
 const baseLimit=PLAN[tier].limit,effectiveLimit=baseLimit===null?null:baseLimit+(graceActive?GRACE_EXTRA:0);
 const locked=effectiveLimit!==null&&count>=effectiveLimit;
 return {tier,count,limit:baseLimit,effectiveLimit,remaining:effectiveLimit===null?null:Math.max(0,effectiveLimit-count),locked,
  upgradeTarget:tier==='free'?'pro':tier==='pro'?'plus':null,expiresAt:tier==='free'?null:Number(record?.subscriptionExpiresAt)||null,
  grace:{active:graceActive,until:graceActive?Number(record.subscriptionGraceUntil):null,extra:graceActive?GRACE_EXTRA:0},pendingOrderId:record?.subscriptionPendingOrderId||null};
}
const publicPlan=()=>({free:{price:0,limit:50},pro:{price:19900,limit:200,days:30},plus:{price:99900,limit:null,days:30}});
function qrisConfig(env,origin){const raw=clean(env?.DANA_BUSINESS_QRIS_URL||env?.ACM_STORE_QRIS_URL,500);if(raw){try{const u=new URL(raw);if(u.protocol==='https:')return u.href}catch{}}return origin+'/subscription/nadmo-dana-qris.png'}

const DANA_SANDBOX_PUBLIC_KEY=`-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnaKVGRbin4Wh4KN35OPh
ytJBjYTz7QZKSZjmHfiHxFmulfT87rta+IvGJ0rCBgg+1EtKk1hX8G5gPGJs1htJ
5jHa3/jCk9l+luzjnuT9UVlwJahvzmFw+IoDoM7hIPjsLtnIe04SgYo0tZBpEmkQ
vUGhmHPqYnUGSSMIpDLJDvbyr8gtwluja1SbRphgDCoYVXq+uUJ5HzPS049aaxTS
nfXh/qXuDoB9EzCrgppLDS2ubmk21+dr7WaO/3RFjnwx5ouv6w+iC1XOJKar3CTk
X6JV1OSST1C9sbPGzMHZ8AGB51BM0mok7davD/5irUk+f0C25OgzkwtxAt80dkDo
/QIDAQAB
-----END PUBLIC KEY-----`;
function danaTs(ms=Date.now()){return new Date(ms+7*3600000).toISOString().replace(/\.\d{3}Z$/,'+07:00')}
function pemBytes(raw){
 const b64=String(raw||'').replace(/-----BEGIN [^-]+-----/g,'').replace(/-----END [^-]+-----/g,'').replace(/\s+/g,'');
 const bin=atob(b64),out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out;
}
async function danaSign(env,method,path,body,timestamp){
 const key=await crypto.subtle.importKey('pkcs8',pemBytes(String(env.DANA_PRIVATE_KEY||'').replace(/\\n/g,'\n')),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
 const hash=await digest(body),input=method+':'+path+':'+hash+':'+timestamp;
 const sig=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,enc.encode(input));
 let bin='';for(const b of new Uint8Array(sig))bin+=String.fromCharCode(b);return btoa(bin);
}
async function danaVerify(env,rawBody,timestamp,signature){
 const publicKey=String(env.DANA_ENV||'').toLowerCase()==='sandbox'?DANA_SANDBOX_PUBLIC_KEY:clean(env.DANA_SENDER_PUBLIC_KEY,8000).replace(/\\n/g,'\n');
 if(!publicKey||!timestamp||!signature)return false;
 const body=JSON.stringify(JSON.parse(rawBody)),hash=await digest(body),input='POST:/v1.0/debit/notify:'+hash+':'+timestamp;
 const key=await crypto.subtle.importKey('spki',pemBytes(publicKey),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 const sig=pemBytes(signature);
 return crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,sig,enc.encode(input));
}
function danaGatewayReady(env){
 return !!(env?.DANA_API_ORIGIN&&env?.DANA_X_PARTNER_ID&&env?.DANA_MERCHANT_ID&&env?.DANA_PRIVATE_KEY);
}
async function activatePaidOrder(storage,order,record,now,referenceNo){
 const currentTier=tierOf(record,now),sameTier=currentTier===order.targetTier&&Number(record.subscriptionExpiresAt)>now,base=sameTier?Number(record.subscriptionExpiresAt):now;
 record.subscriptionTier=order.targetTier;record.subscriptionExpiresAt=base+SUBSCRIPTION_MS;record.subscriptionPendingOrderId='';record.subscriptionGraceUntil=0;record.subscriptionGraceLock='';record.updatedAt=now;
 order.status='approved';order.paymentStatus='paid';order.reviewedAt=now;order.approvedAt=now;order.providerReferenceNo=referenceNo||order.providerReferenceNo||null;
 await storage.put('auth-user:'+record.id,record);await storage.put('subscription-order:'+order.id,order);
}

function mediaOwned(raw,origin,userId){
 if(typeof raw!=='string'||raw.length>700)return false;
 try{const u=new URL(raw);if(u.origin!==origin||u.search||u.hash)return false;return new RegExp('^/api/social/media/'+userId+'/[a-f0-9-]{36}\\.(?:jpg|png|webp)$').test(u.pathname)}catch{return false}
}
async function userByHandle(storage,handle){if(!/^[a-z][a-z0-9_]{2,23}$/.test(handle))return null;const id=await storage.get('auth-handle:'+handle);const record=id&&await storage.get('auth-user:'+id);return record&&!record.disabled?record:null}
async function pendingOrder(storage,record){const id=record?.subscriptionPendingOrderId;if(!id)return null;const order=await storage.get('subscription-order:'+id);return order?.status==='pending'?order:null}
async function adminPrincipal(storage,request,env){
 const user=await getAccount(storage,request);
 if(!user)return null;
 const configuredHandle=clean(env?.NADMO_ADMIN_HANDLE,24).replace(/^@/,'').toLowerCase();
 if(configuredHandle&&user.handle===configuredHandle)return user;
 const configuredKey=clean(env?.NADMO_ADMIN_KEY,256),supplied=clean(request.headers.get('x-nadmo-admin-key'),256);
 if(configuredKey&&safeCompare(configuredKey,supplied))return user;
 const users=await storage.list({prefix:'auth-user:',limit:500});
 let oldest=null;
 const qaLike=record=>{
  const handle=String(record?.handle||'').toLowerCase(),name=String(record?.name||'').toLowerCase();
  return /(?:^qa_|^logintest|^sbadge|^test|e2e|smoke|fixture|automation)/.test(handle)
   || /(?:\bqa\b|\be2e\b|\btest\b|fixture|automation)/.test(name);
 };
 for(const record of users.values()){
  if(!record||record.disabled||qaLike(record))continue;
  if(!oldest||Number(record.createdAt||Infinity)<Number(oldest.createdAt||Infinity))oldest=record;
 }
 return oldest?.id===user.id?user:null;
}
async function parseJSON(request,max=12000){const len=Number(request.headers.get('content-length')||0);if(len>max)throw Error('TOO_LARGE');const raw=await request.text();if(raw.length>max)throw Error('TOO_LARGE');const data=JSON.parse(raw);if(!data||Array.isArray(data)||typeof data!=='object')throw Error('INVALID');return data}
const supportMethods=record=>({link:urlOK(record?.supportUrl)||'',qris:clean(record?.supportQrisUrl,700)});

export async function subscriptionEndpoint(storage,request,env){
 const u=new URL(request.url),p=u.pathname,method=request.method,now=Date.now();

 if(p==='/api/subscription/host'&&method==='GET'){
  const handle=clean(u.searchParams.get('handle'),24).replace(/^@/,'').toLowerCase(),record=await userByHandle(storage,handle);
  if(!record)return fail(404,'Host tidak ditemukan','HOST_NOT_FOUND');
  return json({ok:true,host:{handle:record.handle,name:record.name},subscription:snapshot(record,now),support:supportMethods(record)});
 }

 if(p==='/api/subscription/me'&&method==='GET'){
  const user=await getAccount(storage,request);if(!user)return fail(401,'Login diperlukan','LOGIN_REQUIRED');
  const record=await storage.get('auth-user:'+user.id),pending=await pendingOrder(storage,record);
  return json({ok:true,plan:publicPlan(),qrisUrl:qrisConfig(env,u.origin),paymentGateway:{enabled:danaGatewayReady(env),environment:clean(env?.DANA_ENV,16)||'unknown'},subscription:snapshot(record,now),support:supportMethods(record),
   pending:pending?{id:pending.id,targetTier:pending.targetTier,price:pending.price,status:pending.status,provider:pending.provider||'manual',paymentStatus:pending.paymentStatus||null,createdAt:pending.createdAt,graceGranted:pending.graceGranted===true}:null});
 }

 if(p==='/api/subscription/support-action'&&method==='POST'){
  if(!originOK(request))return fail(403,'Permintaan harus dari NADMO LIVE','ORIGIN_REQUIRED');
  let body;try{body=await parseJSON(request)}catch{return fail(400,'Data tidak valid','INVALID_INPUT')}
  const handle=clean(body.handle,24).replace(/^@/,'').toLowerCase(),record=await userByHandle(storage,handle);
  if(!record)return fail(404,'Host tidak ditemukan','HOST_NOT_FOUND');
  const methods=supportMethods(record);if(!methods.link&&!methods.qris)return fail(409,'Host belum memasang Saweria atau QRIS','NO_SUPPORT_METHOD');
  const before=snapshot(record,now);if(before.locked)return json({ok:false,error:'Batas Support host sudah tercapai',code:'SUPPORT_LIMIT',subscription:before,support:{link:'',qris:''}},409);
  const viewer=await getAccount(storage,request);
  if(viewer?.id===record.id)return json({ok:true,allowed:true,counted:false,self:true,subscription:before,support:methods});
  const rawIdentity=viewer?.id?('account:'+viewer.id):('guest:'+clean(request.headers.get('x-nadmo-client-ip')||'unknown',80)+'|'+clean(request.headers.get('user-agent')||'',180));
  const fingerprint=await digest(rawIdentity),key='support-action:'+record.id+':'+fingerprint,last=Number(await storage.get(key))||0;
  if(last&&now-last<DEDUPE_MS)return json({ok:true,allowed:true,counted:false,deduped:true,subscription:before,support:methods});
  record.supportActionCount=Math.max(0,Number(record.supportActionCount)||0)+1;record.updatedAt=now;
  await storage.put('auth-user:'+record.id,record);await storage.put(key,now);
  const after=snapshot(record,now);return json({ok:true,allowed:true,counted:true,subscription:after,lockedAfter:after.locked,support:methods});
 }

 if(p==='/api/subscription/support-methods'&&method==='POST'){
  if(!originOK(request))return fail(403,'Permintaan harus dari NADMO LIVE','ORIGIN_REQUIRED');
  const user=await getAccount(storage,request);if(!user)return fail(401,'Login diperlukan','LOGIN_REQUIRED');
  let body;try{body=await parseJSON(request)}catch{return fail(400,'Data tidak valid','INVALID_INPUT')}
  const record=await storage.get('auth-user:'+user.id);if(!record)return fail(404,'Akun tidak ditemukan','ACCOUNT_NOT_FOUND');
  const supportUrl=body.supportUrl?urlOK(clean(body.supportUrl,500)):'';if(body.supportUrl&&!supportUrl)return fail(400,'Link Saweria/dukungan harus HTTPS yang valid','BAD_SUPPORT_URL');
  const qrisUrl=clean(body.qrisUrl,700);if(qrisUrl&&!mediaOwned(qrisUrl,u.origin,user.id))return fail(400,'QRIS harus berupa gambar yang diupload oleh akun ini','BAD_QRIS_URL');
  record.supportUrl=supportUrl||'';record.supportQrisUrl=qrisUrl||'';record.updatedAt=now;await storage.put('auth-user:'+user.id,record);
  return json({ok:true,support:supportMethods(record)});
 }


 if(p==='/api/subscription/dana/create'&&method==='POST'){
  if(!originOK(request))return fail(403,'Permintaan harus dari NADMO LIVE','ORIGIN_REQUIRED');
  if(!danaGatewayReady(env))return fail(503,'DANA Payment Gateway belum siap','DANA_NOT_READY');
  const user=await getAccount(storage,request);if(!user)return fail(401,'Login diperlukan','LOGIN_REQUIRED');
  let body;try{body=await parseJSON(request)}catch{return fail(400,'Data tidak valid','INVALID_INPUT')}
  const targetTier=clean(body.targetTier,10).toLowerCase();if(!['pro','plus'].includes(targetTier))return fail(400,'Paket tidak valid','BAD_PLAN');
  const record=await storage.get('auth-user:'+user.id);if(!record)return fail(404,'Akun tidak ditemukan','ACCOUNT_NOT_FOUND');
  const state=snapshot(record,now),allowed=state.tier==='free'?targetTier==='pro':state.tier==='pro'?['pro','plus'].includes(targetTier):targetTier==='plus';
  if(!allowed)return fail(409,'Paket tujuan tidak sesuai tier saat ini','BAD_UPGRADE_PATH');
  const existing=await pendingOrder(storage,record);
  if(existing){
   if(existing.provider==='dana-payment-gateway'&&existing.checkoutUrl&&Number(existing.validUntil)>now)return json({ok:true,duplicate:true,checkoutUrl:existing.checkoutUrl,order:{id:existing.id,targetTier:existing.targetTier,price:existing.price,status:existing.status,provider:existing.provider}});
   return fail(409,'Masih ada pembayaran yang menunggu','ORDER_PENDING');
  }
  const id=crypto.randomUUID(),partnerReferenceNo='NADMO-'+id,price=PLAN[targetTier].price,validUntil=now+15*60*1000;
  const apiOrigin=String(env.DANA_API_ORIGIN||'').replace(/\/$/,'');
  const path='/payment-gateway/v1.0/debit/payment-host-to-host.htm',timestamp=danaTs(now);
  const payload={
   partnerReferenceNo,
   merchantId:String(env.DANA_MERCHANT_ID),
   amount:{value:Number(price).toFixed(2),currency:'IDR'},
   validUpTo:danaTs(validUntil),
   urlParams:[
    {url:u.origin+'/subscription/?payment=dana&order='+encodeURIComponent(id),type:'PAY_RETURN',isDeeplink:'N'},
    {url:u.origin+'/v1.0/debit/notify',type:'NOTIFICATION',isDeeplink:'N'}
   ],
   additionalInfo:{
    order:{orderTitle:'NADMO LIVE '+targetTier.toUpperCase()+' 30 Hari',scenario:'REDIRECT'},
    mcc:'5817',
    envInfo:{sourcePlatform:'IPG',terminalType:'SYSTEM',orderTerminalType:'WEB'}
   }
  };
  const raw=JSON.stringify(payload),signature=await danaSign(env,'POST',path,raw,timestamp);
  const headers={'Content-Type':'application/json','X-TIMESTAMP':timestamp,'X-SIGNATURE':signature,'X-PARTNER-ID':String(env.DANA_X_PARTNER_ID),'X-EXTERNAL-ID':crypto.randomUUID(),'CHANNEL-ID':'95221','ORIGIN':u.origin,'Accept':'application/json'};
  if(String(env.DANA_ENV||'').toLowerCase()==='sandbox')headers['X-Debug-Mode']='true';
  let response,data;try{
   response=await fetch(apiOrigin+path,{method:'POST',headers,body:raw,redirect:'manual',signal:AbortSignal.timeout(10000)});
   const text=await response.text();try{data=JSON.parse(text)}catch{data={responseMessage:text.slice(0,200)}}
  }catch{return fail(502,'DANA tidak merespons','DANA_TIMEOUT')}
  if(data?.responseCode!=='2005400'||!data?.webRedirectUrl)return json({ok:false,error:data?.responseMessage||'Create Order DANA gagal',code:data?.responseCode||'DANA_CREATE_FAILED'},502);
  const order={id,userId:user.id,handle:record.handle,name:record.name,targetTier,price,proofUrl:'',status:'pending',provider:'dana-payment-gateway',paymentStatus:'awaiting_payment',partnerReferenceNo,providerReferenceNo:data.referenceNo||null,checkoutUrl:data.webRedirectUrl,validUntil,createdAt:now,graceGranted:false};
  await storage.put('subscription-order:'+id,order);await storage.put('subscription-dana-ref:'+partnerReferenceNo,id);
  record.subscriptionPendingOrderId=id;record.subscriptionGraceUntil=0;record.updatedAt=now;await storage.put('auth-user:'+user.id,record);
  return json({ok:true,checkoutUrl:data.webRedirectUrl,order:{id,targetTier,price,status:'pending',provider:order.provider,validUntil}},201);
 }

 if(p==='/api/subscription/dana/notify'&&method==='POST'){
  const raw=await request.text(),timestamp=clean(request.headers.get('X-TIMESTAMP'),40),signature=clean(request.headers.get('X-SIGNATURE'),1200),partnerId=clean(request.headers.get('X-PARTNER-ID'),80);
  const ack=(code='2005600',message='Successful',status=200)=>new Response(JSON.stringify({responseCode:code,responseMessage:message}),{status,headers:{'Content-Type':'application/json; charset=utf-8','X-TIMESTAMP':danaTs(),'Cache-Control':'no-store'}});
  if(partnerId!==String(env.DANA_X_PARTNER_ID||''))return ack('5005601','Internal Server Error',500);
  let valid=false,data;try{valid=await danaVerify(env,raw,timestamp,signature);data=JSON.parse(raw)}catch{return ack('5005601','Internal Server Error',500)}
  if(!valid)return ack('5005601','Internal Server Error',500);
  if(String(data.merchantId||'')!==String(env.DANA_MERCHANT_ID||''))return ack('5005601','Internal Server Error',500);
  const ref=clean(data.originalPartnerReferenceNo,80),id=ref&&await storage.get('subscription-dana-ref:'+ref);if(!id)return ack();
  const order=await storage.get('subscription-order:'+id);if(!order)return ack();
  if(order.status==='approved'||order.status==='rejected'||order.status==='cancelled')return ack();
  const record=await storage.get('auth-user:'+order.userId);if(!record)return ack('5005601','Internal Server Error',500);
  const amount=Number(data?.amount?.value),currency=String(data?.amount?.currency||'');
  if(!Number.isFinite(amount)||amount!==Number(order.price)||currency!=='IDR')return ack('5005601','Internal Server Error',500);
  const status=String(data.latestTransactionStatus||'');
  if(status==='00'){
   await activatePaidOrder(storage,order,record,now,clean(data.originalReferenceNo,80));return ack();
  }
  if(status==='05'){
   order.status='cancelled';order.paymentStatus='expired';order.reviewedAt=now;record.subscriptionPendingOrderId='';record.updatedAt=now;
   await storage.put('subscription-order:'+id,order);await storage.put('auth-user:'+record.id,record);return ack();
  }
  return ack();
 }

 if(p==='/api/subscription/order'&&method==='POST'){
  if(!originOK(request))return fail(403,'Permintaan harus dari NADMO LIVE','ORIGIN_REQUIRED');
  const user=await getAccount(storage,request);if(!user)return fail(401,'Login diperlukan','LOGIN_REQUIRED');
  let body;try{body=await parseJSON(request)}catch{return fail(400,'Data tidak valid','INVALID_INPUT')}
  const targetTier=clean(body.targetTier,10).toLowerCase(),proofUrl=clean(body.proofUrl,700);
  if(!['pro','plus'].includes(targetTier))return fail(400,'Paket tidak valid','BAD_PLAN');
  if(!mediaOwned(proofUrl,u.origin,user.id))return fail(400,'Bukti pembayaran harus gambar yang diupload dari akun ini','BAD_PROOF');
  const record=await storage.get('auth-user:'+user.id);if(!record)return fail(404,'Akun tidak ditemukan','ACCOUNT_NOT_FOUND');
  const state=snapshot(record,now),allowed=state.tier==='free'?targetTier==='pro':state.tier==='pro'?['pro','plus'].includes(targetTier):targetTier==='plus';
  if(!allowed)return fail(409,'Paket tujuan tidak sesuai tier saat ini','BAD_UPGRADE_PATH');
  const existing=await pendingOrder(storage,record);if(existing)return json({ok:true,duplicate:true,order:{id:existing.id,targetTier:existing.targetTier,status:existing.status,createdAt:existing.createdAt},subscription:state});
  const id=crypto.randomUUID(),cycle=state.tier+'>'+targetTier+':'+String(Number(record.subscriptionExpiresAt)||0),graceGranted=state.locked&&record.subscriptionGraceLock!==cycle;
  const order={id,userId:user.id,handle:record.handle,name:record.name,targetTier,price:PLAN[targetTier].price,proofUrl,status:'pending',createdAt:now,graceGranted};
  await storage.put('subscription-order:'+id,order);record.subscriptionPendingOrderId=id;
  if(graceGranted){record.subscriptionGraceUntil=now+GRACE_MS;record.subscriptionGraceLock=cycle}else record.subscriptionGraceUntil=0;
  record.updatedAt=now;await storage.put('auth-user:'+user.id,record);
  return json({ok:true,order:{id,targetTier,price:order.price,status:'pending',createdAt:now,graceGranted},subscription:snapshot(record,now)},201);
 }

 if(p==='/api/admin/subscriptions'&&method==='GET'){
  const admin=await adminPrincipal(storage,request,env);if(!admin)return fail(403,'Akun ini bukan owner/admin NADMO LIVE','ADMIN_REQUIRED');
  const entries=await storage.list({prefix:'subscription-order:',limit:500}),orders=[];
  for(const order of entries.values()){if(!order?.id)continue;const record=await storage.get('auth-user:'+order.userId);orders.push({...order,subscription:record?snapshot(record,now):null})}
  orders.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));return json({ok:true,orders:orders.slice(0,200),plan:publicPlan()});
 }

 if(p==='/api/admin/subscriptions/action'&&method==='POST'){
  if(!originOK(request))return fail(403,'Permintaan harus dari NADMO LIVE','ORIGIN_REQUIRED');
  const admin=await adminPrincipal(storage,request,env);if(!admin)return fail(403,'Akun ini bukan owner/admin NADMO LIVE','ADMIN_REQUIRED');
  let body;try{body=await parseJSON(request)}catch{return fail(400,'Data tidak valid','INVALID_INPUT')}
  const id=clean(body.orderId,80),action=clean(body.action,12).toLowerCase();if(!id||!['approve','reject'].includes(action))return fail(400,'Aksi admin tidak valid','BAD_ADMIN_ACTION');
  const order=await storage.get('subscription-order:'+id);if(!order)return fail(404,'Order tidak ditemukan','ORDER_NOT_FOUND');if(order.status!=='pending')return json({ok:true,unchanged:true,order});
  const record=await storage.get('auth-user:'+order.userId);if(!record)return fail(404,'Akun host tidak ditemukan','ACCOUNT_NOT_FOUND');
  if(action==='approve'){
   const currentTier=tierOf(record,now),sameTier=currentTier===order.targetTier&&Number(record.subscriptionExpiresAt)>now,base=sameTier?Number(record.subscriptionExpiresAt):now;
   record.subscriptionTier=order.targetTier;record.subscriptionExpiresAt=base+SUBSCRIPTION_MS;record.subscriptionPendingOrderId='';record.subscriptionGraceUntil=0;record.subscriptionGraceLock='';record.updatedAt=now;
   order.status='approved';order.reviewedAt=now;order.approvedAt=now;
  }else{record.subscriptionPendingOrderId='';record.subscriptionGraceUntil=0;record.updatedAt=now;order.status='rejected';order.reviewedAt=now;order.rejectedAt=now}
  await storage.put('auth-user:'+record.id,record);await storage.put('subscription-order:'+id,order);return json({ok:true,order,subscription:snapshot(record,now)});
 }

 return fail(404,'Subscription endpoint tidak ditemukan','NOT_FOUND');
}
