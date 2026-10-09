'use strict';
const assert=require('node:assert/strict');
const puppeteer=require('puppeteer-core');
const url='https://nadmo-live-beta-20261009.ardarawk.workers.dev/app/';
async function main(){
 const browser=await puppeteer.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,
  args:['--no-sandbox','--disable-dev-shm-usage','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--autoplay-policy=no-user-gesture-required']});
 let host,viewer;
 try{
  const h=await browser.createBrowserContext(),v=await browser.createBrowserContext();
  host=await h.newPage();viewer=await v.newPage();
  for(const page of [host,viewer]){
   await page.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
   await page.evaluateOnNewDocument(()=>{
    window.__safetyEvents=[];
    const BaseSocket=window.WebSocket;
    window.WebSocket=class extends BaseSocket{
     constructor(...args){super(...args);this.addEventListener('message',e=>{try{window.__safetyEvents.push(JSON.parse(e.data))}catch{}})}
    };
   });
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
   await page.$eval('nav button[data-tab="settings"]',el=>el.click());
   await page.$eval('#adult',el=>{if(!el.checked)el.click()});
  }
  await host.$eval('nav button[data-tab="studio"]',el=>el.click());
  await host.$eval('#preview',el=>el.click());
  await host.waitForFunction(()=>document.querySelector('#camState')?.textContent.includes('Kamera dan mikrofon siap'),{timeout:20000});
  await host.$eval('#createRoom',el=>el.click());
  await host.waitForFunction(()=>document.querySelector('#liveState')?.textContent.includes('Bagikan kode room'),{timeout:20000});
  const roomId=await host.$eval('#liveState',el=>el.textContent.match(/[a-f0-9]{12}/i)?.[0]);
  assert.ok(roomId);
  assert.equal(await host.$eval('#hostModeration',x=>x.hidden),false);
  assert.equal(await host.$eval('#reportLive',x=>x.hidden),true);
  await viewer.$eval('nav button[data-tab="explore"]',el=>el.click());
  await viewer.$eval('#refresh',el=>el.click());
  const selector='#rooms .room[data-room-id="'+roomId+'"] .btn';
  await viewer.waitForFunction(id=>!!document.querySelector('#rooms .room[data-room-id="'+id+'"] .btn'),{timeout:20000},roomId);
  await viewer.$eval(selector,el=>el.click());
  await viewer.waitForFunction(()=>document.querySelector('#reportLive')?.hidden===false,{timeout:15000});
  assert.equal(await viewer.$eval('#hostModeration',x=>x.hidden),true);
  await viewer.$eval('#reportLive',el=>el.click());
  await viewer.$eval('#reportReason',el=>{el.value='harassment';el.dispatchEvent(new Event('change',{bubbles:true}))});
  await viewer.$eval('#reportDetails',el=>{el.value='QA test report';el.dispatchEvent(new Event('input',{bubbles:true}))});
  await viewer.$eval('#submitLiveReport',el=>el.click());
  await viewer.waitForFunction(()=>document.querySelector('#reportStatus')?.textContent.includes('diterima'),{timeout:15000});
  console.log('PASS mobile viewer opened report panel and received genuine backend report ID');
  await host.$eval('#hostModeration',el=>el.click());
  await host.waitForFunction(()=>document.querySelectorAll('#moderationPanel .safety-guest').length>=1,{timeout:15000});
  await host.$eval('#moderationPanel .safety-guest button',el=>el.click());
  await host.waitForFunction(()=>window.__safetyEvents.some(m=>m.type==='moderation-result'&&m.action==='mute'),{timeout:10000});
  await viewer.$eval('#message',x=>{x.value='QA muted check'});
  await viewer.$eval('#send',el=>el.click());
  await viewer.waitForFunction(()=>window.__safetyEvents.some(m=>m.type==='error'&&m.message?.includes('dibisukan')),{timeout:10000});
  console.log('PASS host mute from phone UI prevents viewer chat');
  await host.waitForFunction(()=>[...document.querySelectorAll('#moderationPanel button')].some(x=>x.textContent==='UNMUTE'),{timeout:10000});
  await host.$eval('#moderationPanel button',x=>x.click());
  await host.waitForFunction(()=>window.__safetyEvents.some(m=>m.type==='moderation-result'&&m.action==='unmute'),{timeout:10000});
  await viewer.$eval('#message',x=>{x.value='QA unmuted check'});
  await viewer.$eval('#send',el=>el.click());
  await host.waitForFunction(()=>window.__safetyEvents.some(m=>m.type==='chat'&&m.text==='QA unmuted check'),{timeout:10000});
  console.log('PASS host unmute restores viewer chat');
  await host.$eval('#moderationPanel .safety-guest button:nth-of-type(2)',x=>x.click());
  await viewer.waitForFunction(()=>window.__safetyEvents.some(m=>m.type==='moderated'&&m.action==='kick'),{timeout:10000});
  console.log('PASS host kick command from mobile UI reaches viewer');
  console.log('ALL NADMO ROOM SAFETY UI E2E TESTS PASSED');
 }finally{
  try{if(host)await host.$eval('#leave',el=>el.click())}catch{}
  await browser.close();
 }
}
main().catch(e=>{console.error('SAFETY_UI_QA_FAIL',e.stack||e);process.exitCode=1});
