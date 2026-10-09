import assert from 'node:assert/strict';
const base='https://nadmo-live-beta-20261009.ardarawk.workers.dev';
const name='avatarqa'+crypto.randomUUID().replaceAll('-','').slice(0,12),password='NadmoPhotoQA!'+crypto.randomUUID();
const jpeg=Uint8Array.from([255,216,255,...Array(124).fill(18),255,217]);
const reg=await fetch(base+'/api/account/register',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({handle:name,name:'Photo QA',password})});
assert.equal(reg.status,201);
const cookie=reg.headers.get('set-cookie').split(';')[0],auth={Origin:base,Cookie:cookie};
const url=base+'/api/profile/'+name+'/avatar';
try{
 assert.equal((await fetch(url)).status,404);
 assert.equal((await fetch(base+'/api/account/avatar',{method:'PUT',headers:{...auth,'Content-Type':'image/svg+xml'},body:'<svg></svg>'})).status,415);
 assert.equal((await fetch(base+'/api/account/avatar',{method:'PUT',headers:{...auth,Origin:'https://invalid.example','Content-Type':'image/jpeg'},body:jpeg})).status,403);
 const send=await fetch(base+'/api/account/avatar',{method:'PUT',headers:{...auth,'Content-Type':'image/jpeg'},body:jpeg});
 assert.equal(send.status,200,'authenticated avatar upload');
 const info=await send.json();
 assert.ok(info.avatarVersion>0);
 const publicImage=await fetch(url);
 assert.equal(publicImage.status,200);
 assert.deepEqual(new Uint8Array(await publicImage.arrayBuffer()),jpeg);
 assert.equal((await(await fetch(base+'/api/profile/'+name)).json()).profile.avatarVersion,info.avatarVersion);
 assert.equal((await fetch(base+'/api/account/avatar',{method:'DELETE',headers:auth})).status,200);
 assert.equal((await fetch(url)).status,404);
 console.log('PASS avatar persistence, public retrieval, validation and removal');
}finally{
 const cleanup=await fetch(base+'/api/account/delete',{method:'POST',headers:{...auth,'Content-Type':'application/json'},body:JSON.stringify({password})});
 assert.equal(cleanup.status,200);
}