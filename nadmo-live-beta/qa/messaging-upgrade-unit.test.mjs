import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {accountEndpoint} from '../account.mjs';
const origin='https://live.nadmo.id';
const digest=token=>createHash('sha256').update(token).digest('hex');
async function fixture(){
 const db=new Map();
 const storage={
  get:async key=>db.get(key),
  put:async(key,value)=>{db.set(key,structuredClone(value))},
  delete:async key=>{db.delete(key)},
  list:async({prefix='',limit=1000}={})=>new Map([...db].filter(([key])=>key.startsWith(prefix)).slice(0,limit)),
  transaction:async fn=>fn(storage)
 };
 const [a,b]=[
  {id:'user-alpha-001',handle:'alpha',name:'Alpha',dmPrivacy:'everyone',disabled:false},
  {id:'user-bravo-001',handle:'bravo',name:'Bravo',dmPrivacy:'everyone',disabled:false}
 ];
 const accounts={alpha:a,bravo:b},tokens={alpha:'a'.repeat(64),bravo:'b'.repeat(64)};
 for(const user of [a,b]){
  await storage.put('auth-user:'+user.id,user);
  await storage.put('auth-handle:'+user.handle,user.id);
  await storage.put('auth-session:'+digest(tokens[user.handle]),{id:user.id,expiresAt:Date.now()+86400000});
 }
 const call=async(who,route,body=null)=>{
  const method=body?'POST':'GET',headers={Origin:origin,'x-nadmo-client-ip':who+'-qa-'+route};
  if(who!=='anon')headers.Cookie='nadmo_beta_session='+tokens[who];
  if(body)headers['Content-Type']='application/json';
  const request=new Request(origin+route,{method,headers,...(body?{body:JSON.stringify(body)}:{})});
  const result=await accountEndpoint(storage,request);
  return {status:result.status,data:await result.json()};
 };
 const send=(from,to,text,other={})=>call(from,'/api/messages/send',{handle:to,text,...other});
 const thread=(who,other)=>call(who,'/api/messages/thread/'+other);
 const threads=who=>call(who,'/api/messages/threads');
 const act=(from,route,to,extra={})=>call(from,'/api/messages/'+route,{handle:to,...extra});
 const key='dm-thread:'+a.id+':'+b.id;
 return {storage,accounts,call,send,thread,threads,act,key};
}
test('Existing DM send, inbox and unread remain functional',async()=>{
 const x=await fixture();
 assert.equal((await x.send('alpha','bravo','Halo!')).status,201);
 assert.equal((await x.threads('bravo')).data.totalUnread,1);
 assert.equal((await x.thread('bravo','alpha')).data.messages[0].text,'Halo!');
 assert.equal((await x.threads('bravo')).data.totalUnread,0);
});
test('Delete only for self hides sender copy, other participant intact',async()=>{
 const x=await fixture();const sent=(await x.send('alpha','bravo','Private to remove')).data.message;
 assert.equal((await x.act('alpha','delete','bravo',{messageId:sent.id,scope:'me'})).status,200);
 assert.equal((await x.thread('alpha','bravo')).data.messages.length,0);
 assert.equal((await x.thread('bravo','alpha')).data.messages[0].text,'Private to remove');
});
test('Recipient can delete only own copy of received message',async()=>{
 const x=await fixture();const sent=(await x.send('alpha','bravo','Read and delete')).data.message;
 assert.equal((await x.act('bravo','delete','alpha',{messageId:sent.id,scope:'me'})).status,200);
 assert.equal((await x.thread('bravo','alpha')).data.messages.length,0);
 assert.equal((await x.thread('alpha','bravo')).data.messages[0].text,'Read and delete');
});
test('Delete for everyone produces tombstone and erases shared text',async()=>{
 const x=await fixture();const sent=(await x.send('alpha','bravo','Secret text')).data.message;
 assert.equal((await x.act('alpha','delete','bravo',{messageId:sent.id,scope:'everyone'})).status,200);
 for(const side of [['alpha','bravo'],['bravo','alpha']]){
  const m=(await x.thread(...side)).data.messages[0];
  assert.equal(m.deletedForEveryone,true);assert.equal(m.text,'');
 }
 const stored=(await x.storage.get(x.key))[0];assert.equal(stored.text,'');
});
test('Delete for everyone blocked for someone who did not send',async()=>{
 const x=await fixture();const sent=(await x.send('alpha','bravo','Safe')).data.message;
 assert.equal((await x.act('bravo','delete','alpha',{messageId:sent.id,scope:'everyone'})).status,403);
 assert.equal((await x.thread('alpha','bravo')).data.messages[0].text,'Safe');
});
test('Edit own message succeeds within 15 minutes with editedAt',async()=>{
 const x=await fixture();const sent=(await x.send('alpha','bravo','Before')).data.message;
 assert.equal((await x.act('alpha','edit','bravo',{messageId:sent.id,text:'After'})).status,200);
 const result=(await x.thread('bravo','alpha')).data.messages[0];
 assert.equal(result.text,'After');assert.ok(result.editedAt);
});
test('Other user cannot edit someone else message',async()=>{
 const x=await fixture();const sent=(await x.send('alpha','bravo','Original')).data.message;
 assert.equal((await x.act('bravo','edit','alpha',{messageId:sent.id,text:'Forged'})).status,403);
 assert.equal((await x.thread('alpha','bravo')).data.messages[0].text,'Original');
});
test('Edit after 15 minutes rejected on server',async()=>{
 const x=await fixture();const sent=(await x.send('alpha','bravo','Old')).data.message;
 const arr=await x.storage.get(x.key);arr[0].createdAt-=16*60000;await x.storage.put(x.key,arr);
 assert.equal((await x.act('alpha','edit','bravo',{messageId:sent.id,text:'New'})).status,409);
});
test('Delete for everyone after 24 hours rejected on server',async()=>{
 const x=await fixture();const sent=(await x.send('alpha','bravo','Old')).data.message;
 const arr=await x.storage.get(x.key);arr[0].createdAt-=25*3600000;await x.storage.put(x.key,arr);
 assert.equal((await x.act('alpha','delete','bravo',{messageId:sent.id,scope:'everyone'})).status,409);
});
test('Clear chat removes only this account history/inbox, then recovers on new message',async()=>{
 const x=await fixture();await x.send('alpha','bravo','Old message');
 await new Promise(r=>setTimeout(r,4));
 assert.equal((await x.act('alpha','clear','bravo')).data.cleared,true);
 assert.equal((await x.thread('alpha','bravo')).data.messages.length,0);
 assert.ok(!(await x.threads('alpha')).data.threads.some(t=>t.handle==='bravo'));
 assert.equal((await x.thread('bravo','alpha')).data.messages.length,1);
 await new Promise(r=>setTimeout(r,4));
 await x.send('bravo','alpha','New message');
 const visible=(await x.thread('alpha','bravo')).data.messages;
 assert.equal(visible.length,1);assert.equal(visible[0].text,'New message');
});
test('Pin and mute belong only to current account and support unpin',async()=>{
 const x=await fixture();await x.send('alpha','bravo','Hello');
 assert.equal((await x.act('alpha','pin','bravo',{enabled:true})).status,200);
 assert.equal((await x.act('alpha','mute','bravo',{enabled:true})).status,200);
 assert.equal((await x.threads('alpha')).data.threads[0].pinned,true);
 assert.equal((await x.threads('alpha')).data.threads[0].muted,true);
 assert.equal((await x.threads('bravo')).data.threads[0].pinned,false);
 assert.equal((await x.threads('bravo')).data.threads[0].muted,false);
 assert.equal((await x.act('alpha','pin','bravo',{enabled:false})).status,200);
 assert.equal((await x.threads('alpha')).data.threads[0].pinned,false);
});
test('Reply references permitted existing message in a safe bounded quote',async()=>{
 const x=await fixture();const original=(await x.send('alpha','bravo','First')).data.message;
 await x.send('bravo','alpha','Reply',{replyTo:original.id});
 const reply=(await x.thread('alpha','bravo')).data.messages.at(-1);
 assert.equal(reply.replyTo.id,original.id);assert.equal(reply.replyTo.text,'First');
});
test('Cannot send long or empty edits',async()=>{
 const x=await fixture();const original=(await x.send('alpha','bravo','First')).data.message;
 assert.equal((await x.act('alpha','edit','bravo',{messageId:original.id,text:''})).status,400);
 assert.equal((await x.act('alpha','edit','bravo',{messageId:original.id,text:'X'.repeat(2001)})).status,400);
});
test('Cannot delete unknown or forged message id',async()=>{
 const x=await fixture();await x.send('alpha','bravo','First');
 assert.equal((await x.act('alpha','delete','bravo',{messageId:'abc',scope:'me'})).status,400);
 assert.equal((await x.act('alpha','delete','bravo',{messageId:crypto.randomUUID(),scope:'everyone'})).status,404);
});
test('Unauthenticated requests cannot change message',async()=>{
 const x=await fixture();const sent=(await x.send('alpha','bravo','First')).data.message;
 assert.equal((await x.act('anon','delete','bravo',{messageId:sent.id,scope:'everyone'})).status,401);
 assert.equal((await x.thread('bravo','alpha')).data.messages[0].text,'First');
});
test('Block still prevents incoming messages after new actions',async()=>{
 const x=await fixture();await x.send('alpha','bravo','First');
 assert.equal((await x.act('bravo','block','alpha')).status,200);
 assert.equal((await x.send('alpha','bravo','Should fail')).status,403);
});
test('Hidden-for IDs are never sent to the client',async()=>{
 const x=await fixture();const sent=(await x.send('alpha','bravo','First')).data.message;
 await x.act('alpha','delete','bravo',{messageId:sent.id,scope:'me'});
 const json=JSON.stringify((await x.thread('bravo','alpha')).data);
 assert.ok(!json.includes('hiddenFor'));assert.ok(!json.includes('fromId'));
});
test('XSS input remains text payload for safe DOM textContent rendering',async()=>{
 const x=await fixture();
 await x.send('alpha','bravo','<img src=x onerror=alert(1)>');
 const m=(await x.thread('bravo','alpha')).data.messages[0];
 assert.equal(m.text,'<img src=x onerror=alert(1)>');
});

test('Emoji reaction is visible to both, toggle removes it',async()=>{
 const x=await fixture(),sent=(await x.send('alpha','bravo','Reaction test')).data.message;
 assert.equal((await x.act('bravo','react','alpha',{messageId:sent.id,emoji:'❤️'})).status,200);
 const a=(await x.thread('alpha','bravo')).data.messages[0];
 assert.equal(a.reactions[0].emoji,'❤️');assert.equal(a.reactions[0].count,1);
 const b=(await x.thread('bravo','alpha')).data.messages[0];
 assert.equal(b.reactions[0].mine,true);
 assert.equal((await x.act('bravo','react','alpha',{messageId:sent.id,emoji:'❤️'})).status,200);
 assert.equal((await x.thread('alpha','bravo')).data.messages[0].reactions.length,0);
});
test('One reaction per account and disallow unsupported emoji',async()=>{
 const x=await fixture(),sent=(await x.send('alpha','bravo','Emoji')).data.message;
 await x.act('alpha','react','bravo',{messageId:sent.id,emoji:'👍'});
 await x.act('alpha','react','bravo',{messageId:sent.id,emoji:'🔥'});
 const a=(await x.thread('bravo','alpha')).data.messages[0];
 assert.equal(a.reactions.length,1);assert.equal(a.reactions[0].emoji,'🔥');
 assert.equal((await x.act('alpha','react','bravo',{messageId:sent.id,emoji:'invalid'})).status,400);
});
test('Star is private, persistent and unstar works',async()=>{
 const x=await fixture(),sent=(await x.send('alpha','bravo','Important')).data.message;
 assert.equal((await x.act('bravo','star','alpha',{messageId:sent.id,enabled:true})).status,200);
 assert.equal((await x.thread('bravo','alpha')).data.messages[0].starred,true);
 assert.equal((await x.thread('alpha','bravo')).data.messages[0].starred,false);
 assert.equal((await x.act('bravo','star','alpha',{messageId:sent.id,enabled:false})).status,200);
 assert.equal((await x.thread('bravo','alpha')).data.messages[0].starred,false);
});
test('Archive status only affects account selected',async()=>{
 const x=await fixture();await x.send('alpha','bravo','Archive test');
 assert.equal((await x.act('bravo','archive','alpha',{enabled:true})).status,200);
 assert.equal((await x.threads('bravo')).data.threads[0].archived,true);
 assert.equal((await x.threads('alpha')).data.threads[0].archived,false);
 assert.equal((await x.act('bravo','archive','alpha',{enabled:false})).status,200);
 assert.equal((await x.threads('bravo')).data.threads[0].archived,false);
});
test('Mark unread is per user until opening thread',async()=>{
 const x=await fixture();await x.send('alpha','bravo','Read first');
 await x.thread('bravo','alpha');
 assert.equal((await x.threads('bravo')).data.totalUnread,0);
 assert.equal((await x.act('bravo','mark-unread','alpha')).status,200);
 assert.equal((await x.threads('bravo')).data.totalUnread,1);
 assert.equal((await x.threads('alpha')).data.totalUnread,0);
 await x.thread('bravo','alpha');
 assert.equal((await x.threads('bravo')).data.totalUnread,0);
});
test('Unverified stranger cannot react to random message',async()=>{
 const x=await fixture(),sent=(await x.send('alpha','bravo','Secure')).data.message;
 assert.equal((await x.act('anon','react','bravo',{messageId:sent.id,emoji:'❤️'})).status,401);
 assert.equal((await x.act('bravo','react','alpha',{messageId:'0'.repeat(36),emoji:'❤️'})).status,404);
});
test('Deleted-for-everyone messages cannot be reacted or starred',async()=>{
 const x=await fixture(),sent=(await x.send('alpha','bravo','Gone')).data.message;
 await x.act('alpha','delete','bravo',{messageId:sent.id,scope:'everyone'});
 assert.equal((await x.act('bravo','react','alpha',{messageId:sent.id,emoji:'❤️'})).status,404);
 assert.equal((await x.act('bravo','star','alpha',{messageId:sent.id,enabled:true})).status,404);
});
test('Message reaction identities are not in public read payload',async()=>{
 const x=await fixture(),sent=(await x.send('alpha','bravo','Private')).data.message;
 await x.act('bravo','react','alpha',{messageId:sent.id,emoji:'👍'});
 const serialized=JSON.stringify((await x.thread('alpha','bravo')).data.messages);
 assert.ok(!serialized.includes('user-bravo-001'));assert.ok(!serialized.includes('user-alpha-001'));
 assert.ok(!serialized.includes('hiddenFor'));
});
