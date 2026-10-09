import {scrypt} from 'node:crypto';
import {SUPPORTER_THRESHOLDS,SUPPORTER_TIERS,getSupporterProfile,getPublicSupporterBadge} from './supporter-levels.mjs';
import {walletSnapshot,payoutCapability} from './wallet.mjs';
// NADMO LIVE authenticated profiles — PRIVATE beta, NOT government identity verification.
// All persistent account state is in RoomHub Durable Object storage, isolated by prefix.
// Never store KTP, NIK, passports, selfies, government ID or raw payment credentials here.
const enc = new TextEncoder();
const handleOK = v => /^[a-z][a-z0-9_]{2,23}$/.test(v);
const COOKIE='nadmo_beta_session';
const SESSION_AGE=7*86400;
const MAX_BODY=16000;
const AVATAR_MAX_BYTES=65536; // Compact profile pictures only; no raw high-resolution photo storage.
const AVATAR_RESPONSE_HEADERS={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin'};
const clean=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
async function digest(value){return hex(await crypto.subtle.digest('SHA-256',enc.encode(value)))}
async function passwordHash(password,salt){
 // Cloudflare production caps PBKDF2 at 100,000 rounds. Use memory-hard scrypt instead.
 // Fixed configuration for this private beta: N=2^14, r=8, p=1, 32-byte output,
 // with a distinct 128-bit per-account random salt. Never weaken on failure.
 const key=await new Promise((resolve,reject)=>{
  scrypt(password,salt,32,{N:16384,r:8,p:1,maxmem:33554432},(error,derived)=>{
   if(error)reject(error);else resolve(derived);
  });
 });
 return hex(key);
}
function safeCompare(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0}
const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}});
const fail=(status,message)=>json({ok:false,error:message},status);
const originOK=req=>req.headers.get('Origin')===new URL(req.url).origin;
function cookies(req){const cookie=req.headers.get('Cookie')||'';return cookie.split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||''}
function cookie(token){return COOKIE+'='+token+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age='+SESSION_AGE}
function unCookie(){return COOKIE+'=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'}
function urlOK(raw){
 if(typeof raw!=='string'||raw.length>500)return null;
 try{
  const u=new URL(raw.trim());
  if(u.protocol!=='https:'||!u.hostname.includes('.')||u.username||u.password||u.hostname==='localhost'||u.port)return null;
  if(/^(?:127\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(u.hostname))return null;
  return u.href;
 }catch{return null}
}
async function throttle(storage,key,limit,windowMs){
 const now=Date.now();
 const value=await storage.get('auth-limit:'+key)||{count:0,until:now+windowMs};
 if(now>value.until){value.count=0;value.until=now+windowMs}
 value.count++;
 await storage.put('auth-limit:'+key,value);
 return value.count<=limit;
}
async function getAccountBySessionFingerprint(storage,fingerprint){
 if(typeof fingerprint!=='string'||!/^[a-f0-9]{64}$/.test(fingerprint))return null;
 const session=await storage.get('auth-session:'+fingerprint);
 if(!session||session.expiresAt<Date.now())return null;
 const user=await storage.get('auth-user:'+session.id);
 return user&&user.disabled!==true?{id:session.id,handle:user.handle,name:user.name,bio:user.bio||'',links:user.links||[],avatarVersion:user.avatarVersion||0,verifiedAdult:user.verifiedAdult===true,kycStatus:user.kycStatus||'NOT_CONFIGURED'}:null;
}
async function getSessionFingerprint(request){
 const token=cookies(request);
 return /^[a-f0-9]{64}$/.test(token)?await digest(token):null;
}
async function getAccount(storage,request){
 const fingerprint=await getSessionFingerprint(request);
 return fingerprint?getAccountBySessionFingerprint(storage,fingerprint):null;
}
async function createSession(storage,account){
 const token=hex(crypto.getRandomValues(new Uint8Array(32)));
 await storage.put('auth-session:'+await digest(token),{id:account.id,expiresAt:Date.now()+SESSION_AGE*1000});
 return token;
}
export {getAccount,urlOK,getAccountBySessionFingerprint,getSessionFingerprint};
export async function accountEndpoint(storage,request){
 const u=new URL(request.url),p=u.pathname,method=request.method;
 if(p==='/api/supporter/levels'&&method==='GET')return json({
  ok:true,version:'nadmo-supporter-v1',currency:'IDR',totalLevels:50,thresholdsIDR:SUPPORTER_THRESHOLDS,
  tiers:SUPPORTER_TIERS,paymentsEnabled:false,
  policy:'Only verified settled rupiah tips count. No public individual spending amount, no client-generated level.'
 });
 if(p==='/api/supporter/me'&&method==='GET'){
  const active=await getAccount(storage,request);
  if(!active)return json({ok:true,authenticated:false,supporter:null,paymentsEnabled:false});
  const record=await storage.get('auth-user:'+active.id);
  return json({ok:true,authenticated:true,supporter:await getSupporterProfile(storage,active.id,record),paymentsEnabled:false});
 }
 if(p==='/api/social/feed'&&method==='GET'){
  return json({ok:true,posts:(await storage.get('social-public-feed')||[]).slice(0,80)});
 }
 if(p==='/api/payments/status'&&method==='GET')return json({
  enabled:false,providerConfigured:false,transfersAllowed:false,privateTicketsEnabled:false,
  recipientPayoutsEnabled:false,state:'WAITING_LICENSED_PROVIDER'
 });
 if(p==='/api/wallet/me'&&method==='GET'){
  const owner=await getAccount(storage,request);
  if(!owner)return fail(401,'Masuk akun untuk melihat dompet');
  const balances=await walletSnapshot(storage,owner.id);
  return json({ok:true,wallet:balances,capability:payoutCapability(),identityVerified:owner.kycStatus==='verified'&&owner.verifiedAdult});
 }
 if(p==='/api/wallet/withdraw'&&method!=='POST')return fail(405,'Method not allowed');

 const pairId=(a,b)=>[a,b].sort().join(':');
 const threadKey=(a,b)=>'dm-thread:'+pairId(a,b);
 const approvalKey=(a,b)=>'dm-approved:'+pairId(a,b);
 const hasBlock=async(a,b)=>!!(await storage.get('dm-block:'+a+':'+b)||await storage.get('dm-block:'+b+':'+a));
 const principal=p.startsWith('/api/messages/')?await getAccount(storage,request):null;
 if(p.startsWith('/api/messages/')&&method==='GET'){
  if(!principal)return fail(401,'Masuk akun untuk melihat pesan');
  if(p==='/api/messages/threads'){
   const members=await storage.list({prefix:'dm-member:'+principal.id+':',limit:100});
   const threads=[];
   for(const item of members.values()){
    if(!item?.otherId||await hasBlock(principal.id,item.otherId))continue;
    const other=await storage.get('auth-user:'+item.otherId);
    if(!other||other.disabled)continue;
    const messages=await storage.get(threadKey(principal.id,item.otherId))||[];
    threads.push({handle:other.handle,name:other.name,
      updatedAt:messages.at(-1)?.createdAt||item.createdAt||0,
      lastText:messages.at(-1)?.text?.slice(0,100)||''});
   }
   return json({ok:true,threads:threads.sort((a,b)=>b.updatedAt-a.updatedAt)});
  }
  if(p==='/api/messages/requests'){
   const requests=await storage.list({prefix:'dm-request:'+principal.id+':',limit:60});
   const incoming=[];
   for(const r of requests.values()){
    const sender=r?.fromId&&await storage.get('auth-user:'+r.fromId);
    if(sender&&!sender.disabled&&!await hasBlock(principal.id,sender.id))
     incoming.push({handle:sender.handle,name:sender.name,createdAt:r.createdAt});
   }
   return json({ok:true,requests:incoming.slice(0,30)});
  }
  if(p.startsWith('/api/messages/thread/')){
   const handle=decodeURIComponent(p.slice('/api/messages/thread/'.length)).toLowerCase();
   if(!handleOK(handle))return fail(404,'Percakapan tidak ditemukan');
   const id=await storage.get('auth-handle:'+handle);
   if(!id||await hasBlock(principal.id,id)||!await storage.get(approvalKey(principal.id,id)))
    return fail(403,'Percakapan memerlukan persetujuan kedua akun');
   return json({ok:true,messages:(await storage.get(threadKey(principal.id,id))||[]).slice(-80)});
  }
  return fail(404,'Halaman pesan tidak ditemukan');
 }
 if(p==='/api/streaming/capacity')return json({architecture:'P2P_WEBRTC',maxViewersPerRoom:4,turnConfigured:false,sfuConfigured:false,scaleReady:false});
 if(p.startsWith('/api/profile/')&&p.endsWith('/avatar')&&method==='GET'){
  const handle=p.slice('/api/profile/'.length,-'/avatar'.length).toLowerCase();
  if(!handleOK(handle))return new Response('Not Found',{status:404,headers:AVATAR_RESPONSE_HEADERS});
  const id=await storage.get('auth-handle:'+handle);
  if(!id)return new Response('Not Found',{status:404,headers:AVATAR_RESPONSE_HEADERS});
  const owner=await storage.get('auth-user:'+id);
  if(!owner||owner.disabled)return new Response('Not Found',{status:404,headers:AVATAR_RESPONSE_HEADERS});
  const photo=await storage.get('auth-avatar:'+id);
  if(!photo||!photo.data||!['image/jpeg','image/webp'].includes(photo.type))
   return new Response('Not Found',{status:404,headers:AVATAR_RESPONSE_HEADERS});
  return new Response(photo.data,{status:200,headers:{...AVATAR_RESPONSE_HEADERS,'Content-Type':photo.type}});
 }
 if(p==='/api/account/avatar'&&method==='GET')return fail(405,'Method not allowed');
 if(p==='/api/account/avatar'&&['PUT','DELETE'].includes(method)){
  if(!originOK(request))return fail(403,'Same-origin request required');
  const owner=await getAccount(storage,request);
  if(!owner)return fail(401,'Masuk akun untuk mengganti foto');
  if(!await throttle(storage,'avatar:'+owner.id,15,15*60000))
   return fail(429,'Terlalu sering mengganti foto. Coba lagi nanti.');
  const record=await storage.get('auth-user:'+owner.id);
  if(!record||record.disabled)return fail(401,'Akun tidak tersedia');
  if(method==='DELETE'){
   await storage.delete('auth-avatar:'+owner.id);
   record.avatarVersion=0;record.updatedAt=Date.now();
   await storage.put('auth-user:'+owner.id,record);
   return json({ok:true,avatarVersion:0});
  }
  const type=(request.headers.get('Content-Type')||'').toLowerCase();
  if(!['image/jpeg','image/webp'].includes(type))return fail(415,'Gunakan foto JPG, PNG, atau WebP');
  const length=Number(request.headers.get('Content-Length')||0);
  if(length>AVATAR_MAX_BYTES)return fail(413,'Foto terlalu besar. Maksimal 64 KB setelah diperkecil.');
  const body=await request.arrayBuffer();
  if(body.byteLength<100||body.byteLength>AVATAR_MAX_BYTES)return fail(413,'Ukuran foto tidak valid');
  const bytes=new Uint8Array(body);
  const jpeg=type==='image/jpeg'&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff;
  const webp=type==='image/webp'&&bytes[0]===0x52&&bytes[1]===0x49&&bytes[2]===0x46&&bytes[3]===0x46
   &&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
  if(!jpeg&&!webp)return fail(415,'File bukan gambar yang didukung');
  await storage.put('auth-avatar:'+owner.id,{type,data:bytes});
  record.avatarVersion=Date.now();record.updatedAt=record.avatarVersion;
  await storage.put('auth-user:'+owner.id,record);
  return json({ok:true,avatarVersion:record.avatarVersion});
 }
 if(p.startsWith('/api/profile/')&&method==='GET'){
  const handle=decodeURIComponent(p.slice('/api/profile/'.length)).toLowerCase();
  if(!handleOK(handle))return fail(404,'Profil tidak ditemukan');
  const id=await storage.get('auth-handle:'+handle);
  const account=id&&await storage.get('auth-user:'+id);
  if(!account||account.disabled)return fail(404,'Profil tidak ditemukan');
  const posts=await storage.get('auth-posts:'+id)||[];
  const supporterBadge=await getPublicSupporterBadge(storage,account.id,account);
  return json({ok:true,profile:{handle:account.handle,name:account.name,bio:account.bio||'',links:account.links||[],avatarVersion:account.avatarVersion||0,verified:account.kycStatus==='verified',supporterBadge,posts:posts.filter(x=>x.status==='published').slice(0,20)}});
 }
 if(!p.startsWith('/api/account/')&&!p.startsWith('/api/messages/')&&p!=='/api/wallet/withdraw')return fail(404,'Not Found');
 if(p==='/api/account/me'&&method==='GET'){
  const user=await getAccount(storage,request);
  return json({ok:true,authenticated:!!user,account:user});
 }
 if(!['POST','PUT'].includes(method))return fail(405,'Method not allowed');
 if(!originOK(request))return fail(403,'Same-origin request required');
 if(!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type')||''))return fail(415,'JSON required');
 if(Number(request.headers.get('content-length')||0)>MAX_BODY)return fail(413,'Too large');
 let payload;
 try{
  const raw=await request.text();
  if(raw.length>MAX_BODY)return fail(413,'Too large');
  payload=JSON.parse(raw);
  if(!payload||Array.isArray(payload)||typeof payload!=='object')return fail(400,'Invalid input');
 }catch{return fail(400,'Invalid JSON')}
 const ip=clean(request.headers.get('x-nadmo-client-ip')||'unknown',70);
 const ipHash=await digest(ip);
 if(!await throttle(storage,ipHash+':'+p,25,15*60000))return fail(429,'Terlalu banyak percobaan, coba lagi nanti');
 if(p==='/api/account/register'&&method==='POST'){
  const handle=clean(payload.handle,24).toLowerCase();
  const name=clean(payload.name,60);
  const pw=payload.password;
  if(!handleOK(handle)||!name||name.length>60||typeof pw!=='string'||pw.length<12||pw.length>128)
   return fail(400,'Username 3–24 karakter, nama dan kata sandi minimal 12 karakter diperlukan');
  if(await storage.get('auth-handle:'+handle))return fail(409,'Username sudah digunakan');
  // Explicitly not KYC: this account cannot be treated as an identity-verified streamer.
  const salt=hex(crypto.getRandomValues(new Uint8Array(16)));
  let passhash;
  try{passhash=await passwordHash(pw,salt)}
  catch(error){console.error('Password KDF failure',error?.name,error?.code);return fail(503,'Secure password hashing unavailable on this server')}
  const id=crypto.randomUUID();
  const user={id,handle,name,bio:'',links:[],salt,passhash,passAlgo:'scrypt-v1',kycStatus:'NOT_CONFIGURED',verifiedAdult:false,createdAt:Date.now()};
  await storage.put('auth-user:'+id,user);
  await storage.put('auth-handle:'+handle,id);
  const token=await createSession(storage,user);
  return json({ok:true,account:{id,handle,name,bio:'',links:[],avatarVersion:0,kycStatus:'NOT_CONFIGURED',verifiedAdult:false}},201,{'Set-Cookie':cookie(token)});
 }
 if(p==='/api/account/login'&&method==='POST'){
  const handle=clean(payload.handle,24).toLowerCase(),pw=payload.password;
  if(!handleOK(handle)||typeof pw!=='string'||pw.length>128)return fail(401,'Login tidak valid');
  if(!await throttle(storage,ipHash+':login:'+handle,8,15*60000))return fail(429,'Terlalu banyak upaya login');
  const id=await storage.get('auth-handle:'+handle),user=id&&await storage.get('auth-user:'+id);
  if(!user||user.disabled||!safeCompare(await passwordHash(pw,user.salt),user.passhash))return fail(401,'Username atau kata sandi salah');
  const token=await createSession(storage,user);
  return json({ok:true,account:{id,handle:user.handle,name:user.name,bio:user.bio||'',links:user.links||[],avatarVersion:user.avatarVersion||0,kycStatus:user.kycStatus||'NOT_CONFIGURED',verifiedAdult:user.verifiedAdult===true}},200,{'Set-Cookie':cookie(token)});
 }
 if(p==='/api/account/logout'&&method==='POST'){
  const token=cookies(request);
  if(token)await storage.delete('auth-session:'+await digest(token));
  return json({ok:true},200,{'Set-Cookie':unCookie()});
 }
 const user=await getAccount(storage,request);
 if(!user)return fail(401,'Login diperlukan');
 const record=await storage.get('auth-user:'+user.id);
 if(!record)return fail(401,'Login diperlukan');
 if(p==='/api/wallet/withdraw'){
  // Never accept bank details or queue a real payout without a licensed provider,
  // reconciled ledger, verified account, and secured payout-destination vault.
  return fail(409,'Penarikan belum tersedia. Saldo dan pencairan aktif setelah pembayaran resmi diluncurkan.');
 }
 if(p==='/api/account/supporter-visibility'&&method==='PUT'){
  if(typeof payload.visible!=='boolean')return fail(400,'Pilihan tampilan badge tidak valid');
  record.supporterBadgeVisible=payload.visible;record.updatedAt=Date.now();
  await storage.put('auth-user:'+user.id,record);
  return json({ok:true,visible:record.supporterBadgeVisible});
 }
 if(p==='/api/account/delete'&&method==='POST'){
  const wallet=await walletSnapshot(storage,user.id);
  if(wallet.transactions.length||wallet.withdrawals.length)
   return fail(409,'Akun memiliki riwayat keuangan dan memerlukan proses penghapusan sesuai kewajiban pencatatan.');
  if(record.kycStatus==='verified')return fail(403,'Penghapusan akun terverifikasi harus melalui peninjauan retensi data.');
  const password=typeof payload.password==='string'?payload.password:'';
  if(!password||!safeCompare(await passwordHash(password,record.salt),record.passhash))
   return fail(401,'Konfirmasi kata sandi salah');
  await storage.delete('auth-handle:'+record.handle);
  await storage.delete('auth-posts:'+record.id);
  await storage.delete('auth-avatar:'+record.id);
  await storage.delete('auth-user:'+record.id);
  const token=cookies(request);
  if(token)await storage.delete('auth-session:'+await digest(token));
  return json({ok:true,deleted:true},200,{'Set-Cookie':unCookie()});
 }
 if(p==='/api/account/profile'&&method==='PUT'){
  const name=clean(payload.name,60),bio=clean(payload.bio,300);
  if(!name)return fail(400,'Nama tampilan wajib diisi');
  const links=payload.links;
  if(!Array.isArray(links)||links.length>12)return fail(400,'Maksimum 12 link');
  const validated=[];
  for(const entry of links){
   const label=clean(entry?.label,40),url=urlOK(entry?.url);
   if(!label||!url||validated.some(x=>x.url===url))return fail(400,'Terdapat link tidak valid atau duplikat');
   validated.push({label,url});
  }
  record.name=name;record.bio=bio;record.links=validated;record.updatedAt=Date.now();
  await storage.put('auth-user:'+user.id,record);
  return json({ok:true,account:{id:record.id,handle:record.handle,name,bio,links:validated,avatarVersion:record.avatarVersion||0,verifiedAdult:user.verifiedAdult,kycStatus:user.kycStatus}});
 }
 if(p==='/api/account/posts/publish'&&method==='POST'){
  const text=clean(payload.text,2000);
  if(!text||typeof payload.text!=='string'||payload.text.length>2000)return fail(400,'Postingan tidak valid');
  if(!await throttle(storage,'publish:'+user.id,8,3600000))return fail(429,'Terlalu banyak postingan');
  const post={id:crypto.randomUUID(),accountId:user.id,handle:user.handle,name:record.name,
   avatarVersion:record.avatarVersion||0,text,createdAt:Date.now(),status:'published'};
  const previous=await storage.get('auth-posts:'+user.id)||[];
  await storage.put('auth-posts:'+user.id,[post,...previous].slice(0,80));
  const feed=await storage.get('social-public-feed')||[];
  await storage.put('social-public-feed',[post,...feed].slice(0,200));
  return json({ok:true,post},201);
 }
 if(p==='/api/account/posts/delete'&&method==='POST'){
  const id=typeof payload.id==='string'?payload.id:'';
  if(!/^[a-f0-9-]{36}$/.test(id))return fail(400,'Postingan tidak valid');
  const previous=await storage.get('auth-posts:'+user.id)||[];
  if(!previous.some(post=>post.id===id))return fail(404,'Postingan tidak ditemukan');
  await storage.put('auth-posts:'+user.id,previous.filter(post=>post.id!==id));
  const feed=await storage.get('social-public-feed')||[];
  await storage.put('social-public-feed',feed.filter(post=>post.id!==id));
  return json({ok:true,deleted:true});
 }
 if(p==='/api/account/posts'&&method==='POST'){
  const text=clean(payload.text,2000);
  if(!text)return fail(400,'Caption kosong');
  const previous=await storage.get('auth-posts:'+user.id)||[];
  // Only drafts in beta until identity/moderation/reporting are ready.
  const post={id:crypto.randomUUID(),text,createdAt:Date.now(),status:'draft'};
  await storage.put('auth-posts:'+user.id,[post,...previous].slice(0,40));
  return json({ok:true,post},201);
 }
 if(p==='/api/account/posts'&&method==='GET')return fail(405,'Use /api/account/posts/list');
 if(p==='/api/account/posts/list'&&method==='POST')return json({ok:true,posts:await storage.get('auth-posts:'+user.id)||[]});
 return fail(404,'Unknown account action');
}
