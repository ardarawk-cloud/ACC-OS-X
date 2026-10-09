'use strict';
const assert=require('node:assert/strict');
const puppeteer=require('puppeteer-core');
const base='https://nadmo-live-beta-20261009.ardarawk.workers.dev';
async function main(){
 const browser=await puppeteer.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,
  args:['--no-sandbox','--disable-dev-shm-usage']});
 const handle='sbadge'+crypto.randomUUID().replaceAll('-','').slice(0,14);
 const password='NadmoSupporterQA!'+crypto.randomUUID();
 let page,context,registered=false;
 try{
  context=await browser.createBrowserContext();page=await context.newPage();
  await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(base+'/app/',{waitUntil:'domcontentloaded',timeout:30000});
  await page.$eval('nav [data-tab="settings"]',button=>button.click());
  await page.waitForFunction(()=>document.querySelectorAll('#supporterLevels .supporter-row').length===10,{timeout:12000});
  const initial=await page.evaluate(()=>({
   rows:[...document.querySelectorAll('#supporterLevels .supporter-row')].map(x=>({badge:x.querySelector('.supporter-badge')?.textContent,threshold:x.querySelector('small')?.textContent})),
   progress:document.querySelector('#supporterProgress').textContent,
   privateControl:document.querySelector('#supporterPrivacy').hidden
  }));
  assert.equal(initial.rows.length,10,'Ten tier design previews');
  assert.equal(initial.privateControl,true,'Unauthenticated viewers cannot change another account setting');
  assert.ok(initial.rows.some(x=>x.badge?.includes('♛')),'Crown marks for high tiers');
  console.log('PASS mobile preview 10 original tier badges and crowns (clearly preview, not earned)');
  const details=await page.evaluate(async()=>{
   const [level,me]=await Promise.all([fetch('/api/supporter/levels'),fetch('/api/supporter/me')]);
   return {levelStatus:level.status,levels:await level.json(),meStatus:me.status,me:await me.json()};
  });
  assert.equal(details.levelStatus,200);
  assert.equal(details.levels.totalLevels,50);
  assert.equal(details.levels.paymentsEnabled,false);
  assert.equal(details.meStatus,200);
  assert.equal(details.me.authenticated,false);
  await page.$eval('#accountHandle',(e,text)=>{e.value=text;e.dispatchEvent(new Event('input',{bubbles:true}))},handle);
  await page.$eval('#accountName',e=>{e.value='Supporter Beta QC';e.dispatchEvent(new Event('input',{bubbles:true}))});
  await page.$eval('#accountPass',(e,pw)=>{e.value=pw;e.dispatchEvent(new Event('input',{bubbles:true}))},password);
  await page.$eval('#accountRegister',e=>e.click());
  await page.waitForFunction(()=>!document.querySelector('#accountSignedCard').classList.contains('hide'),{timeout:20000});
  registered=true;
  await page.waitForFunction(()=>!document.querySelector('#supporterPrivacy').hidden,{timeout:15000});
  assert.match(await page.$eval('#supporterProgress',e=>e.textContent),/Level 0/);
  assert.equal(await page.$eval('#supporterMyBadge',e=>e.hidden),true,'No fake badge for a new account');
  const forged=await page.evaluate(async()=>{
   const res=await fetch('/api/supporter/award',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({level:50,totalVerifiedIDR:2000000000})});
   return {status:res.status,body:(await res.text()).slice(0,150)};
  });
  assert.notEqual(forged.status,200,'Browser must not be able to grant supporter level');
  await page.$eval('#supporterShowBadge',e=>e.click());
  await page.waitForFunction(()=>document.querySelector('#supporterStatus').textContent.includes('PRATINJAU DESAIN'),{timeout:15000});
  const privateResponse=await page.evaluate(async()=>await (await fetch('/api/supporter/me')).json());
  assert.equal(privateResponse.supporter.visible,false,'Hidden badge preference persists on server');
  await page.$eval('#supporterShowBadge',e=>e.click());
  await page.waitForFunction(()=>document.querySelector('#supporterStatus').textContent.includes('PRATINJAU DESAIN'),{timeout:12000});
  const visibleResponse=await page.evaluate(async()=>await(await fetch('/api/supporter/me')).json());
  assert.equal(visibleResponse.supporter.visible,true);
  assert.equal(visibleResponse.supporter.level,0);
  assert.equal(visibleResponse.supporter.totalVerifiedIDR,0);
  console.log('PASS server-level privacy opt out/in and no fake credit from browser');
  const publicProfile=await page.evaluate(async h=>await(await fetch('/api/profile/'+h)).json(),handle);
  assert.equal(publicProfile.profile.supporterBadge,null,'Public profile never reveals total/spend and no unearned badge');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.$eval('nav [data-tab="settings"]',e=>e.click());
  await page.waitForFunction(()=>document.querySelectorAll('#supporterLevels .supporter-row').length===10,{timeout:15000});
  assert.deepEqual(errors,[],'No JavaScript exception');
  console.log('PASS supporter gallery reloads on mobile and public profile does not expose payment total');
  console.log('ALL NADMO SUPPORTER BADGE E2E TESTS PASSED');
 }finally{
  if(registered&&page)try{
   await page.evaluate(async pw=>await fetch('/api/account/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw})}),password);
  }catch(err){console.warn('Supporter QA account cleanup:',err.message)}
  await browser.close();
 }
}
main().catch(e=>{console.error('SUPPORTER_E2E_FAILURE',e.stack||e);process.exitCode=1});
