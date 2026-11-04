import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const origin='https://live.nadmo.id',suffix=randomUUID().replaceAll('-','').slice(0,11);
const a='v2qa'+suffix+'a',b='v2qa'+suffix+'b',password='NadmoQA-v2-'+randomUUID();
let cookies=[],tests=0;
async function api(p,cookie,body){
 const method=body?'POST':'GET';
 const headers={Origin:origin,...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})};
 const response=await fetch(origin+p,{method,headers,body:body?JSON.stringify(body):undefined,redirect:'manual'});
 let data;try{data=await response.json()}catch{data={error:'INVALID_JSON'}};
 return {status:response.status,data,headers:response.headers};
}
async function register(handle){
 const r=await api('/api/account/register',null,{handle,name:'NADMO QA v2',password});
 assert.equal(r.status,201,'Register failed: '+JSON.stringify(r.data));
 const cookie=r.headers.get('set-cookie')?.split(';')[0];assert.ok(cookie);
 cookies.push(cookie);return cookie;
}
const act=(cookie,type,handle,more={})=>api('/api/messages/'+type,cookie,{handle,...more});
const get=(cookie,handle)=>api('/api/messages/thread/'+handle,cookie);
const run=async(name,fn)=>{await fn();tests++;console.log('PASS',name)};
try{
 const ca=await register(a),cb=await register(b);
 const message=await act(ca,'send',b,{text:'NADMO v430 QA!'});assert.equal(message.status,201);
 const id=message.data.message.id;
 await run('react is authenticated and visible both sides',async()=>{
  assert.equal((await act(cb,'react',a,{messageId:id,emoji:'❤️'})).status,200);
  const mine=(await get(cb,a)).data.messages.find(m=>m.id===id);
  assert.equal(mine.reactions[0].emoji,'❤️');assert.equal(mine.reactions[0].mine,true);
  const peer=(await get(ca,b)).data.messages.find(m=>m.id===id);
  assert.equal(peer.reactions[0].count,1);assert.equal(peer.reactions[0].mine,false);
 });
 await run('reaction replaced then toggled off',async()=>{
  assert.equal((await act(cb,'react',a,{messageId:id,emoji:'🔥'})).status,200);
  const r=(await get(ca,b)).data.messages.find(m=>m.id===id);
  assert.equal(r.reactions.length,1);assert.equal(r.reactions[0].emoji,'🔥');
  assert.equal((await act(cb,'react',a,{messageId:id,emoji:'🔥'})).status,200);
  assert.equal((await get(ca,b)).data.messages.find(m=>m.id===id).reactions.length,0);
 });
 await run('unsupported emoji rejected',async()=>{
  assert.equal((await act(cb,'react',a,{messageId:id,emoji:'unsupported'})).status,403);
 });
 await run('starred messages private per account',async()=>{
  assert.equal((await act(cb,'star',a,{messageId:id,enabled:true})).status,200);
  assert.equal((await get(cb,a)).data.messages.find(m=>m.id===id).starred,true);
  assert.equal((await get(ca,b)).data.messages.find(m=>m.id===id).starred,false);
 });
 await run('archive is private to the user',async()=>{
  assert.equal((await act(cb,'archive',a,{enabled:true})).status,200);
  assert.equal((await api('/api/messages/threads',cb)).data.threads.find(x=>x.handle===a).archived,true);
  assert.equal((await api('/api/messages/threads',ca)).data.threads.find(x=>x.handle===b).archived,false);
 });
 await run('mark unread persists until chat opens',async()=>{
  await get(cb,a);
  assert.equal((await act(cb,'mark-unread',a)).status,200);
  assert.ok((await api('/api/messages/threads',cb)).data.totalUnread>=1);
  await get(cb,a);
  assert.equal((await api('/api/messages/threads',cb)).data.totalUnread,0);
 });
 await run('unstar and unarchive',async()=>{
  assert.equal((await act(cb,'star',a,{messageId:id,enabled:false})).status,200);
  assert.equal((await act(cb,'archive',a,{enabled:false})).status,200);
  assert.equal((await get(cb,a)).data.messages.find(m=>m.id===id).starred,false);
  assert.equal((await api('/api/messages/threads',cb)).data.threads.find(x=>x.handle===a).archived,false);
 });
 await run('old delete-for-everyone still works',async()=>{
  assert.equal((await act(ca,'delete',b,{messageId:id,scope:'everyone'})).status,200);
  assert.equal((await act(cb,'star',a,{messageId:id,enabled:true})).status,404);
  assert.equal((await act(cb,'react',a,{messageId:id,emoji:'❤️'})).status,404);
 });
 console.log('PASS ALL',tests,'PRODUCTION V430 SMOKE');
}finally{
 for(const cookie of cookies){
  try{const r=await api('/api/account/delete',cookie,{password});console.log('QA_CLEANUP',r.status);assert.equal(r.status,200)}
  catch(e){console.error('QA_CLEANUP_ERROR',String(e))}
 }
}
