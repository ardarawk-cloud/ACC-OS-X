import {accountEndpoint,getAccount,getAccountBySessionFingerprint,getSessionFingerprint} from './account.mjs';
import {getPublicSupporterBadge} from './supporter-levels.mjs';
import {proposePK,publicPK,consentPK,supportPK,checkPKDeadline,finishPK} from './pk-battle.mjs';
// NADMO LIVE beta realtime signaling. WebRTC P2P mesh; NOT a production SFU.
// No money handling or public onboarding. Beta safety tools operate without staffed review.
const ALLOWED_ORIGIN='https://appassets.androidplatform.net';
const ROOM_LIMIT=20, VIEWER_LIMIT=4, MAX_EVENTS=35, MAX_ICE_EVENTS=120, MAX_MESSAGE=60000, HOST_GRACE_MS=90000, REPORT_LIMIT=100, REPORT_TTL=14*86400000, GUEST_LIMIT=9;

function txt(x,max=60){return typeof x==='string'?x.trim().slice(0,max):''}
function reply(ws,object){try{ws.send(JSON.stringify(object))}catch(e){}}
function failure(ws,message){reply(ws,{type:'error',message})}
function state(ws){return ws.deserializeAttachment()||{}}
function save(ws,meta){ws.serializeAttachment(meta)}
function getHost(clients,id){return clients.find(x=>state(x).id===id)}
function roomCount(clients,id){return clients.filter(x=>state(x).role==='viewer'&&state(x).roomId===id).length}
function stageGuests(clients,id){return clients.filter(x=>state(x).role==='guest'&&state(x).roomId===id)}
function stagePublic(clients,id){return stageGuests(clients,id).map(x=>{
 const s=state(x);return {id:s.id,name:s.displayName||s.handle||'Tamu',handle:s.handle||null,avatarVersion:s.avatarVersion||0,mode:s.guestMode||'voice',ready:s.guestReady===true,mic:s.guestMic===true,camera:s.guestCamera===true,streamId:s.guestStreamId||null};
})}
function stageBroadcast(clients,id,layout=[]){
 const packet={type:'stage-updated',guests:stagePublic(clients,id),layout,maxGuests:GUEST_LIMIT};
 for(const ws of clients)if(state(ws).roomId===id)reply(ws,packet);
}
function broadcastPK(peers,roomId,pk){
 const packet={type:'pk-state',pk:publicPK(pk)};
 for(const peer of peers)if(state(peer).roomId===roomId)reply(peer,packet);
}
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
 async scheduleHeartbeat(){
  const now=Date.now(),scheduled=await this.ctx.storage.getAlarm();
  if(scheduled===null||scheduled>now+25000)await this.ctx.storage.setAlarm(now+25000);
 }
 async pruneReports(now=Date.now()){
  const entries=[...(await this.ctx.storage.list({prefix:'abuse-report:'})).entries()];
  const current=[];
  for(const [key,report] of entries){
   if(!report||!Number.isFinite(report.createdAt)||now-report.createdAt>=REPORT_TTL)await this.ctx.storage.delete(key);
   else current.push({key,expiresAt:report.createdAt+REPORT_TTL});
  }
  current.sort((a,b)=>a.expiresAt-b.expiresAt);
  const extra=Math.max(0,current.length-REPORT_LIMIT);
  for(const item of current.slice(0,extra))await this.ctx.storage.delete(item.key);
  return current.length>extra?current[extra].expiresAt:null;
 }
 async validHostSession(s,room){
  if(s.role!=='host'||room.hostId!==s.id)return false;
  if(!room.hostAccountId)return !this.creatorVerificationRequired();
  const principal=s.sessionFingerprint?await getAccountBySessionFingerprint(this.ctx.storage,s.sessionFingerprint):null;
  return !!principal&&principal.id===room.hostAccountId&&(!this.creatorVerificationRequired()||(principal.verifiedAdult&&principal.kycStatus==='verified'));
 }
 async fetch(request){
  const route=new URL(request.url).pathname;
  if(route==='/rooms'){
   const rooms=await this.findRooms();
   const peers=this.sockets();
   const list=[];
   for(const [key,room] of rooms){
    if(room.mode!=='public')continue;
    if(room.hostOfflineAt||!getHost(peers,room.hostId))continue;
    list.push({id:room.id,title:room.title,hostName:room.hostName||'Host',hostHandle:room.hostHandle||null,hostAvatarVersion:room.hostAvatarVersion||0,hostVerified:room.hostVerified===true,category:room.category,broadcastKind:room.broadcastKind||"camera",createdAt:room.createdAt,viewers:roomCount(peers,room.id)});
   }
   return Response.json({rooms:list});
  }
  if(route.startsWith('/api/account/')||route.startsWith('/api/profile/')||route.startsWith('/api/supporter/')||route==='/api/payments/status'||route==='/api/streaming/capacity'||route.startsWith('/api/social/')||route.startsWith('/api/messages/')||route.startsWith('/api/wallet/')){
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
    accountId:principal?.id||null,sessionFingerprint,handle:principal?.handle||null,avatarVersion:principal?.avatarVersion||0,displayName:principal?.name||null,
    verifiedAdult:principal?.verifiedAdult===true,kycStatus:principal?.kycStatus||'NOT_CONFIGURED'});
  // A 25s server heartbeat keeps mobile network paths warm without an APK update.
  // The alarm is scheduled only while sockets are present; no idle background loop.
  await this.scheduleHeartbeat();
  return new Response(null,{status:101,webSocket:client});
 }
 async alarm(){
  const sockets=this.sockets(),rooms=await this.findRooms();
  const now=Date.now();
  for(const [key,room] of rooms){
   if(room.pk){
    const checked=checkPKDeadline(room.pk,now);
    if(checked!==room.pk){room.pk=checked;await this.ctx.storage.put(key,room);broadcastPK(sockets,room.id,checked)}
   }
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
  else{
   const nextExpiry=await this.pruneReports(now);
   if(nextExpiry!==null)await this.ctx.storage.setAlarm(Math.max(now+1000,nextExpiry));
  }
 }
 async webSocketMessage(ws,input){
  if(typeof input!=='string'||input.length>MAX_MESSAGE){ws.close(1009,'message too large');return}
  let msg;
  try{msg=JSON.parse(input)}catch(e){failure(ws,'JSON tidak valid');return}
  if(!msg||typeof msg!=='object'||Array.isArray(msg))return failure(ws,'Pesan tidak valid');
  let s=state(ws);
  const now=Date.now();
  if(now-(s.lastWindow||0)>1000){s.lastWindow=now;s.events=0;s.iceEvents=0}
  const type=msg.type;
  // ICE candidates are generated in bursts by WebRTC when the audience joins.
  // Count them separately: the previous generic 35/s rate limiter dropped the
  // entire host WebSocket, falsely displaying "host lost network" to viewers.
  // Keep a firm independent cap and strict candidate shape/length below.
  const candidate=type==='signal'&&msg.data&&typeof msg.data==='object'&&!msg.data.description?msg.data.candidate:null;
  const isIceCandidate=!!(candidate&&typeof candidate.candidate==='string'&&candidate.candidate.length<=2048);
  if(isIceCandidate?++s.iceEvents>MAX_ICE_EVENTS:++s.events>MAX_EVENTS){
    ws.close(1008,isIceCandidate?'ice rate limited':'rate limited');return;
  }
  save(ws,s);
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
   // Native GAME facecam configuration is bounded before being sent to viewers.
   const fc=msg.facecam&&typeof msg.facecam==='object'&&!Array.isArray(msg.facecam)?msg.facecam:null;
   const bound=(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):fallback;
   const facecam=fc?{x:bound(fc.x,0,.82,.72),y:bound(fc.y,.02,.85,.11),size:bound(fc.size,56,112,76)}:null;
   const mode=msg.mode==='password'?'password':'public';
   const password=txt(msg.password,32);
   if(mode==='password'&&password.length<4)return failure(ws,'Kode private room minimal 4 karakter');
   const id=crypto.randomUUID().replace(/-/g,'').slice(0,12);
   const resumeToken=crypto.randomUUID()+crypto.randomUUID();
   const room={id,title:txt(msg.title,60)||'NADMO LIVE',category:txt(msg.category,28)||'Social',
    hostName:current?.name||txt(msg.hostName,60)||'Host',hostHandle:current?.handle||null,hostAvatarVersion:current?.avatarVersion||0,
     hostThemeId:['nadmo','cyberbw','noir','retro','electric'].includes(msg.themeId)?msg.themeId:
     (['nadmo','cyberbw','noir','retro','electric'].includes(current?.themeId)?current.themeId:'nadmo'),
    hostVerified:current?.kycStatus==='verified'&&current?.verifiedAdult===true,hostAccountId:current?.id||null,
    broadcastKind:['radio','gaming','talk'].includes(msg.broadcastKind)?msg.broadcastKind:'camera',
    mode,facecam,hostId:s.id,hostResumeHash:await sha(resumeToken),hostOfflineAt:null,passwordHash:mode==='password'?await sha(password):null,mirrorBroadcast:false,stageLayout:[],createdAt:now,stagePreset:'auto',stageRandomSeed:0};
   await this.ctx.storage.put('room:'+id,room);
   s.roomId=id;s.role='host';save(ws,s);
   reply(ws,{type:'created',id,selfId:s.id,resumeToken,mirrorBroadcast:false,hostName:room.hostName,hostHandle:room.hostHandle,hostVerified:room.hostVerified,hostAvatarVersion:room.hostAvatarVersion||0,hostThemeId:room.hostThemeId||'nadmo',createdAt:room.createdAt,broadcastKind:room.broadcastKind,category:room.category,layout:[],stagePreset:room.stagePreset||'auto',stageRandomSeed:room.stageRandomSeed||0});
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
   const viewers=peers.filter(x=>state(x).roomId===id&&['viewer','guest'].includes(state(x).role)).map(x=>state(x).id);
   reply(ws,{type:'resumed',id,selfId:s.id,viewers,mirrorBroadcast:room.mirrorBroadcast===true,hostName:room.hostName,hostHandle:room.hostHandle,hostVerified:room.hostVerified,hostAvatarVersion:room.hostAvatarVersion||0,hostThemeId:room.hostThemeId||'nadmo',createdAt:room.createdAt,broadcastKind:room.broadcastKind||'camera',category:room.category,layout:room.stageLayout||[],stagePreset:room.stagePreset||'auto',stageRandomSeed:room.stageRandomSeed||0,pk:publicPK(room.pk)});
   for(const other of peers){if(state(other).roomId===id&&state(other).role!=='host')reply(other,{type:'host-reconnected'})}
    for(const other of peers){const meta=state(other);if(meta.roomId===id&&meta.pendingGuestMode)reply(ws,{type:'guest-requested',id:meta.id,name:meta.displayName||meta.handle||'Penonton',mode:meta.pendingGuestMode})}
    stageBroadcast(peers,id,room.stageLayout||[]);
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
   if(s.accountId&&Array.isArray(room.blockedAccounts)&&room.blockedAccounts.includes(s.accountId))
    return failure(ws,'Akses akun ke room ini telah diblokir oleh host.');
   s.roomId=id;s.role='viewer';save(ws,s);
   reply(ws,{type:'joined',id,title:room.title,hostName:room.hostName||'Host',hostHandle:room.hostHandle||null,hostVerified:room.hostVerified===true,hostAvatarVersion:room.hostAvatarVersion||0,hostThemeId:room.hostThemeId||'nadmo',selfId:s.id,hostId:room.hostId,facecam:room.facecam||null,mirrorBroadcast:room.mirrorBroadcast===true,createdAt:room.createdAt,maxGuests:GUEST_LIMIT,broadcastKind:room.broadcastKind||'camera',category:room.category,guests:stagePublic(peers,id),layout:room.stageLayout||[],stagePreset:room.stagePreset||'auto',stageRandomSeed:room.stageRandomSeed||0,pk:publicPK(room.pk)});
   // Name comes from authenticated WebSocket session only, never the JOIN payload.
   // Anonymous guests get a distinguishable label, not a fabricated real name.
   // Compact room notifications use exactly one identifier: profile name,
   // falling back to @handle and finally the anonymous viewer ID.
   const joinedName=s.displayName||(s.handle?'@'+s.handle:'Penonton #'+s.id.slice(-4).toUpperCase());
   const presenceLabel=joinedName;
   reply(host,{type:'viewer-joined',id:s.id,name:joinedName,handle:s.handle||null});
   // Always deliver viewer-joined to establish WebRTC. Suppress only repeated
   // on-screen notices when the same authenticated account reconnects fast.
   const presenceKey=s.accountId?'account:'+s.accountId:(s.handle?'handle:'+s.handle.toLowerCase():null);
   let announce=true;
   if(presenceKey){
    const fresh=Array.isArray(room.recentJoinNotices)
      ?room.recentJoinNotices.filter(item=>item&&Number.isFinite(item.at)&&now-item.at>=0&&now-item.at<45000).slice(-31):[];
    announce=!fresh.some(item=>item.key===presenceKey);
    if(announce){
     room.recentJoinNotices=[...fresh.filter(item=>item.key!==presenceKey),{key:presenceKey,at:now}];
     await this.ctx.storage.put('room:'+id,room);
    }
   }
   // Send room entry as server-trusted system chat to web and GAME overlays.
   if(announce){
    const presence={type:'chat',from:'nadmo:room-presence',name:joinedName,
     text:'sudah bergabung',system:'viewer-joined',
     viewerId:s.id,viewerName:joinedName,handle:null,avatarVersion:0};
    for(const receiver of peers)if(receiver!==ws&&state(receiver).roomId===id)reply(receiver,presence);
   }
    stageBroadcast(peers,id,room.stageLayout||[]);
   return;
  }
  if(!s.roomId)return failure(ws,'Belum tergabung dalam room');
  const room=await this.ctx.storage.get('room:'+s.roomId);
  if(!room)return failure(ws,'Room sudah tidak aktif');
  if(type==='guest-request'){
   if(s.role!=='viewer'||s.pendingGuestMode)return failure(ws,'Permintaan panggung hanya untuk penonton yang belum mengajukan.');
   if(stageGuests(this.sockets(),room.id).length>=GUEST_LIMIT)return failure(ws,'Sembilan kursi tamu sudah terisi.');
   const mode=msg.mode==='camera'?'camera':msg.mode==='voice'?'voice':null;
   if(!mode)return failure(ws,'Pilih kamera atau suara.');
   const host=getHost(this.sockets(),room.hostId);
   if(!host||room.hostOfflineAt)return failure(ws,'Host sedang tidak tersedia.');
   s.pendingGuestMode=mode;save(ws,s);reply(ws,{type:'guest-request-pending',mode});
   reply(host,{type:'guest-requested',id:s.id,name:s.displayName||s.handle||'Penonton',mode});
   return;
  }
  if(type==='guest-answer'){
   if(!await this.validHostSession(s,room))return failure(ws,'Hanya host yang dapat menerima tamu.');
   const id=txt(msg.id,32),guest=this.sockets().find(x=>state(x).id===id&&state(x).roomId===room.id);
   if(!guest||state(guest).role!=='viewer'||!state(guest).pendingGuestMode)return failure(ws,'Permintaan tamu tidak aktif.');
   if(typeof msg.accept!=='boolean')return failure(ws,'Persetujuan tidak valid.');
   if(msg.accept&&stageGuests(this.sockets(),room.id).length>=GUEST_LIMIT)return failure(ws,'Kursi tamu penuh.');
   const gs=state(guest),mode=gs.pendingGuestMode;gs.pendingGuestMode=null;
   if(msg.accept){gs.role='guest';gs.guestMode=mode;gs.guestReady=false;gs.guestMic=false;gs.guestCamera=false;gs.guestStreamId=null}
   save(guest,gs);reply(guest,{type:msg.accept?'guest-approved':'guest-rejected',mode});
   reply(ws,{type:'guest-request-resolved',id,accepted:msg.accept});
   stageBroadcast(this.sockets(),room.id,room.stageLayout||[]);return;
  }
  if(type==='guest-ready'||type==='guest-media-state'){
   if(s.role!=='guest')return failure(ws,'Belum diberi akses panggung.');
   if(typeof msg.mic!=='boolean'||typeof msg.camera!=='boolean')return failure(ws,'Status media tidak valid.');
   if(type==='guest-media-state'&&!s.guestReady)return failure(ws,'Media belum siap.');
   s.guestReady=true;s.guestMic=msg.mic;s.guestCamera=msg.camera;
   if(type==='guest-ready')s.guestStreamId=txt(msg.streamId,128)||s.guestStreamId||null;
   save(ws,s);
   if(type==='guest-ready'){
    const host=getHost(this.sockets(),room.hostId);
    if(host)reply(host,{type:'guest-ready',id:s.id});
   }
   stageBroadcast(this.sockets(),room.id,room.stageLayout||[]);return;
  }
  if(type==='guest-exit'){
   if(s.role!=='guest')return failure(ws,'Tidak berada di panggung.');
   if(roomCount(this.sockets(),room.id)>=VIEWER_LIMIT)return failure(ws,'Penonton penuh. Keluar dari room untuk turun panggung.');
   if(room.pk&&room.pk.status!=='finished'&&room.pk.invited.includes(s.id)){
    room.pk=finishPK(room.pk,'participant-left',now);await this.ctx.storage.put('room:'+room.id,room);broadcastPK(this.sockets(),room.id,room.pk);
   }
   s.role='viewer';s.guestReady=false;s.guestMode=null;s.guestCamera=false;s.guestMic=false;s.guestStreamId=null;save(ws,s);
   const host=getHost(this.sockets(),room.hostId);if(host)reply(host,{type:'guest-left',id:s.id});
   reply(ws,{type:'guest-exited'});stageBroadcast(this.sockets(),room.id,room.stageLayout||[]);return;
  }
  // Friendly challenge among consenting guests of this SAME live room.
  if(type==='pk-start'){
   if(!await this.validHostSession(s,room))return failure(ws,'Hanya host dapat mengundang PK.');
   const prior=checkPKDeadline(room.pk,now);
   if(prior&&prior.status!=='finished')return failure(ws,'Selesaikan PK saat ini terlebih dahulu.');
   try{
    const eligible=stagePublic(this.sockets(),room.id).filter(g=>g.ready);
    let selection=eligible;
    if(Array.isArray(msg.participants)&&!msg.random){
     const requested=msg.participants.map(id=>txt(id,32));
     if(requested.length!==new Set(requested).size)return failure(ws,'Pilihan peserta ganda.');
     selection=requested.map(id=>eligible.find(g=>g.id===id));
     if(selection.some(item=>!item))return failure(ws,'Peserta belum aktif di panggung.');
    }
    const pk=proposePK({id:crypto.randomUUID(),hostId:room.hostId,guests:selection,mode:msg.mode,minutes:msg.minutes,random:msg.random===true,now});
    room.pk=pk;await this.ctx.storage.put('room:'+room.id,room);broadcastPK(this.sockets(),room.id,pk);
   }catch(error){failure(ws,String(error?.message||'Gagal memulai PK').slice(0,120))}
   return;
  }
  if(type==='pk-consent'){
   if(s.role!=='guest')return failure(ws,'Hanya tamu panggung yang diundang boleh menjawab PK.');
   try{
    room.pk=consentPK(checkPKDeadline(room.pk,now),s.id,msg.accept,now);
    await this.ctx.storage.put('room:'+room.id,room);
    broadcastPK(this.sockets(),room.id,room.pk);
   }catch(error){failure(ws,String(error?.message||'Undangan tidak berlaku').slice(0,120))}
   return;
  }
  if(type==='pk-support'){
   if(s.role!=='viewer'||!s.accountId||!s.sessionFingerprint)return failure(ws,'Masuk akun sebagai penonton untuk mendukung PK.');
   const principal=await getAccountBySessionFingerprint(this.ctx.storage,s.sessionFingerprint);
   if(!principal||principal.id!==s.accountId)return failure(ws,'Sesi pendukung sudah berakhir.');
   try{
    room.pk=supportPK(checkPKDeadline(room.pk,now),principal.id,msg.side,now);
    await this.ctx.storage.put('room:'+room.id,room);
    broadcastPK(this.sockets(),room.id,room.pk);
   }catch(error){failure(ws,String(error?.message||'Dukungan tidak diproses').slice(0,120))}
   return;
  }
  if(type==='pk-end'){
   if(!await this.validHostSession(s,room))return failure(ws,'Hanya host dapat mengakhiri PK.');
   if(room.pk&&room.pk.status!=='finished'){
    room.pk=finishPK(room.pk,'host-ended',now);
    await this.ctx.storage.put('room:'+room.id,room);
    broadcastPK(this.sockets(),room.id,room.pk);
   }
   return;
  }
  if(type==='stage-preset'){
   if(!await this.validHostSession(s,room))return failure(ws,'Hanya host dapat mengatur tata letak.');
   if(!['auto','focus','random'].includes(msg.preset))return failure(ws,'Tata letak belum didukung.');
   room.stagePreset=msg.preset;
   if(msg.preset==='random')room.stageRandomSeed=Math.floor(Math.random()*999999)+1;
   await this.ctx.storage.put('room:'+room.id,room);
   for(const viewer of this.sockets())if(state(viewer).roomId===room.id)reply(viewer,{type:'stage-preset-updated',preset:room.stagePreset,seed:room.stageRandomSeed||0});
   return;
  }
  if(type==='stage-layout'){
   // Host owns the shared layout. Only existing on-stage guests may be positioned.
   if(!await this.validHostSession(s,room))return failure(ws,'Hanya host dapat mengatur posisi tamu');
   if(!Array.isArray(msg.layout)||msg.layout.length>GUEST_LIMIT)return failure(ws,'Tata letak tidak valid');
   const ids=new Set(stageGuests(this.sockets(),room.id).map(x=>state(x).id));
   const seen=new Set(),layout=[];
   for(const rect of msg.layout){
    if(!rect||typeof rect!=='object'||Array.isArray(rect)||typeof rect.id!=='string'||!ids.has(rect.id)||seen.has(rect.id))
     return failure(ws,'Kotak tamu tidak valid');
    const {x,y,w,h}=rect;
    if(![x,y,w,h].every(n=>typeof n==='number'&&Number.isFinite(n))||w<18||h<15||x<0||y<0||x+w>100.001||y+h>100.001)
     return failure(ws,'Posisi atau ukuran tamu di luar batas panggung');
    seen.add(rect.id);
    layout.push({id:rect.id,x:Math.round(x*10)/10,y:Math.round(y*10)/10,w:Math.round(w*10)/10,h:Math.round(h*10)/10});
   }
   room.stageLayout=layout;
   await this.ctx.storage.put('room:'+room.id,room);
   for(const viewer of this.sockets())if(state(viewer).roomId===room.id)
    reply(viewer,{type:'stage-layout-updated',layout});
   return;
  }
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
  if(type==='report'){
   if(!['viewer','guest'].includes(s.role))return failure(ws,'Laporan live hanya dapat dikirim oleh peserta room.');
   if(now-(s.lastReport||0)<60000)return failure(ws,'Laporan sebelumnya baru diterima. Tunggu 60 detik.');
   const reason=txt(msg.reason,40).toLowerCase();
   if(!['harassment','threats','fraud','impersonation','copyright','other'].includes(reason))
    return failure(ws,'Pilih alasan laporan yang tersedia.');
   const description=txt(msg.description,300);
   // No government ID, IP or raw chat transcript is stored in this private beta report.
   const report={id:crypto.randomUUID(),roomId:room.id,creatorAccountId:room.hostAccountId||null,reason,description,createdAt:now,status:'PENDING_OPERATOR_REVIEW'};
   await this.ctx.storage.put('abuse-report:'+now+':'+report.id,report);
   s.lastReport=now;save(ws,s);
   await this.pruneReports(now);
   reply(ws,{type:'report-received',id:report.id,status:report.status});
   return;
  }
  if(type==='moderate'){
   if(!await this.validHostSession(s,room))return failure(ws,'Hanya host room dengan sesi valid yang dapat memoderasi.');
   const action=txt(msg.action,12).toLowerCase(),targetId=txt(msg.targetId,32);
   if(!['mute','unmute','kick','block'].includes(action))return failure(ws,'Perintah moderasi tidak dikenal.');
   const target=this.sockets().find(x=>state(x).id===targetId&&state(x).roomId===room.id&&['viewer','guest'].includes(state(x).role));
   if(!target)return failure(ws,'Penonton tidak ada lagi di room.');
   const targetState=state(target);
   if(action==='block'&&!targetState.accountId)
    return failure(ws,'Akun anonim tidak bisa diblokir permanen. Gunakan KICK untuk mengeluarkan sesi ini.');
   if(!Array.isArray(room.mutedSessions))room.mutedSessions=[];
   if(!Array.isArray(room.blockedAccounts))room.blockedAccounts=[];
   if(action==='mute'&&!room.mutedSessions.includes(targetId))room.mutedSessions.push(targetId);
   if(action==='unmute')room.mutedSessions=room.mutedSessions.filter(id=>id!==targetId);
   if(action==='block'&&!room.blockedAccounts.includes(targetState.accountId)){
    if(room.blockedAccounts.length>=100)return failure(ws,'Batas blokir room tercapai.');
    room.blockedAccounts.push(targetState.accountId);
   }
   if(action==='kick'||action==='block'){
    room.mutedSessions=room.mutedSessions.filter(id=>id!==targetId);
    const wasGuest=targetState.role==='guest';
    targetState.role=null;targetState.roomId=null;save(target,targetState);
    if(wasGuest){
     if(room.pk&&room.pk.status!=='finished'&&room.pk.invited.includes(targetId)){
      room.pk=finishPK(room.pk,'participant-removed',now);broadcastPK(this.sockets(),room.id,room.pk);
     }
     reply(ws,{type:'guest-left',id:targetId});
    }
    stageBroadcast(this.sockets(),room.id,room.stageLayout||[]);
    reply(target,{type:'moderated',action,reason:action==='block'?'Akun diblokir dari room ini.':'Host mengeluarkan Anda dari room ini.'});
    reply(ws,{type:'viewer-left',id:targetId});
   }else reply(target,{type:'moderated',action,reason:action==='mute'?'Host membisukan chat Anda.':'Host mengaktifkan kembali chat Anda.'});
   await this.ctx.storage.put('room:'+room.id,room);
   reply(ws,{type:'moderation-result',action,targetId,ok:true});
   if(action==='kick'||action==='block')try{target.close(4003,'Removed by host')}catch{}
   return;
  }
  if(type==='chat'){
   if(Array.isArray(room.mutedSessions)&&room.mutedSessions.includes(s.id))return failure(ws,'Chat dibisukan oleh host.');
   const text=txt(msg.text,250);
   if(!text)return;
   if(now-(s.lastChat||0)<600)return failure(ws,'Tunggu sebelum mengirim chat');
   s.lastChat=now;save(ws,s);
   // A client cannot select a public level. Resolve from the authenticated account
   // and server-stored, payment-verified total for each chat send.
   let supporterBadge=null;
   if(s.accountId&&s.sessionFingerprint){
    const principal=await getAccountBySessionFingerprint(this.ctx.storage,s.sessionFingerprint);
    if(principal?.id===s.accountId){
     const record=await this.ctx.storage.get('auth-user:'+principal.id);
     supporterBadge=await getPublicSupporterBadge(this.ctx.storage,principal.id,record);
    }
   }
   const packet={type:'chat',from:s.id,name:s.displayName||s.handle||(s.role==='host'?room.hostName||'Host':'Viewer'),handle:s.handle||null,avatarVersion:s.avatarVersion||0,verified:s.kycStatus==='verified'&&s.verifiedAdult===true,supporterBadge,text};
   this.sockets().filter(x=>state(x).roomId===room.id).forEach(x=>reply(x,packet));
   return;
  }
  if(type==='host-visibility'){
   if(s.role!=='host'||room.hostId!==s.id)return failure(ws,'Hanya host yang dapat memberi status siaran');
   const status=msg.status==='background'?'background':'active';
   for(const viewer of this.sockets()){
    if(['viewer','guest'].includes(state(viewer).role)&&state(viewer).roomId===s.roomId)reply(viewer,{type:'host-visibility',status});
   }
   return;
  }
  if(type==='refresh-media'){
   // A viewer returning from mobile background can request fresh WebRTC negotiation.
   // Refresh only within its joined room; never expose the host's recovery token.
   if(!['viewer','guest'].includes(s.role))return failure(ws,'Hanya penonton yang dapat meminta pemulihan video');
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
   if(data.candidate){
    const candidate=data.candidate;
    if(!candidate||typeof candidate!=='object'||Array.isArray(candidate)||
      typeof candidate.candidate!=='string'||candidate.candidate.length>2048||
      typeof candidate.sdpMid!=='string'||candidate.sdpMid.length>32||
      !Number.isInteger(candidate.sdpMLineIndex)||candidate.sdpMLineIndex<0||candidate.sdpMLineIndex>16)
      return failure(ws,'Kandidat koneksi ICE tidak valid');
   }
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
   if(room){
    if(role==='guest'&&room.pk&&room.pk.status!=='finished'&&room.pk.invited.includes(s.id)){
     room.pk=finishPK(room.pk,'participant-left',Date.now());await this.ctx.storage.put('room:'+roomId,room);broadcastPK(peers,roomId,room.pk);
    }
    const host=getHost(peers,room.hostId);
    if(host){reply(host,{type:'viewer-left',id:s.id});if(role==='guest')reply(host,{type:'guest-left',id:s.id})}
    stageBroadcast(peers,roomId,room.stageLayout||[]);
   }
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
   if(other!==ws&&state(other).roomId===room.id&&['viewer','guest'].includes(state(other).role))reply(other,{type:'host-reconnecting',seconds:90});
  }
  await this.scheduleHeartbeat();
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
  // AzuraCast audio CDN may use a different hostname than the station API.
  // Never trust an arbitrary nowplaying.listen_url: permit only a separately
  // configured exact HTTPS RADIO_STREAM_ORIGIN, or the main RADIO_ORIGIN.
  const streamOrigin=secureOrigin(env.RADIO_STREAM_ORIGIN);
  const allowedStreamOrigins=new Set([origin,streamOrigin].filter(Boolean));
  if(np.station.listen_url&&typeof np.station.listen_url==='string'){
   try{
    const u=new URL(np.station.listen_url);
    if(u.protocol==='https:'&&!u.username&&!u.password&&!u.hash&&allowedStreamOrigins.has(u.origin))
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
// Keep the owner's existing Coda sandbox callback URLs safe during LIVE UI deployments.
// NOT a payment integration: no webhook is acknowledged or wallet credited.
function nadmoCodapayGate(request){
 const url=new URL(request.url);
 const path=url.pathname;
 const notify=path==='/api/payments/codapay/notify';
 const success=path==='/api/payments/codapay/success';
 if(!notify&&!success)return null;
 const baseHeaders={'Cache-Control':'no-store, max-age=0','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
 if(notify){
  const headers={...baseHeaders,'Content-Type':'application/json; charset=utf-8'};
  if(request.method==='GET'&&url.searchParams.get('health')==='1'&&url.searchParams.size===1)
   return new Response(JSON.stringify({ok:true,endpoint:'codapay-notification',paymentEnabled:false,mode:'pending-provider-activation'}),{status:200,headers});
  if(!['GET','POST'].includes(request.method))return new Response(JSON.stringify({ok:false,error:'METHOD_NOT_ALLOWED'}),{status:405,headers});
  return new Response(JSON.stringify({ok:false,error:'CODAPAY_PAYMENT_GATE_DISABLED'}),{status:503,headers:{...headers,'Retry-After':'300'}});
 }
 if(request.method!=='GET')return new Response('Method Not Allowed',{status:405,headers:baseHeaders});
 const html='<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="refresh" content="7;url=/app/"><title>NADMO LIVE - Verifikasi pembayaran</title></head><body style="font:16px system-ui,sans-serif;background:#10131a;color:#fff;min-height:100vh;display:grid;place-items:center"><main style="max-width:420px;padding:24px;text-align:center"><h1>NADMO LIVE</h1><p>Pembayaran masih menunggu verifikasi. Saldo belum berubah.</p><p><a href="/app/" style="color:#73c1ff">Kembali ke aplikasi</a></p></main></body></html>';
 return new Response(html,{status:200,headers:{...baseHeaders,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; navigate-to 'self'; base-uri 'none'; frame-ancestors 'none'"}});
}
export default {
 async fetch(request,env,ctx){
  const url=new URL(request.url);
  const codapayGate=nadmoCodapayGate(request);
  if(codapayGate)return codapayGate;
  if(request.method==='OPTIONS')return cors(request,new Response(null,{status:204}));
  if(request.method!=='GET'&&!url.pathname.startsWith('/api/account/')&&!url.pathname.startsWith('/api/messages/')&&!(url.pathname==='/api/wallet/withdraw'&&request.method==='POST')&&!(url.pathname==='/api/social/media/upload'&&request.method==='PUT'))
    return new Response('Method Not Allowed',{status:405});
  // Official native GAME update: a safe 302 to the immutable owner-signed
  // release. Cloudflare Worker subrequests cannot reliably proxy this 50MB
  // GitHub asset (503), whereas browser download follows this URL directly.
  if(url.pathname==='/download.apk'){
    const filename='NADMO-LIVE-v0.10.10-beta.apk';
    return Response.redirect('https://github.com/ardarawk-cloud/ACC-Builder-Apk/releases/download/nadmo-live-v0.10.10-beta/'+filename,302);
  }
  // Serve the verified signed Android package from our own Cloudflare static assets.
  // Unlike a GitHub Actions artifact, this is a direct APK (no ZIP or GitHub webview).
  if(['/NADMO-LIVE-v0.9.1-beta.apk','/NADMO-LIVE-v0.9.2-beta.apk','/NADMO-LIVE-v0.9.4-beta.apk'].includes(url.pathname)){
    // Official mutable alias upgrades to owner-signed v0.9.4 (same cert, higher versionCode).
    // Older version-specific links remain immutable.
    const filename=url.pathname.endsWith('v0.9.1-beta.apk')?'NADMO-LIVE-v0.9.1-beta.apk'
      :url.pathname.endsWith('v0.9.2-beta.apk')?'NADMO-LIVE-v0.9.2-beta.apk'
      :'NADMO-LIVE-v0.9.4-beta.apk';
    const asset=await env.ASSETS.fetch(new Request(url.origin+'/downloads/'+filename));
    if(asset.status!==200||!asset.body)return new Response('NADMO LIVE APK belum tersedia. Coba lagi nanti.',{status:503,headers:{'Cache-Control':'no-store'}});
    const headers=new Headers(asset.headers);
    headers.set('Content-Type','application/vnd.android.package-archive');
    headers.set('Content-Disposition','attachment; filename="'+filename+'"');
    headers.set('X-Content-Type-Options','nosniff');
    headers.set('Cache-Control',url.pathname==='/download.apk'?'no-store':'public, max-age=86400, immutable');
    headers.set('Access-Control-Allow-Origin','*');
    return new Response(asset.body,{status:200,headers});
  }
  if(url.pathname==='/app')return Response.redirect(url.origin+'/app/',308);
  if(url.pathname==='/app/'||url.pathname==='/app/index.html'){
    const asset=await env.ASSETS.fetch(new Request(url.origin+'/app/index.html'));
    const headers=new Headers(asset.headers);
    headers.set('X-Content-Type-Options','nosniff');
    headers.set('Cache-Control','no-store, max-age=0');
    headers.set('X-NADMO-LIVE-VERSION','20261012-live-hourly-break-v7');
    headers.set('Referrer-Policy','no-referrer');
    headers.set('Permissions-Policy','camera=(self), microphone=(self)');
    return new Response(asset.body,{status:asset.status,headers});
  }
  if(url.pathname==='/api/radio/status')return cors(request,Response.json(await radioStatus(env)));
  if(url.pathname==='/health')return cors(request,Response.json({ok:true,service:'nadmo-live-beta',engine:'cloudflare-durable-objects',mode:'webrtc-p2p',maxViewers:VIEWER_LIMIT,maxGuestSeats:GUEST_LIMIT,guestMediaArchitecture:'BETA_HOST_RELAY_P2P',payments:false,creatorVerificationRequired:env.VERIFY_CREATOR_REQUIRED==='true'||env.BETA_TEST_HOSTS_ENABLED!=='true',anonymousBetaHostsEnabled:env.BETA_TEST_HOSTS_ENABLED==='true'&&env.VERIFY_CREATOR_REQUIRED!=='true'}));
  if(url.pathname==='/'){
   // The official short URL opens the app, not a JSON status page.
   // Keep workers.dev root behavior unchanged for legacy integrations.
   if(url.hostname==='live.nadmo.id'){
    const target=new URL('/app/',url.origin);
    target.search=url.search;
    return Response.redirect(target.toString(),308);
   }
   return cors(request,Response.json({service:'NADMO LIVE',status:'BETA',note:'Open /app/ in your browser; backend is configured automatically.'}));
  }
  const isAccountApi=url.pathname.startsWith('/api/account/')||url.pathname.startsWith('/api/profile/')||url.pathname.startsWith('/api/supporter/')||
    url.pathname==='/api/payments/status'||url.pathname==='/api/streaming/capacity'||url.pathname.startsWith('/api/social/')||url.pathname.startsWith('/api/messages/')||url.pathname.startsWith('/api/wallet/');
  if(!isAccountApi&&url.pathname!=='/api/rooms'&&url.pathname!=='/ws')return new Response('Not Found',{status:404});
  if(url.pathname==='/ws'){
   const origin=request.headers.get('Origin');
   if(origin!==ALLOWED_ORIGIN&&origin!==url.origin)return new Response('Origin not allowed',{status:403});
   if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response('Upgrade required',{status:426});
  }
  const hub=env.ROOM_HUB.get(env.ROOM_HUB.idFromName('nadmo-beta-v1'));
  if(url.pathname==='/ws')return hub.fetch(request);
  // A single R2 binding serves photos and videos. No external storage credentials
  // or raw object keys are exposed to clients. Existing video URLs remain valid.
  const mediaExt={jpg:'image/jpeg',png:'image/png',webp:'image/webp',mp4:'video/mp4',webm:'video/webm'};
  const mediaPath=/^\/api\/social\/media\/([a-f0-9-]{36})\/([a-f0-9-]{36})\.(jpg|png|webp|mp4|webm)$/;
  const mediaKey=(user,id,ext)=>(['jpg','png','webp'].includes(ext)?'photos/':'clips/')+user+'/'+id+'.'+ext;
  if(url.pathname==='/api/social/media/status'&&request.method==='GET')
   return cors(request,Response.json({ok:true,enabled:!!env.SOCIAL_MEDIA,maxItems:10,maxImageBytes:8*1024*1024,
    maxVideoBytes:25*1024*1024,formats:['image/jpeg','image/png','image/webp','video/mp4','video/webm']}));
  if(url.pathname==='/api/social/media/upload'&&request.method==='PUT'){
   if(!env.SOCIAL_MEDIA)return cors(request,Response.json({ok:false,error:'Penyimpanan foto/video belum aktif'},{status:503}));
   if(request.headers.get('Origin')!==url.origin)return new Response('Forbidden',{status:403});
   const mime=(request.headers.get('Content-Type')||'').split(';')[0].toLowerCase();
   const ext=Object.keys(mediaExt).find(x=>mediaExt[x]===mime),isPhoto=ext&&['jpg','png','webp'].includes(ext);
   const size=Number(request.headers.get('Content-Length')),max=isPhoto?8*1024*1024:25*1024*1024;
   if(!ext)return cors(request,Response.json({ok:false,error:'Gunakan JPG, PNG, WebP, MP4 atau WebM'},{status:415}));
   if(!Number.isSafeInteger(size)||size<100||size>max)
    return cors(request,Response.json({ok:false,error:isPhoto?'Foto maksimal 8 MB':'Video maksimal 25 MB'},{status:413}));
   const auth=await hub.fetch(new Request(url.origin+'/api/account/me',{headers:{Cookie:request.headers.get('Cookie')||''}}));
   const account=(await auth.json()).account;
   if(!account?.id)return cors(request,Response.json({ok:false,error:'Masuk akun untuk upload'},{status:401}));
   const approval=await hub.fetch(new Request(url.origin+'/api/account/social/upload-allowed',{method:'POST',
    headers:{Origin:url.origin,'Content-Type':'application/json',Cookie:request.headers.get('Cookie')||''},body:'{}'}));
   if(!approval.ok)return cors(request,new Response(approval.body,{status:approval.status,headers:{'Content-Type':'application/json'}}));
   const id=crypto.randomUUID(),key=mediaKey(account.id,id,ext);
   try{
    let data=request.body;
    if(isPhoto){
     const bytes=new Uint8Array(await request.arrayBuffer());
     const valid=ext==='jpg'&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255||
      ext==='png'&&bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71||
      ext==='webp'&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
     if(!valid)return cors(request,Response.json({ok:false,error:'Konten foto tidak cocok dengan format'},{status:415}));
     data=bytes;
    }
    await env.SOCIAL_MEDIA.put(key,data,{httpMetadata:{contentType:mime,cacheControl:'public, max-age=3600'},customMetadata:{owner:account.id}});
   }catch(e){console.error('SOCIAL R2 upload',e?.name);return cors(request,Response.json({ok:false,error:'Upload media gagal'},{status:503}))}
   return cors(request,Response.json({ok:true,type:isPhoto?'image':'video',url:url.origin+'/api/social/media/'+account.id+'/'+id+'.'+ext,bytes:size},{status:201}));
  }
  if(url.pathname.startsWith('/api/social/media/')&&request.method==='GET'){
   if(!env.SOCIAL_MEDIA)return new Response('Media unavailable',{status:503});
   const match=url.pathname.match(mediaPath);
   if(!match)return new Response('Not Found',{status:404});
   const isPhoto=['jpg','png','webp'].includes(match[3]);
   const object=await env.SOCIAL_MEDIA.get(mediaKey(match[1],match[2],match[3]),isPhoto?{}:{range:request.headers});
   if(!object)return new Response('Not Found',{status:404});
   const range=object.range,partial=!isPhoto&&!!request.headers.get('Range')&&!!range;
   const headers=new Headers({'Content-Type':mediaExt[match[3]],
    'Accept-Ranges':isPhoto?'none':'bytes','X-Content-Type-Options':'nosniff','Cache-Control':'public, max-age=3600'});
   if(partial){
    const offset=range.offset||0,length=range.length||object.size-offset;
    headers.set('Content-Range','bytes '+offset+'-'+(offset+length-1)+'/'+object.size);
    headers.set('Content-Length',String(length));
   }else headers.set('Content-Length',String(object.size));
   return cors(request,new Response(object.body,{status:partial?206:200,headers}));
  }
  if(isAccountApi){
   if(url.pathname==='/api/account/posts/publish'&&request.method==='POST'){
    let body;try{body=await request.clone().json()}catch(e){return new Response('Invalid JSON',{status:400})}
    const raw=body?.media===undefined?[]:body.media;
    if(!Array.isArray(raw)||raw.length>10)return cors(request,Response.json({ok:false,error:'Maksimal 10 foto/video'},{status:400}));
    if(raw.length&&body.videoUrl)return cors(request,Response.json({ok:false,error:'Pisahkan link video dan galeri upload'},{status:400}));
    const legacy=typeof body?.videoUrl==='string'?body.videoUrl:'';
    if(raw.length||legacy.startsWith(url.origin+'/api/social/media/')){
     if(!env.SOCIAL_MEDIA)return cors(request,Response.json({ok:false,error:'Penyimpanan galeri belum aktif'},{status:503}));
     const auth=await hub.fetch(new Request(url.origin+'/api/account/me',{headers:{Cookie:request.headers.get('Cookie')||''}}));
     const user=(await auth.json()).account;
     if(!user?.id)return cors(request,Response.json({ok:false,error:'Silakan login'},{status:401}));
     const ordered=raw.length?raw:[{type:'video',url:legacy}],seen=new Set();
     for(const entry of ordered){
      if(!entry||!['image','video'].includes(entry.type)||typeof entry.url!=='string')
       return cors(request,Response.json({ok:false,error:'Media tidak valid'},{status:400}));
      let input;try{input=new URL(entry.url)}catch(e){}
      if(!input||input.origin!==url.origin||input.search||input.hash||seen.has(input.href))
       return cors(request,Response.json({ok:false,error:'Alamat media tidak valid atau duplikat'},{status:400}));
      seen.add(input.href);
      const match=input.pathname.match(mediaPath);
      if(!match||match[1]!==user.id)return cors(request,Response.json({ok:false,error:'Media bukan milik akun ini'},{status:403}));
      if(entry.type!==(['jpg','png','webp'].includes(match[3])?'image':'video'))
       return cors(request,Response.json({ok:false,error:'Jenis media tidak cocok'},{status:400}));
      const object=await env.SOCIAL_MEDIA.head(mediaKey(match[1],match[2],match[3]));
      if(!object||object.customMetadata?.owner!==user.id)
       return cors(request,Response.json({ok:false,error:'Media tidak ditemukan'},{status:404}));
     }
    }
   }
   // Same-origin mutating requests only; never trust a spoofed visitor IP header.
   const headers=new Headers(request.headers);
   headers.set('x-nadmo-client-ip',request.headers.get('CF-Connecting-IP')||'unknown');
   const r=await hub.fetch(new Request(request,{headers}));
   if(url.pathname==='/api/account/posts/delete'&&request.method==='POST'&&r.ok&&env.SOCIAL_MEDIA){
    // Deleting a public post must also remove its privately stored media.
    // The DO already checked post ownership before returning deletedMedia.
    try{
     const deleted=await r.clone().json();
     for(const asset of (Array.isArray(deleted.deletedMedia)?deleted.deletedMedia:[]).slice(0,10)){
      let mediaUrl;try{mediaUrl=new URL(asset)}catch(e){}
      const permittedOrigins=new Set([url.origin,'https://live.nadmo.id',
       'https://nadmo-live-beta-20261009.ardarawk.workers.dev']);
      if(!mediaUrl||!permittedOrigins.has(mediaUrl.origin)||mediaUrl.search||mediaUrl.hash)continue;
      const item=mediaUrl.pathname.match(mediaPath);
      if(item)await env.SOCIAL_MEDIA.delete(mediaKey(item[1],item[2],item[3]));
     }
    }catch(e){console.error('Failed R2 cleanup after post deletion',e?.name);}
   }
   return cors(request,r);
  }
  const r=await hub.fetch(new Request('https://rooms-internal/rooms'));
  return cors(request,r);
 }
}
