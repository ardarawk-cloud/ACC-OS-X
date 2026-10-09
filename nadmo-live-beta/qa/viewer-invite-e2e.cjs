'use strict';
const assert=require('node:assert/strict');
const puppeteer=require('puppeteer-core');
const {WebSocket}=require('ws');
const base='https://nadmo-live-beta-20261009.ardarawk.workers.dev';
const sockets=[];
function connect(){
 return new Promise((resolve,reject)=>{
  const ws=new WebSocket(base.replace(/^https:/,'wss:')+'/ws',{headers:{Origin:base},handshakeTimeout:12000});
  ws.once('open',()=>{sockets.push(ws);resolve(ws)});
  ws.once('error',reject);
 });
}
function awaitType(ws,type,timeout=15000){
 return new Promise((resolve,reject)=>{
  const timeoutId=setTimeout(()=>{cleanup();reject(Error('Timed out '+type))},timeout);
  function received(raw){let m;try{m=JSON.parse(String(raw))}catch{return}if(m.type!==type)return;cleanup();resolve(m)}
  function closed(){cleanup();reject(Error('Socket closed waiting for '+type))}
  function cleanup(){clearTimeout(timeoutId);ws.off('message',received);ws.off('close',closed)}
  ws.on('message',received);ws.on('close',closed);
 });
}
async function createRoom(mode,password){
 const ws=await connect(),pending=awaitType(ws,'created');
 ws.send(JSON.stringify({type:'create',mode,password,title:'Viewer deep link QA',category:'Social'}));
 return {host:ws,room:await pending};
}
async function main(){
 const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
  args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const config of [{mode:'public',password:''},{mode:'password',password:'test-room-secret'}]){
   const {host,room}=await createRoom(config.mode,config.password);
   const context=await browser.createBrowserContext();
   const page=await context.newPage();
   await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true,hasTouch:true});
   const dialogs=[],errors=[];
   page.on('pageerror',err=>errors.push(String(err)));
   page.on('dialog',async dialog=>{
    dialogs.push(dialog.type()+':'+dialog.message());
    await dialog.accept(dialog.type()==='prompt'?config.password:undefined);
   });
   const link=base+'/app/?room='+encodeURIComponent(room.id)+(config.mode==='password'?'&private=1':'');
   await page.goto(link,{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForFunction(()=>!document.querySelector('#settings').classList.contains('hide'),{timeout:15000});
   assert.equal(await page.$eval('#adult',node=>node.checked),false,'New viewer must explicitly confirm age');
   assert.ok(dialogs.some(s=>s.includes('Konfirmasi usia')),'Age confirmation expected for new viewer');
   const joinedHost=awaitType(host,'viewer-joined');
   await page.$eval('#adult',node=>node.click());
   await page.waitForFunction(()=>!document.querySelector('#watch').classList.contains('hide')&&document.querySelector('#watchTitle')?.textContent.includes('Host'),{timeout:17000});
   const hostViewer=await joinedHost;
   assert.ok(hostViewer.id,'Host must be notified of a real remote viewer');
   assert.equal(page.url(),link,'Viewer must not have to open invite link again');
   if(config.mode==='password')assert.ok(dialogs.some(s=>s.startsWith('prompt:')),'Private invite must prompt for code');
   assert.deepEqual(errors,[],'Browser JS errors');
   console.log('PASS fresh '+config.mode+' deep link -> age confirmation -> auto JOIN -> room, without reload or KTP');
   host.send(JSON.stringify({type:'leave'}));
   await context.close();
  }
  console.log('ALL NADMO VIEWER INVITE E2E TESTS PASSED');
 }finally{
  await browser.close();
  for(const socket of sockets)try{socket.terminate()}catch{}
 }
}
main().catch(e=>{console.error('VIEWER_INVITE_QA_FAILED',e.stack||e);process.exitCode=1});
