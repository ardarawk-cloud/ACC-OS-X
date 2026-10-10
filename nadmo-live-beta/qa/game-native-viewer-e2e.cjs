'use strict';
const puppeteer=require('puppeteer-core');
const assert=require('node:assert/strict');
const base='https://nadmo-live-beta-20261009.ardarawk.workers.dev/app/';
(async()=>{
 const browser=await puppeteer.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,
  args:['--no-sandbox','--disable-dev-shm-usage','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required']});
 let host,viewer,room;
 try{
  const hContext=await browser.createBrowserContext(),vContext=await browser.createBrowserContext();
  host=await hContext.newPage();viewer=await vContext.newPage();
  await Promise.all([host.goto(base,{waitUntil:'domcontentloaded',timeout:25000}),viewer.goto(base,{waitUntil:'domcontentloaded',timeout:25000})]);
  await viewer.$eval('#adult',el=>el.click());
  assert.equal(await viewer.$eval('#adult',el=>el.checked),true);
  room=await host.evaluate(async()=>{
   const stream=await navigator.mediaDevices.getUserMedia({video:true,audio:true});
   const socket=new WebSocket(location.origin.replace(/^http/,'ws')+'/ws');
   const peers=new Map(),log=[];
   window.__gameQA={stream,socket,peers,log};
   const send=obj=>socket.send(JSON.stringify(obj));
   const signal=(to,data)=>send({type:'signal',to,data});
   const offer=async id=>{
    let prior=peers.get(id);if(prior)prior.close();
    const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
    peers.set(id,pc);
    for(const track of stream.getTracks())pc.addTrack(track,stream);
    pc.onicecandidate=e=>{if(e.candidate)signal(id,{candidate:e.candidate.toJSON()})};
    pc.oniceconnectionstatechange=()=>log.push('ICE '+pc.iceConnectionState);
    await pc.setLocalDescription(await pc.createOffer());
    signal(id,{description:pc.localDescription,reset:true});
   };
   return await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('room start timed out: '+log.join(','))),20000);
    socket.onopen=()=>send({type:'create',title:'Native-to-public-viewer QA',category:'Gaming',mode:'public',hostName:'NADMO QA'});
    socket.onmessage=async e=>{
     try{
      const m=JSON.parse(e.data);log.push('recv '+m.type);
      if(m.type==='created'){clearTimeout(timer);resolve(m.id)}
      if(m.type==='viewer-joined'||m.type==='media-refresh-request')await offer(m.id);
      if(m.type==='signal'){
       const pc=peers.get(m.from);if(!pc)return;
       if(m.data?.description?.type==='answer')await pc.setRemoteDescription(m.data.description);
       if(m.data?.candidate){try{await pc.addIceCandidate(m.data.candidate)}catch(e){log.push('candidate '+e.message)}}
      }
      if(m.type==='error'){clearTimeout(timer);reject(Error('Server rejected: '+m.message))}
     }catch(err){log.push('event error: '+err.message)}
    };
    socket.onerror=()=>{clearTimeout(timer);reject(Error('host WS failed'))};
   });
  });
  console.log('GAME native-style host room: '+room);
  await viewer.locator('nav button[data-tab="explore"]').click();
  await viewer.waitForFunction(id=>Boolean(document.querySelector('#rooms .room[data-room-id="'+id+'"] .btn')),{timeout:25000},room);
  await viewer.locator('#rooms .room[data-room-id="'+room+'"] .btn').click();
  try{
   await viewer.waitForFunction(()=>{
    const v=document.querySelector('#remote');
    return v?.videoWidth>0&&v.readyState>=2&&
     v.srcObject?.getVideoTracks()?.some(t=>t.readyState==='live');
   },{timeout:30000,polling:250});
  }catch(err){
   console.log('HOST_DIAG',JSON.stringify(await host.evaluate(()=>window.__gameQA?.log.slice(-35))));
   console.log('VIEWER_DIAG',JSON.stringify(await viewer.evaluate(()=>({
    msg:document.querySelector('#watchState')?.textContent,watch:!document.querySelector('#watch')?.classList.contains('hide'),
    video:document.querySelector('#remote')?.videoWidth,ready:document.querySelector('#remote')?.readyState,
    media:document.querySelector('#remote')?.srcObject?.getTracks().map(t=>t.kind)
   }))));
   throw err;
  }
  const detail=await viewer.$eval('#remote',v=>({
   width:v.videoWidth,height:v.videoHeight,ready:v.readyState,
   tracks:v.srcObject.getTracks().map(t=>t.kind)
  }));
  assert(detail.width>0&&detail.tracks.includes('video'));
  console.log('PASS actual NADMO public viewer decodes GAME video',JSON.stringify(detail));
 }finally{
  if(host)try{await host.evaluate(()=>{const q=window.__gameQA;if(!q)return;
   if(q.socket.readyState===WebSocket.OPEN)q.socket.send(JSON.stringify({type:'leave'}));
   for(const p of q.peers.values())p.close();
   q.stream.getTracks().forEach(t=>t.stop());
  })}catch(e){}
  await browser.close();
 }
})().catch(err=>{console.error('GAME_VIEWER_E2E_FAIL',err);process.exit(1)});
