'use strict';
const assert=require('node:assert/strict');
const puppeteer=require('puppeteer-core');
const host='https://live.nadmo.id';
const handle='linkqa'+crypto.randomUUID().replaceAll('-','').slice(0,10);
const pass='LinkQa!'+crypto.randomUUID();
async function request(path,cookie,body){
 return fetch(host+path,{method:'POST',headers:{Origin:host,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(body)});
}
async function main(){
 let browser,cookie;
 try{
  const registered=await request('/api/account/register','',{handle,name:'Link QA User',password:pass});
  assert.equal(registered.status,201);
  cookie=registered.headers.get('set-cookie').split(';')[0];
  browser=await puppeteer.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage();
  await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  const [name,value]=cookie.split('=');
  await page.setCookie({url:host,name,value,httpOnly:true});
  await page.goto(host+'/app/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!document.querySelector('#meSigned').classList.contains('hide'),{timeout:18000});
  await page.$eval('nav [data-tab="settings"]',e=>e.click());
  await page.$eval('#editProfileBtn',e=>e.click());
  await page.$eval('#profileLinkLabel',e=>e.value='Booking');
  await page.$eval('#profileLinkUrl',e=>e.value='https://example.com/book');
  await page.$eval('#profileAddLink',e=>e.click());
  await page.waitForFunction(()=>document.querySelector('#profileEditStatus').textContent.includes('Link tersimpan di akun'),{timeout:14000});
  assert.equal(await page.$eval('#profileBusinessLinks a',e=>e.href),'https://example.com/book');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!document.querySelector('#meSigned').classList.contains('hide'),{timeout:18000});
  await page.$eval('nav [data-tab="settings"]',e=>e.click());
  assert.equal(await page.$eval('#profileBusinessLinks a',e=>e.textContent.includes('Booking')),true);
  const before=await page.evaluate(async()=>await(await fetch('/api/profile/'+handle)).json());
  assert.equal(before.profile.links.length,1);
  await page.$eval('#editProfileBtn',e=>e.click());
  await page.$eval('#profileEditLinks button',e=>e.click());
  await page.waitForFunction(()=>document.querySelector('#profileEditStatus').textContent.includes('Link dihapus dari akun'),{timeout:14000});
  assert.equal(await page.$eval('#profileBusinessLinks',e=>e.querySelectorAll('a').length),0);
  const after=await page.evaluate(async()=>await(await fetch('/api/profile/'+handle)).json());
  assert.equal(after.profile.links.length,0);
  console.log('PASS immediate link sync, ME visibility, reload, public profile and remove');
 }finally{
  if(browser)await browser.close();
  if(cookie){
   const deleted=await request('/api/account/delete',cookie,{password:pass});
   assert.equal(deleted.status,200);
  }
 }
}
main().catch(error=>{console.error(error.stack||error);process.exitCode=1});
