'use strict';
// Long display names must not overflow either the LIVE card or the on-air title.
const assert=require('node:assert/strict');
const puppeteer=require('puppeteer-core');
const {WebSocket}=require('ws');
const base='https://nadmo-live-beta-20261009.ardarawk.workers.dev';
const fullName='FACECOCKTAIL-NADMO-LIVE-STREAMER-VERY-LONG-USERNAME';
function connectHost(){
 return new Promise((resolve,reject)=>{
  const ws=new WebSocket(base.replace('https:','wss:')+'/ws',{headers:{Origin:base},handshakeTimeout:12000});
  ws.once('open',()=>resolve(ws));ws.once('error',reject);
 });
}
function waitEvent(ws,type,timeout=15000){
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{end();reject(Error('Timeout '+type))},timeout);
  const got=raw=>{let obj;try{obj=JSON.parse(String(raw))}catch{return}
   if(obj.type===type){end();resolve(obj)}
  };
  const closed=()=>{end();reject(Error('Socket closed before '+type))};
  function end(){clearTimeout(timer);ws.off('message',got);ws.off('close',closed)}
  ws.on('message',got);ws.on('close',closed);
 });
}
async function main(){
 let host=null,browser=null;
 try{
  host=await connectHost();
  const started=waitEvent(host,'created');
  host.send(JSON.stringify({type:'create',mode:'public',category:'Social',hostName:fullName,title:'NADMO LIVE'}));
  const {id:roomId}=await started;assert.ok(roomId);
  browser=await puppeteer.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  for(const viewport of [{name:'small-phone',width:320,height:700,isMobile:true},{name:'phone',width:390,height:844,isMobile:true},{name:'desktop',width:1280,height:900,isMobile:false}]){
   const page=await browser.newPage();
   const faults=[];page.on('pageerror',e=>faults.push(String(e)));
   await page.setViewport({width:viewport.width,height:viewport.height,deviceScaleFactor:1,isMobile:viewport.isMobile,hasTouch:viewport.isMobile});
   await page.goto(base+'/app/',{waitUntil:'domcontentloaded',timeout:30000});
   await page.$eval('nav [data-tab="explore"]',e=>e.click());
   await page.$eval('#refresh',e=>e.click());
   await page.waitForFunction(id=>!!document.querySelector('#rooms .room[data-room-id="'+id+'"]'),{timeout:15000},roomId);
   const card=await page.evaluate(id=>{
    const root=document.querySelector('#rooms .room[data-room-id="'+id+'"]');
    const main=root.querySelector('.room-main'),heading=main.querySelector('b'),photo=root.querySelector('.room-art');
    const bounds=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
    return {card:bounds(root),main:bounds(main),heading:bounds(heading),photo:bounds(photo),label:heading.textContent,title:heading.title,
      font:getComputedStyle(heading).fontSize,lines:getComputedStyle(heading).webkitLineClamp,classes:heading.className,
      overflow:document.documentElement.scrollWidth>window.innerWidth+2};
   },roomId);
   console.log('LONG_NAME_CARD_'+viewport.name+' '+JSON.stringify(card));
   assert.equal(card.label,fullName,'Streamer label must not change');
   assert.equal(card.title,fullName,'Full name should remain accessible on long press/hover');
   assert.ok(card.classes.includes('name-very-long'),'Very long names must use smaller font');
   assert.equal(card.lines,'2','Room name should allow at most two lines');
   assert.ok(card.heading.height<=33,'Long room name should not create a large billboard');
   assert.ok(card.heading.right<=card.main.right+1,'Name escaped from its content column');
   assert.ok(card.heading.left>=card.photo.right-1,'Name overlaps art');
   assert.ok(card.main.right<=card.card.right+1,'Room main escaped card');
   assert.equal(card.overflow,false,'LIVE card triggers horizontal overflow');
   await page.$eval('nav [data-tab="settings"]',e=>e.click());
   await page.$eval('#adult',e=>{if(!e.checked)e.click()});
   await page.$eval('nav [data-tab="explore"]',e=>e.click());
   const selector='#rooms .room[data-room-id="'+roomId+'"] .btn';
   await page.$eval(selector,e=>e.click());
   await page.waitForFunction(()=>document.querySelector('#watchTitle')?.textContent.includes('FACECOCKTAIL')&&!document.querySelector('#watch').classList.contains('hide'),{timeout:15000});
   const live=await page.evaluate(()=>{
    const name=document.querySelector('#watchTitle'),left=document.querySelector('#watch .page-top>div'),back=document.querySelector('#leave');
    const a=name.getBoundingClientRect(),b=left.getBoundingClientRect(),c=back.getBoundingClientRect();
    return {text:name.textContent,title:name.title,className:name.className,
      width:a.width,right:a.right,parentRight:b.right,backLeft:c.left,scrollWidth:name.scrollWidth,clientWidth:name.clientWidth,
      screenWidth:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth+2};
   });
   console.log('LONG_NAME_WATCH_'+viewport.name+' '+JSON.stringify(live));
   assert.equal(live.text,fullName);
   assert.equal(live.title,fullName);
   assert.ok(live.className.includes('name-very-long'));
   assert.ok(live.right<=live.parentRight+2,'Watch title escapes available text area');
   assert.equal(live.overflow,false,'On-air view triggers horizontal overflow');
   assert.deepEqual(faults,[],'JavaScript page errors');
   await page.close();
   console.log('PASS long streamer display name, no overflow: '+viewport.name);
  }
  console.log('ALL LONG STREAMER NAME LAYOUT TESTS PASSED');
 }finally{
  if(browser)await browser.close();
  if(host){try{host.send(JSON.stringify({type:'leave'}))}catch{}try{host.terminate()}catch{}}
 }
}
main().catch(error=>{console.error('STREAMER_NAME_QA_FAILED',error.stack||error);process.exitCode=1});
