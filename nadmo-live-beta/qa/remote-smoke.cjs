'use strict';
const assert=require('node:assert/strict');
const {WebSocket}=require('ws');
const base='https://nadmo-live-beta-20261009.ardarawk.workers.dev';
const origin='https://appassets.androidplatform.net';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function fetchData(path){
 const r=await fetch(base+path,{headers:{Origin:origin},signal:AbortSignal.timeout(15000)});
 assert.equal(r.status,200,path+' HTTP '+r.status);
 assert.equal(r.headers.get('access-control-allow-origin'),origin,'CORS required');
 return r.json();
}
function connect(){
 return new Promise((resolve,reject)=>{
  const ws=new WebSocket(base.replace('https:','wss:')+'/ws',{headers:{Origin:origin},handshakeTimeout:15000});
  ws.once('open',()=>resolve(ws));ws.once('error',reject);
 });
}
function waitFor(ws,type,timeout=12000){
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{cleanup();reject(new Error('Timed out awaiting '+type))},timeout);
  function handler(raw){let msg;try{msg=JSON.parse(String(raw))}catch(e){return}if(msg.type!==type)return;cleanup();resolve(msg)}
  function onClose(){cleanup();reject(new Error('Socket closed awaiting '+type))}
  function cleanup(){clearTimeout(timer);ws.off('message',handler);ws.off('close',onClose)}
  ws.on('message',handler);ws.on('close',onClose);
 });
}
async function main(){
 const peers=[];
 try{
  const h=await fetchData('/health');assert.equal(h.ok,true);assert.equal(h.mode,'webrtc-p2p');
  console.log('PASS remote health & Android CORS');
  const host=await connect();peers.push(host);
  const created=waitFor(host,'created');
  host.send(JSON.stringify({type:'create',title:'QA Remote Beta Room',category:'Podcast',mode:'public'}));
  const room=await created;assert.ok(room.id);
  console.log('PASS create room');
  let rooms=await fetchData('/api/rooms');assert.ok(rooms.rooms.some(x=>x.id===room.id));
  console.log('PASS public discovery');
  const viewer=await connect();peers.push(viewer);
  const joined=waitFor(viewer,'joined'),notice=waitFor(host,'viewer-joined');
  viewer.send(JSON.stringify({type:'join',id:room.id}));
  assert.equal((await joined).id,room.id);const n=await notice;assert.ok(n.id);
  console.log('PASS join + notify');
  const signal=waitFor(viewer,'signal');
  host.send(JSON.stringify({type:'signal',to:n.id,data:{candidate:{candidate:'candidate:demo',sdpMid:'0',sdpMLineIndex:0}}}));
  assert.equal((await signal).data.candidate.candidate,'candidate:demo');
  console.log('PASS signaling');
  const chat=waitFor(host,'chat');
  viewer.send(JSON.stringify({type:'chat',text:'hello from QA'}));
  assert.equal((await chat).text,'hello from QA');
  console.log('PASS chat');
  viewer.close();host.close();await sleep(700);
  const privateHost=await connect();peers.push(privateHost);
  const privateCreated=waitFor(privateHost,'created');
  privateHost.send(JSON.stringify({type:'create',title:'QA Locked Room',mode:'password',password:'beta-984'}));
  const locked=await privateCreated;
  rooms=await fetchData('/api/rooms');
  assert.ok(!rooms.rooms.some(x=>x.id===locked.id),'private room hidden');
  const guest=await connect();peers.push(guest);
  const bad=waitFor(guest,'error');guest.send(JSON.stringify({type:'join',id:locked.id,password:'wrong'}));
  assert.match((await bad).message,/salah/i);
  const good=waitFor(guest,'joined');guest.send(JSON.stringify({type:'join',id:locked.id,password:'beta-984'}));
  assert.equal((await good).id,locked.id);
  console.log('PASS private room gate');
  console.log('ALL REMOTE SIGNALING TESTS PASSED');
 }finally{peers.forEach(ws=>{try{ws.close()}catch(e){}})}
}
main().catch(e=>{console.error(e);process.exitCode=1});
