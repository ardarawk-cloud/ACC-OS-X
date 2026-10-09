'use strict';
const assert=require('node:assert/strict');
const {WebSocket}=require('ws');
const base='https://nadmo-live-beta-20261009.ardarawk.workers.dev';
const origin='https://appassets.androidplatform.net';
const opened=[];
function connect(){return new Promise((resolve,reject)=>{
 const ws=new WebSocket(base.replace('https:','wss:')+'/ws',{headers:{Origin:origin},handshakeTimeout:12000});
 ws.once('open',()=>{opened.push(ws);resolve(ws)});
 ws.once('error',reject);
});}
function until(ws,type,timeout=16000){return new Promise((resolve,reject)=>{
 let clock=setTimeout(()=>{stop();reject(Error('Timeout '+type))},timeout);
 function onMessage(raw){let m;try{m=JSON.parse(String(raw))}catch(e){return}if(m.type!==type)return;stop();resolve(m)}
 function onClose(code){stop();reject(Error('Socket closed '+code))}
 function stop(){clearTimeout(clock);ws.off('message',onMessage);ws.off('close',onClose)}
 ws.on('message',onMessage);ws.on('close',onClose);
});}
function send(ws,obj){ws.send(JSON.stringify(obj))}
async function rooms(){const r=await fetch(base+'/api/rooms',{signal:AbortSignal.timeout(10000)});assert.equal(r.status,200);return(await r.json()).rooms}
async function run(){
 try{
  const host=await connect(),viewer=await connect();
  const newRoom=until(host,'created');
  send(host,{type:'create',title:'QA Custom Price '+Date.now(),category:'Gaming',mode:'public'});
  const room=await newRoom;
  assert.ok((await rooms()).some(x=>x.id===room.id));
  console.log('PASS public room immediately discoverable');
  const joined=until(viewer,'joined'),arrival=until(host,'viewer-joined');
  send(viewer,{type:'join',id:room.id});await joined;const audience=await arrival;
  const kicked=until(viewer,'access-revoked'),revoked=until(host,'viewer-left'),changed=until(host,'access-updated');
  send(host,{type:'set-access',mode:'password',password:'QA-pass-2026',amount:7500,minutes:10});
  const [state,left]=await Promise.all([changed,revoked]);const exit=await kicked;
  assert.equal(state.mode,'password');assert.equal(state.offer.amount,7500);assert.equal(state.offer.minutes,10);
  assert.equal(state.offer.paymentEnabled,false);assert.equal(state.displaced,1);
  assert.equal(left.id,audience.id);assert.ok(exit.reason.includes('privat'));
  assert.ok(!(await rooms()).some(x=>x.id===room.id));
  console.log('PASS custom Rp7.500 / 10 menit displays as unpaid label, public viewers removed');
  const denied=until(viewer,'error');send(viewer,{type:'join',id:room.id,password:'WRONG'});
  assert.match((await denied).message,/Kode akses salah/);
  const paidJoin=until(viewer,'joined'),noticed=until(host,'viewer-joined');
  send(viewer,{type:'join',id:room.id,password:'QA-pass-2026'});
  await paidJoin;await noticed;
  console.log('PASS passcode required for private re-entry; no fake payment entitlement');
  const publicAgain=until(host,'access-updated');
  send(host,{type:'set-access',mode:'public'});
  assert.equal((await publicAgain).mode,'public');
  assert.ok((await rooms()).some(x=>x.id===room.id));
  console.log('PASS host can go public again without creating new room');
  send(host,{type:'leave'});
  await new Promise(r=>setTimeout(r,600));
  assert.ok(!(await rooms()).some(x=>x.id===room.id));
  console.log('ALL DYNAMIC PRIVATE ACCESS TESTS PASSED');
 }finally{for(const ws of opened)try{ws.terminate()}catch(e){}}
}
run().catch(e=>{console.error(e.stack||e);process.exitCode=1});