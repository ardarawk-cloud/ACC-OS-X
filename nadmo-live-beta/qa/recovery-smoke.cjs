'use strict';
const assert=require('node:assert/strict');
const {WebSocket}=require('ws');
const base='https://nadmo-live-beta-20261009.ardarawk.workers.dev';
const origin='https://appassets.androidplatform.net';
const opened=[];
function wsConnect(){
 return new Promise((resolve,reject)=>{
  const ws=new WebSocket(base.replace('https:','wss:')+'/ws',{headers:{Origin:origin},handshakeTimeout:12000});
  ws.once('open',()=>{opened.push(ws);resolve(ws)});
  ws.once('error',reject);
 });
}
function waitFor(ws,type,timeout=16000){
 return new Promise((resolve,reject)=>{
  let timer=setTimeout(()=>{end();reject(Error('Timed out '+type))},timeout);
  function handle(raw){let m;try{m=JSON.parse(String(raw))}catch(e){return}if(m.type!==type)return;end();resolve(m)}
  function closed(code){end();reject(Error('WebSocket closed '+code+' while waiting for '+type))}
  function end(){clearTimeout(timer);ws.off('message',handle);ws.off('close',closed)}
  ws.on('message',handle);ws.on('close',closed);
 });
}
function send(ws,body){ws.send(JSON.stringify(body))}
async function rooms(){
 const r=await fetch(base+'/api/rooms',{signal:AbortSignal.timeout(10000)});assert.equal(r.status,200);
 return (await r.json()).rooms;
}
async function main(){
 try{
  const host=await wsConnect();
  const created=waitFor(host,'created');
  send(host,{type:'create',title:'QA Host Reconnect',mode:'public',category:'Gaming'});
  const room=await created;
  assert.match(room.resumeToken,/^[a-f0-9-]{70,80}$/i);
  assert.ok((await rooms()).some(x=>x.id===room.id&&x.category==='Gaming'));
  console.log('PASS creator can publish Gaming room and receives private recovery credential');
  const viewer=await wsConnect();
  const joined=waitFor(viewer,'joined'),joinedHost=waitFor(host,'viewer-joined');
  send(viewer,{type:'join',id:room.id});
  await joined;const firstViewer=await joinedHost;
  assert.ok(firstViewer.id);
  console.log('PASS real viewer joined live room');
  const waitOffline=waitFor(viewer,'host-reconnecting');
  host.terminate();
  const offline=await waitOffline;
  assert.equal(offline.seconds,90);
  assert.ok(!(await rooms()).some(x=>x.id===room.id),'offline host should not appear as live');
  console.log('PASS abrupt host loss preserves viewer and hides offline stream from discovery');
  const attacker=await wsConnect(),bad=waitFor(attacker,'error');
  send(attacker,{type:'resume',id:room.id,token:'invalid'});
  assert.match((await bad).message,/ditolak/i);
  console.log('PASS unauthorized session takeover rejected');
  const newHost=await wsConnect();
  const onResume=waitFor(newHost,'resumed'),onRecover=waitFor(viewer,'host-reconnected');
  send(newHost,{type:'resume',id:room.id,token:room.resumeToken});
  const result=await onResume;await onRecover;
  assert.equal(result.id,room.id);
  assert.deepEqual(result.viewers,[firstViewer.id]);
  assert.ok((await rooms()).some(x=>x.id===room.id));
  console.log('PASS host recovers identical live room with existing viewer');
  const incoming=waitFor(viewer,'signal');
  send(newHost,{type:'signal',to:firstViewer.id,data:{candidate:{candidate:'candidate:resume-check',sdpMid:'0',sdpMLineIndex:0}}});
  const relay=await incoming;
  assert.equal(relay.from,result.selfId);
  console.log('PASS recovered WebRTC signaling reaches original viewer');
  const chat=waitFor(newHost,'chat');
  send(viewer,{type:'chat',text:'still watching'});
  assert.equal((await chat).text,'still watching');
  console.log('PASS chat after recovery');
  send(newHost,{type:'leave'});
  await new Promise(r=>setTimeout(r,550));
  assert.ok(!(await rooms()).some(x=>x.id===room.id));
  console.log('PASS deliberate end removes room');
  console.log('ALL HOST RECOVERY TESTS PASSED');
 }finally{
  for(const ws of opened)try{ws.terminate()}catch(e){}
 }
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1});
