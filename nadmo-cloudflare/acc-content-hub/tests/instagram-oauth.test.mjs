import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {handleInstagramOAuth} from '../instagram-oauth.mjs';

const migration2=readFileSync(new URL('../migrations/0002_social_chat_channels.sql',import.meta.url),'utf8');
const migration4=readFileSync(new URL('../migrations/0004_instagram_oauth.sql',import.meta.url),'utf8');
function makeEnv(){
 const raw=new DatabaseSync(':memory:');raw.exec(migration2);raw.exec(migration4);
 const db={prepare:sql=>({bind(...args){return {
  async first(){return raw.prepare(sql).get(...args)},
  async all(){return {results:raw.prepare(sql).all(...args)}},
  async run(){return {meta:{changes:raw.prepare(sql).run(...args).changes}}}
 }}})};
 return {SOCIAL_DB:db,SOCIAL_IG_APP_ID:'1234567',SOCIAL_IG_APP_SECRET:'secret-do-not-expose',
  SOCIAL_IG_TOKEN_KEY:Buffer.alloc(32,42).toString('base64url'),raw};
}
function call(env,path){
 const url=new URL('https://contenthub.nadmo.id'+path);
 return handleInstagramOAuth(new Request(url),env,url);
}
test('Instagram Login is disabled and fails closed when app credentials absent',async()=>{
 const env=makeEnv();delete env.SOCIAL_IG_APP_SECRET;
 const s=await call(env,'/api/social/instagram/status');
 assert.equal((await s.json()).configured,false);
 const start=await call(env,'/api/social/instagram/start?channel_key=distorsi-rakyat');
 assert.equal(start.status,503);
 assert.equal(env.raw.prepare('SELECT count(*) as n FROM social_instagram_oauth_states').get().n,0);
});
test('Instagram OAuth uses approved scopes, one-time state and AES-GCM token storage',async()=>{
 const env=makeEnv();
 const start=await call(env,'/api/social/instagram/start?channel_key=distorsi-rakyat');
 assert.equal(start.status,302);
 const auth=new URL(start.headers.get('location'));
 assert.equal(auth.host,'www.instagram.com');
 assert.equal(auth.searchParams.get('scope'),'instagram_business_basic,instagram_business_content_publish');
 assert.equal(auth.searchParams.get('enable_fb_login'),'0');
 const state=auth.searchParams.get('state');
 assert.equal(state.length,43);
 assert.equal(auth.searchParams.get('redirect_uri'),'https://contenthub.nadmo.id/api/social/instagram/callback');
 const shortToken='short-token-'+('x'.repeat(35)),longToken='long-token-'+('y'.repeat(65));
 const oldFetch=globalThis.fetch;
 globalThis.fetch=async (resource,init)=>{
  const u=new URL(String(resource));
  if(u.hostname==='api.instagram.com'){
   const f=new URLSearchParams(init.body);
   assert.equal(f.get('client_secret'),'secret-do-not-expose');
   return Response.json({access_token:shortToken,user_id:'1789000000001'});
  }
  if(u.hostname==='graph.instagram.com'&&u.pathname==='/access_token')return Response.json({access_token:longToken,expires_in:5184000});
  if(u.hostname==='graph.instagram.com'&&u.pathname==='/me'){
   assert.equal(init.headers.Authorization,'Bearer '+longToken);
   return Response.json({id:'1789000000001',username:'distorsirakyat',account_type:'BUSINESS'});
  }
  throw Error('unexpected endpoint '+u.hostname+u.pathname);
 };
 try {
  const response=await call(env,'/api/social/instagram/callback?state='+state+'&code=sample-code');
  assert.equal(response.status,302);
  assert.match(response.headers.get('location'),/instagram_result=connected/);
  assert.doesNotMatch(response.headers.get('location'),/sample-code|secret-do-not-expose|long-token/);
  const data=env.raw.prepare('SELECT * FROM social_instagram_accounts WHERE account_id=?').get('1789000000001');
  assert.equal(data.username,'distorsirakyat');
  assert.equal(data.account_type,'BUSINESS');
  assert.notEqual(data.token_cipher,longToken);
  assert.ok(data.token_cipher.length>longToken.length);
  const replay=await call(env,'/api/social/instagram/callback?state='+state+'&code=sample-code');
  assert.equal(replay.status,403);
  assert.equal(env.raw.prepare('SELECT count(*) as n FROM social_instagram_accounts').get().n,1);
 }finally{globalThis.fetch=oldFetch}
});
test('unknown channels rejected before OAuth redirect',async()=>{
 const env=makeEnv();
 const r=await call(env,'/api/social/instagram/start?channel_key=random-not-owned');
 assert.equal(r.status,404);
});
