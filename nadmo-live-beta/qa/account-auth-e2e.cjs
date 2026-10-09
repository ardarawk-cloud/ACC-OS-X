'use strict';
const assert=require('node:assert/strict');
const puppeteer=require('puppeteer-core');
const url='https://nadmo-live-beta-20261009.ardarawk.workers.dev/app/';
async function main(){
 const browser=await puppeteer.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,
  args:['--no-sandbox','--disable-dev-shm-usage']});
 const handle='qa_'+Date.now().toString(36);
 const password='NadmoQA.'+crypto.randomUUID()+'!'; // Unique test-only secret, never printed
 try{
  const a=await browser.createBrowserContext(),b=await browser.createBrowserContext();
  const one=await a.newPage(),two=await b.newPage();
  for(const p of [one,two])await p.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  await one.locator('nav [data-tab="settings"]').click();
  const routeProbe=await one.evaluate(async()=>{
   const r=await fetch('/api/account/me',{credentials:'include'});
   return {status:r.status,body:(await r.text()).slice(0,160)};
  });
  console.log('AUTH_ROUTE_PROBE',JSON.stringify(routeProbe));
  await one.locator('#accountHandle').fill(handle);
  await one.locator('#accountName').fill('NADMO QA Independent Creator');
  await one.locator('#accountPass').fill(password);
  one.on('response',async response=>{if(response.url().includes('/api/account/register')){try{console.log('AUTH_REGISTER_HTTP',JSON.stringify({status:response.status(),body:(await response.text()).slice(0,450)}))}catch(e){console.log('AUTH_REGISTER_RESPONSE_READ_ERROR',String(e))}}});
  one.on('pageerror',e=>console.log('AUTH_PAGE_ERROR',String(e)));
  one.on('console',m=>{if(m.type()==='error')console.log('AUTH_CONSOLE_ERROR',m.text().slice(0,300))});
  await one.locator('#accountRegister').click();
  await new Promise(r=>setTimeout(r,3000));
  const diag=await one.evaluate(()=>({status:document.querySelector('#accountStatus')?.textContent,signed:!document.querySelector('#accountSignedCard')?.classList.contains('hide'),url:location.href}));
  console.log('AUTH_SIGNUP_DIAGNOSTIC',JSON.stringify(diag));
  await one.waitForFunction(()=>!document.querySelector('#accountSignedCard').classList.contains('hide'),{timeout:18000});
  assert.equal(await one.$eval('#signedAccountHandle',x=>x.textContent),'@'+handle);
  const cookieVisible=await one.evaluate(()=>document.cookie.includes('nadmo_beta_session'));
  assert.equal(cookieVisible,false,'Session cookie must be HttpOnly');
  assert.match(await one.$eval('#accountKycNote',x=>x.textContent),/belum/i,'Account must not be represented as identity verified');
  const reg=await one.evaluate(async()=>{
   const response=await fetch('/api/account/me',{credentials:'include'});
   return await response.json();
  });
  assert.equal(reg.account.verifiedAdult,false,'Password account != adult ID verification');
  assert.equal(reg.account.kycStatus,'NOT_CONFIGURED','KYC not claimed active');
  console.log('PASS registered private beta account, HttpOnly session, no fake KYC verification');

  await one.locator('#editProfileBtn').click();
  await one.locator('#profileName').fill('NADMO QA Creator');
  await one.locator('#profileBio').fill('Open business links under one NADMO account');
  await one.locator('#profileLinkLabel').fill('Independent Booking');
  await one.locator('#profileLinkUrl').fill('https://bookbwd.nadmo.id/');
  await one.locator('#profileAddLink').click();
  await one.locator('#profileSave').click();
  await one.waitForFunction(()=>document.querySelector('#profileEditStatus').textContent.includes('server'),{timeout:10000});
  await one.locator('#profilePostText').fill('Book directly https://bookbwd.nadmo.id/ without walled gardens');
  await one.locator('#profilePostSave').click();
  await one.waitForFunction(()=>document.querySelector('#profileSyncedPosts').querySelectorAll('a').length===1,{timeout:10000});

  await two.locator('nav [data-tab="settings"]').click();
  await two.locator('#accountHandle').fill(handle);
  await two.locator('#accountPass').fill(password);
  await two.locator('#accountLogin').click();
  await two.waitForFunction(()=>!document.querySelector('#accountSignedCard').classList.contains('hide'),{timeout:12000});
  await two.waitForFunction(()=>document.querySelector('#profileSyncedPosts').querySelectorAll('a').length===1,{timeout:10000});
  assert.equal(await two.$eval('#profileBusinessLinks a',x=>x.href),'https://bookbwd.nadmo.id/');
  assert.equal(await two.$eval('#profileDisplayName',x=>x.textContent),'NADMO QA Creator');
  const post=await two.$eval('#profileSyncedPosts a',x=>x.href);
  assert.equal(post,'https://bookbwd.nadmo.id/');
  const publicProfile=await two.evaluate(async handle=>{
   return (await fetch('/api/profile/'+handle)).json();
  },handle);
  assert.equal(publicProfile.profile.handle,handle);
  assert.deepEqual(publicProfile.profile.links,[{label:'Independent Booking',url:'https://bookbwd.nadmo.id/'}]);
  assert.equal(publicProfile.profile.verified,false);
  assert.equal(publicProfile.profile.posts.length,0,'Draft posts must remain private');
  console.log('PASS synced business profile and clickable drafts on two device contexts');
  const bad=await two.evaluate(async()=>fetch('/api/account/profile',{
   method:'PUT',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({name:'Safe',bio:'',links:[{label:'Fake',url:'javascript:alert(1)'}]})
  }).then(x=>x.status));
  assert.equal(bad,400,'Unsafe URLs rejected at server');
  console.log('PASS API rejects malicious URL and keeps posts unpublished');

  await two.evaluate(async password=>{
   const result=await fetch('/api/account/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});
   if(!result.ok)throw Error('Account cleanup failed '+result.status);
  },password);
  const deleted=await two.evaluate(()=>fetch('/api/account/me').then(x=>x.json()));
  assert.equal(deleted.authenticated,false);
  const previous=await one.evaluate(()=>fetch('/api/account/me').then(x=>x.json()));
  assert.equal(previous.authenticated,false,'Deleted account must not authenticate on other device');
  console.log('PASS owner account removal and session revocation across devices');
  console.log('ALL NADMO ACCOUNT AUTH E2E TESTS PASSED');
 }finally{await browser.close()}
}
main().catch(e=>{console.error('AUTH_E2E_FAIL '+(e.stack||e));process.exitCode=1});
