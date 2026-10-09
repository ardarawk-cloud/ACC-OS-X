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
// Indexed, account-bound social follows: never browser-only or fabricated counts.
const socialFollowing=(a,b)=>'social-following:'+a+':'+b;
const socialFollower=(a,b)=>'social-follower:'+a+':'+b;
const socialCounts=account=>({followers:Math.max(0,Number(account?.followersCount)||0),following:Math.max(0,Number(account?.followingCount)||0)});

const AVATAR_MAX_BYTES=65536;
// Creator-first social interactions. Counts and permissions come from durable server state.
const postIdOK=id=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f-]{27,}$/.test(id)&&id.length===36;
const socialLikesKey=(postId,id)=>'social-like:'+postId+':'+id;
const socialUserLike=(id,postId)=>'social-user-like:'+id+':'+postId;
const repostsKey=id=>'social-user-reposts:'+id;
const commentsKey=id=>'social-post-comments:'+id;
const lookupOriginal=(feed,id)=>feed.find(p=>p.id===id&&p.status==='published'&&p.type!=='repost');
const isBlockedSocialURL=(label,url)=>{
 try{
  const u=new URL(url),text=(String(label||'')+' '+decodeURIComponent(u.hostname+u.pathname+u.search)).toLowerCase();
  return /(?:^|[^a-z0-9])(judol|judi\s*online|slot\s*gacor|togel\s*online|kasino\s*online|casino\s*online|taruhan\s*online)(?:$|[^a-z0-9])/.test(text)
   ||/^(?:judol|slotgacor|judionline|togelonline|casinoonline)[a-z0-9-]*\./.test(u.hostname);
 }catch{return true}
};
 // Compact profile pictures only; no raw high-resolution photo storage.
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
  return isBlockedSocialURL('',u.href)?null:u.href;
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
 if(p==='/api/social/connections'&&method==='GET'){
  const active=await getAccount(storage,request);
  if(!active)return fail(401,'Masuk akun untuk melihat pengikut');
  const relation=u.searchParams.get('type')||'following';
  if(!['followers','following'].includes(relation))return fail(400,'Tipe daftar tidak valid');
  const prefix=(relation==='followers'?'social-follower:':'social-following:')+active.id+':';
  const entries=await storage.list({prefix,limit:501});
  const accounts=[];
  for(const item of entries.values()){
   if(!item?.id)continue;
   const person=await storage.get('auth-user:'+item.id);
   if(person&&!person.disabled)accounts.push({handle:person.handle,name:person.name,avatarVersion:person.avatarVersion||0});
  }
  const record=await storage.get('auth-user:'+active.id);
  return json({ok:true,type:relation,counts:socialCounts(record),accounts:accounts.slice(0,500),truncated:entries.size>500});
 }
 if(p==='/api/social/feed'&&method==='GET'){
  const viewer=await getAccount(storage,request);
  const feed=await storage.get('social-public-feed')||[];
  let liked=new Set();
  if(viewer){
   const entries=await storage.list({prefix:'social-user-like:'+viewer.id+':',limit:501});
   liked=new Set([...entries.keys()].map(key=>key.slice(('social-user-like:'+viewer.id+':').length)));
  }
  return json({ok:true,posts:feed.slice(0,80).map(post=>({...post,likedByMe:liked.has(post.originalId||post.id)}))});
 }
 if(p==='/api/social/post'&&method==='GET'){
  const id=u.searchParams.get('id')||'';
  if(!postIdOK(id))return fail(400,'Postingan tidak valid');
  const feed=await storage.get('social-public-feed')||[];
  const post=feed.find(x=>x.id===id&&x.status==='published');
  return post?json({ok:true,post}):fail(404,'Postingan tidak ditemukan');
 }
 if(p==='/api/social/engagement'&&method==='GET'){
  const id=u.searchParams.get('id')||'';
  if(!postIdOK(id))return fail(400,'Postingan tidak valid');
  const feed=await storage.get('social-public-feed')||[];
  const post=lookupOriginal(feed,id);
  if(!post)return fail(404,'Postingan sudah tidak tersedia');
  const viewer=await getAccount(storage,request);
  return json({ok:true,counts:{likes:post.likesCount||0,comments:post.commentsCount||0,reposts:post.repostsCount||0},
   liked:viewer?!!await storage.get(socialLikesKey(id,viewer.id)):false,comments:(await storage.get(commentsKey(id))||[]).slice(-50)});
 }
 if(p==='/api/social/reposts/me'&&method==='GET'){
  const viewer=await getAccount(storage,request);
  if(!viewer)return fail(401,'Masuk akun untuk melihat repost');
  const own=await storage.get(repostsKey(viewer.id))||[];
  const feed=await storage.get('social-public-feed')||[];
  return json({ok:true,reposts:own.slice(-50).reverse().map(x=>({id:x.id,createdAt:x.createdAt,original:lookupOriginal(feed,x.originalId)})).filter(x=>x.original)});
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
  const viewer=await getAccount(storage,request);
  const isFollowing=viewer?!!await storage.get(socialFollowing(viewer.id,id)):false;
  return json({ok:true,isFollowing,profile:{...socialCounts(account),handle:account.handle,name:account.name,bio:account.bio||'',links:account.links||[],avatarVersion:account.avatarVersion||0,verified:account.kycStatus==='verified',supporterBadge,posts:posts.filter(x=>x.status==='published').slice(0,20)}});
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
 if((p==='/api/account/follow'||p==='/api/account/unfollow')&&method==='POST'){
  const handle=clean(payload.handle,24).replace(/^@/,'').toLowerCase();
  if(!handleOK(handle))return fail(400,'Username tidak valid');
  if(handle===user.handle)return fail(400,'Tidak bisa mengikuti akun sendiri');
  const targetId=await storage.get('auth-handle:'+handle);
  const target=targetId&&await storage.get('auth-user:'+targetId);
  if(!target||target.disabled)return fail(404,'Akun tidak ditemukan');
  if(await hasBlock(user.id,targetId))return fail(403,'Hubungan akun dibatasi');
  const key=socialFollowing(user.id,targetId),existing=!!await storage.get(key);
  const wantFollow=p==='/api/account/follow';
  if(existing===wantFollow)return json({ok:true,following:existing,counts:socialCounts(record)});
  if(!await throttle(storage,'social-follow:'+user.id,90,86400000))return fail(429,'Terlalu banyak perubahan mengikuti');
  if(wantFollow&&socialCounts(record).following>=500)return fail(409,'Batas mengikuti 500 akun pada beta');
  if(wantFollow){
   const entry={id:targetId,createdAt:Date.now()};
   await storage.put(key,entry);
   await storage.put(socialFollower(targetId,user.id),{id:user.id,createdAt:entry.createdAt});
  }else{
   await storage.delete(key);
   await storage.delete(socialFollower(targetId,user.id));
  }
  const delta=wantFollow?1:-1;
  record.followingCount=Math.max(0,socialCounts(record).following+delta);
  target.followersCount=Math.max(0,socialCounts(target).followers+delta);
  await storage.put('auth-user:'+user.id,record);
  await storage.put('auth-user:'+targetId,target);
  return json({ok:true,following:wantFollow,counts:socialCounts(record)});
 }
 if(p.startsWith('/api/messages/')&&method==='POST'){
  const handle=clean(payload.handle,24).toLowerCase();
  if(!handleOK(handle)||handle===user.handle)return fail(400,'Username penerima tidak valid');
  const otherId=await storage.get('auth-handle:'+handle);
  const other=otherId&&await storage.get('auth-user:'+otherId);
  if(!other||other.disabled)return fail(404,'Akun penerima tidak ditemukan');
  if(p==='/api/messages/block'){
   await storage.put('dm-block:'+user.id+':'+otherId,true);
   // Blocking also severs following in either direction, no hidden social connection.
   for(const [from,to] of [[user.id,otherId],[otherId,user.id]]){
    if(!await storage.get(socialFollowing(from,to)))continue;
    await storage.delete(socialFollowing(from,to));
    await storage.delete(socialFollower(to,from));
    const source=from===user.id?record:other,receiver=to===user.id?record:other;
    source.followingCount=Math.max(0,socialCounts(source).following-1);
    receiver.followersCount=Math.max(0,socialCounts(receiver).followers-1);
   }
   await storage.put('auth-user:'+user.id,record);
   await storage.put('auth-user:'+otherId,other);
   await storage.delete('dm-request:'+user.id+':'+otherId);
   await storage.delete('dm-request:'+otherId+':'+user.id);
   await storage.delete('dm-outgoing:'+user.id+':'+otherId);
   await storage.delete('dm-outgoing:'+otherId+':'+user.id);
   return json({ok:true,blocked:true});
  }
  if(p==='/api/messages/unblock'){
   await storage.delete('dm-block:'+user.id+':'+otherId);
   return json({ok:true,blocked:false});
  }
  if(await hasBlock(user.id,otherId))return fail(403,'Percakapan dibatasi');
  if(p==='/api/messages/request'){
   if(!await throttle(storage,'dm-request-rate:'+user.id,15,86400000))
    return fail(429,'Terlalu banyak permintaan pesan hari ini');
   if(await storage.get(approvalKey(user.id,otherId)))return json({ok:true,accepted:true});
   const requested='dm-request:'+otherId+':'+user.id;
   if(!await storage.get(requested))await storage.put(requested,{fromId:user.id,createdAt:Date.now()});
   await storage.put('dm-outgoing:'+user.id+':'+otherId,true);
   return json({ok:true,pending:true});
  }
  if(p==='/api/messages/accept'){
   const key='dm-request:'+user.id+':'+otherId;
   if(!await storage.get(key))return fail(404,'Permintaan chat tidak tersedia');
   await storage.delete(key);
   await storage.delete('dm-outgoing:'+otherId+':'+user.id);
   await storage.put(approvalKey(user.id,otherId),true);
   await storage.put('dm-member:'+user.id+':'+otherId,{otherId,createdAt:Date.now()});
   await storage.put('dm-member:'+otherId+':'+user.id,{otherId:user.id,createdAt:Date.now()});
   return json({ok:true,accepted:true,handle:other.handle});
  }
  if(p==='/api/messages/send'){
   if(!await storage.get(approvalKey(user.id,otherId)))return fail(403,'Tunggu izin penerima');
   if(!await throttle(storage,'dm-send:'+user.id,80,3600000))return fail(429,'Batas pengiriman pesan tercapai');
   const text=clean(payload.text,2000);
   if(!text||typeof payload.text!=='string'||payload.text.length>2000)return fail(400,'Pesan tidak valid');
   const message={id:crypto.randomUUID(),fromHandle:user.handle,text,createdAt:Date.now()};
   const key=threadKey(user.id,otherId),msgs=await storage.get(key)||[];
   await storage.put(key,[...msgs,message].slice(-100));
   return json({ok:true,message},201);
  }
  return fail(404,'Aksi pesan tidak ditemukan');
 }
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
  // Erase social posts and pending messaging state before revoking this identity.
  const feed=await storage.get('social-public-feed')||[];
  // Remove creator-owned posts and reposts; do not leave orphaned public repost copies.
  const owned=new Set(feed.filter(post=>post.accountId===user.id&&post.type!=='repost').map(post=>post.id));
  const ownReposted=new Set((await storage.get(repostsKey(user.id))||[]).map(x=>x.originalId));
  for(const id of ownReposted){const original=lookupOriginal(feed,id);if(original)original.repostsCount=Math.max(0,(original.repostsCount||0)-1)}
  const retained=feed.filter(post=>post.accountId!==user.id&&!owned.has(post.originalId));
  for(const original of retained.filter(post=>post.type!=='repost')){
   const comments=await storage.get(commentsKey(original.id))||[];
   if(comments.some(x=>x.accountId===user.id)){
    const cleanComments=comments.filter(x=>x.accountId!==user.id);
    original.commentsCount=Math.max(0,(original.commentsCount||0)-(comments.length-cleanComments.length));
    await storage.put(commentsKey(original.id),cleanComments);
   }
  }
  const liked=await storage.list({prefix:'social-user-like:'+user.id+':',limit:501});
  for(const key of liked.keys()){
   const id=key.slice(('social-user-like:'+user.id+':').length);
   await storage.delete(socialLikesKey(id,user.id));await storage.delete(key);
   const original=lookupOriginal(retained,id);
   if(original)original.likesCount=Math.max(0,(original.likesCount||0)-1);
  }
  for(const id of owned){
   await storage.delete(commentsKey(id));
   const otherLikes=await storage.list({prefix:'social-like:'+id+':',limit:501});
   for(const key of otherLikes.keys()){
    const otherId=key.slice(('social-like:'+id+':').length);
    await storage.delete(socialUserLike(otherId,id));await storage.delete(key);
   }
  }
  await storage.delete(repostsKey(user.id));
  await storage.put('social-public-feed',retained);
  const ownConnections=await storage.list({prefix:'dm-member:'+user.id+':',limit:100});
  for(const item of ownConnections.values()){
   if(!item?.otherId)continue;
   await storage.delete(threadKey(user.id,item.otherId));
   await storage.delete(approvalKey(user.id,item.otherId));
   await storage.delete('dm-member:'+item.otherId+':'+user.id);
   await storage.delete('dm-member:'+user.id+':'+item.otherId);
   await storage.delete('dm-block:'+user.id+':'+item.otherId);
   await storage.delete('dm-block:'+item.otherId+':'+user.id);
  }
  const incoming=await storage.list({prefix:'dm-request:'+user.id+':',limit:100});
  for(const [key,item] of incoming){
   await storage.delete(key);
   if(item?.fromId)await storage.delete('dm-outgoing:'+item.fromId+':'+user.id);
  }
  const outgoing=await storage.list({prefix:'dm-outgoing:'+user.id+':',limit:100});
  for(const key of outgoing.keys()){
   const otherId=key.split(':').at(-1);
   await storage.delete('dm-request:'+otherId+':'+user.id);
   await storage.delete(key);
  }
  // Delete both sides of social relationships, and correct the surviving accounts' counts.
  for(const direction of ['social-following:','social-follower:']){
   const prefix=direction+user.id+':';
   for(;;){
    const batch=await storage.list({prefix,limit:100});
    if(batch.size===0)break;
    for(const [key,entry] of batch){
     const otherId=entry?.id||key.slice(prefix.length);
     if(direction==='social-following:')await storage.delete(socialFollower(otherId,user.id));
     else await storage.delete(socialFollowing(otherId,user.id));
     await storage.delete(key);
     const other=await storage.get('auth-user:'+otherId);
     if(other&&!other.disabled){
      if(direction==='social-following:')other.followersCount=Math.max(0,socialCounts(other).followers-1);
      else other.followingCount=Math.max(0,socialCounts(other).following-1);
      await storage.put('auth-user:'+otherId,other);
     }
    }
   }
  }
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
   if(!label||!url||isBlockedSocialURL(label,url)||validated.some(x=>x.url===url))return fail(400,'Link tidak valid, judi online, atau duplikat');
   validated.push({label,url});
  }
  record.name=name;record.bio=bio;record.links=validated;record.updatedAt=Date.now();
  await storage.put('auth-user:'+user.id,record);
  return json({ok:true,account:{id:record.id,handle:record.handle,name,bio,links:validated,avatarVersion:record.avatarVersion||0,verifiedAdult:user.verifiedAdult,kycStatus:user.kycStatus}});
 }
 if(p==='/api/account/social/upload-allowed'&&method==='POST'){
  // File storage is a separate optional R2 dependency. Limit allocations per user.
  if(!await throttle(storage,'social-media-upload:'+user.id,8,86400000))return fail(429,'Batas upload harian beta tercapai');
  return json({ok:true,allowed:true});
 }
 if(p==='/api/account/social/like'&&method==='POST'){
  const id=payload.id,want=payload.liked===true;
  if(!postIdOK(id)||typeof payload.liked!=='boolean')return fail(400,'Pilihan like tidak valid');
  const feed=await storage.get('social-public-feed')||[],post=lookupOriginal(feed,id);
  if(!post)return fail(404,'Postingan tidak tersedia');
  const key=socialLikesKey(id,user.id),old=!!await storage.get(key);
  if(old!==want){
   if(!await throttle(storage,'social-like-rate:'+user.id,100,3600000))return fail(429,'Terlalu sering menyukai postingan');
   if(want){await storage.put(key,true);await storage.put(socialUserLike(user.id,id),true)}
   else{await storage.delete(key);await storage.delete(socialUserLike(user.id,id))}
   post.likesCount=Math.max(0,(post.likesCount||0)+(want?1:-1));
   await storage.put('social-public-feed',feed);
  }
  return json({ok:true,liked:want,likes:post.likesCount||0});
 }
 if(p==='/api/account/social/comment'&&method==='POST'){
  const id=payload.id,text=clean(payload.text,500);
  if(!postIdOK(id)||!text||typeof payload.text!=='string'||payload.text.length>500)return fail(400,'Komentar harus 1–500 karakter');
  const feed=await storage.get('social-public-feed')||[],post=lookupOriginal(feed,id);
  if(!post)return fail(404,'Postingan tidak tersedia');
  if(!await throttle(storage,'social-comment:'+user.id,25,3600000))return fail(429,'Terlalu sering berkomentar');
  const previous=await storage.get(commentsKey(id))||[];
  if(previous.length>=200)return fail(409,'Batas komentar beta tercapai untuk postingan ini');
  const comment={id:crypto.randomUUID(),accountId:user.id,handle:user.handle,name:record.name,text,createdAt:Date.now()};
  await storage.put(commentsKey(id),[...previous,comment]);
  post.commentsCount=Math.max(0,(post.commentsCount||0)+1);
  await storage.put('social-public-feed',feed);
  return json({ok:true,comment,counts:{comments:post.commentsCount}},201);
 }
 if(p==='/api/account/social/repost'&&method==='POST'){
  const id=payload.id;
  if(!postIdOK(id))return fail(400,'Postingan tidak valid');
  const feed=await storage.get('social-public-feed')||[],post=lookupOriginal(feed,id);
  if(!post)return fail(404,'Postingan tidak tersedia');
  if(post.accountId===user.id)return fail(400,'Tidak perlu repost postingan sendiri');
  const list=await storage.get(repostsKey(user.id))||[];
  const existing=list.find(x=>x.originalId===id);
  if(existing)return json({ok:true,reposted:true,repostId:existing.id,counts:{reposts:post.repostsCount||0}});
  if(!await throttle(storage,'social-repost:'+user.id,15,86400000))return fail(429,'Terlalu banyak repost hari ini');
  const repost={id:crypto.randomUUID(),originalId:id,createdAt:Date.now()};
  await storage.put(repostsKey(user.id),[...list,repost].slice(-100));
  post.repostsCount=(post.repostsCount||0)+1;
  const entry={id:repost.id,accountId:user.id,handle:user.handle,name:record.name,avatarVersion:record.avatarVersion||0,
   originalId:id,type:'repost',text:'',createdAt:repost.createdAt,status:'published'};
  await storage.put('social-public-feed',[entry,...feed].slice(0,200));
  return json({ok:true,reposted:true,repostId:repost.id,counts:{reposts:post.repostsCount}},201);
 }
 if(p==='/api/account/posts/publish'&&method==='POST'){
  const text=clean(payload.text,2000);
  const videoUrl=payload.videoUrl?urlOK(payload.videoUrl):null;
  if(payload.videoUrl&&!videoUrl)return fail(400,'URL video harus HTTPS yang aman dan bukan judi online');
  if(videoUrl){
   const videoHost=new URL(videoUrl).hostname.toLowerCase().replace(/^www\./,'');
   const videoPath=new URL(videoUrl).pathname.toLowerCase();
   if(!(['youtube.com','m.youtube.com','youtu.be','vimeo.com','player.vimeo.com'].includes(videoHost)
     ||/\.(mp4|webm)$/.test(videoPath)))return fail(400,'Gunakan link video YouTube, Vimeo, MP4, atau WebM yang valid');
  }
  if((!text&&!videoUrl)||typeof payload.text!=='string'||payload.text.length>2000)return fail(400,'Postingan atau video tidak valid');
  if(!await throttle(storage,'publish:'+user.id,8,3600000))return fail(429,'Terlalu banyak postingan');
  const post={id:crypto.randomUUID(),accountId:user.id,handle:user.handle,name:record.name,
   avatarVersion:record.avatarVersion||0,text,videoUrl:videoUrl||null,likesCount:0,commentsCount:0,repostsCount:0,createdAt:Date.now(),status:'published'};
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
  await storage.put('social-public-feed',feed.filter(post=>post.id!==id&&post.originalId!==id));
  const likes=await storage.list({prefix:'social-like:'+id+':',limit:501});
  for(const key of likes.keys()){
   const otherId=key.slice(('social-like:'+id+':').length);
   await storage.delete(socialUserLike(otherId,id));await storage.delete(key);
  }
  await storage.delete(commentsKey(id));
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
