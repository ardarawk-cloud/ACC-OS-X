'use strict';
const assert=require('node:assert/strict');
const puppeteer=require('puppeteer-core');
const base='https://live.nadmo.id';
(async()=>{
 const browser=await puppeteer.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage();await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/app/',{waitUntil:'domcontentloaded'});
  const start=await page.evaluate(()=>({
   noAccount:document.querySelector('#meSigned').classList.contains('hide'),
   entryVisible:document.querySelector('#offgridEntry').getBoundingClientRect().height>0,
   footer:document.querySelector('.nadmo-pt-footer')?.textContent,
   noAuthRequired:document.querySelector('#offgridEntry').closest('#authPage')===null,
   modalClosed:document.querySelector('#offgridModal').classList.contains('hide'),
   widthOk:document.documentElement.scrollWidth<=innerWidth+2
  }));
  assert.equal(start.noAccount,true);
  assert.equal(start.entryVisible,true);
  assert.equal(start.footer,'© 2026 PT NADMO Studio Indonesia');
  assert.equal(start.noAuthRequired,true);assert.equal(start.modalClosed,true);assert.equal(start.widthOk,true);
  await page.setOfflineMode(true);
  await page.$eval('#offgridEntry',el=>el.click());
  const opened=await page.evaluate(()=>({
   visible:!document.querySelector('#offgridModal').classList.contains('hide'),
   focus:document.activeElement.id,
   status:document.querySelector('.offgrid-status').textContent,
   text:document.querySelector('#offgridDescription').textContent,
   hasInputs:document.querySelector('#offgridModal input')!==null,
   boxWidth:document.querySelector('.offgrid-panel').getBoundingClientRect().width
  }));
  assert.equal(opened.visible,true);
  assert.equal(opened.focus,'offgridClose');
  assert.match(opened.status,/BELUM AKTIF.*tidak bisa mengirim pesan offline/);
  assert.match(opened.text,/internet blackout/);
  assert.equal(opened.hasInputs,false);
  assert.ok(opened.boxWidth<=370);
  await page.keyboard.press('Escape');
  assert.equal(await page.$eval('#offgridModal',el=>el.classList.contains('hide')),true);
  await page.$eval('#offgridEntry',el=>el.click());
  await page.$eval('#offgridClose',el=>el.click());
  assert.equal(await page.$eval('#offgridModal',el=>el.classList.contains('hide')),true);
  assert.deepEqual(errors,[],'no JavaScript errors when opening OFFGRID offline');
  console.log('PASS guest OFFGRID modal (network disconnected), red status, no login and corporate footer');
 }finally{await browser.close()}
})().catch(error=>{console.error('OFFGRID_GUEST_MOBILE_QA_FAIL',error.stack||error);process.exitCode=1});
