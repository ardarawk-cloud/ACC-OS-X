import {test} from 'node:test';
import assert from 'node:assert/strict';
import {handleMedia,mediaExists,isOwnedMediaUrl,MAX_MEDIA_BYTES} from '../social-media.mjs';

const host='https://contenthub.nadmo.id';
function mockBucket(){
 const entries=new Map();
 return {
  async put(k,body,metadata){const data=new Uint8Array(await new Response(body).arrayBuffer());entries.set(k,{data,metadata});return {size:data.length}},
  async head(k){const o=entries.get(k);return o?{size:o.data.length,httpMetadata:o.metadata.httpMetadata}:null},
  async get(k){const o=entries.get(k);return o?{size:o.data.length,httpMetadata:o.metadata.httpMetadata,body:new Blob([o.data]).stream()}:null},
  async delete(k){entries.delete(k)},
  entries
 };
}
const url=path=>new URL(host+path);
const pngBytes=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/aUcAAAAASUVORK5CYII=','base64'));
test('private media uploads and reads preserve bytes and MIME, with R2 key not public',async()=>{
 const env={SOCIAL_MEDIA:mockBucket()};
 const req=new Request(host+'/api/social/media',{method:'POST',headers:{'content-type':'image/png','content-length':String(pngBytes.length)},body:pngBytes});
 const result=await handleMedia(req,env,url('/api/social/media'));
 assert.equal(result.status,201);
 const body=await result.json();
 assert.equal(body.private,true);
 assert.equal(body.size,pngBytes.length);
 assert.match(body.media_url,/^https:\/\/contenthub\.nadmo\.id\/api\/social\/media\/media\/[0-9a-f-]+\.png$/);
 assert.equal(await mediaExists(env,body.media_url,host),true);
 const file=await handleMedia(new Request(body.media_url),env,new URL(body.media_url));
 assert.equal(file.status,200);
 assert.equal(file.headers.get('content-type'),'image/png');
 assert.equal(file.headers.get('cache-control'),'private, no-store');
 assert.deepEqual(new Uint8Array(await file.arrayBuffer()),pngBytes);
});
test('media endpoint fails closed for type, size, missing binding and invalid key',async()=>{
 const db=mockBucket();
 const missing=await handleMedia(new Request(host+'/api/social/media'),{},url('/api/social/media'));
 assert.equal(missing.status,503);
 const wrong=new Request(host+'/api/social/media',{method:'POST',headers:{'content-type':'text/html','content-length':'25'},body:'<script>alert(1)</script>'});
 assert.equal((await handleMedia(wrong,{SOCIAL_MEDIA:db},url('/api/social/media'))).status,415);
 const oversized=new Request(host+'/api/social/media',{method:'POST',headers:{'content-type':'video/mp4','content-length':String(MAX_MEDIA_BYTES+1)},body:pngBytes});
 assert.equal((await handleMedia(oversized,{SOCIAL_MEDIA:db},url('/api/social/media'))).status,413);
 const traversal=await handleMedia(new Request(host+'/api/social/media/../../secrets'),{SOCIAL_MEDIA:db},url('/api/social/media/../../secrets'));
 assert.equal(traversal.status,404);
 assert.equal(isOwnedMediaUrl('https://evil.example/api/social/media/media/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.png',host),false);
 assert.equal(isOwnedMediaUrl(host+'/api/social/media/media/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.png',host),true);
});
