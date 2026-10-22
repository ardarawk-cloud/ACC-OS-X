'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const puppeteer=require('puppeteer-core');
const html=fs.readFileSync(path.join(__dirname,'../public/app/index.html'),'utf8');
const origin='https://live.nadmo.id';
(async()=>{
 const browser=await puppeteer.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,
  args:['--no-sandbox','--disable-dev-shm-usage','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--autoplay-policy=no-user-gesture-required']});
 let host;
 try{
  const context=await browser.createBrowserContext();
  await context.overridePermissions(origin,['microphone','camera']);
  host=await context.newPage();
  await host.setViewport({width:1366,height:900});
  await host.setRequestInterception(true);
  host.on('request',r=>r.isNavigationRequest()&&r.url().startsWith(origin+'/app/')?r.respond({status:200,contentType:'text/html',body:html}):r.continue());
  const faults=[];host.on('pageerror',e=>faults.push(String(e)));
  await host.evaluateOnNewDocument(()=>{
   const NativeWS=window.WebSocket;
   window.WebSocket=class extends NativeWS {
    constructor(...args){super(...args);this.addEventListener('message',event=>{
     try{const m=JSON.parse(event.data);if(m.type==='created')window.__roomId=m.id}catch(_){}
    })}
   };
   window.__displayCalls=0;window.__cameraCalls=0;
   const gum=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
   navigator.mediaDevices.getUserMedia=c=>{if(c.video)window.__cameraCalls++;return gum(c)};
   navigator.mediaDevices.getDisplayMedia=async()=>{
    window.__displayCalls++;
    if(window.__rejectDisplay)throw new DOMException('Cancelled','NotAllowedError');
    const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;
    const ctx=canvas.getContext('2d');
    const draw=()=>{ctx.fillStyle='#145c30';ctx.fillRect(0,0,640,360);ctx.fillStyle='#fff';ctx.font='32px Arial';ctx.fillText('NADMO STUDIO QA '+Date.now(),24,100)};
    draw();window.__draw=setInterval(draw,80);
    const stream=canvas.captureStream(12);
    const audio=new AudioContext(),tone=audio.createOscillator(),out=audio.createMediaStreamDestination();
    tone.frequency.value=440;tone.connect(out);tone.start();window.__tone=audio;
    stream.addTrack(out.stream.getAudioTracks()[0]);window.__display=stream;
    return stream;
   };
  });
  await host.goto(origin+'/app/',{waitUntil:'domcontentloaded'});
  await host.$eval('#adult',e=>e.click());
  await host.$eval('nav button[data-tab="studio"]',e=>e.click());
  await host.$eval('[data-live-mode="studio"]',e=>e.click());
  assert.equal(await host.$eval('#createRoom',e=>e.disabled),false);
  await host.evaluate(()=>window.__rejectDisplay=true);
  await host.$eval('#preview',e=>e.click());
  await host.waitForFunction(()=>document.querySelector('#studioSourceStatus').textContent.includes('dibatalkan'));
  assert.equal(await host.$eval('#camera',e=>e.srcObject),null,'Cancellation must not fall back to camera');
  await host.evaluate(()=>window.__rejectDisplay=false);
  await host.$eval('#preview',e=>e.click());
  await host.waitForFunction(()=>document.querySelector('#studioSourceStatus').textContent.includes('SUMBER SIAP'));
  assert.deepEqual(await host.$eval('#camera',e=>e.srcObject.getTracks().map(t=>t.kind).sort()),['audio','video'],'Mixed source audio + mic must be one audio track');
  assert.equal(await host.evaluate(()=>window.__cameraCalls),0,'Studio must never open a camera');
  await host.$eval('#title',e=>e.value='NADMO STUDIO QA '+Date.now());
  await host.$eval('#createRoom',e=>e.click());
  await host.waitForFunction(()=>Boolean(window.__roomId),{timeout:30000});
  const room=await host.evaluate(()=>window.__roomId);assert.match(room,/^[a-f0-9]{12}$/i);
  const viewer=await (await browser.createBrowserContext()).newPage();
  await viewer.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  await viewer.setRequestInterception(true);
  viewer.on('request',r=>r.isNavigationRequest()&&r.url().startsWith(origin+'/app/')?r.respond({status:200,contentType:'text/html',body:html}):r.continue());
  viewer.on('pageerror',e=>faults.push(String(e)));
  await viewer.goto(origin+'/app/',{waitUntil:'domcontentloaded'});
  await viewer.$eval('#adult',e=>e.click());
  await viewer.waitForSelector('#rooms .room[data-room-id="'+room+'"] .btn',{timeout:30000});
  await viewer.$eval('#rooms .room[data-room-id="'+room+'"] .btn',e=>e.click());
  await viewer.waitForFunction(()=>{const v=document.querySelector('#remote');return v.videoWidth>0&&v.readyState>=2&&v.srcObject?.getAudioTracks().length===1},{timeout:30000});
  await host.evaluate(()=>window.dispatchEvent(new Event('focus')));
  assert.equal(await host.evaluate(()=>window.__cameraCalls),0,'Foreground recovery cannot replace Studio with camera');
  const media=await viewer.$eval('#remote',e=>({width:e.videoWidth,height:e.videoHeight,audio:e.srcObject.getAudioTracks().length}));
  assert(media.width>0&&media.audio===1);
  await host.evaluate(()=>{const t=window.__display.getVideoTracks()[0];t.stop();t.dispatchEvent(new Event('ended'))});
  await host.waitForFunction(()=>document.querySelector('#studioSourceStatus').textContent.includes('dihentikan'));
  assert.equal(await host.$eval('#camera',e=>e.srcObject),null);
  assert.equal(await host.evaluate(()=>window.__display.getTracks().every(t=>t.readyState==='ended')),true,'Source/mic lifecycle must clean up');
  assert.deepEqual(faults,[]);
  console.log('PASS Studio: cancelled picker, display preview, mixed audio, real WebRTC host-to-mobile viewer, source-end cleanup, no camera fallback',media);
  const radio=await (await browser.createBrowserContext()).newPage();
  await radio.setRequestInterception(true);
  radio.on('request',r=>r.isNavigationRequest()&&r.url().startsWith(origin+'/app/')?r.respond({status:200,contentType:'text/html',body:html}):r.continue());
  await radio.evaluateOnNewDocument(()=>{window.__commands=[];window.NadmoGame={postMessage:s=>window.__commands.push(JSON.parse(s))}});
  await radio.goto(origin+'/app/',{waitUntil:'domcontentloaded'});
  await radio.$eval('#adult',e=>e.click());
  await radio.$eval('nav button[data-tab="studio"]',e=>e.click());
  await radio.evaluate(()=>window.dispatchEvent(new CustomEvent('nadmo-game-status',{detail:{state:'stopped',radioMusicSupported:true,radioControlsSupported:true}})));
  await radio.$eval('[data-live-mode="radio"]',e=>e.click());
  await radio.$eval('#createRoom',e=>e.click());
  assert.equal(await radio.evaluate(()=>window.__commands.find(c=>c.type==='start')?.broadcastKind),'radio');
  await radio.evaluate(()=>window.dispatchEvent(new CustomEvent('nadmo-game-status',{detail:{state:'live',broadcastKind:'radio',room:'qa-radio',message:'RADIO LIVE',radioMusicSupported:true,radioControlsSupported:true}})));
  assert.equal(await radio.$eval('#radioShareLive',e=>e.hidden),false);
  await radio.$eval('#radioPauseLive',e=>e.click());
  assert.equal(await radio.evaluate(()=>window.__commands.at(-1).type),'radio-pause');
  await radio.evaluate(()=>window.dispatchEvent(new CustomEvent('nadmo-game-status',{detail:{state:'paused',broadcastKind:'radio',room:'qa-radio',radioMusicSupported:true,radioControlsSupported:true}})));
  await radio.$eval('#radioPauseLive',e=>e.click());
  assert.equal(await radio.evaluate(()=>window.__commands.at(-1).type),'radio-resume');
  assert.equal(await radio.$eval('[data-live-mode="gaming"]',e=>e.disabled),true);
  console.log('PASS RADIO UI bridge: start, status, share, pause/resume, active mode isolation');
 }finally{
  if(host)await host.evaluate(()=>{try{const t=window.__display?.getVideoTracks()[0];if(t){t.stop();t.dispatchEvent(new Event('ended'))}clearInterval(window.__draw);window.__tone?.close()}catch(_){}}).catch(()=>{});
  await browser.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1});
