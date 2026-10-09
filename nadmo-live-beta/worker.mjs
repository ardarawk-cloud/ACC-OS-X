import {accountEndpoint,getAccount,getAccountBySessionFingerprint,getSessionFingerprint} from './account.mjs';
// NADMO LIVE beta realtime signaling. WebRTC P2P mesh; NOT a production SFU.
// No money handling, no public onboarding, no content moderation service.
const ALLOWED_ORIGIN='https://appassets.androidplatform.net';
const ROOM_LIMIT=20, VIEWER_LIMIT=4, MAX_EVENTS=35, MAX_MESSAGE=60000, HOST_GRACE_MS=90000;

function txt(x,max=60){return typeof x==='string'?x.trim().slice(0,max):''}
function reply(ws,object){try{ws.send(JSON.stringify(object))}catch(e){}}
function failure(ws,message){reply(ws,{type:'error',message})}
function state(ws){return ws.deserializeAttachment()||{}}
function save(ws,meta){ws.serializeAttachment(meta)}
function getHost(clients,id){return clients.find(x=>state(x).id===id)}
function roomCount(clients,id){return clients.filter(x=>state(x).role==='viewer'&&state(x).roomId===id).length}
async function sha(value){
 const bytes=new TextEncoder().encode(value);
 const result=await crypto.subtle.digest('SHA-256',bytes);
 return [...new Uint8Array(result)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function cors(request,response){
 const origin=request.headers.get('Origin');
 const headers=new Headers(response.headers);
 if(origin===ALLOWED_ORIGIN||origin===new URL(request.url).origin){
   headers.set('Access-Control-Allow-Origin',origin);
   headers.set('Access-Control-Allow-Methods','GET,OPTIONS');
   headers.set('Access-Control-Allow-Headers','Content-Type');
   headers.set('Vary','Origin');
 }
 headers.set('Cache-Control','no-store');
 headers.set('X-Content-Type-Options','nosniff');
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
export class RoomHub{
 constructor(ctx,env){this.ctx=ctx;this.env=env}
 creatorVerificationRequired(){return this.env.VERIFY_CREATOR_REQUIRED==='true'||this.env.BETA_TEST_HOSTS_ENABLED!=='true'}
 sockets(){return this.ctx.getWebSockets()}
 async findRooms(){return this.ctx.storage.list({prefix:'room:'})}
 async fetch(request){
  const route=new URL(request.url).pathname;
  if(route==='/rooms'){
   const rooms=await this.findRooms();
   const peers=this.sockets();
   const list=[];
   for(const [key,room] of rooms){
    if(room.mode!=='public')continue;
    if(room.hostOfflineAt||!getHost(peers,room.hostId))continue;
    list.push({id:room.id,title:room.title,hostName:room.hostName||'Host',hostHandle:room.hostHandle||null,hostVerified:room.hostVerified===true,category:room.category,viewers:roomCount(peers,room.id)});
   }
   return Response.json({rooms:list});
  }
  if(route.startsWith('/api/account/')||route.startsWith('/api/profile/')||route==='/api/payments/status'||route==='/api/streaming/capacity'){
   try{return await accountEndpoint(this.ctx.storage,request)}
   catch(error){
    console.error('NADMO account route',error?.name,String(error?.message||'').slice(0,150));
    return Response.json({ok:false,error:'Account temporarily unavailable',errorType:error?.name||'ServerError'},{status:500});
   }
  }
  if(route!=='/ws'||request.headers.get('Upgrade')?.toLowerCase()!=='websocket'){
   return new Response('WebSocket upgrade required',{status:426});
  }
  if(this.sockets().length>=120)return new Response('Beta is at capacity',{status:503});
  const pair=new WebSocketPair(),client=pair[0],server=pair[1];
  this.ctx.acceptWebSocket(server);
  const principal=await getAccount(this.ctx.storage,request);
  const sessionFingerprint=principal?await getSessionFingerprint(request):null;
  save(server,{id:crypto.randomUUID().replace(/-/g,'').slice(0,16),roomId:null,role:null,lastWindow:0,events:0,lastChat:0,
    accountId:principal?.id||null,sessionFingerprint,handle:principal?.handle||null,displayName:principal?.name||null,
    verifiedAdult:principal?.verifiedAdult===true,kycStatus:principal?.kycStatus||'NOT_CONFIGURED'});
  // A 25s server heartbeat keeps mobile network paths warm without an APK update.
  // The alarm is scheduled only while sockets are present; no idle background loop.
  if((await this.ctx.storage.getAlarm())===null)await this.ctx.storage.setAlarm(Date.now()+25000);
  return new Response(null,{status:101,webSocket:client});
 }
 async alarm(){
  const sockets=this.sockets(),rooms=await this.findRooms();
  const now=Date.now();
  for(const [key,room] of rooms){
   if(room.hostOfflineAt&&now-room.hostOfflineAt>HOST_GRACE_MS){
    await this.ctx.storage.delete(key);
    for(const socket of sockets){
     const meta=state(socket);
     if(meta.roomId!==room.id)continue;
     meta.roomId=null;meta.role=null;save(socket,meta);
     reply(socket,{type:'room-ended',reason:'Host tidak kembali setelah masa pemulihan.'});
    }
   }
  }
  if(sockets.length){
   const heartbeat={type:'heartbeat',at:now};
   for(const socket of sockets)reply(socket,heartbeat);
  }
  if(sockets.length||(await this.findRooms()).size)await this.ctx.storage.setAlarm(now+25000);
 }
 async webSocketMessage(ws,input){
  if(typeof input!=='string'||input.length>MAX_MESSAGE){ws.close(1009,'message too large');return}
  let msg;
  try{msg=JSON.parse(input)}catch(e){failure(ws,'JSON tidak valid');return}
  if(!msg||typeof msg!=='object'||Array.isArray(msg))return failure(ws,'Pesan tidak valid');
  let s=state(ws);
  const now=Date.now();
  if(now-(s.lastWindow||0)>1000){s.lastWindow=now;s.events=0}
  if(++s.events>MAX_EVENTS){ws.close(1008,'rate limited');return}
  save(ws,s);
  const type=msg.type;
  if(type==='leave'){await this.leave(ws,s);reply(ws,{type:'left'});return}
  if(type==='create'){
   if(s.roomId)return failure(ws,'Keluar dari room sebelumnya terlebih dahulu');
   // Re-read sessions on every host action: expired/revoked sessions have no creator rights.
   const current=s.sessionFingerprint?await getAccountBySessionFingerprint(this.ctx.storage,s.sessionFingerprint):null;
   if(s.accountId&&(!current||current.id!==s.accountId))
    return failure(ws,'Sesi akun telah berakhir. Silakan login kembali.');
   // Isolated private beta may opt in to anonymous test hosts; other Workers fail closed.
   if(this.creatorVerificationRequired()&&(!current||current.kycStatus!=='verified'||!current.verifiedAdult))
    return failure(ws,'Akun streamer harus terverifikasi identitas 18+ sebelum GO LIVE.');
   const all=await this.findRooms();
   if(all.size>=ROOM_LIMIT)return failure(ws,'Room beta sudah penuh');
   const mode=msg.mode==='password'?'password':'public';
   const password=txt(msg.password,32);
   if(mode==='password'&&password.length<4)return failure(ws,'Kode private room minimal 4 karakter');
   const id=crypto.randomUUID().replace(/-/g,'').slice(0,12);
   const resumeToken=crypto.randomUUID()+crypto.randomUUID();
   const room={id,title:txt(msg.title,60)||'NADMO LIVE',category:txt(msg.category,28)||'Social',
    hostName:current?.name||txt(msg.hostName,60)||'Host',hostHandle:current?.handle||null,
    hostVerified:current?.kycStatus==='verified'&&current?.verifiedAdult===true,hostAccountId:current?.id||null,
    mode,hostId:s.id,hostResumeHash:await sha(resumeToken),hostOfflineAt:null,passwordHash:mode==='password'?await sha(password):null,mirrorBroadcast:false,createdAt:now};
   await this.ctx.storage.put('room:'+id,room);
   s.roomId=id;s.role='host';save(ws,s);
   reply(ws,{type:'created',id,selfId:s.id,resumeToken,mirrorBroadcast:false,hostName:room.hostName,hostHandle:room.hostHandle,hostVerified:room.hostVerified});
   return;
  }
  if(type==='resume'){
   if(s.roomId)return failure(ws,'Keluar room sebelumnya sebelum pemulihan');
   const id=txt(msg.id,32),token=txt(msg.token,128);
   const room=await this.ctx.storage.get('room:'+id);
   if(!room||!room.hostResumeHash||!token||await sha(token)!==room.hostResumeHash){
    return failure(ws,'Pemulihan room ditolak: akses tidak valid atau room telah berakhir');
   }
   if(room.hostOfflineAt&&now-room.hostOfflineAt>HOST_GRACE_MS){
    await this.ctx.storage.delete('room:'+id);
    return failure(ws,'Waktu pemulihan 90 detik telah habis');
   }
   const current=s.sessionFingerprint?await getAccountBySessionFingerprint(this.ctx.storage,s.sessionFingerprint):null;
   if(this.creatorVerificationRequired()){
    if(!current||current.id!==room.hostAccountId||current.kycStatus!=='verified'||!current.verifiedAdult)
     return failure(ws,'Pemulihan streamer memerlukan sesi akun terverifikasi yang sama');
   }else if(room.hostAccountId&&(!current||current.id!==room.hostAccountId)){
    return failure(ws,'Pemulihan ditolak: akun pemilik room tidak cocok atau sesi telah berakhir');
   }
   const peers=this.sockets();
   const old=getHost(peers,room.hostId);
   if(old&&old!==ws){
    const previous=state(old);
    previous.roomId=null;previous.role=null;save(old,previous);
    try{old.close(4000,'Session transferred')}catch(e){}
   }
   room.hostId=s.id;room.hostOfflineAt=null;
   await this.ctx.storage.put('room:'+id,room);
   s.roomId=id;s.role='host';save(ws,s);
   const viewers=peers.filter(x=>state(x).roomId===id&&state(x).role==='viewer').map(x=>state(x).id);
   reply(ws,{type:'resumed',id,selfId:s.id,viewers,mirrorBroadcast:room.mirrorBroadcast===true,hostName:room.hostName,hostHandle:room.hostHandle,hostVerified:room.hostVerified});
   for(const other of peers){if(state(other).roomId===id&&state(other).role==='viewer')reply(other,{type:'host-reconnected'})}
   return;
  }
  if(type==='join'){
   if(s.roomId)return failure(ws,'Keluar room sebelumnya terlebih dahulu');
   const id=txt(msg.id,32);
   const room=await this.ctx.storage.get('room:'+id);
   if(!room)return failure(ws,'Room tidak ditemukan atau sudah selesai');
   const peers=this.sockets(),host=getHost(peers,room.hostId);
   if(!host||room.hostOfflineAt){return failure(ws,'Host sedang reconnect. Coba lagi beberapa detik.')}
   if(roomCount(peers,id)>=VIEWER_LIMIT)return failure(ws,'Room beta penuh (maks. 4 penonton)');
   if(room.mode==='password'&&await sha(txt(msg.password,32))!==room.passwordHash)return failure(ws,'Kode akses salah');
   s.roomId=id;s.role='viewer';save(ws,s);
   reply(ws,{type:'joined',id,title:room.title,hostName:room.hostName||'Host',hostHandle:room.hostHandle||null,hostVerified:room.hostVerified===true,selfId:s.id,hostId:room.hostId,mirrorBroadcast:room.mirrorBroadcast===true});
   reply(host,{type:'viewer-joined',id:s.id});
   return;
  }
  if(!s.roomId)return failure(ws,'Belum tergabung dalam room');
  const room=await this.ctx.storage.get('room:'+s.roomId);
  if(!room)return failure(ws,'Room sudah tidak aktif');
  if(type==='set-mirror'){
   if(s.role!=='host'||room.hostId!==s.id)return failure(ws,'Hanya host boleh mengubah mirror siaran');
   if(typeof msg.mirrored!=='boolean')return failure(ws,'Nilai mirror tidak valid');
   room.mirrorBroadcast=msg.mirrored;
   await this.ctx.storage.put('room:'+room.id,room);
   const packet={type:'mirror-updated',mirrorBroadcast:room.mirrorBroadcast};
   for(const receiver of this.sockets())if(state(receiver).roomId===room.id)reply(receiver,packet);
   return;
  }
  if(type==='set-access'){
   if(s.role!=='host'||room.hostId!==s.id)return failure(ws,'Hanya host yang dapat mengubah akses siaran');
   const mode=msg.mode==='password'?'password':msg.mode==='public'?'public':null;
   if(!mode)return failure(ws,'Mode akses tidak dikenal');
   let passwordHash=null,offer=null;
   if(mode==='password'){
    const code=txt(msg.password,32);
    if(code.length<4)return failure(ws,'Kode private minimal 4 karakter');
    const amount=Number(msg.amount),minutes=Number(msg.minutes);
    if(!Number.isSafeInteger(amount)||amount<1000||amount>10000000||![10,30,60].includes(minutes))return failure(ws,'Tarif atau durasi tidak valid');
    passwordHash=await sha(code);
    // PRICE LABEL ONLY: never claim a real transaction or time entitlement without payment validation.
    offer={amount,minutes,currency:'IDR',paymentEnabled:false};
   }
   room.mode=mode;room.passwordHash=passwordHash;room.offer=offer;
   await this.ctx.storage.put('room:'+room.id,room);
   let displaced=0;
   if(mode==='password'){
    for(const viewer of this.sockets()){
     const meta=state(viewer);
     if(meta.role!=='viewer'||meta.roomId!==room.id)continue;
     const id=meta.id;meta.role=null;meta.roomId=null;save(viewer,meta);
     reply(viewer,{type:'access-revoked',reason:'Host mengubah siaran menjadi privat. Akses ulang membutuhkan kode undangan. Pembayaran belum aktif.'});
     reply(ws,{type:'viewer-left',id});
     displaced++;
    }
   }
   reply(ws,{type:'access-updated',mode,offer,displaced});
   return;
  }
  if(type==='chat'){
   const text=txt(msg.text,250);
   if(!text)return;
   if(now-(s.lastChat||0)<600)return failure(ws,'Tunggu sebelum mengirim chat');
   s.lastChat=now;save(ws,s);
   const packet={type:'chat',name:s.displayName||s.handle||(s.role==='host'?room.hostName||'Host':'Viewer'),handle:s.handle||null,verified:s.kycStatus==='verified'&&s.verifiedAdult===true,text};
   this.sockets().filter(x=>state(x).roomId===room.id).forEach(x=>reply(x,packet));
   return;
  }
  if(type==='host-visibility'){
   if(s.role!=='host'||room.hostId!==s.id)return failure(ws,'Hanya host yang dapat memberi status siaran');
   const status=msg.status==='background'?'background':'active';
   for(const viewer of this.sockets()){
    if(state(viewer).role==='viewer'&&state(viewer).roomId===s.roomId)reply(viewer,{type:'host-visibility',status});
   }
   return;
  }
  if(type==='refresh-media'){
   // A viewer returning from mobile background can request fresh WebRTC negotiation.
   // Refresh only within its joined room; never expose the host's recovery token.
   if(s.role!=='viewer')return failure(ws,'Hanya penonton yang dapat meminta pemulihan video');
   const host=getHost(this.sockets(),room.hostId);
   if(!host||room.hostOfflineAt)return failure(ws,'Host belum kembali online');
   reply(host,{type:'media-refresh-request',id:s.id});
   return;
  }
  if(type==='signal'){
   const to=txt(msg.to,32);
   const target=getHost(this.sockets(),to);
   if(!target||state(target).roomId!==s.roomId||target===ws)return;
   if(s.role!=='host'&&state(target).role!=='host')return;
   const data=msg.data;
   if(!data||typeof data!=='object'||Array.isArray(data))return;
   if(data.description&&!['offer','answer'].includes(data.description.type))return;
   if(!data.description&&!data.candidate)return;
   reply(target,{type:'signal',from:s.id,data});
   return;
  }
  failure(ws,'Perintah tidak didukung');
 }
 async leave(ws,s){
  if(!s.roomId)return;
  const roomId=s.roomId,role=s.role,peers=this.sockets();
  s.roomId=null;s.role=null;save(ws,s);
  if(role==='host'){
   await this.ctx.storage.delete('room:'+roomId);
   for(const other of peers){
    const meta=state(other);
    if(meta.roomId===roomId){
     meta.roomId=null;meta.role=null;save(other,meta);
     reply(other,{type:'room-ended',reason:'Host mengakhiri siaran.'});
     try{other.close(1000,'room closed')}catch(e){}
    }
   }
  }else{
   const room=await this.ctx.storage.get('room:'+roomId);
   if(room){const host=getHost(peers,room.hostId);if(host)reply(host,{type:'viewer-left',id:s.id})}
  }
 }
 async disconnected(ws){
  const s=state(ws);
  if(!s.roomId)return;
  if(s.role!=='host'){await this.leave(ws,s);return}
  const room=await this.ctx.storage.get('room:'+s.roomId);
  if(!room||room.hostId!==s.id)return;
  room.hostOfflineAt=Date.now();
  await this.ctx.storage.put('room:'+room.id,room);
  for(const other of this.sockets()){
   if(other!==ws&&state(other).roomId===room.id&&state(other).role==='viewer')reply(other,{type:'host-reconnecting',seconds:90});
  }
  if((await this.ctx.storage.getAlarm())===null)await this.ctx.storage.setAlarm(Date.now()+25000);
 }
 async webSocketClose(ws,code,reason){
  console.log('NADMO socket close',code,String(reason||'').slice(0,80),state(ws).role||'none');
  await this.disconnected(ws);
 }
 async webSocketError(ws){
  console.log('NADMO socket error',state(ws).role||'none');
  await this.disconnected(ws);
 }
}

function azuraStation(value){return typeof value==='string'&&/^[a-z0-9_-]{1,64}$/i.test(value)?value:'nadmo_radio'}
function secureOrigin(value){
 if(typeof value!=='string'||!value.trim())return null;
 try{
  const u=new URL(value);
  if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.pathname!=='/')return null;
  return u.origin;
 }catch{return null}
}
async function radioStatus(env){
 const origin=secureOrigin(env.RADIO_ORIGIN);
 const short=azuraStation(env.RADIO_STATION);
 const standby={ok:true,station:'NADMO RADIO',slug:short,online:false,djLive:false,
   nowPlaying:null,listeners:0,streamUrl:null,source:'azuracast',paymentEnabled:false};
 if(!origin)return {...standby,configured:false,state:'NOT_CONFIGURED'};
 let response;
 try{
  response=await fetch(origin+'/api/nowplaying/'+encodeURIComponent(short),{
   method:'GET',redirect:'error',signal:AbortSignal.timeout(6000),
   headers:{'Accept':'application/json'}
  });
  if(!response.ok)return {...standby,configured:true,state:'UNAVAILABLE'};
  if(Number(response.headers.get('content-length')||0)>100000)return {...standby,configured:true,state:'BAD_RESPONSE'};
  const raw=await response.text();
  if(raw.length>100000)return {...standby,configured:true,state:'BAD_RESPONSE'};
  const np=JSON.parse(raw);
  if(!np||typeof np!=='object'||!np.station)return {...standby,configured:true,state:'BAD_RESPONSE'};
  // Station backend may return a stream URL on another hostname. For the pilot,
  // play only verified same-origin HTTPS URLs, never arbitrary redirect targets.
  let streamUrl=null;
  if(np.station.listen_url&&typeof np.station.listen_url==='string'){
   try{
    const u=new URL(np.station.listen_url);
    if(u.protocol==='https:'&&!u.username&&!u.password&&!u.hash&&u.origin===origin)
     streamUrl=u.href;
   }catch{}
  }
  const online=np.is_online===true&&!!streamUrl;
  const clean=(v,limit=100)=>typeof v==='string'?v.trim().slice(0,limit):'';
  return {ok:true,station:clean(np.station.name)||'NADMO RADIO',slug:short,
    configured:true,state:online?'ON_AIR':'OFF_AIR',online,
    djLive:np.live?.is_live===true,
    nowPlaying:online?{title:clean(np.now_playing?.song?.title)||'Unknown Track',
      artist:clean(np.now_playing?.song?.artist)||'Independent Artist'}:null,
    listeners:online&&Number.isFinite(Number(np.listeners?.current))?
       Math.max(0,Math.min(10000000,Math.round(Number(np.listeners.current)))):0,
    streamUrl:online?streamUrl:null,source:'azuracast',paymentEnabled:false};
 }catch(error){return {...standby,configured:true,state:'UNAVAILABLE'}}
}
export default {
 async fetch(request,env,ctx){
  const url=new URL(request.url);
  if(request.method==='OPTIONS')return cors(request,new Response(null,{status:204}));
  if(request.method!=='GET'&&!url.pathname.startsWith('/api/account/'))
    return new Response('Method Not Allowed',{status:405});
  if(url.pathname==='/app')return Response.redirect(url.origin+'/app/',308);
  if(url.pathname==='/app/'||url.pathname==='/app/index.html'){
    const asset=await env.ASSETS.fetch(new Request(url.origin+'/app/index.html'));
    const headers=new Headers(asset.headers);
    headers.set('X-Content-Type-Options','nosniff');
    headers.set('Cache-Control','public, max-age=60, must-revalidate');
    headers.set('Referrer-Policy','no-referrer');
    headers.set('Permissions-Policy','camera=(self), microphone=(self)');
    return new Response(asset.body,{status:asset.status,headers});
  }
  if(url.pathname==='/api/radio/status')return cors(request,Response.json(await radioStatus(env)));
  if(url.pathname==='/health')return cors(request,Response.json({ok:true,service:'nadmo-live-beta',engine:'cloudflare-durable-objects',mode:'webrtc-p2p',maxViewers:VIEWER_LIMIT,payments:false,creatorVerificationRequired:env.VERIFY_CREATOR_REQUIRED==='true'||env.BETA_TEST_HOSTS_ENABLED!=='true',anonymousBetaHostsEnabled:env.BETA_TEST_HOSTS_ENABLED==='true'&&env.VERIFY_CREATOR_REQUIRED!=='true'}));
  if(url.pathname==='/'){
   return cors(request,Response.json({service:'NADMO LIVE',status:'BETA',note:'Open /app/ in your browser; backend is configured automatically.'}));
  }
  const isAccountApi=url.pathname.startsWith('/api/account/')||url.pathname.startsWith('/api/profile/')||
    url.pathname==='/api/payments/status'||url.pathname==='/api/streaming/capacity';
  if(!isAccountApi&&url.pathname!=='/api/rooms'&&url.pathname!=='/ws')return new Response('Not Found',{status:404});
  if(url.pathname==='/ws'){
   const origin=request.headers.get('Origin');
   if(origin!==ALLOWED_ORIGIN&&origin!==url.origin)return new Response('Origin not allowed',{status:403});
   if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response('Upgrade required',{status:426});
  }
  const hub=env.ROOM_HUB.get(env.ROOM_HUB.idFromName('nadmo-beta-v1'));
  if(url.pathname==='/ws')return hub.fetch(request);
  if(isAccountApi){
   // Same-origin mutating requests only; never trust a spoofed visitor IP header.
   const headers=new Headers(request.headers);
   headers.set('x-nadmo-client-ip',request.headers.get('CF-Connecting-IP')||'unknown');
   const r=await hub.fetch(new Request(request,{headers}));
   return cors(request,r);
  }
  const r=await hub.fetch(new Request('https://rooms-internal/rooms'));
  return cors(request,r);
 }
}
