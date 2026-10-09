'use strict';
// Verify LIVE feed takes priority over decorative headers on Android and desktop.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const puppeteer=require('puppeteer-core');
const url='https://nadmo-live-beta-20261009.ardarawk.workers.dev/app/';
async function main(){
 const browser=await puppeteer.launch({
  executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,
  args:['--no-sandbox','--disable-dev-shm-usage']
 });
 try{
  for(const device of [
   {name:'mobile',width:390,height:844,isMobile:true,hasTouch:true},
   {name:'desktop',width:1280,height:900,isMobile:false,hasTouch:false}
  ]){
   const page=await browser.newPage();
   await page.setViewport({width:device.width,height:device.height,deviceScaleFactor:1,isMobile:device.isMobile,hasTouch:device.hasTouch});
   const faults=[];page.on('pageerror',error=>faults.push(String(error)));
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
   await page.$eval('nav [data-tab="explore"]',el=>el.click());
   await page.waitForFunction(()=>!document.querySelector('#explore')?.classList.contains('hide'),{timeout:10000});
   await page.waitForFunction(()=>document.querySelector('#rooms')?.textContent&&!document.querySelector('#rooms')?.textContent.includes('MEMUAT SIARAN'),{timeout:16000});
   const layout=await page.evaluate(()=>{
    const section=document.querySelector('#explore');
    const query=sel=>section.querySelector(sel);
    const measure=el=>{const r=el.getBoundingClientRect();return {top:Math.round(r.top),height:Math.round(r.height),width:Math.round(r.width)}};
    const header=query('.explore-head'),title=query('h2'),search=query('#searchLive'),filters=query('#filters'),rooms=query('#rooms');
    return {title:title.textContent.trim(),header:measure(header),heading:measure(title),search:measure(search),
     filters:measure(filters),rooms:measure(rooms),count:query('#liveCount')?.textContent,
     filterCount:filters.querySelectorAll('button').length,emptyStateHeight:rooms.querySelector('.no-signal')?.getBoundingClientRect().height||null,
     redundantText:section.textContent.includes('ON THE AIR')||section.textContent.includes('FIND YOUR FREQUENCY'),
     horizontalOverflow:document.documentElement.scrollWidth>window.innerWidth+2};
   });
   console.log(device.name.toUpperCase()+'_LIVE_FEED_LAYOUT '+JSON.stringify(layout));
   assert.match(layout.title,/LIVE SEKARANG/);
   assert.equal(layout.redundantText,false,'Oversized old heading should be removed');
   assert.ok(layout.heading.height<=35,'Compact heading is too tall');
   assert.ok(layout.search.height<=42,'Search input should be slim');
   assert.ok(layout.rooms.top<345,'Live room list is too far down');
   assert.equal(layout.filterCount,6,'Category filters must remain available');
   assert.equal(layout.horizontalOverflow,false,'LIVE viewport has horizontal overflow');
   if(layout.emptyStateHeight!==null)assert.ok(layout.emptyStateHeight<=130,'Empty live feed must not have a giant placeholder');
   const out=path.join('nadmo-live-beta','qa','screenshots');
   fs.mkdirSync(out,{recursive:true});
   await page.screenshot({path:path.join(out,'live-compact-'+device.name+'.png')});
   await page.$eval('#searchLive',el=>{el.value='NADMO_TEST_NOT_FOUND';el.dispatchEvent(new Event('input',{bubbles:true}))});
   const filtered=await page.$eval('#liveCount',el=>el.textContent);
   assert.ok(filtered.includes('0 LIVE ROOMS'),'Live search must remain functional');
   console.log('PASS compact '+device.name+' layout, visible rooms, live search, six categories and screenshot');
   assert.deepEqual(faults,[],'No browser JS exceptions');
   await page.close();
  }
  console.log('ALL NADMO COMPACT LIVE FEED E2E TESTS PASSED');
 }finally{await browser.close()}
}
main().catch(e=>{console.error('LIVE_FEED_COMPACT_QA_FAIL',e.stack||e);process.exitCode=1});
