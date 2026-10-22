'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const puppeteer=require('puppeteer-core');
const html=fs.readFileSync(path.join(__dirname,'../public/app/index.html'),'utf8');
const origin='https://live.nadmo.id';
(async()=>{
 const {default:worker}=await import('../worker.mjs');
 const {deriveWallet,payoutCapability}=await import('../wallet.mjs');
 const browser=await puppeteer.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const width of [390,1366]){
   const page=await browser.newPage();await page.setViewport({width,height:844,isMobile:width<500,hasTouch:width<500});
   let rejectQuotes=false;const faults=[];
   page.on('pageerror',e=>faults.push(String(e)));await page.setRequestInterception(true);
   page.on('request',async r=>{
    try{
     const u=new URL(r.url());
     if(r.isNavigationRequest())return r.respond({status:200,contentType:'text/html',body:html});
     if(u.pathname.startsWith('/api/payments/')){
      if(rejectQuotes)return r.respond({status:503,contentType:'application/json',body:'{"ok":false}'});
      const response=await worker.fetch(new Request(r.url()),{},{});
      return r.respond({status:response.status,contentType:'application/json',body:await response.text()});
     }
     let body={ok:true,rooms:[],posts:[],reposts:[],counts:{followers:0,following:0},paymentsEnabled:false};
     if(u.pathname==='/api/account/me')body={ok:true,authenticated:true,account:{id:'fee-qa-account',handle:'feeqa',name:'Fee QA',bio:'',links:[]}};
     if(u.pathname==='/api/wallet/me')body={ok:true,wallet:deriveWallet(),capability:payoutCapability(),identityVerified:false};
     if(u.pathname==='/api/supporter/me')body={ok:true,authenticated:false,supporter:null,paymentsEnabled:false};
     return r.respond({status:200,contentType:'application/json',body:JSON.stringify(body)});
    }catch(e){faults.push(String(e));if(!r.isInterceptResolutionHandled())await r.abort()}
   });
   await page.goto(origin+'/app/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!document.querySelector('#meSigned').classList.contains('hide'));
   await page.$eval('nav [data-tab="settings"]',e=>e.click());
   await page.$eval('[data-open-page="walletPage"]',e=>e.click());
   await page.waitForFunction(()=>document.querySelector('#feeBreakdown').dataset.policyVersion==='2026-10-22.1');
   let text=await page.$eval('#feeBreakdown',e=>e.textContent);
   assert.match(text,/7%/);assert.match(text,/7\.000/);assert.match(text,/93\.000/);
   assert.match(text,/Menunggu verifikasi pajak/);assert.match(text,/Sesuai profil pajak host/);
   assert.equal(await page.$eval('#walletWithdraw',e=>e.disabled),true);
   assert.equal(await page.$eval('#walletAvailable',e=>e.textContent),'Rp0');
   assert.equal(await page.$eval('#walletPage',e=>e.scrollWidth<=e.clientWidth+1),true,'Wallet must fit mobile/desktop');
   assert.equal(await page.$eval('#walletFeePolicy',e=>e.getBoundingClientRect().width>0),true,'Calculator is visible, not hidden developer settings');
   await page.select('#feeType','ticket');
   await page.waitForFunction(()=>document.querySelector('#feeBreakdown').textContent.includes('10%'));
   assert.match(await page.$eval('#feeBreakdown',e=>e.textContent),/90\.000/);
   await page.select('#feeType','topup');
   await page.waitForFunction(()=>document.querySelector('#feeBreakdown').textContent.includes('2,65%'));
   text=await page.$eval('#feeBreakdown',e=>e.textContent);
   assert.match(text,/2\.650/);assert.match(text,/292/);assert.match(text,/97\.058/);
   await page.$eval('#feeAmount',e=>{e.value='1000.5';e.dispatchEvent(new Event('input'))});
   await page.waitForFunction(()=>document.querySelector('#feeBreakdown').textContent.includes('nominal bulat'));
   assert.equal(await page.$eval('#feeBreakdown',e=>e.dataset.policyVersion),undefined);
   await page.$eval('#feeAmount',e=>{e.value='200000';e.dispatchEvent(new Event('input'))});
   await page.select('#feeType','gift');
   await page.waitForFunction(()=>document.querySelector('#feeBreakdown').textContent.includes('186.000'));
   rejectQuotes=true;
   await page.$eval('#feeAmount',e=>{e.value='300000';e.dispatchEvent(new Event('input'))});
   await page.waitForFunction(()=>document.querySelector('#feeBreakdown').textContent.includes('belum dapat dimuat'));
   assert.doesNotMatch(await page.$eval('#feeBreakdown',e=>e.textContent),/186\.000/,'Failed requests clear stale financial estimates');
   assert.deepEqual(faults,[]);
   console.log('PASS wallet fees '+width+'px: server policy, gift/ticket/QRIS tax basis, pending taxes, zero funds, disabled payout, invalid/offline inputs');
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
