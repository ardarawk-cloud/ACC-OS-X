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
 const id=post.body.post.id;
 const like=await action('/api/account/social/like',cb,{id,liked:true});
 assert.equal(like.status,200);
 assert.equal(like.body.likes,1);
 const again=await action('/api/account/social/like',cb,{id,liked:true});
 assert.equal(again.status,200);assert.equal(again.body.likes,1);
 const comment=await action('/api/account/social/comment',cb,{id,text:'Postingan bagus!'});
 assert.equal(comment.status,201);
 const engagement=await get('/api/social/engagement?id='+id);
 assert.equal(engagement.body.counts.likes,1);
 assert.equal(engagement.body.counts.comments,1);
 assert.equal(engagement.body.comments[0].text,'Postingan bagus!');
 const repost=await action('/api/account/social/repost',cb,{id,caption:'Konten menarik untuk komunitas NADMO.'});
 assert.equal(repost.status,201);
 const own=await get('/api/social/reposts/me',cb);
 assert.equal(own.status,200);
 assert.equal(own.body.reposts[0].original.id,id);
 assert.equal(own.body.reposts[0].caption,'Konten menarik untuk komunitas NADMO.');
 const feedWithRepost=await get('/api/social/feed');
 const shared=feedWithRepost.body.posts.find(post=>post.id===repost.body.repostId);
 assert.equal(shared.caption,'Konten menarik untuk komunitas NADMO.');
 assert.equal(shared.original.id,id);
 const badCaption=await action('/api/account/social/repost',ca,{id,caption:'a'.repeat(501)});
 assert.equal(badCaption.status,400);
  // Unrepost is owner-only: cannot remove someone else's repost, and counters stay accurate.
  // Worker/DO code can briefly be at different rollout versions immediately after deploy.
  // Retry only an unavailable API route, then fail loudly with its real response.
  let byOther;
  for(let attempt=0;attempt<10;attempt++){
   byOther=await action('/api/account/social/unrepost',ca,{id});
   if(byOther.status!==404)break;
   if(attempt<9)await new Promise(resolve=>setTimeout(resolve,2500));
  }
  assert.equal(byOther.status,200,'unrepost readiness: '+JSON.stringify(byOther.body));
  assert.equal(byOther.body.removed,false);
  assert.equal((await get('/api/social/reposts/me',cb)).body.reposts.length,1);
  const undone=await action('/api/account/social/unrepost',cb,{id});
  assert.equal(undone.status,200);
  assert.equal(undone.body.removed,true);
  assert.equal(undone.body.counts.reposts,0);
  assert.equal((await get('/api/social/reposts/me',cb)).body.reposts.length,0);
  assert.equal((await get('/api/social/engagement?id='+id)).body.counts.reposts,0);
  assert.ok(!(await get('/api/social/feed')).body.posts.some(p=>p.id===repost.body.repostId));
  assert.equal((await action('/api/account/social/unrepost',cb,{id})).body.removed,false);
  // A removed repost may be shared again by its owner without stale duplicate state.
  const againRepost=await action('/api/account/social/repost',cb,{id});
  assert.equal(againRepost.status,201);
  assert.equal((await get('/api/social/reposts/me',cb)).body.reposts.length,1);

 // Follow is account-bound and persists cross-device. Duplicate requests do not inflate counters.
 const firstFollow=await action('/api/account/follow',ca,{handle:j});
 console.log('FOLLOW DEBUG',firstFollow.status,firstFollow.body.error);
 assert.equal(firstFollow.status,200);
 assert.equal((await action('/api/account/follow',ca,{handle:j})).status,200);
 assert.equal((await action('/api/account/follow',ca,{handle:h})).status,400);
 let links=await get('/api/social/connections?type=following',ca);
 assert.equal(links.status,200);assert.equal(links.body.counts.following,1);
 assert.ok(links.body.accounts.some(x=>x.handle===j));
 links=await get('/api/social/connections?type=followers',cb);
 assert.equal(links.body.counts.followers,1);assert.ok(links.body.accounts.some(x=>x.handle===h));
 assert.equal((await get('/api/profile/'+j,ca)).body.isFollowing,true);
 assert.equal((await get('/api/profile/'+j)).body.isFollowing,false);
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
 assert.equal((await get('/api/social/connections?type=following',ca)).body.counts.following,0,'Block must also remove follow');
 assert.equal((await get('/api/social/connections?type=followers',cb)).body.counts.followers,0,'Block must also remove follower');
 assert.equal((await action('/api/account/follow',ca,{handle:j})).status,403,'Blocked follow must fail');
 const remove=await action('/api/account/posts/delete',ca,{id:post.body.post.id});assert.equal(remove.status,200);
 assert.ok(!(await get('/api/social/feed')).body.posts.some(x=>x.id===post.body.post.id));
 console.log('PASS public posting/deletion, follow counts/consent, chat consent, send, receive, blocking');
}finally{
 for(const cookie of [ca,cb].filter(Boolean)){
  const result=await action('/api/account/delete',cookie,{password});
  assert.equal(result.status,200,'QA cleanup');
 }
}
