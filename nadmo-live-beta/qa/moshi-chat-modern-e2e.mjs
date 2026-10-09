import assert from 'node:assert/strict';
const base='https://nadmo-live-beta-20261009.ardarawk.workers.dev';
const handles=Array.from({length:4},(_,i)=>'moshi'+i+crypto.randomUUID().replaceAll('-','').slice(0,10));
const password='NadmoMoshiE2E!'+crypto.randomUUID();
const parse=async response=>({status:response.status,body:await response.json()});
const cookies=[];
const register=async handle=>{
 const result=await fetch(base+'/api/account/register',{method:'POST',
  headers:{Origin:base,'Content-Type':'application/json'},
  body:JSON.stringify({handle,name:'MOSHI QA '+handle,password})});
 assert.equal(result.status,201,'Register '+handle);
 const cookie=result.headers.get('set-cookie').split(';')[0];cookies.push(cookie);return cookie;
};
const post=async(p,cookie,body)=>parse(await fetch(base+p,{method:'POST',headers:{Origin:base,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(body)}));
const get=async(p,cookie)=>parse(await fetch(base+p,{headers:{Cookie:cookie}}));
try{
 const [A,B,C,D]=await Promise.all(handles.map(register));
 assert.equal((await get('/api/messages/settings',B)).body.privacy,'everyone','Default direct inbox');
 const direct=await post('/api/messages/send',A,{handle:handles[1],text:'Halo NADMO! Tidak wajib meminta chat.'});
 assert.equal(direct.status,201,'Open chat direct, no consent');
 const inbox=await get('/api/messages/threads',B);
 assert.equal(inbox.status,200);assert.equal(inbox.body.totalUnread,1);
 const row=inbox.body.threads.find(x=>x.handle===handles[0]);
 assert.equal(row.name,'MOSHI QA '+handles[0]);
 assert.equal(row.unread,1);assert.ok(row.lastText.includes('Halo'));
 assert.equal((await get('/api/messages/thread/'+handles[0],B)).status,200);
 assert.equal((await get('/api/messages/threads',B)).body.totalUnread,0,'read receipts clear unread');
 assert.equal((await post('/api/messages/privacy',B,{privacy:'requests'})).body.privacy,'requests');
 assert.equal((await get('/api/messages/settings',B)).body.privacy,'requests');
 assert.equal((await post('/api/messages/send',C,{handle:handles[1],text:'Should wait for approval'})).status,403);
 const ask=await post('/api/messages/request',C,{handle:handles[1]});
 assert.equal(ask.status,200);assert.equal(ask.body.pending,true);
 assert.ok((await get('/api/messages/requests',B)).body.requests.some(x=>x.handle===handles[2]));
 assert.equal((await post('/api/messages/accept',B,{handle:handles[2]})).status,200);
 assert.equal((await post('/api/messages/send',C,{handle:handles[1],text:'Accepted request works'})).status,201);
 assert.equal((await post('/api/messages/send',A,{handle:handles[1],text:'Existing chat persists despite setting'})).status,201);
 assert.equal((await post('/api/messages/privacy',B,{privacy:'following'})).status,200);
 assert.equal((await post('/api/messages/send',D,{handle:handles[1],text:'No follow yet'})).status,403);
 assert.equal((await post('/api/account/follow',B,{handle:handles[3]})).status,200);
 assert.equal((await post('/api/messages/send',D,{handle:handles[1],text:'Following privacy permits DM'})).status,201);
 assert.equal((await post('/api/messages/block',B,{handle:handles[3]})).status,200);
 assert.equal((await post('/api/messages/send',D,{handle:handles[1],text:'Blocked'})).status,403);
 assert.equal((await post('/api/messages/privacy',B,{privacy:'invalid'})).status,400);
 console.log('PASS MOSHI direct send, unread count, read, requests opt-in, following-only, block and persistence');
}finally{
 for(const cookie of cookies){
  const removed=await post('/api/account/delete',cookie,{password});
  assert.equal(removed.status,200,'Cleanup test account');
 }
}
