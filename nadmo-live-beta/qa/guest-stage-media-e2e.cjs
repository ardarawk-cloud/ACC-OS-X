'use strict';
// Guest camera/voice stage E2E through real WebRTC and Cloudflare Durable Object.
const assert=require('node:assert/strict');
const puppeteer=require('puppeteer-core');
const base='https://nadmo-live-beta-20261009.ardarawk.workers.dev/app/';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function startPage(browser,label){
 const context=await browser.createBrowserContext();
 const page=await context.newPage();
 await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true,hasTouch:true});
 await page.evaluateOnNewDocument(()=>{
  window.__stageQA=[];
  const WS=window.WebSocket;
  window.WebSocket=class extends WS{
   constructor(...args){super(...args);this.addEventListener('message',e=>{try{const m=JSON.parse(e.data);window.__stageQA.push({direction:'received',type:m.type,action:m.action||'',message:m.message||''})}catch{}})}
   send(value){try{const m=JSON.parse(value);window.__stageQA.push({direction:'sent',type:m.type,mode:m.mode||''})}catch{}return super.send(value)}
  };
 });
 page.on('pageerror',error=>console.error('PAGEERROR '+label+' '+String(error)));
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
 await page.$eval('nav button[data-tab="settings"]',el=>el.click());
 await page.$eval('#adult',el=>{if(!el.checked)el.click()});
 return {context,page};
}
async function main(){
 const browser=await puppeteer.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,
  args:['--no-sandbox','--disable-dev-shm-usage','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--autoplay-policy=no-user-gesture-required']});
 let host,viewer,guest;
 try{
  host=await startPage(browser,'host');
  viewer=await startPage(browser,'viewer');
  guest=await startPage(browser,'guest');
  await host.page.$eval('nav button[data-tab="studio"]',el=>el.click());
  await host.page.$eval('#preview',el=>el.click());
  await host.page.waitForFunction(()=>document.querySelector('#camState')?.textContent.includes('Kamera dan mikrofon siap'),{timeout:18000});
  await host.page.$eval('#createRoom',el=>el.click());
  await host.page.waitForFunction(()=>document.querySelector('#liveState')?.textContent.includes('Bagikan kode room'),{timeout:15000});
  const roomId=await host.page.$eval('#liveState',e=>e.textContent.match(/[a-f0-9]{12}/i)?.[0]);
  assert.ok(roomId);
  for(const item of [viewer,guest]){
   await item.page.$eval('nav button[data-tab="explore"]',el=>el.click());
   await item.page.$eval('#refresh',el=>el.click());
   const selector='#rooms .room[data-room-id="'+roomId+'"] .btn';
   await item.page.waitForFunction(id=>!!document.querySelector('#rooms .room[data-room-id="'+id+'"] .btn'),{timeout:20000},roomId);
   await item.page.$eval(selector,el=>el.click());
   await item.page.waitForFunction(()=>!document.querySelector('#watch').classList.contains('hide'),{timeout:15000});
  }
  assert.equal(await guest.page.$eval('#joinGuestCamera',el=>el.hidden),false);
  await guest.page.$eval('#joinGuestCamera',el=>el.click());
  await host.page.waitForFunction(()=>window.__stageQA.some(x=>x.type==='guest-requested'),{timeout:12000});
  await host.page.$eval('#hostGuestRequests',el=>el.click());
  await host.page.waitForFunction(()=>document.querySelectorAll('#guestRequestPanel .guest-invite').length===1,{timeout:8000});
  await host.page.$eval('#guestRequestPanel .guest-invite button',el=>el.click());
  await guest.page.waitForFunction(()=>window.__stageQA.some(x=>x.type==='guest-approved'),{timeout:12000});
  await guest.page.waitForFunction(()=>window.__stageQA.some(x=>x.direction==='sent'&&x.type==='guest-ready'),{timeout:20000});
  await host.page.waitForFunction(()=>window.__stageQA.some(x=>x.type==='guest-ready'),{timeout:12000});
  await host.page.waitForFunction(()=>{
   const elem=document.querySelector('#guestStageGrid video');
   return !!elem?.srcObject?.getVideoTracks()?.some(track=>track.readyState==='live');
  },{timeout:25000});
  const guestCapture=await guest.page.evaluate(()=>({
   guestStageCount:document.querySelectorAll('#guestStageGrid .stage-guest-tile').length,
   ownVideo:document.querySelector('#guestStageGrid video')?.srcObject?.getVideoTracks().length||0,
   ownAudio:document.querySelector('#guestStageGrid video')?.srcObject?.getAudioTracks().length||0
  }));
  assert.equal(guestCapture.ownVideo,1);
  assert.equal(guestCapture.ownAudio,1);
  console.log('PASS host approved guest camera; guest microphone/video tracks captured; host receives guest media');
  await viewer.page.waitForFunction(()=>{
   const elem=document.querySelector('#guestStageGrid video');
   return !!elem?.srcObject?.getVideoTracks()?.some(track=>track.readyState==='live');
  },{timeout:35000});
  console.log('PASS regular viewer receives guest camera through host WebRTC relay');
  await guest.page.$eval('#guestMicToggle',el=>el.click());
  await guest.page.waitForFunction(()=>document.querySelector('#guestMicToggle').textContent.includes('OFF'),{timeout:8000});
  await host.page.waitForFunction(()=>window.__stageQA.some(x=>x.type==='stage-updated'&&x.guests?.[0]?.mic===false),{timeout:8000}).catch(async()=>{
   await host.page.waitForFunction(()=>[...document.querySelectorAll('#guestStageGrid .stage-tag')].some(e=>e.textContent.includes('MIC OFF')),{timeout:7000});
  });
  const off=await guest.page.evaluate(()=>document.querySelector('#guestStageGrid video')?.srcObject?.getAudioTracks()[0]?.enabled);
  assert.equal(off,false);
  await guest.page.$eval('#guestMicToggle',el=>el.click());
  assert.equal(await guest.page.evaluate(()=>document.querySelector('#guestStageGrid video')?.srcObject?.getAudioTracks()[0]?.enabled),true);
  await guest.page.$eval('#guestCameraToggle',el=>el.click());
  const hidden=await guest.page.evaluate(()=>document.querySelector('#guestStageGrid video')?.srcObject?.getVideoTracks()[0]?.enabled);
  assert.equal(hidden,false);
  await guest.page.$eval('#guestCameraToggle',el=>el.click());
  assert.equal(await guest.page.evaluate(()=>document.querySelector('#guestStageGrid video')?.srcObject?.getVideoTracks()[0]?.enabled),true);
  console.log('PASS guest mic OFF/ON and camera OFF/ON toggles change real media track.enabled');
  await guest.page.$eval('#guestLeaveStage',el=>el.click());
  await guest.page.waitForFunction(()=>window.__stageQA.some(x=>x.type==='guest-exited'),{timeout:15000});
  await host.page.waitForFunction(()=>document.querySelectorAll('#guestStageGrid .stage-guest-tile').length===0,{timeout:15000});
  console.log('PASS guest descends stage and media tiles disappear for host');
  console.log('ALL NADMO GUEST MEDIA WEBRTC E2E TESTS PASSED');
 }finally{
  if(host)try{await host.page.$eval('#leave',el=>el.click())}catch{}
  for(const item of [guest,viewer,host])if(item)try{await item.context.close()}catch{}
  await browser.close();
 }
}
main().catch(e=>{console.error('GUEST_STAGE_E2E_FAIL',e.stack||e);process.exitCode=1});
