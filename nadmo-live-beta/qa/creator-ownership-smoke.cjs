'use strict';
// NADMO LIVE private beta: account-bound room recovery and revoked-session regression.
const assert=require('node:assert/strict');
const {WebSocket}=require('ws');
const base='https://nadmo-live-beta-20261009.ardarawk.workers.dev';
const opened=[];
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function send(ws,m){ws.send(JSON.stringify(m))}
function waitFor(ws,type,timeout=12000){
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{done();reject(Error('Timeout waiting for '+type))},timeout);
  function onMessage(raw){let data;try{data=JSON.parse(String(raw))}catch{return}if(data.type===type){done();resolve(data)}}
  function onClose(){done();reject(Error('WebSocket closed before '+type))}
  function done(){clearTimeout(timer);ws.off('message',onMessage);ws.off('close',onClose)}
  ws.on('message',onMessage);ws.on('close',onClose);
 });
}
function connect(cookie=''){
 return new Promise((resolve,reject)=>{
  const ws=new WebSocket(base.replace(/^https:/,'wss:')+'/ws',{
   headers:{Origin:base,...(cookie?{Cookie:cookie}:{})},handshakeTimeout:12000
  });
  ws.once('open',()=>{opened.push(ws);resolve(ws)});
  ws.once('error',reject);
 });
}
async function action(path,body,cookie=''){
 const response=await fetch(base+path,{method:'POST',headers:{Origin:base,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
 const result=await response.json();
 return {status:response.status,body:result,cookie:(response.headers.get('set-cookie')||'').split(';')[0]};
}
async function register(){
 const handle='qa'+crypto.randomUUID().replace(/-/g,'').slice(0,16);
 const password='NadmoPrivateQA!'+crypto.randomUUID();
 const result=await action('/api/account/register',{handle,name:'NADMO QA Creator',password});
 assert.equal(result.status,201,JSON.stringify(result.body));
 assert.match(result.cookie,/^nadmo_beta_session=[a-f0-9]{64}$/);
 return {handle,password,cookie:result.cookie};
}
async function main(){
 let a,b,host,viewer,recovered;
 try{
  const status=await (await fetch(base+'/health')).json();
  assert.equal(status.anonymousBetaHostsEnabled,true,'Anonymous hosts ONLY on beta Worker');
  assert.equal(status.creatorVerificationRequired,false,'Beta must not falsely claim KYC is active');
  a=await register();b=await register();
  host=await connect(a.cookie);
  const createdPromise=waitFor(host,'created');
  send(host,{type:'create',title:'Private beta ownership QA',mode:'public',category:'Podcast'});
  const room=await createdPromise;
  assert.equal(room.hostVerified,false,'Password signup is not verified identity');
  assert.ok(room.resumeToken);
  console.log('PASS beta account created a test room without claiming KYC');
  viewer=await connect();
  const joined=waitFor(viewer,'joined');
  send(viewer,{type:'join',id:room.id});
  await joined;
  console.log('PASS anonymous viewer can watch public beta without uploading ID');
  const crossAccount=await connect(b.cookie);
  const denied=waitFor(crossAccount,'error');
  send(crossAccount,{type:'resume',id:room.id,token:room.resumeToken});
  assert.match((await denied).message,/pemilik room|akun pemilik|terverifikasi|ditolak/i);
  console.log('PASS second account cannot hijack room even with host recovery token');
  const hostOffline=waitFor(viewer,'host-reconnecting');
  host.terminate();
  await hostOffline;
  recovered=await connect(a.cookie);
  const resumed=waitFor(recovered,'resumed');
  send(recovered,{type:'resume',id:room.id,token:room.resumeToken});
  assert.equal((await resumed).id,room.id);
  console.log('PASS same account can recover streaming room');
  const logout=await action('/api/account/logout',{},a.cookie);
  assert.equal(logout.status,200);
  const retry=await connect(a.cookie);
  const revokedResume=waitFor(retry,'error');
  send(retry,{type:'resume',id:room.id,token:room.resumeToken});
  assert.match((await revokedResume).message,/ditolak|pemulihan|pemilik/i);
  console.log('PASS revoked session cannot take over active room');
  const leave=waitFor(recovered,'left');
  send(recovered,{type:'leave'});
  await leave;
  const revoked=waitFor(recovered,'error');
  send(recovered,{type:'create',title:'Must reject expired session',mode:'public'});
  assert.match((await revoked).message,/sesi akun|login/i);
  console.log('PASS logged-out account loses GO LIVE privileges on existing WebSocket');
  console.log('ALL CREATOR OWNERSHIP REGRESSION TESTS PASSED');
 }finally{
  for(const ws of opened)try{ws.terminate()}catch{}
  for(const account of [a,b]){
   if(!account)continue;
   try{
    const login=await action('/api/account/login',{handle:account.handle,password:account.password});
    if(login.status===200)await action('/api/account/delete',{password:account.password},login.cookie);
   }catch(error){console.warn('QA cleanup:',error.message)}
  }
 }
}
main().catch(e=>{console.error('CREATOR_QA_FAILURE',e.stack||e);process.exitCode=1});
