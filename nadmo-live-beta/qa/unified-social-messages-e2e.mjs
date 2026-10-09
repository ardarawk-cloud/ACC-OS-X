import assert from 'node:assert/strict';
const base='https://nadmo-live-beta-20261009.ardarawk.workers.dev';
const h='union'+crypto.randomUUID().replaceAll('-','').slice(0,10),j='union'+crypto.randomUUID().replaceAll('-','').slice(0,10);
const password='NadmoOneQA!'+crypto.randomUUID();
const json=async r=>({status:r.status,body:await r.json()});
const reg=async handle=>{
 const r=await fetch(base+'/api/account/register',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({handle,name:'One QA '+handle,password})});
 assert.equal(r.status,201);return r.headers.get('set-cookie').split(';')[0];
};
const action=async(route,cookie,data)=>json(await fetch(base+route,{method:'POST',headers:{Origin:base,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(data)}));
const get=async(route,cookie)=>json(await fetch(base+route,{headers:cookie?{Cookie:cookie}:{}}));
let ca,cb;
try{
 ca=await reg(h);cb=await reg(j);
 const post=await action('/api/account/posts/publish',ca,{text:'NADMO social public test '+h});
 assert.equal(post.status,201);
 const feed=await get('/api/social/feed');
 assert.equal(feed.status,200);
 assert.ok(feed.body.posts.some(p=>p.id===post.body.post.id));
 const unaccepted=await action('/api/messages/send',ca,{handle:j,text:'Must not deliver'});
 assert.equal(unaccepted.status,403,'Chat requires consent');
 const requested=await action('/api/messages/request',ca,{handle:j});assert.equal(requested.status,200);
 const incoming=await get('/api/messages/requests',cb);
 assert.ok(incoming.body.requests.some(x=>x.handle===h));
 const accept=await action('/api/messages/accept',cb,{handle:h});assert.equal(accept.status,200);
 const sent=await action('/api/messages/send',ca,{handle:j,text:'Chat after consent'});
 assert.equal(sent.status,201);
 const history=await get('/api/messages/thread/'+h,cb);
 assert.equal(history.status,200);assert.ok(history.body.messages.some(x=>x.text==='Chat after consent'));
 const blocked=await action('/api/messages/block',cb,{handle:h});assert.equal(blocked.status,200);
 assert.equal((await action('/api/messages/send',ca,{handle:j,text:'Not after block'})).status,403);
 const remove=await action('/api/account/posts/delete',ca,{id:post.body.post.id});assert.equal(remove.status,200);
 assert.ok(!(await get('/api/social/feed')).body.posts.some(x=>x.id===post.body.post.id));
 console.log('PASS public posting/deletion, chat consent, send, receive, blocking');
}finally{
 for(const cookie of [ca,cb].filter(Boolean)){
  const result=await action('/api/account/delete',cookie,{password});
  assert.equal(result.status,200,'QA cleanup');
 }
}
