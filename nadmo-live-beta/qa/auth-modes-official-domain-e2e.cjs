'use strict';
const assert=require('node:assert/strict');
const puppeteer=require('puppeteer-core');
const legacy='https://nadmo-live-beta-20261009.ardarawk.workers.dev';
const official='https://live.nadmo.id';
const username='logintest'+crypto.randomUUID().replaceAll('-','').slice(0,11);
const name='Login Existing QA';
const password='NadmoLoginVerify!'+crypto.randomUUID();
async function registerOld(){
 const r=await fetch(legacy+'/api/account/register',{method:'POST',
  headers:{Origin:legacy,'Content-Type':'application/json'},
  body:JSON.stringify({handle:username,name,password})});
 assert.equal(r.status,201,'Create existing account on old Worker address');
 return r.headers.get('set-cookie').split(';')[0];
}
(async()=>{
 let cookie,browser;
 try{
  cookie=await registerOld();
  browser=await puppeteer.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,
   args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage();await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(official+'/app/',{waitUntil:'domcontentloaded'});
  await page.$eval('#mastLogin',el=>el.click());
  await page.waitForFunction(()=>!document.getElementById('authPage').classList.contains('hide'),{timeout:12000});
  const first=await page.evaluate(()=>({
   nameHidden:document.getElementById('accountRegisterExtra').classList.contains('hide'),
   mastHidden:document.getElementById('mastLogin').hidden,
   loginText:document.getElementById('accountLogin').textContent,
   signupText:document.getElementById('accountRegister').textContent,
   handleVisible:document.getElementById('accountHandle').getBoundingClientRect().height>0,
   passVisible:document.getElementById('accountPass').getBoundingClientRect().height>0
  }));
  assert.deepEqual(first,{nameHidden:true,mastHidden:true,loginText:'MASUK',signupText:'DAFTAR AKUN BARU',
   handleVisible:true,passVisible:true});
  await page.$eval('#accountLogin',el=>el.click());
  assert.equal(await page.$eval('#accountStatus',el=>el.textContent),
   'Isi username dan kata sandi untuk masuk.','Empty login must not call server');
  await page.$eval('#accountHandle',(el,value)=>el.value=value,username);
  await page.$eval('#accountPass',(el,value)=>el.value=value,password);
  await page.$eval('#accountLogin',el=>el.click());
  await page.waitForFunction(()=>!document.getElementById('settings').classList.contains('hide'),{timeout:17000});
  const me=await page.evaluate(async()=> {
   const response=await fetch('/api/account/me',{credentials:'include'});
   return {status:response.status,result:await response.json()};
  });
  assert.equal(me.status,200);
  assert.equal(me.result.account.handle,username);
  assert.equal(me.result.account.name,name);
  await page.$eval('#meMore',el=>el.click());
  await page.$eval('#preferencesPage [data-open-page="accountPage"]',el=>el.click());
  await page.$eval('#accountLogout',el=>el.click());
  await page.waitForFunction(()=>!document.getElementById('authPage').classList.contains('hide'),{timeout:12000});
  // Login form still only needs two fields even after a logout.
  assert.equal(await page.$eval('#accountRegisterExtra',el=>el.classList.contains('hide')),true);
  await page.$eval('#accountRegister',el=>el.click());
  assert.equal(await page.$eval('#accountRegisterExtra',el=>!el.classList.contains('hide')),true);
  assert.equal(await page.$eval('#accountRegister',el=>el.textContent),'BUAT AKUN');
  await page.$eval('#accountLogin',el=>el.click());
  assert.equal(await page.$eval('#accountRegisterExtra',el=>el.classList.contains('hide')),true);
  assert.deepEqual(errors,[]);
  console.log('PASS official domain existing account login, only two required fields, signup switching and no duplicate MASUK');
 }finally{
  if(browser)await browser.close();
  if(cookie){
   const r=await fetch(legacy+'/api/account/delete',{method:'POST',headers:{Origin:legacy,Cookie:cookie,'Content-Type':'application/json'},
    body:JSON.stringify({password})});
   assert.equal(r.status,200,'delete temporary QA account');
  }
 }
})().catch(error=>{console.error('AUTH_MODES_QA_FAIL',error.stack||error);process.exitCode=1});
