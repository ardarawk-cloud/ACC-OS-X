// NADMO LIVE beta realtime signaling. WebRTC P2P mesh; NOT a production SFU.
// No money handling, no public onboarding, no content moderation service.
const ALLOWED_ORIGIN='https://appassets.androidplatform.net';
const ROOM_LIMIT=20, VIEWER_LIMIT=4, MAX_EVENTS=35, MAX_MESSAGE=60000;

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
    if(!getHost(peers,room.hostId))continue;
    list.push({id:room.id,title:room.title,category:room.category,viewers:roomCount(peers,room.id)});
   }
   return Response.json({rooms:list});
  }
  if(route!=='/ws'||request.headers.get('Upgrade')?.toLowerCase()!=='websocket'){
   return new Response('WebSocket upgrade required',{status:426});
  }
  if(this.sockets().length>=120)return new Response('Beta is at capacity',{status:503});
  const pair=new WebSocketPair(),client=pair[0],server=pair[1];
  this.ctx.acceptWebSocket(server);
  save(server,{id:crypto.randomUUID().replace(/-/g,'').slice(0,16),roomId:null,role:null,lastWindow:0,events:0,lastChat:0});
  // A 25s server heartbeat keeps mobile network paths warm without an APK update.
  // The alarm is scheduled only while sockets are present; no idle background loop.
  if((await this.ctx.storage.getAlarm())===null)await this.ctx.storage.setAlarm(Date.now()+25000);
  return new Response(null,{status:101,webSocket:client});
 }
 async alarm(){
  const sockets=this.sockets();
  if(!sockets.length)return;
  const payload=JSON.stringify({type:'heartbeat',at:Date.now()});
  for(const socket of sockets)reply(socket,JSON.parse(payload));
  await this.ctx.storage.setAlarm(Date.now()+25000);
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
  if(type==='leave'){await this.leave(ws,s);return}
  if(type==='create'){
   if(s.roomId)return failure(ws,'Keluar dari room sebelumnya terlebih dahulu');
   const all=await this.findRooms();
   if(all.size>=ROOM_LIMIT)return failure(ws,'Room beta sudah penuh');
   const mode=msg.mode==='password'?'password':'public';
   const password=txt(msg.password,32);
   if(mode==='password'&&password.length<4)return failure(ws,'Kode private room minimal 4 karakter');
   const id=crypto.randomUUID().replace(/-/g,'').slice(0,12);
   const room={id,title:txt(msg.title,60)||'NADMO LIVE',category:txt(msg.category,28)||'Social',mode,hostId:s.id,passwordHash:mode==='password'?await sha(password):null,createdAt:now};
   await this.ctx.storage.put('room:'+id,room);
   s.roomId=id;s.role='host';save(ws,s);
   reply(ws,{type:'created',id,selfId:s.id});
   return;
  }
  if(type==='join'){
   if(s.roomId)return failure(ws,'Keluar room sebelumnya terlebih dahulu');
   const id=txt(msg.id,32);
   const room=await this.ctx.storage.get('room:'+id);
   if(!room)return failure(ws,'Room tidak ditemukan atau sudah selesai');
   const peers=this.sockets(),host=getHost(peers,room.hostId);
   if(!host){await this.ctx.storage.delete('room:'+id);return failure(ws,'Host sudah offline')}
   if(roomCount(peers,id)>=VIEWER_LIMIT)return failure(ws,'Room beta penuh (maks. 4 penonton)');
   if(room.mode==='password'&&await sha(txt(msg.password,32))!==room.passwordHash)return failure(ws,'Kode akses salah');
   s.roomId=id;s.role='viewer';save(ws,s);
   reply(ws,{type:'joined',id,title:room.title,selfId:s.id,hostId:room.hostId});
   reply(host,{type:'viewer-joined',id:s.id});
   return;
  }
  if(!s.roomId)return failure(ws,'Belum tergabung dalam room');
  const room=await this.ctx.storage.get('room:'+s.roomId);
  if(!room)return failure(ws,'Room sudah tidak aktif');
  if(type==='chat'){
   const text=txt(msg.text,250);
   if(!text)return;
   if(now-(s.lastChat||0)<600)return failure(ws,'Tunggu sebelum mengirim chat');
   s.lastChat=now;save(ws,s);
   const packet={type:'chat',name:s.role==='host'?'Host':'Viewer',text};
   this.sockets().filter(x=>state(x).roomId===room.id).forEach(x=>reply(x,packet));
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
     failure(other,'Host telah mengakhiri siaran');
     try{other.close(1000,'room closed')}catch(e){}
    }
   }
  }else{
   const room=await this.ctx.storage.get('room:'+roomId);
   if(room){const host=getHost(peers,room.hostId);if(host)reply(host,{type:'viewer-left',id:s.id})}
  }
 }
 async webSocketClose(ws,code,reason){
  console.log('NADMO socket close',code,String(reason||'').slice(0,80),state(ws).role||'none');
  await this.leave(ws,state(ws));
  try{ws.close(code||1000,reason||'closed')}catch(e){}
 }
 async webSocketError(ws){
  console.log('NADMO socket error',state(ws).role||'none');
  await this.leave(ws,state(ws));
  try{ws.close(1011,'connection error')}catch(e){}
 }
}
export default {
 async fetch(request,env,ctx){
  const url=new URL(request.url);
  if(request.method==='OPTIONS')return cors(request,new Response(null,{status:204}));
  if(request.method!=='GET')return new Response('Method Not Allowed',{status:405});
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
  if(url.pathname==='/health')return cors(request,Response.json({ok:true,service:'nadmo-live-beta',engine:'cloudflare-durable-objects',mode:'webrtc-p2p',maxViewers:VIEWER_LIMIT,payments:false}));
  if(url.pathname==='/'){
   return cors(request,Response.json({service:'NADMO LIVE',status:'BETA',note:'Install Android beta and configure HTTPS backend URL in Settings.'}));
  }
  if(url.pathname!=='/api/rooms'&&url.pathname!=='/ws')return new Response('Not Found',{status:404});
  if(url.pathname==='/ws'){
   const origin=request.headers.get('Origin');
   if(origin!==ALLOWED_ORIGIN&&origin!==url.origin)return new Response('Origin not allowed',{status:403});
   if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response('Upgrade required',{status:426});
  }
  const hub=env.ROOM_HUB.get(env.ROOM_HUB.idFromName('nadmo-beta-v1'));
  if(url.pathname==='/ws')return hub.fetch(request);
  const r=await hub.fetch(new Request('https://rooms-internal/rooms'));
  return cors(request,r);
 }
}
