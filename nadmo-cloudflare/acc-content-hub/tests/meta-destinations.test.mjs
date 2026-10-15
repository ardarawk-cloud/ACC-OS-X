import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {discoverMeta,handleMetaDestinations} from '../meta-destinations.mjs';
const sqlA=readFileSync(new URL('../migrations/0002_social_chat_channels.sql',import.meta.url),'utf8');
const sqlB=readFileSync(new URL('../migrations/0003_social_destinations.sql',import.meta.url),'utf8');
function makeDB(){
 const raw=new DatabaseSync(':memory:');raw.exec(sqlA);raw.exec(sqlB);
 const prepare=sql=>({bind(...args){return {async first(){return raw.prepare(sql).get(...args)},async all(){return {results:raw.prepare(sql).all(...args)}},async run(){return {meta:{changes:raw.prepare(sql).run(...args).changes}}}}}});
 return {prepare,async batch(stmts){return Promise.all(stmts.map(s=>s.run()))},raw};
}
const connector={async fetch(request){
 const p=new URL(request.url).pathname;
 if(p.endsWith('/pages'))return Response.json({ok:true,pages:[{id:'101',name:'Nadmo Studio',access_token:'PRIVATE_SECRET_MUST_NOT_LEAK'},{id:'202',name:'Bali Wedding DJ'}]});
 if(p.endsWith('/instagram-accounts'))return Response.json({ok:true,accounts:[{id:'909',username:'nadmostudio',pageId:'101',accessToken:'PRIVATE_TOKEN'}]});
 return Response.json({ok:false},{status:404});
}};
function req(path,body){const url=new URL('https://contenthub.nadmo.id'+path);return {url,request:new Request(url,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined})};}
const env=()=>({SOCIAL_DB:makeDB(),META_CONNECTOR:connector});
test('existing Meta connector discovers pages and Instagram without exposing access tokens',async()=>{
 const r=await discoverMeta(env());
 assert.equal(r.accounts.length,3);
 assert.equal(r.accounts[0].platform,'facebook_page');
 assert.ok(!JSON.stringify(r).includes('PRIVATE_SECRET_MUST_NOT_LEAK'));
 assert.ok(!JSON.stringify(r).includes('PRIVATE_TOKEN'));
});
test('selection persists immediately per channel, no global account fallback',async()=>{
 const e=env();
 const save=req('/api/social/channel-destinations',{channel_key:'arda-comics',targets:[{platform:'facebook_page',id:'202'}]});
 let r=await handleMetaDestinations(save.request,e,save.url);
 assert.equal(r.status,200);
 assert.equal((await r.json()).selected[0].label,'Bali Wedding DJ');
 const another=req('/api/social/channel-destinations?channel_key=balinightlife');
 r=await handleMetaDestinations(another.request,e,another.url);
 assert.deepEqual((await r.json()).selected,[]);
 const read=req('/api/social/channel-destinations?channel_key=arda-comics');
 r=await handleMetaDestinations(read.request,e,read.url);
 assert.equal((await r.json()).selected[0].target_id,'202');
 const clear=req('/api/social/channel-destinations',{channel_key:'arda-comics',targets:[]});
 r=await handleMetaDestinations(clear.request,e,clear.url);
 assert.equal((await r.json()).selected.length,0);
});
test('unconnected IDs, invalid channels, and arbitrary fake handles are rejected',async()=>{
 const e=env();
 for(const x of [
  {channel_key:'arda-comics',targets:[{platform:'facebook_page',id:'999999'}]},
  {channel_key:'nadmo-studion',targets:[{platform:'facebook_page',id:'101'}]},
  {channel_key:'arda-comics',targets:[{platform:'facebook_profile',id:'101'}]},
  {channel_key:'arda-comics',targets:[{platform:'instagram',id:'@nadmostudio'}]}
 ]){
  const {request,url}=req('/api/social/channel-destinations',x);
  const r=await handleMetaDestinations(request,e,url);
  assert.ok(r.status>=400);
 }
 assert.equal(e.SOCIAL_DB.raw.prepare('SELECT count(*) AS c FROM social_channel_destinations').get().c,0);
});
