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
function qrisConfig(env){const raw=clean(env?.ACM_STORE_QRIS_URL,500);if(!raw)return '';try{const u=new URL(raw);return u.protocol==='https:'?u.href:''}catch{return ''}}
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
 for(const record of users.values()){
  if(!record||record.disabled)continue;
  if(!oldest||Number(record.createdAt||Infinity)<Number(oldest.createdAt||Infinity))oldest=record;
 }
 return oldest?.id===user.id?user:null;
}
async function parseJSON(request,max=12000){const len=Number(request.headers.get('content-length')||0);if(len>max)throw Error('TOO_LARGE');const raw=await request.text();if(raw.length>max)throw Error('TOO_LARGE');const data=JSON.parse(raw);if(!data||Array.isArray(data)||typeof data!=='object')throw Error('INVALID');return data}
const supportMethods=(record,prefs={})=>({link:urlOK(record?.supportUrl)||'',qris:clean(record?.supportQrisUrl,700),sociabuzz:urlOK(prefs?.socialBuzzUrl)||''});

export async function subscriptionEndpoint(storage,request,env){
 const u=new URL(request.url),p=u.pathname,method=request.method,now=Date.now();

 if(p==='/api/subscription/host'&&method==='GET'){
  const handle=clean(u.searchParams.get('handle'),24).replace(/^@/,'').toLowerCase(),record=await userByHandle(storage,handle);
  if(!record)return fail(404,'Host tidak ditemukan','HOST_NOT_FOUND');
  return json({ok:true,host:{handle:record.handle,name:record.name},subscription:snapshot(record,now),support:supportMethods(record,await storage.get('support-prefs:'+record.id))});
 }

 if(p==='/api/subscription/me'&&method==='GET'){
  const user=await getAccount(storage,request);if(!user)return fail(401,'Login diperlukan','LOGIN_REQUIRED');
  const record=await storage.get('auth-user:'+user.id),pending=await pendingOrder(storage,record);
  return json({ok:true,plan:publicPlan(),qrisUrl:qrisConfig(env),subscription:snapshot(record,now),support:supportMethods(record,await storage.get('support-prefs:'+record.id)),
   pending:pending?{id:pending.id,targetTier:pending.targetTier,price:pending.price,status:pending.status,createdAt:pending.createdAt,graceGranted:pending.graceGranted===true}:null});
 }

 if(p==='/api/subscription/support-action'&&method==='POST'){
  if(!originOK(request))return fail(403,'Permintaan harus dari NADMO LIVE','ORIGIN_REQUIRED');
  let body;try{body=await parseJSON(request)}catch{return fail(400,'Data tidak valid','INVALID_INPUT')}
  const handle=clean(body.handle,24).replace(/^@/,'').toLowerCase(),record=await userByHandle(storage,handle);
  if(!record)return fail(404,'Host tidak ditemukan','HOST_NOT_FOUND');
  const methods=supportMethods(record,await storage.get('support-prefs:'+record.id));if(!methods.link&&!methods.qris&&!methods.sociabuzz)return fail(409,'Host belum memasang Saweria, SociaBuzz atau QRIS','NO_SUPPORT_METHOD');
  const before=snapshot(record,now);if(before.locked)return json({ok:false,error:'Batas Support host sudah tercapai',code:'SUPPORT_LIMIT',subscription:before,support:{link:'',qris:'',sociabuzz:''}},409);
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
  return json({ok:true,support:supportMethods(record,await storage.get('support-prefs:'+record.id))});
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
