'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const puppeteer=require('puppeteer-core');
const html=fs.readFileSync(path.join(__dirname,'../public/app/index.html'),'utf8');
const worker=fs.readFileSync(path.join(__dirname,'../worker.mjs'),'utf8');
for(const script of [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]){
 if(script[1].trim())new vm.Script(script[1],{filename:'NADMO-live-radio-inline.js'});
}
assert(worker.includes("url.pathname==='/api/radio/status'"),'Radio station has server-backed endpoint');
assert(worker.includes('origin===origin')||worker.includes('u.origin===origin'),'Stream cannot redirect to arbitrary host');
assert(html.includes('data-tab="radio"'),'Existing RADIO channel navigation preserved');
assert(html.includes('id="radioStream"'),'Only rights-cleared, user-initiated audio element exists');
assert(!/audio\.captureStream\(|youtube.*MediaProjection/i.test(html),'No rebroadcast capture of commercial media providers');

(async()=>{
 const browser=await puppeteer.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
  headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage();
  const errors=[];let mode='offline',apiCalls=0;
  page.on('pageerror',e=>errors.push(String(e)));
  await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:1});
  await page.setRequestInterception(true);
  page.on('request',async req=>{
   if(req.isNavigationRequest()){
    return req.respond({status:200,contentType:'text/html',body:html});
   }
   if(req.url().includes('/api/radio/status')){
    apiCalls++;
    if(mode==='outage')return req.respond({status:503,contentType:'application/json',
      headers:{'access-control-allow-origin':'*'},body:'{"error":"temporary"}'});
    const status=mode==='online'?
     {configured:true,online:true,state:'ON_AIR',station:'NADMO RADIO ONE',
      streamUrl:'https://nadmo-radio-qc.test/listen/nadmo_radio/radio.mp3',
      listeners:14,djLive:false,nowPlaying:{title:'Live Track',artist:'Independent Artist'}}:
     {configured:false,online:false,state:'NOT_CONFIGURED',station:'NADMO RADIO',streamUrl:null};
    return req.respond({status:200,contentType:'application/json',
      headers:{'access-control-allow-origin':'*'},body:JSON.stringify(status)});
   }
   return req.respond({status:404,contentType:'text/plain',body:'Not Found'});
  });
  await page.goto('http://nadmo-radio-qc.test/app/',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#radioListen');
  await page.evaluate(()=>document.querySelector('#home [data-tab="radio"]').click());
  await page.waitForFunction(()=>document.querySelector('#radioStatusText').textContent.includes('BELUM DIKONFIGURASI'),{timeout:14000});
  const offline=await page.evaluate(()=>{
   const r=document.querySelector('#radioStage').getBoundingClientRect();
   return{height:r.height,width:r.width,screen:innerHeight,
     label:document.querySelector('#radioOnAir').textContent,
     disabled:document.querySelector('#radioListen').disabled,
     mini:document.querySelector('#radioMiniDock').hidden,
     cameraPresent:!!document.querySelector('#remote'),
     gamePresent:!!document.querySelector('#gameSetup'),
     audioPaused:document.querySelector('#radioStream').paused};
  });
  assert.ok(offline.height>offline.screen*.64,'RADIO must occupy phone CAMERA-sized portrait stage, not GAME card');
  assert.ok(offline.width>=320,'Radio stage should fill phone width');
  assert.equal(offline.disabled,true,'Cannot offer fake 24/7 stream before radio backend configured');
  assert.equal(offline.mini,true);
  assert.equal(offline.audioPaused,true,'Do not autoplay without viewer request');
  assert.equal(offline.cameraPresent,true);
  assert.equal(offline.gamePresent,true);
  mode='online';
  await page.click('#radioRefresh');
  await page.waitForFunction(()=>!document.querySelector('#radioListen').disabled,{timeout:10000});
  const online=await page.evaluate(()=>({
   title:document.querySelector('#radioTrackName').textContent,
   artist:document.querySelector('#radioTrackArtist').textContent,
   count:document.querySelector('#radioListenerCount').textContent,
   onAir:document.querySelector('#radioOnAir').textContent
  }));
  assert.equal(online.title,'Live Track');assert.equal(online.artist,'Independent Artist');
  assert.ok(online.count.includes('14'));assert.equal(online.onAir,'● ON AIR');
  await page.evaluate(()=>{
   const audio=document.querySelector('#radioStream');
   window.__radioPaused=true;
   Object.defineProperty(audio,'paused',{configurable:true,get:()=>window.__radioPaused});
   Object.defineProperty(audio,'readyState',{configurable:true,get:()=>3});
   audio.play=async()=>{window.__radioPaused=false;audio.dispatchEvent(new Event('play'))};
   audio.pause=()=>{window.__radioPaused=true;audio.dispatchEvent(new Event('pause'))};
  });
  await page.click('#radioListen');
  await page.waitForFunction(()=>!document.querySelector('#radioMiniDock').hidden,{timeout:6000});
  await page.evaluate(()=>document.querySelector('nav [data-tab="explore"]').click());
  assert.equal(await page.$eval('#radioMiniDock',el=>el.hidden),false,'Player persists across app tabs');
  mode='outage';
  await page.evaluate(()=>document.querySelector('#radioRefresh').click());
  await page.waitForFunction(()=>document.querySelector('#radioStatusText').textContent.includes('sementara'),{timeout:9000});
  assert.equal(await page.$eval('#radioMiniDock',el=>el.hidden),false,
   'Temporary metadata failure must not kill active radio audio');
  await page.click('#radioMiniPause');
  assert.equal(await page.$eval('#radioMiniDock',el=>el.hidden),true,'Listener can stop the radio from any tab');
  assert.deepEqual(errors,[],'No page JavaScript errors: '+errors.join('\n'));
  console.log('PASS NADMO RADIO camera-size mobile player and 24/7 server integration '+JSON.stringify({offline,online,apiCalls}));
 }finally{await browser.close();}
})().catch(e=>{console.error('RADIO_MOBILE_FIRST_FAIL',e);process.exitCode=1});
