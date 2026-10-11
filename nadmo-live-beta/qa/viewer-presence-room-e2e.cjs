'use strict';
// JOIN presence must be real room signaling, never simulated viewer counts.
const assert=require('node:assert/strict');
const {WebSocket}=require('ws');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const base='https://live.nadmo.id';
const actors=[];
async function connect(){
 const ws=new WebSocket(base.replace('https://','wss://')+'/ws',{headers:{Origin:base},handshakeTimeout:12000});
 await new Promise((yes,no)=>{ws.once('open',yes);ws.once('error',no)});
 const inbox=[];
 ws.on('message',raw=>{try{inbox.push(JSON.parse(String(raw)))}catch{}});
 const actor={ws,inbox,
  send:x=>ws.send(JSON.stringify(x)),
  async next(type,filter=()=>true,timeout=12000){
   const limit=Date.now()+timeout;
   do{
    const idx=inbox.findIndex(x=>x.type===type&&filter(x));
    if(idx!==-1)return inbox.splice(idx,1)[0];
    await new Promise(resolve=>setTimeout(resolve,25));
   }while(Date.now()<limit);
   throw new Error('Timeout waiting for '+type);
  }
 };
 actors.push(actor);return actor;
}
(async()=>{
 try{
  const host=await connect();
  host.send({type:'create',title:'NADMO room presence QA',category:'Social',mode:'public'});
  const room=await host.next('created');assert.ok(room.id);
  const v1=await connect();
  v1.send({type:'join',id:room.id,name:'ADMIN SPOOF'});
  const joined1=await v1.next('joined');
  const first=await host.next('viewer-joined');
  assert.equal(first.id,joined1.selfId);
  console.log('FIRST_PRESENCE_EVENT_SHAPE '+JSON.stringify({
   namePresent:typeof first.name==='string'&&first.name.trim().length>0,
   anonymousLabel:/^Penonton #[A-F0-9]{4}$/.test(first.name||''),
   spoofed:first.name==='ADMIN SPOOF',fields:Object.keys(first)
  }));
  assert.ok(typeof first.name==='string'&&first.name.trim().length>0,'host needs a readable session-derived name');
  assert.notEqual(first.name,'ADMIN SPOOF','JOIN body may not set public identity');

  const note1=await host.next('chat',x=>x.system==='viewer-joined');
  assert.equal(note1.from,'nadmo:room-presence');
  assert.equal(note1.viewerId,joined1.selfId);
  assert.ok(note1.text.includes(first.name)&&note1.text.includes('sudah bergabung'));
  assert.ok(!note1.text.includes('ADMIN SPOOF'),'cannot spoof public name through JOIN');
  assert.equal(v1.inbox.some(x=>x.system==='viewer-joined'&&x.viewerId===joined1.selfId),false);
  const v2=await connect();
  v2.send({type:'join',id:room.id});
  const joined2=await v2.next('joined');
  assert.ok(joined2.selfId);
  const second=await host.next('viewer-joined',x=>x.id===joined2.selfId);
  const note2=await host.next('chat',x=>x.system==='viewer-joined'&&x.viewerId===second.id);
  assert.ok(note2.text.includes(second.name));
  const audienceNotice=await v1.next('chat',x=>x.system==='viewer-joined'&&x.viewerId===second.id);
  assert.equal(audienceNotice.text,note2.text,'existing viewer receives same message');
  // Normal host-to-audience chat still works after system presence.
  host.send({type:'chat',text:'Selamat datang di NADMO LIVE'});
  assert.equal((await v1.next('chat',x=>x.text==='Selamat datang di NADMO LIVE')).name,'Host');
  const html=readFileSync(resolve(__dirname,'../public/app/index.html'),'utf8');
  assert.match(html,/room-join-notice/);
  assert.match(html,/viewerDisplayNames\.set\(m.id/);
  assert.match(html,/recentRoomJoins\.get\(identity\)/);
  console.log('JOIN_PRESENCE_E2E_PASS: trusted names, host + existing audience, chat, spoof rejection, native-compatible packets');
  host.send({type:'leave'});
 }finally{for(const a of actors)try{a.ws.terminate()}catch{}}
})().catch(e=>{console.error('JOIN_PRESENCE_E2E_FAIL',e.stack||e);process.exitCode=1});
