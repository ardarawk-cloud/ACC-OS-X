'use strict';
const assert=require('node:assert/strict');
const {WebSocket}=require('ws');
const base='https://nadmo-live-beta-20261009.ardarawk.workers.dev';
const sockets=[];
function on(ws,type,timeout=12000){
 return new Promise((resolve,reject)=>{
  const clock=setTimeout(()=>{done();reject(Error('Timeout '+type))},timeout);
  const receive=raw=>{let v;try{v=JSON.parse(String(raw))}catch{return}if(v.type!==type)return;done();resolve(v)};
  const close=()=>{done();reject(Error('Socket closed before '+type))};
  function done(){clearTimeout(clock);ws.off('message',receive);ws.off('close',close)}
  ws.on('message',receive);ws.on('close',close);
 });
}
function send(ws,packet){ws.send(JSON.stringify(packet))}
function open(cookie=''){
 return new Promise((resolve,reject)=>{
  const ws=new WebSocket(base.replace(/^https/,'wss')+'/ws',{headers:{Origin:base,...(cookie?{Cookie:cookie}:{})},handshakeTimeout:12000});
  ws.once('open',()=>{sockets.push(ws);resolve(ws)});
  ws.once('error',reject);
 });
}
async function account(){
 const handle='mod'+crypto.randomUUID().replace(/-/g,'').slice(0,17);
 const password='NadmoModQA!'+crypto.randomUUID();
 const response=await fetch(base+'/api/account/register',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({handle,name:'QA Viewer',password})});
 const result=await response.json();
 assert.equal(response.status,201,JSON.stringify(result));
 const cookie=(response.headers.get('set-cookie')||'').split(';')[0];
 assert.match(cookie,/^nadmo_beta_session=[a-f0-9]{64}$/);
 return {handle,password,cookie};
}
async function main(){
 let registered;
 try{
  registered=await account();
  const host=await open();
  const created=on(host,'created');send(host,{type:'create',title:'NADMO safety QA',category:'Social',mode:'public'});
  const room=await created;
  const guest=await open();let joined=on(guest,'joined'),joinedHost=on(host,'viewer-joined');
  send(guest,{type:'join',id:room.id});
  await joined;const anonId=(await joinedHost).id;
  const signed=await open(registered.cookie);joined=on(signed,'joined');joinedHost=on(host,'viewer-joined');
  send(signed,{type:'join',id:room.id});
  await joined;const registeredId=(await joinedHost).id;
  console.log('PASS anonymous and signed-in viewers join same live room');
  let bad=on(guest,'error');send(guest,{type:'report',reason:'bad-reason'});
  assert.match((await bad).message,/alasan/i);
  const report=on(guest,'report-received');send(guest,{type:'report',reason:'harassment',description:'Test-only suspicious conduct'});
  const reference=await report;assert.match(reference.id,/^[a-f0-9-]{36}$/);assert.equal(reference.status,'PENDING_OPERATOR_REVIEW');
  bad=on(guest,'error');send(guest,{type:'report',reason:'harassment',description:'duplicate'});
  assert.match((await bad).message,/60 detik/i);
  console.log('PASS viewer report accepted with ID, valid reason and rate limit');
  bad=on(guest,'error');send(guest,{type:'moderate',action:'kick',targetId:registeredId});
  assert.match((await bad).message,/host/i);
  console.log('PASS non-host moderation attempt is blocked on server');
  let hostAck=on(host,'moderation-result'),signedAck=on(signed,'moderated');
  send(host,{type:'moderate',action:'mute',targetId:registeredId});
  assert.equal((await hostAck).action,'mute');assert.equal((await signedAck).action,'mute');
  bad=on(signed,'error');send(signed,{type:'chat',text:'This muted message cannot transmit'});
  assert.match((await bad).message,/dibisukan/i);
  hostAck=on(host,'moderation-result');signedAck=on(signed,'moderated');
  send(host,{type:'moderate',action:'unmute',targetId:registeredId});
  await hostAck;await signedAck;
  const transmitted=on(host,'chat');send(signed,{type:'chat',text:'Message after unmute'});
  assert.equal((await transmitted).text,'Message after unmute');
  console.log('PASS host mute/unmute enforced on real WebSocket chat');
  hostAck=on(host,'moderation-result');signedAck=on(signed,'moderated');
  send(host,{type:'moderate',action:'block',targetId:registeredId});
  assert.equal((await hostAck).action,'block');assert.equal((await signedAck).action,'block');
  const rerun=await open(registered.cookie);bad=on(rerun,'error');
  send(rerun,{type:'join',id:room.id});
  assert.match((await bad).message,/diblokir/i);
  console.log('PASS signed-in account block persists across new WebSocket connections');
  hostAck=on(host,'moderation-result');const kicked=on(guest,'moderated');
  send(host,{type:'moderate',action:'kick',targetId:anonId});
  await hostAck;assert.equal((await kicked).action,'kick');
  console.log('PASS anonymous viewer kick, without claiming permanent identity block');
  send(host,{type:'leave'});
  console.log('ALL NADMO ROOM SAFETY E2E TESTS PASSED');
 }finally{
  for(const ws of sockets)try{ws.terminate()}catch{}
  if(registered)try{
   const login=await fetch(base+'/api/account/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({handle:registered.handle,password:registered.password})});
   if(login.ok){
    const cookie=(login.headers.get('set-cookie')||'').split(';')[0];
    await fetch(base+'/api/account/delete',{method:'POST',headers:{Origin:base,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify({password:registered.password})});
   }
  }catch(e){console.warn('QA cleanup skipped:',e.message)}
 }
}
main().catch(e=>{console.error('ROOM_SAFETY_QA_FAIL',e.stack||e);process.exitCode=1});
