import {accountEndpoint,getAccount,getAccountBySessionFingerprint,getSessionFingerprint} from './account.mjs';
import {getPublicSupporterBadge} from './supporter-levels.mjs';
// NADMO LIVE beta realtime signaling. WebRTC P2P mesh; NOT a production SFU.
// No money handling or public onboarding. Beta safety tools operate without staffed review.
const ALLOWED_ORIGIN='https://appassets.androidplatform.net';
const ROOM_LIMIT=20, VIEWER_LIMIT=4, MAX_EVENTS=35, MAX_MESSAGE=60000, HOST_GRACE_MS=90000, REPORT_LIMIT=100, REPORT_TTL=14*86400000, GUEST_LIMIT=9;

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
    list.push({id:room.id,title:room.title,hostName:room.hostName||'Host',hostHandle:room.hostHandle||null,hostVerified:room.hostVerified===true,category:room.category,viewers:roomCount(peers,room.id)});
   }
   return Response.json({rooms:list});
  }
  if(route.startsWith('/api/account/')||route.startsWith('/api/profile/')||route.startsWith('/api/supporter/')||route==='/api/payments/status'||route==='/api/streaming/capacity'||route.startsWith('/api/wallet/')){
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
  await this.scheduleHeartbeat();
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
    mode,hostId:s.id,hostResumeHash:await sha(resumeToken),hostOfflineAt:null,passwordHash:mode==='password'?await sha(password):null,mirrorBroadcast:false,stageLayout:[],createdAt:now};
   await this.ctx.storage.put('room:'+id,room);
   s.roomId=id;s.role='host';save(ws,s);
   reply(ws,{type:'created',id,selfId:s.id,resumeToken,mirrorBroadcast:false,hostName:room.hostName,hostHandle:room.hostHandle,hostVerified:room.hostVerified,layout:[]});
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
   reply(ws,{type:'resumed',id,selfId:s.id,viewers,mirrorBroadcast:room.mirrorBroadcast===true,hostName:room.hostName,hostHandle:room.hostHandle,hostVerified:room.hostVerified,layout:room.stageLayout||[]});
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
   reply(ws,{type:'joined',id,title:room.title,hostName:room.hostName||'Host',hostHandle:room.hostHandle||null,hostVerified:room.hostVerified===true,selfId:s.id,hostId:room.hostId,mirrorBroadcast:room.mirrorBroadcast===true,maxGuests:GUEST_LIMIT,guests:stagePublic(peers,id),layout:room.stageLayout||[]});
   reply(host,{type:'viewer-joined',id:s.id});
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
   s.role='viewer';s.guestReady=false;s.guestMode=null;s.guestCamera=false;s.guestMic=false;s.guestStreamId=null;save(ws,s);
   const host=getHost(this.sockets(),room.hostId);if(host)reply(host,{type:'guest-left',id:s.id});
   reply(ws,{type:'guest-exited'});stageBroadcast(this.sockets(),room.id,room.stageLayout||[]);return;
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
    if(wasGuest)reply(ws,{type:'guest-left',id:targetId});
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
   const packet={type:'chat',from:s.id,name:s.displayName||s.handle||(s.role==='host'?room.hostName||'Host':'Viewer'),handle:s.handle||null,verified:s.kycStatus==='verified'&&s.verifiedAdult===true,supporterBadge,text};
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
  if(request.method!=='GET'&&!url.pathname.startsWith('/api/account/')&&!(url.pathname==='/api/wallet/withdraw'&&request.method==='POST'))
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
  if(url.pathname==='/health')return cors(request,Response.json({ok:true,service:'nadmo-live-beta',engine:'cloudflare-durable-objects',mode:'webrtc-p2p',maxViewers:VIEWER_LIMIT,maxGuestSeats:GUEST_LIMIT,guestMediaArchitecture:'BETA_HOST_RELAY_P2P',payments:false,creatorVerificationRequired:env.VERIFY_CREATOR_REQUIRED==='true'||env.BETA_TEST_HOSTS_ENABLED!=='true',anonymousBetaHostsEnabled:env.BETA_TEST_HOSTS_ENABLED==='true'&&env.VERIFY_CREATOR_REQUIRED!=='true'}));
  if(url.pathname==='/'){
   return cors(request,Response.json({service:'NADMO LIVE',status:'BETA',note:'Open /app/ in your browser; backend is configured automatically.'}));
  }
  const isAccountApi=url.pathname.startsWith('/api/account/')||url.pathname.startsWith('/api/profile/')||url.pathname.startsWith('/api/supporter/')||
    url.pathname==='/api/payments/status'||url.pathname==='/api/streaming/capacity'||url.pathname.startsWith('/api/wallet/');
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
