// Production smoke: create ONLY temporary QA users, never touch real accounts.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const base='https://live.nadmo.id';
const suffix=randomUUID().replaceAll('-','').slice(0,9);
const A='dmqa'+suffix+'a',B='dmqa'+suffix+'b',password='NadmoDmQA!'+randomUUID();
const sessions=[];
async function call(url,{cookie,body}={}){
 const method=body?'POST':'GET';
 const headers={Origin:base,...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})};
 const response=await fetch(base+url,{method,headers,body:body?JSON.stringify(body):undefined,redirect:'manual'});
 let data;try{data=await response.json()}catch{data={error:'INVALID_JSON'}};
 return {status:response.status,data,headers:response.headers};
}
async function register(handle){
 const r=await call('/api/account/register',{body:{handle,name:'NADMO Messaging QA',password}});
 assert.equal(r.status,201,'QA account register '+handle+' '+JSON.stringify(r.data).slice(0,120));
 const cookie=r.headers.get('set-cookie')?.split(';')[0];
 assert.ok(cookie,'QA login session cookie');
 sessions.push(cookie);
 return cookie;
}
const action=(cookie,route,handle,fields={})=>call('/api/messages/'+route,{cookie,body:{handle,...fields}});
const thread=(cookie,handle)=>call('/api/messages/thread/'+handle,{cookie});
const checks=[];
async function check(name,fn){await fn();checks.push(name);console.log('PASS',name)}
try{
 const ca=await register(A),cb=await register(B);
 let initial;
 await check('send existing DM and unread',async()=>{
  initial=await action(ca,'send',B,{text:'NADMO QA: first message'});
  assert.equal(initial.status,201);
  const unread=await call('/api/messages/threads',{cookie:cb});
  assert.ok(unread.data.totalUnread>=1);
 });
 await check('delete for me, receiver retains message',async()=>{
  const r=await action(ca,'delete',B,{messageId:initial.data.message.id,scope:'me'});
  assert.equal(r.status,200,'delete me: '+JSON.stringify(r.data));
  assert.ok(!(await thread(ca,B)).data.messages.some(m=>m.id===initial.data.message.id));
  assert.ok((await thread(cb,A)).data.messages.some(m=>m.id===initial.data.message.id));
 });
 await check('edit sender, receiver sees edited result',async()=>{
  const sent=await action(ca,'send',B,{text:'Edit this'});
  const e=await action(ca,'edit',B,{messageId:sent.data.message.id,text:'Edited successfully'});
  assert.equal(e.status,200);
  const m=(await thread(cb,A)).data.messages.find(m=>m.id===sent.data.message.id);
  assert.equal(m.text,'Edited successfully');assert.ok(m.editedAt);
 });
 await check('receiver forbidden from editing message',async()=>{
  const sent=await action(ca,'send',B,{text:'Permission check'});
  const e=await action(cb,'edit',A,{messageId:sent.data.message.id,text:'Unauthorized'});
  assert.equal(e.status,403);
 });
 await check('sender recall everyone',async()=>{
  const sent=await action(ca,'send',B,{text:'Delete all'});
  assert.equal((await action(ca,'delete',B,{messageId:sent.data.message.id,scope:'everyone'})).status,200);
  for(const [c,h] of [[ca,B],[cb,A]]){const m=(await thread(c,h)).data.messages.find(x=>x.id===sent.data.message.id);assert.equal(m.deletedForEveryone,true);assert.equal(m.text,'')}
 });
 await check('reply and quote',async()=>{
  const target=await action(ca,'send',B,{text:'Quote me'});
  const reply=await action(cb,'send',A,{text:'Reply to you',replyTo:target.data.message.id});
  assert.equal(reply.status,201);
  const m=(await thread(ca,B)).data.messages.find(x=>x.id===reply.data.message.id);
  assert.equal(m.replyTo?.id,target.data.message.id);
 });
 await check('pin and mute are per-account',async()=>{
  assert.equal((await action(ca,'pin',B,{enabled:true})).status,200);
  assert.equal((await action(ca,'mute',B,{enabled:true})).status,200);
  const t=(await call('/api/messages/threads',{cookie:ca})).data.threads.find(x=>x.handle===B);
  assert.equal(t.pinned,true);assert.equal(t.muted,true);
  const other=(await call('/api/messages/threads',{cookie:cb})).data.threads.find(x=>x.handle===A);
  assert.equal(other.pinned,false);
 });
 await check('clear chat for me, peer history preserved',async()=>{
  assert.equal((await action(ca,'clear',B)).status,200);
  assert.equal((await thread(ca,B)).data.messages.length,0);
  assert.ok((await thread(cb,A)).data.messages.length>0);
 });
 console.log('PASS ALL',checks.length,'real production DM checks; user data: QA only');
}finally{
 for(const cookie of sessions){
  try{const r=await call('/api/account/delete',{cookie,body:{password}});console.log('QA_CLEANUP',r.status)}catch(e){console.error('QA_CLEANUP_EXCEPTION',String(e).slice(0,100))}
 }
}
