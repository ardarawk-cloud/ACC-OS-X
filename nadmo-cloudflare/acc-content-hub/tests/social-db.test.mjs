import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {handleSocial,dateWita,CHANNELS} from '../social-queue.mjs';
const schema=readFileSync(new URL('../migrations/0001_social_queue.sql',import.meta.url),'utf8');
const secret='s'.repeat(40);
function makeDB(){
 const raw=new DatabaseSync(':memory:');raw.exec(schema);
 return {
   prepare(sql){return {bind(...values){return {
     async first(column){const r=raw.prepare(sql).get(...values);return column?r?.[column]:r},
     async all(){return {results:raw.prepare(sql).all(...values)}},
     async run(){return {meta:{changes:raw.prepare(sql).run(...values).changes}}}
   }}}},
   raw
 };
}
async function call(env,path,body=null) {
 const url=new URL('https://example.com/api/social'+path);
 const req=new Request(url,{method:body?'POST':'GET',headers:{'X-NADMO-OWNER-KEY':secret,...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 const r=await handleSocial(req,env,url);
 return {status:r.status,body:await r.json()};
}
const content=(key,ch)=>({client_submission_key:key,platform:'tiktok',channel_key:ch,title:'Example test',caption:'Original content test',media_url:'https://example.com/video.mp4',media_type:'video'});
test('idempotent submission, QC guard, transition and TikTok receipt',async()=>{
 const db=makeDB(),env={SOCIAL_DB:db,NADMO_SOCIAL_OWNER_KEY:secret};
 const draft=content('unique-test-job-1','balinightlife');
 const first=await call(env,'/jobs',draft);
 assert.equal(first.status,201);
 const id=first.body.job.id;
 const duplicate=await call(env,'/jobs',draft);
 assert.equal(duplicate.body.duplicate,true);
 assert.equal(duplicate.body.job.id,id);
 const bad=await call(env,'/jobs/'+id+'/action',{action:'qc_pass',expected_version:1});
 assert.equal(bad.status,400);
 const pass=await call(env,'/jobs/'+id+'/action',{action:'qc_pass',expected_version:1,rights_confirmed:true});
 assert.equal(pass.body.job.status,'READY');
 const future=new Date(Date.parse(dateWita().date+'T00:00:00Z')+86400000).toISOString().slice(0,10);
 const scheduled=await call(env,'/schedule',{date:future});
 assert.equal(scheduled.body.scheduled.length,1);
 const picked=await call(env,'/jobs/'+id+'/action',{action:'share_opened',expected_version:3});
 assert.equal(picked.body.job.status,'SHARE_OPENED');
 const reported=await call(env,'/jobs/'+id+'/action',{action:'self_report',expected_version:4,published_url:'https://www.tiktok.com/@nadmo/video/123'});
 assert.equal(reported.body.job.status,'SELF_REPORTED');
 const noAutomatic=await call(env,'/jobs/'+id+'/action',{action:'verify',expected_version:5});
 assert.equal(noAutomatic.status,400);
 const verified=await call(env,'/jobs/'+id+'/action',{action:'verify',expected_version:5,owner_verified:true});
 assert.equal(verified.body.job.status,'PUBLISHED_VERIFIED');
 assert.equal(db.raw.prepare('select count(*) as n from social_jobs').get().n,1);
 assert.equal(db.raw.prepare('select count(*) as n from social_events').get().n,6);
});
test('scheduler never overbooks 10 slots with 20 approved channels',async()=>{
 const db=makeDB(),env={SOCIAL_DB:db,NADMO_SOCIAL_OWNER_KEY:secret};
 for(let i=0;i<20;i++){
  const c=CHANNELS[i];
  const d=await call(env,'/jobs',content('batch-unique-'+i,c.key));
  assert.equal(d.status,201);
  const r=await call(env,'/jobs/'+d.body.job.id+'/action',{action:'qc_pass',expected_version:1,rights_confirmed:true});
  assert.equal(r.status,200);
 }
 const day=new Date(Date.parse(dateWita().date+'T00:00:00Z')+86400000).toISOString().slice(0,10);
 const s=await call(env,'/schedule',{date:day});
 assert.equal(s.body.scheduled.length,10);
 const again=await call(env,'/schedule',{date:day});
 assert.equal(again.body.scheduled.length,0);
 const count=db.raw.prepare("select count(*) as n from social_jobs where scheduled_date=?").get(day).n;
 assert.equal(count,10);
});
