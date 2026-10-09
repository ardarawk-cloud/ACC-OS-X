'use strict';
const assert=require('node:assert/strict');
const puppeteer=require('puppeteer-core');
const base='https://nadmo-live-beta-20261009.ardarawk.workers.dev/app/';
const name='meone'+crypto.randomUUID().replaceAll('-','').slice(0,12);
const password='NadmoMeQA!'+crypto.randomUUID();
(async()=>{
 const browser=await puppeteer.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 let page,created=false;
 try{
  page=await browser.newPage();await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.$eval('nav [data-tab="settings"]',el=>el.click());
  assert.equal(await page.$eval('#authPage',el=>!el.classList.contains('hide')),true,'Login must live outside ME');
  assert.equal(await page.$eval('#settings',el=>el.classList.contains('hide')),true,'ME cannot expose a login form');
  await page.$eval('#accountHandle',(el,v)=>el.value=v,name);
  await page.$eval('#accountName',el=>el.value='NADMO ME QA');
  await page.$eval('#accountPass',(el,v)=>el.value=v,password);
  await page.$eval('#accountRegister',el=>el.click());
  await page.waitForFunction(()=>!document.querySelector('#settings').classList.contains('hide'),{timeout:20000});
  created=true;
  const state=await page.evaluate(()=>{
   const me=document.querySelector('#settings'),wallet=me.querySelector('#meWalletOpen');
   return {hasWallet:!!wallet&&wallet.getBoundingClientRect().width>0,
    loginInside:!!me.querySelector('#accountLoginCard'),
    technicalSettings:!!me.querySelector('#developerOnlySettings'),
    supporterInside:!!me.querySelector('#supporterPanel'),
    composerInside:!!me.querySelector('#profilePostText'),
    horizontalOverflow:document.documentElement.scrollWidth>innerWidth+2};
  });
  assert.deepEqual(state,{hasWallet:true,loginInside:false,technicalSettings:false,supporterInside:false,composerInside:false,horizontalOverflow:false});
  await page.$eval('#meWalletOpen',el=>el.click());
  assert.equal(await page.$eval('#walletPage',el=>!el.classList.contains('hide')),true);
  assert.equal(await page.$eval('#walletWithdraw',el=>el.disabled),true,'Withdraw remains disabled');
  await page.$eval('#walletPage .subBack',el=>el.click());
  await page.$eval('#meMore',el=>el.click());
  assert.equal(await page.$eval('#preferencesPage',el=>!el.classList.contains('hide')),true);
  await page.$eval('#preferencesPage [data-open-page="supporterPage"]',el=>el.click());
  await page.waitForFunction(()=>document.querySelectorAll('#supporterLevels .supporter-row').length===10,{timeout:12000});
  const badges=await page.evaluate(()=>{
   const rows=[...document.querySelectorAll('#supporterLevels .supporter-row')];
   return {count:rows.length,overflow:rows.some(r=>r.scrollWidth>r.clientWidth+1),
    width:document.documentElement.scrollWidth-innerWidth};
  });
  assert.equal(badges.count,10);assert.equal(badges.overflow,false);assert.ok(badges.width<=2);
  await page.$eval('#supporterPage .subBack',el=>el.click());
  await page.$eval('#preferencesPage .subBack',el=>el.click());
  await page.$eval('nav [data-tab="socialPage"]',el=>el.click());
  await page.$eval('#socialCompose',el=>el.click());
  const body='NADMO ONE public mobile profile smoke '+name;
  await page.$eval('#socialPostText',(el,v)=>el.value=v,body);
  await page.$eval('#socialPublish',el=>el.click());
  await page.waitForFunction(text=>document.querySelector('#socialPublicFeed').textContent.includes(text),{timeout:12000},body);
  await page.$eval('nav [data-tab="settings"]',el=>el.click());
  assert.ok((await page.$eval('#profilePublishedPosts',el=>el.textContent)).includes(body));
  assert.deepEqual(errors,[],'No browser JavaScript crashes');
  console.log('PASS mobile ME profile, login separation, direct wallet, supporter layout, live public posts');
 }finally{
  if(created&&page)await page.evaluate(pw=>fetch('/api/account/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw})}),password).catch(()=>{});
  await browser.close();
 }
})().catch(err=>{console.error('ME_ONE_QA_FAIL',err.stack||err);process.exitCode=1});
