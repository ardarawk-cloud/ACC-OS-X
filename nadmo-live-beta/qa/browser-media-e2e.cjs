'use strict';
const assert=require('node:assert/strict');
const puppeteer=require('puppeteer-core');
const url='https://nadmo-live-beta-20261009.ardarawk.workers.dev/app/';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function waitText(page,selector,text,timeout=22000){
 await page.waitForFunction((sel,phrase)=>document.querySelector(sel)?.textContent?.includes(phrase),{timeout},selector,text);
}
async function readyAge(page){
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
 await page.locator('nav button[data-tab="settings"]').click();
 await page.locator('#adult').click();
 assert.equal(await page.$eval('#adult',el=>el.checked),true);
}
async function main(){
 const chrome=process.env.CHROME_BIN||'/usr/bin/google-chrome';
 const streamTitle='NADMO QA Stream '+(process.env.GITHUB_RUN_ID||Date.now());
 const browser=await puppeteer.launch({
  executablePath:chrome,headless:true,
  args:['--no-sandbox','--disable-dev-shm-usage','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--autoplay-policy=no-user-gesture-required','--enable-logging=stderr']
 });
 try{
  const a=await browser.createBrowserContext(),b=await browser.createBrowserContext();
  const host=await a.newPage(),viewer=await b.newPage();
  const faults=[];
  for(const [page,name] of [[host,'HOST'],[viewer,'VIEWER']]){
   page.on('pageerror',err=>{faults.push(name+': '+String(err));console.log('PAGE_ERROR',name,String(err))});
   page.on('console',msg=>{if(msg.type()==='error')console.log('CONSOLE',name,msg.text().slice(0,160))});
  }
  for(const page of [host,viewer]){
   await page.evaluateOnNewDocument(()=>{
    window.__nadmoQALog=[];
    window.__nadmoPCs=[];
    window.__nadmoSockets=[];
    const RealWS=window.WebSocket;
    class QASocket extends RealWS{
     constructor(...args){
      super(...args);
      window.__nadmoSockets.push(this);
      this.addEventListener('message',e=>{try{const m=JSON.parse(e.data);window.__nadmoQALog.push('RECV '+m.type+' '+(m.data?.description?.type||''))}catch(x){}});
      this.addEventListener('close',e=>window.__nadmoQALog.push('CLOSE '+e.code));
     }
     send(str){
      try{const m=JSON.parse(str);window.__nadmoQALog.push('SEND '+m.type+' '+(m.data?.description?.type||''))}catch(e){}
      return super.send(str);
     }
    }
    window.WebSocket=QASocket;
    const NativePC=window.RTCPeerConnection;
    class QAPeer extends NativePC{constructor(...args){super(...args);window.__nadmoPCs.push(this)}}
    window.RTCPeerConnection=QAPeer;
   });
  }
  await readyAge(host);
  await host.locator('nav button[data-tab="studio"]').click();
  await host.locator('#preview').click();
  await waitText(host,'#camState','Kamera dan mikrofon siap');
  const hostTracks=await host.$eval('#camera',el=>el.srcObject?.getTracks().map(t=>t.kind).sort());
  assert.deepEqual(hostTracks,['audio','video']);
  console.log('PASS host fake camera and mic preview');
  await host.select('#category','Gaming');
  await host.locator('#title').fill(streamTitle);
  await host.locator('#createRoom').click();
  await waitText(host,'#watchState','Bagikan kode');
  const roomId=await host.$eval('#watchState',el=>el.textContent.match(/[a-f0-9]{12}/i)?.[0]);
  assert.ok(roomId);
  const roomButton='#rooms .room[data-room-id="'+roomId+'"] .btn';
  console.log('PASS host published Gaming room '+roomId);
  await readyAge(viewer);
  await viewer.locator('nav button[data-tab="explore"]').click();
  await viewer.waitForFunction(id=>Boolean(document.querySelector('#rooms .room[data-room-id="'+id+'"] .btn')),{timeout:30000},roomId);
  await delay(1000);
  const beforeClick=await viewer.evaluate(id=>({adult:document.querySelector('#adult')?.checked,visible:!document.querySelector('#explore')?.classList.contains('hide'),cards:document.querySelectorAll('#rooms .room').length,target:!!document.querySelector('#rooms .room[data-room-id="'+id+'"] .btn')}),roomId);
  console.log('VIEWER_BEFORE_CLICK '+JSON.stringify(beforeClick));
  const coords=await viewer.$eval(roomButton,el=>{const r=el.getBoundingClientRect();const center=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return{y:r.y,height:r.height,hitTag:center?.tagName,hitText:center?.textContent?.slice(0,45)}});
  console.log('VIEWER_WATCH_BUTTON_GEOMETRY '+JSON.stringify(coords));
  await viewer.$eval(roomButton,el=>el.scrollIntoView({block:'center',behavior:'instant'}));
  await viewer.locator(roomButton).click();
  await delay(1000);
  console.log('VIEWER_AFTER_CLICK '+JSON.stringify(await viewer.evaluate(()=>({adult:document.querySelector('#adult')?.checked,watch:!document.querySelector('#watch')?.classList.contains('hide'),log:window.__nadmoQALog?.slice(-20)}))));
  try{await waitText(viewer,'#watchState','Video tersambung',35000)}
  catch(err){
   for(const [p,name] of [[host,'HOST'],[viewer,'VIEWER']]){
    const data=await p.evaluate(()=>({
     appStatus:document.querySelector('#watchState')?.textContent,adult:document.querySelector('#adult')?.checked,view:!document.querySelector('#watch')?.classList.contains('hide'),cards:document.querySelectorAll('#rooms .room').length,
     socket:window.__nadmoQALog?.slice(-40),
     peers:window.__nadmoPCs?.map(x=>({ice:x.iceConnectionState,connection:x.connectionState,signaling:x.signalingState,
      gathering:x.iceGatheringState,localSDP:x.localDescription?.type,remoteSDP:x.remoteDescription?.type,
      senders:x.getSenders().map(x=>x.track?.kind),receivers:x.getReceivers().map(x=>x.track?.kind)})),
     remote:document.querySelector('#remote')?.srcObject?.getTracks().map(x=>({kind:x.kind,state:x.readyState}))||[]
    }));
    console.log('DIAGNOSTIC '+name+' '+JSON.stringify(data));
   }
   throw err;
  }
  await viewer.waitForFunction(()=>{const v=document.querySelector('#remote');return v?.videoWidth>0&&v?.readyState>=2},{timeout:20000});
  const evidence=await viewer.$eval('#remote',el=>({
    width:el.videoWidth,height:el.videoHeight,readyState:el.readyState,
    tracks:el.srcObject?.getTracks().map(t=>({kind:t.kind,enabled:t.enabled,readyState:t.readyState}))
  }));
  assert.ok(evidence.width>0&&evidence.height>0,'Remote playback has no video frame');
  assert.ok(evidence.tracks.some(t=>t.kind==='video'&&t.readyState==='live'),'No active remote video track');
  assert.ok(evidence.tracks.some(t=>t.kind==='audio'),'No remote audio track');
  console.log('PASS actual WebRTC video and audio media received',JSON.stringify(evidence));
  // Simulated Android foreground return: refresh the host camera while room/viewer stay open.
  const firstHostVideo=await host.$eval('#remote',el=>el.srcObject?.getVideoTracks()[0]?.id);
  const firstViewerStream=await viewer.$eval('#remote',el=>el.srcObject?.id);
  await host.evaluate(()=>{
    Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'hidden'});
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'visible'});
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await host.waitForFunction(old=>{
    const track=document.querySelector('#remote')?.srcObject?.getVideoTracks()[0];
    return track&&track.readyState==='live'&&track.id!==old;
  },{timeout:18000},firstHostVideo);
  await viewer.waitForFunction(old=>{
    const el=document.querySelector('#remote');
    return el?.srcObject?.id!==old&&el?.srcObject?.getVideoTracks()[0]?.readyState==='live'&&el.videoWidth>0;
  },{timeout:25000},firstViewerStream);
  console.log('PASS host background return restarts camera while same viewer receives refreshed video');
  const viewerStreamAfterHostResume=await viewer.$eval('#remote',el=>el.srcObject?.id);
  await viewer.evaluate(()=>{
    Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'hidden'});
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'visible'});
    document.dispatchEvent(new Event('visibilitychange'));
  });
  console.log('VIEWER_RESUME_REQUEST '+JSON.stringify(await viewer.evaluate(()=>({visible:document.visibilityState,state:document.querySelector('#watchState')?.textContent,events:window.__nadmoQALog?.slice(-12)}))));
  await delay(1300);
  console.log('HOST_AFTER_VIEWER_RESUME '+JSON.stringify(await host.evaluate(()=>({events:window.__nadmoQALog?.slice(-18),state:document.querySelector('#watchState')?.textContent}))));
  try{
   await viewer.waitForFunction(old=>{
     const el=document.querySelector('#remote');
     return el?.srcObject?.id!==old&&el?.srcObject?.getVideoTracks()[0]?.readyState==='live'&&el.videoWidth>0;
   },{timeout:20000},viewerStreamAfterHostResume);
  }catch(e){
   for(const [page,name] of [[host,'HOST'],[viewer,'VIEWER']]){
    console.log('FOREGROUND_DIAGNOSTIC '+name+' '+JSON.stringify(await page.evaluate(()=>({
     status:document.querySelector('#watchState')?.textContent,
     events:window.__nadmoQALog?.slice(-35),
     peers:window.__nadmoPCs?.map(p=>({state:p.connectionState,ice:p.iceConnectionState,signaling:p.signalingState,closed:p.signalingState==='closed'})),
     stream:document.querySelector('#remote')?.srcObject?.id,
     video:document.querySelector('#remote')?.videoWidth
    }))));
   }
   throw e;
  }
  console.log('PASS returning viewer requests fresh video without leaving room');
  // The user can also force recovery in-place if Android did not emit a resume event.
  const viewerManualBefore=await viewer.$eval('#remote',el=>el.srcObject?.id);
  await viewer.locator('#refreshVideo').click();
  await viewer.waitForFunction(old=>{
    const el=document.querySelector('#remote');
    return el?.srcObject?.id!==old&&el?.srcObject?.getVideoTracks()[0]?.readyState==='live'&&el.videoWidth>0;
  },{timeout:25000},viewerManualBefore);
  console.log('PASS manual refresh-video button restores viewer media without rejoining');
  await host.locator('#afkToggle').click();
  await waitText(host,'#watchState','AFK aktif',15000);
  await viewer.waitForFunction(()=>document.querySelector('#remote')?.srcObject?.getVideoTracks()?.[0]?.readyState==='live',{timeout:15000});
  console.log('PASS host AFK media switch without closing viewer stream');
  await host.evaluate(()=>window.__nadmoSockets[0].close(4001,'QA network switch'));
  await host.waitForFunction(()=>window.__nadmoQALog.some(x=>x.startsWith('SEND resume')),{timeout:25000});
  await waitText(host,'#watchState','Room berhasil dipulihkan',25000);
  await viewer.waitForFunction(()=>window.__nadmoQALog.some(x=>x.startsWith('RECV host-reconnected')),{timeout:25000});
  await waitText(viewer,'#watchState','Video tersambung',35000);
  await viewer.waitForFunction(()=>{const v=document.querySelector('#remote');return v?.videoWidth>0&&v?.readyState>=2},{timeout:20000});
  const recovered=await viewer.$eval('#remote',el=>({
    width:el.videoWidth,playing:el.readyState>=2,
    tracks:el.srcObject?.getTracks().map(t=>t.kind+':'+t.readyState)
  }));
  assert.ok(recovered.width>0&&recovered.playing,'Recovered video must actually play');
  assert.ok(recovered.tracks?.includes('audio:live')&&recovered.tracks?.includes('video:live'));
  console.log('PASS video and audio resumed after host WebSocket network switch',JSON.stringify(recovered));
  await host.$eval('#leave',el=>el.scrollIntoView({block:'center',behavior:'instant'}));
  console.log('LEAVE_BUTTON_GEOMETRY '+JSON.stringify(await host.$eval('#leave',el=>{
    const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
    return{y:r.y,height:r.height,hit:hit?.tagName,hitId:hit?.id,text:hit?.textContent?.slice(0,35)}
  })));
  await host.locator('#leave').click();
  const sentLeave=await host.evaluate(()=>window.__nadmoQALog?.some(x=>x.startsWith('SEND leave')));
  console.log('HOST_LEAVE_SENT '+JSON.stringify({sentLeave,events:await host.evaluate(()=>window.__nadmoQALog?.slice(-12))}));
  assert.ok(sentLeave,'Actual Leave command must be sent');
  try{
    await viewer.waitForFunction(()=>document.querySelector('#explore')&&!document.querySelector('#explore').classList.contains('hide'),{timeout:12000});
  }catch(e){
    const status=await viewer.evaluate(()=>({events:window.__nadmoQALog?.slice(-30),watchState:document.querySelector('#watchState')?.textContent,flash:document.querySelector('#flash')?.textContent,exploreHidden:document.querySelector('#explore')?.classList.contains('hide')}));
    console.log('ROOM_END_DIAGNOSTIC '+JSON.stringify(status));throw e;
  }
  console.log('PASS explicit end shows viewer Explore without useless reconnect attempts');
  assert.equal(faults.length,0,'Browser uncaught exceptions: '+faults.join('; '));
  console.log('ALL HEADLESS WEBRTC BROADCAST TESTS PASSED');
 }finally{await browser.close();}
}
main().catch(e=>{console.error('E2E_FAIL '+(e.stack||e));process.exitCode=1});
