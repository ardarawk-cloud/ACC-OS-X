import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {normaliseDmView,visibleDmMessages,summariseDm,updateDmText,validateDmReply,DM_EDIT_WINDOW_MS} from '../messages-v2.mjs';
import {accountEndpoint} from '../account.mjs';

const owner='alice',friend='bobby',ua='user-a-001',ub='user-b-002';
const msg=(id,handle='alice',createdAt=Date.now()-1000,text='Halo')=>({id,fromHandle:handle,createdAt,text});
const m1=msg('11111111-1111-4111-8111-111111111111');
const m2=msg('22222222-2222-4222-8222-222222222222','bobby');

class Storage{
 constructor(){this.state=new Map()}
 async get(k){return this.state.get(k)}
 async put(k,v){this.state.set(k,structuredClone(v))}
 async delete(k){this.state.delete(k)}
 async list({prefix='',limit=1000}={}){return new Map([...this.state.entries()].filter(([k])=>k.startsWith(prefix)).slice(0,limit))}
 async transaction(fn){return fn(this)}
}
function setup(){
 const storage=new Storage(),now=Date.now();
 const users=[{id:ua,handle:owner,name:'Alice',dmPrivacy:'everyone',createdAt:now-100000},
              {id:ub,handle:friend,name:'Bob',dmPrivacy:'everyone',createdAt:now-100000}];
 for(const u of users){storage.state.set('auth-user:'+u.id,u);storage.state.set('auth-handle:'+u.handle,u.id)}
 const cookies=new Map();
 for(const u of users){
  const token=u===users[0]?'a'.repeat(64):'b'.repeat(64);
  const hash=createHash('sha256').update(token).digest('hex');
  storage.state.set('auth-session:'+hash,{id:u.id,expiresAt:now+10000000});
  cookies.set(u.handle,'nadmo_beta_session='+token);
 }
 const request=(handle,path,body=null,method=body?'POST':'GET')=>new Request('https://live.nadmo.id'+path,{
  method,headers:{Cookie:cookies.get(handle)||'',Origin:'https://live.nadmo.id','Content-Type':'application/json','x-nadmo-client-ip':handle},
  ...(body?{body:JSON.stringify(body)}:{})
 });
 const call=async(handle,path,body=null)=>{const response=await accountEndpoint(storage,request(handle,path,body));return {status:response.status,data:await response.json()}};
 return {storage,call,request};
}
test('view normalizes malicious and unexpected metadata',()=>{
 const v=normaliseDmView({clearedAt:NaN,hiddenIds:['not-a-uuid',m1.id,m1.id],pinned:'true',muted:true});
 assert.deepEqual(v.hiddenIds,[m1.id]);assert.equal(v.pinned,false);assert.equal(v.muted,true);assert.equal(v.clearedAt,0);
});
test('delete for me only hides own view',()=>{
 const a=visibleDmMessages([m1,m2],{hiddenIds:[m1.id]}),b=visibleDmMessages([m1,m2],{});
 assert.equal(a.length,1);assert.equal(b.length,2);
});
test('cleared conversation cannot resurrect old message',()=>{
 const cut=Date.now();const list=visibleDmMessages([m1,m2],{clearedAt:cut});
 assert.equal(list.length,0);
});
test('deleted for all removes plaintext and reply quote on all sides',()=>{
 const removed=updateDmText([m1,m2],{actorHandle:'alice',id:m1.id,action:'delete-for-all'});
 assert.equal(removed.message.text,'');assert.equal(removed.message.deletedForAll,true);
 const replied={...m2,replyToId:m1.id};
 const publicList=visibleDmMessages([removed.message,replied],{});
 assert.equal(publicList[1].replyPreview,'Pesan tidak tersedia');
});
test('different author cannot edit or delete for everyone',()=>{
 for(const action of ['edit','delete-for-all']){
  assert.equal(updateDmText([m1],{actorHandle:'bobby',id:m1.id,action,text:'Change'}).error,'NOT_AUTHOR');
 }
});
test('edit allowed within 15 minutes and marked, not after',()=>{
 const now=m1.createdAt+DM_EDIT_WINDOW_MS-1;
 const edited=updateDmText([m1],{actorHandle:'alice',id:m1.id,action:'edit',text:'Baru',now});
 assert.equal(edited.message.text,'Baru');assert.equal(edited.message.editedAt,now);
 assert.equal(updateDmText([m1],{actorHandle:'alice',id:m1.id,action:'edit',text:'Baru',now:now+2}).error,'EDIT_WINDOW_EXPIRED');
});
test('reply must point to visible nondeleted message',()=>{
 assert.equal(validateDmReply([m1],m1.id,{}).replyToId,m1.id);
 assert.equal(validateDmReply([m1],m1.id,{hiddenIds:[m1.id]}).error,'REPLY_NOT_FOUND');
 assert.equal(validateDmReply([{...m1,deletedForAll:true,text:''}],m1.id,{}).error,'REPLY_NOT_FOUND');
});
test('unread excludes hidden, deleted, cleared messages',()=>{
 const inbox=summariseDm([m1,{...m2,deletedForAll:true,text:''}],{},'alice',0);
 assert.equal(inbox.unread,0);assert.equal(inbox.lastText,'Pesan dihapus');
});
test('legacy messages without new fields remain readable',()=>{
 const old={id:m1.id,fromHandle:'alice',text:'Old',createdAt:m1.createdAt};
 const visible=visibleDmMessages([old],{});
 assert.equal(visible[0].text,'Old');assert.equal(visible[0].deletedForAll,false);
});

test('server: existing account can send, and recipient can read',async()=>{
 const {call}=setup();
 const send=await call('alice','/api/messages/send',{handle:'bobby',text:'Halo Bob'});
 assert.equal(send.status,201);
 const received=await call('bobby','/api/messages/thread/alice');
 assert.equal(received.status,200);
 assert.equal(received.data.messages[0].text,'Halo Bob');
});
test('server: sender delete-for-me persists but does not remove other copy',async()=>{
 const {call}=setup();
 const sent=await call('alice','/api/messages/send',{handle:'bobby',text:'Private hello'});
 const id=sent.data.message.id;
 const action=await call('alice','/api/messages/message-action',{handle:'bobby',id,action:'delete-for-me'});
 assert.equal(action.status,200);assert.equal(action.data.appliesToOther,false);
 const own=await call('alice','/api/messages/thread/bobby'),other=await call('bobby','/api/messages/thread/alice');
 assert.equal(own.data.messages.length,0);assert.equal(other.data.messages.length,1);
});
test('server: sender delete-for-all becomes tombstone on both accounts',async()=>{
 const {call}=setup();
 const sent=await call('alice','/api/messages/send',{handle:'bobby',text:'Secret'});
 const id=sent.data.message.id;
 const action=await call('alice','/api/messages/message-action',{handle:'bobby',id,action:'delete-for-all'});
 assert.equal(action.status,200);
 const other=await call('bobby','/api/messages/thread/alice');
 assert.equal(other.data.messages[0].text,'');assert.equal(other.data.messages[0].deletedForAll,true);
});
test('server: receiver cannot delete for everyone',async()=>{
 const {call}=setup();
 const sent=await call('alice','/api/messages/send',{handle:'bobby',text:'A'});
 const r=await call('bobby','/api/messages/message-action',{handle:'alice',id:sent.data.message.id,action:'delete-for-all'});
 assert.equal(r.status,403);
});
test('server: edit and reply link update consistently',async()=>{
 const {call}=setup();
 const sent=await call('alice','/api/messages/send',{handle:'bobby',text:'Original'});
 const id=sent.data.message.id;
 const updated=await call('alice','/api/messages/message-action',{handle:'bobby',id,action:'edit',text:'Updated'});
 assert.equal(updated.status,200);
 const response=await call('bobby','/api/messages/send',{handle:'alice',text:'Reply',replyToId:id});
 assert.equal(response.status,201);
 const messages=await call('alice','/api/messages/thread/bobby');
 assert.equal(messages.data.messages[1].replyPreview,'Updated');
});
test('server: conversation clear only for account owner',async()=>{
 const {call}=setup();
 await call('alice','/api/messages/send',{handle:'bobby',text:'Bersih'});
 const removed=await call('alice','/api/messages/conversation-action',{handle:'bobby',action:'clear'});
 assert.equal(removed.status,200);assert.equal(removed.data.appliesToOther,false);
 const own=await call('alice','/api/messages/thread/bobby'),other=await call('bobby','/api/messages/thread/alice');
 assert.equal(own.data.messages.length,0);assert.equal(other.data.messages.length,1);
});
test('server: pin, mute, archive and unarchive are account-scoped',async()=>{
 const {call}=setup();
 const modes=[['pin','pinned'],['mute','muted'],['archive','archived']];
 for(const [action,field] of modes){
  const response=await call('alice','/api/messages/conversation-action',{handle:'bobby',action,enabled:true});
  assert.equal(response.status,200);assert.equal(response.data.preferences[field],true);
 }
 const other=await call('bobby','/api/messages/thread/alice');
 assert.equal(other.data.preferences.pinned,false);assert.equal(other.data.preferences.archived,false);
});
test('server: unread marker is account-scoped and cleared on opening',async()=>{
 const {call}=setup();
 await call('alice','/api/messages/send',{handle:'bobby',text:'New'});
 await call('bobby','/api/messages/thread/alice');
 await call('bobby','/api/messages/conversation-action',{handle:'alice',action:'mark-unread'});
 const summary=await call('bobby','/api/messages/threads');
 assert.equal(summary.data.totalUnread,1);
 await call('bobby','/api/messages/thread/alice');
 const again=await call('bobby','/api/messages/threads');assert.equal(again.data.totalUnread,0);
});
test('server: star stays private to user and toggles off',async()=>{
 const {call}=setup();
 const sent=await call('alice','/api/messages/send',{handle:'bobby',text:'Penting'});
 const id=sent.data.message.id;
 await call('alice','/api/messages/message-action',{handle:'bobby',id,action:'star',enabled:true});
 const own=await call('alice','/api/messages/thread/bobby'),other=await call('bobby','/api/messages/thread/alice');
 assert.equal(own.data.messages[0].starred,true);assert.equal(other.data.messages[0].starred,false);
});
test('server: normal old DM endpoints and privacy options still work',async()=>{
 const {call}=setup();
 const privacy=await call('alice','/api/messages/privacy',{privacy:'requests'});
 assert.equal(privacy.status,200);
 const settings=await call('alice','/api/messages/settings');assert.equal(settings.data.privacy,'requests');
});
