import assert from 'node:assert/strict';
import WebSocket from 'ws';

const HOST='nadmo-live-beta-20261009.ardarawk.workers.dev';
const URL='wss://'+HOST+'/ws',ORIGIN='https://'+HOST;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function createClient(){
 const ws=new WebSocket(URL,{headers:{Origin:ORIGIN}});
 const packets=[];
 let closed=false,closeCode=0,closeReason='';
 ws.on('message',raw=>{try{packets.push(JSON.parse(raw.toString()))}catch{}});
 ws.on('close',(code,reason)=>{closed=true;closeCode=code;closeReason=String(reason)});
 ws.on('error',err=>{console.warn('ICE-burst socket warning:',err.message)});
 const opened=new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>reject(Error('WebSocket open timeout')),15000);
  ws.once('open',()=>{clearTimeout(timeout);resolve()});
  ws.once('error',err=>{clearTimeout(timeout);reject(err)});
 });
 async function wait(type,timeoutMs=9000){
  const deadline=Date.now()+timeoutMs;
  while(Date.now()<deadline){
   const found=packets.find(x=>x.type===type);
   if(found)return found;
   if(closed)throw Error('Host socket CLOSED '+closeCode+' '+closeReason+' before '+type);
   await sleep(35);
  }
  throw Error('Missing '+type+'; WS state='+ws.readyState+'; messages='+packets.slice(-5).map(x=>x.type).join(','));
 }
 return {ws,packets,opened,wait,get closed(){return closed},get code(){return closeCode},get reason(){return closeReason}};
}

const host=createClient();let roomCreated=false;
try{
 await host.opened;
 host.ws.send(JSON.stringify({type:'create',title:'NADMO GAME ICE BURST QA',category:'Gaming',mode:'public',hostName:'NADMO QA'}));
 const created=await host.wait('created');roomCreated=true;
 assert.ok(created.id?.length===12);
 const count=70;
 // Valid SDP candidate objects using the exact shape sent by Android WebRTC.
 // Destination does not exist, avoiding unnecessary relaying to real viewers.
 const data={candidate:{
  candidate:'candidate:1 1 udp 2122260223 192.0.2.1 55432 typ host generation 0 ufrag QA network-id 1',
  sdpMid:'0',sdpMLineIndex:0
 }};
 for(let i=0;i<count;i++)host.ws.send(JSON.stringify({type:'signal',to:'probe-nobody',data}));
 // Control messages must remain live even after candidate burst.
 host.ws.send(JSON.stringify({type:'chat',text:'ICE burst '+Date.now()}));
 const chat=await host.wait('chat',10000);
 assert.ok(chat.text?.startsWith('ICE burst '));
 assert.equal(host.closed,false,'Server killed host while ICE candidates were being gathered');
 host.ws.send(JSON.stringify({type:'leave'}));
 await host.wait('left');
 console.log('PASS: real Worker kept host room ONLINE through '+count+' rapid ICE candidates and accepted chat/leave.');
}finally{
 if(host.ws.readyState===WebSocket.OPEN&&roomCreated)host.ws.send(JSON.stringify({type:'leave'}));
 host.ws.close();
}
