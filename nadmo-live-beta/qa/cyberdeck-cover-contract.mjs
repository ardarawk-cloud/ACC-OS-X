// Regression guard for NADMO LIVE cyberdeck profile customization.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {accountEndpoint} from '../account.mjs';

const origin='https://live.nadmo.id';
const token='a'.repeat(64);
const userId='f1d4b4aa-2aae-4d4e-97f1-444444444444';
const hash=createHash('sha256').update(token).digest('hex');
const db=new Map([
 ['auth-handle:coverqa',userId],
 ['auth-user:'+userId,{id:userId,handle:'coverqa',name:'Cover QA',bio:'',links:[],themeId:'nadmo',fontId:'system',coverId:'grid',avatarVersion:0,verifiedAdult:false,kycStatus:'NOT_CONFIGURED'}],
 ['auth-session:'+hash,{id:userId,expiresAt:Date.now()+86400000}]
]);
const storage={
 get:async key=>db.get(key),
 put:async(key,value)=>{db.set(key,value)},
 delete:async key=>{db.delete(key)},
 list:async({prefix=''}={})=>new Map([...db.entries()].filter(([key])=>key.startsWith(prefix)))
};
const req=(path,{method='GET',body=null,type='',auth=false,originHeader=false}={})=>{
 const headers={};
 if(auth)headers.Cookie='nadmo_beta_session='+token;
 if(originHeader)headers.Origin=origin;
 if(type)headers['Content-Type']=type;
 return new Request(origin+path,{method,headers,body});
};
const respond=request=>accountEndpoint(storage,request);
const jpg=new Uint8Array(800);
jpg.set([255,216,255,224],0);jpg.fill(42,4);jpg.set([255,217],jpg.length-2);

let r=await respond(req('/api/account/cover',{method:'PUT',body:jpg,type:'image/jpeg',originHeader:true}));
assert.equal(r.status,401,'anonymous cannot change cover');
r=await respond(req('/api/account/cover',{method:'PUT',body:jpg,type:'image/png',auth:true,originHeader:true}));
assert.equal(r.status,415,'raw PNG not accepted without JPEG conversion');
r=await respond(req('/api/account/cover',{method:'PUT',body:jpg,type:'image/jpeg',auth:true,originHeader:true}));
assert.equal(r.status,200,'signed-in user can upload cover');
const saved=await r.json();
assert.ok(saved.coverVersion>0);
r=await respond(req('/api/profile/coverqa/cover'));
assert.equal(r.status,200,'published cover is viewable without login');
assert.equal(r.headers.get('content-type'),'image/jpeg');
assert.deepEqual(new Uint8Array(await r.arrayBuffer()),jpg,'stored compressed photo remains unchanged');
r=await respond(req('/api/profile/coverqa'));
assert.equal(r.status,200);
assert.equal((await r.json()).profile.coverVersion,saved.coverVersion,'public profile exposes only cover version');
r=await respond(req('/api/account/me',{auth:true}));
assert.equal(r.status,200);
assert.equal((await r.json()).account.coverVersion,saved.coverVersion,'ME includes current cover version');
r=await respond(req('/api/account/profile',{method:'PUT',auth:true,originHeader:true,type:'application/json',
 body:JSON.stringify({name:'Cover QA',bio:'',links:[],themeId:'cyberbw',fontId:'system',coverId:'grid'})}));
assert.equal(r.status,200,'optional BW theme is valid');
assert.equal((await r.json()).account.themeId,'cyberbw');
r=await respond(req('/api/account/cover',{method:'DELETE',auth:true,originHeader:true}));
assert.equal(r.status,200);
assert.equal((await r.json()).coverVersion,0);
r=await respond(req('/api/profile/coverqa/cover'));
assert.equal(r.status,404,'deleting cover removes public image');
const html=await readFile(new URL('../public/app/index.html',import.meta.url),'utf8');
for(const item of ['id="coverFile"','id="coverChoose"','id="coverRemove"','CYBERPUNK BW','NADMO ORIGINAL','function createCoverBlob'])
 assert.ok(html.includes(item),'missing UI contract '+item);
assert.ok(html.includes('--neon:#dcff38'),'bright stabilo default color');
assert.ok(!html.includes('id="profileCover"'),'legacy cover preset removed from profile editor');
console.log('CYBERDECK BW + UPLOAD COVER CONTRACT PASS');
