import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

const origin='https://live.nadmo.id';
const username='sbqa'+randomUUID().replaceAll('-','').slice(0,12);
const password='NadmoSBqa!'+randomUUID();
const social='https://sociabuzz.com/'+username+'/tribe';
let sessionCookie=null,passed=0;

async function req(path,body=null,cookie=sessionCookie){
 const headers={Origin:origin,...(cookie?{Cookie:cookie}:{}),
  ...(body!==null?{'Content-Type':'application/json'}:{})};
 const response=await fetch(origin+path,{method:body===null?'GET':'POST',
  headers,body:body===null?undefined:JSON.stringify(body),redirect:'manual'});
 let result;try{result=await response.json()}catch{result={invalidResponse:true}};
 return {status:response.status,data:result,headers:response.headers};
}
async function run(name,test){
 await test();passed++;console.log('PASS',name);
}

try{
 await run('Register disposable QA host',async()=>{
  const r=await req('/api/account/register',{handle:username,name:'SociaBuzz QA',password},null);
  assert.equal(r.status,201,JSON.stringify(r.data).slice(0,300));
  sessionCookie=r.headers.get('set-cookie')?.split(';')[0];
  assert.ok(sessionCookie,'Session cookie was not set');
 });
 await run('Save SociaBuzz as the only support method',async()=>{
  const r=await req('/api/subscription/support-methods',{supportUrl:'',qrisUrl:'',sociabuzzUrl:social});
  assert.equal(r.status,200,JSON.stringify(r.data));
  assert.equal(r.data.support.sociabuzz,social);
  assert.equal(r.data.support.link,'');
  assert.equal(r.data.support.qris,'');
 });
 await run('Reload own settings retains SociaBuzz',async()=>{
  const r=await req('/api/subscription/me');
  assert.equal(r.status,200);
  assert.equal(r.data.support.sociabuzz,social);
 });
 await run('Public host endpoint exposes the provider link',async()=>{
  const r=await req('/api/subscription/host?handle='+encodeURIComponent(username),null,null);
  assert.equal(r.status,200);
  assert.equal(r.data.support.sociabuzz,social);
 });
 await run('Support action accepts host with only SociaBuzz, no payment success',async()=>{
  const r=await req('/api/subscription/support-action',{handle:username});
  assert.equal(r.status,200,JSON.stringify(r.data));
  assert.equal(r.data.allowed,true);
  assert.equal(r.data.self,true);
  assert.equal(r.data.counted,false);
  assert.equal(r.data.support.sociabuzz,social);
  assert.equal(r.data.paid,undefined);
 });
 await run('Reject lookalike domain and keep old link',async()=>{
  const r=await req('/api/subscription/support-methods',
    {supportUrl:'',qrisUrl:'',sociabuzzUrl:'https://sociabuzz.com.evil.example/u/tribe'});
  assert.equal(r.status,400);
  assert.equal((await req('/api/subscription/me')).data.support.sociabuzz,social);
 });
 await run('Reject non-HTTPS link and base-domain landing URL',async()=>{
  for(const bad of ['http://sociabuzz.com/qa/tribe','https://sociabuzz.com/']){
   const r=await req('/api/subscription/support-methods',
    {supportUrl:'',qrisUrl:'',sociabuzzUrl:bad});
   assert.equal(r.status,400,bad+' '+JSON.stringify(r.data));
  }
 });
 await run('Old Saweria/QRIS-only clients preserve SociaBuzz',async()=>{
  const r=await req('/api/subscription/support-methods',
    {supportUrl:'https://saweria.co/'+username,qrisUrl:''});
  assert.equal(r.status,200);
  assert.equal(r.data.support.link,'https://saweria.co/'+username);
  assert.equal(r.data.support.sociabuzz,social);
 });
 await run('Remove SociaBuzz only, preserve Saweria',async()=>{
  const r=await req('/api/subscription/support-methods',
    {supportUrl:'https://saweria.co/'+username,qrisUrl:'',sociabuzzUrl:''});
  assert.equal(r.status,200);
  assert.equal(r.data.support.sociabuzz,'');
  assert.equal(r.data.support.link,'https://saweria.co/'+username);
 });
 console.log('PASS ALL',passed,'SOCIALBUZZ V435 PRODUCTION CHECKS');
}finally{
 if(sessionCookie){
  try{
   const r=await req('/api/account/delete',{password});
   console.log('QA_CLEANUP',r.status);
   assert.equal(r.status,200,'QA account deletion failed');
  }catch(e){console.error('QA_CLEANUP_ERROR',String(e));process.exitCode=1}
 }
}
