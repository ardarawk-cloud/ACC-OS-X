import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {deflateSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const base='https://nadmo-live-beta-20261009.ardarawk.workers.dev';
const name='gallery'+randomUUID().replaceAll('-','').slice(0,12);
const second='other'+randomUUID().replaceAll('-','').slice(0,12);
const password='GalleryQA!'+randomUUID();

function crc32(b){
 let crc=0xffffffff;
 for(const byte of b){crc^=byte;for(let i=0;i<8;i++)crc=crc&1?(crc>>>1)^0xedb88320:crc>>>1;}
 return (crc^0xffffffff)>>>0;
}
function chunk(type,payload){
 const data=Buffer.concat([Buffer.from(type,'ascii'),payload]);
 const header=Buffer.alloc(4);header.writeUInt32BE(payload.length);
 const footer=Buffer.alloc(4);footer.writeUInt32BE(crc32(data));
 return Buffer.concat([header,data,footer]);
}
function samplePng(){
 const width=16,height=16,header=Buffer.alloc(13),raw=Buffer.alloc(height*(width*4+1));
 header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
 for(let y=0;y<height;y++){
  const row=y*(width*4+1);raw[row]=0;
  randomBytes(width*4).copy(raw,row+1);
 }
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),
  chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
async function register(handle){
 const r=await fetch(base+'/api/account/register',{method:'POST',
  headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({handle,name:'Gallery QA',password})});
 assert.equal(r.status,201,'Register '+handle+' '+await r.text());
 return r.headers.get('set-cookie').split(';')[0];
}
async function post(route,cookie,body){
 const r=await fetch(base+route,{method:'POST',headers:{Origin:base,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(body)});
 return {status:r.status,body:await r.json()};
}
async function upload(cookie,mime,data){
 const r=await fetch(base+'/api/social/media/upload',{method:'PUT',
  headers:{Origin:base,Cookie:cookie,'Content-Type':mime,'Content-Length':String(data.length)},body:data});
 assert.equal(r.status,201,'Upload '+mime+' '+await r.text());
 const response=await r.json();
 assert.equal(response.ok,true);
 return response;
}
let ownerCookie,outsiderCookie,postId;
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'nadmo-gallery-'));
try{
 ownerCookie=await register(name);outsiderCookie=await register(second);
 const status=await (await fetch(base+'/api/social/media/status')).json();
 assert.equal(status.enabled,true,'R2 bucket must be bound');
 assert.equal(status.maxItems,10);
 const image=samplePng();
 const photo=await upload(ownerCookie,'image/png',image);
 const videoPath=path.join(dir,'sample.webm');
 execFileSync('ffmpeg',['-loglevel','error','-f','lavfi','-i','sine=frequency=440:sample_rate=24000',
  '-t','0.5','-c:a','libopus','-b:a','24k','-y',videoPath],{timeout:15000});
 const clip=fs.readFileSync(videoPath);
 assert.ok(clip.length>100&&clip.length<25*1024*1024);
 const movie=await upload(ownerCookie,'video/webm',clip);
 const outsider=await post('/api/account/posts/publish',outsiderCookie,{
  text:'Must reject other account media',media:[{type:'image',url:photo.url}]});
 assert.equal(outsider.status,403,'Cannot publish files from another account');
 const publish=await post('/api/account/posts/publish',ownerCookie,{
  text:'Gallery QA photo + video',media:[{type:'image',url:photo.url},{type:'video',url:movie.url}]});
 assert.equal(publish.status,201,JSON.stringify(publish.body));
 postId=publish.body.post.id;
 assert.deepEqual(publish.body.post.media,[{type:'image',url:photo.url},{type:'video',url:movie.url}]);
 const feed=await (await fetch(base+'/api/social/feed')).json();
 assert.deepEqual(feed.posts.find(p=>p.id===postId)?.media,publish.body.post.media);
 const photoResp=await fetch(photo.url);assert.equal(photoResp.status,200);
 assert.equal(photoResp.headers.get('content-type'),'image/png');
 assert.deepEqual(Buffer.from(await photoResp.arrayBuffer()),image);
 const videoResp=await fetch(movie.url,{headers:{Range:'bytes=0-99'}});
 assert.equal(videoResp.status,206,'Video byte-range must support playback seeking');
 assert.equal(videoResp.headers.get('content-type'),'video/webm');
 assert.ok((await videoResp.arrayBuffer()).byteLength>0);
 const invalid=await post('/api/account/posts/publish',ownerCookie,{
  text:'Too many items',media:Array(11).fill({type:'image',url:photo.url})});
 assert.equal(invalid.status,400);
 console.log('PASS SOCIAL GALLERY: R2 PNG+WebM upload, owner, 1:1 feed payload, ordering, 206 playback, 10-item limit');
}finally{
 if(ownerCookie&&postId)await post('/api/account/posts/delete',ownerCookie,{id:postId}).catch(()=>{});
 fs.rmSync(dir,{recursive:true,force:true});
}
