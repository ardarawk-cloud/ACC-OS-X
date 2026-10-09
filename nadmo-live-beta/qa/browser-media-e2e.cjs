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
  await readyAge(host);
  await host.locator('nav button[data-tab="studio"]').click();
  await host.locator('#preview').click();
  await waitText(host,'#camState','Kamera dan mikrofon siap');
  const hostTracks=await host.$eval('#camera',el=>el.srcObject?.getTracks().map(t=>t.kind).sort());
  assert.deepEqual(hostTracks,['audio','video']);
  console.log('PASS host fake camera and mic preview');
  await host.select('#category','Gaming');
  await host.locator('#title').fill('NADMO QA Virtual Camera Stream');
  await host.locator('#createRoom').click();
  await waitText(host,'#watchState','Bagikan kode');
  console.log('PASS host published Gaming room');
  await readyAge(viewer);
  await viewer.locator('nav button[data-tab="explore"]').click();
  await viewer.waitForFunction(()=>Array.from(document.querySelectorAll('#rooms .room b')).some(x=>x.textContent==='NADMO QA Virtual Camera Stream'),{timeout:30000});
  await viewer.locator('#rooms .room .btn').click();
  await waitText(viewer,'#watchState','Video tersambung',35000);
  const evidence=await viewer.$eval('#remote',el=>({
    width:el.videoWidth,height:el.videoHeight,readyState:el.readyState,
    tracks:el.srcObject?.getTracks().map(t=>({kind:t.kind,enabled:t.enabled,readyState:t.readyState}))
  }));
  assert.ok(evidence.width>0&&evidence.height>0,'Remote playback has no video frame');
  assert.ok(evidence.tracks.some(t=>t.kind==='video'&&t.readyState==='live'),'No active remote video track');
  assert.ok(evidence.tracks.some(t=>t.kind==='audio'),'No remote audio track');
  console.log('PASS actual WebRTC video and audio media received',JSON.stringify(evidence));
  await host.locator('#afkToggle').click();
  await waitText(host,'#watchState','AFK aktif',15000);
  await viewer.waitForFunction(()=>document.querySelector('#remote')?.srcObject?.getVideoTracks()?.[0]?.readyState==='live',{timeout:15000});
  console.log('PASS host AFK media switch without closing viewer stream');
  await host.locator('#leave').click();
  console.log('PASS host can end stream cleanly');
  assert.equal(faults.length,0,'Browser uncaught exceptions: '+faults.join('; '));
  console.log('ALL HEADLESS WEBRTC BROADCAST TESTS PASSED');
 }finally{await browser.close();}
}
main().catch(e=>{console.error('E2E_FAIL '+(e.stack||e));process.exitCode=1});
