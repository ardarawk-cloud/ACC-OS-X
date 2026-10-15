import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {handleSocial,dateWita,CHANNELS} from '../social-queue.mjs';
const schema=readFileSync(new URL('../migrations/0001_social_queue.sql',import.meta.url),'utf8');
const ownerEmail='owner@example.test';
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
 const req=new Request(url,{method:body?'POST':'GET',headers:{...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 const r=await handleSocial(req,env,url,async()=>true);
 return {status:r.status,body:await r.json()};
}
const content=(key,ch)=>({client_submission_key:key,platform:'tiktok',channel_key:ch,title:'Example test',caption:'Original content test',media_url:'https://example.com/video.mp4',media_type:'video'});
test('idempotent submission, QC guard, transition and TikTok receipt',async()=>{
 const db=makeDB(),env={SOCIAL_DB:db,NADMO_SOCIAL_OWNER_EMAIL:ownerEmail};
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
 const db=makeDB(),env={SOCIAL_DB:db,NADMO_SOCIAL_OWNER_EMAIL:ownerEmail};
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

test('chat submissions without media are kept private and blocked until asset arrives',async()=>{
 const db=makeDB(),env={SOCIAL_DB:db,NADMO_SOCIAL_OWNER_EMAIL:ownerEmail};
 const draft={...content('chat-draft-no-media-1','arda-comics'),media_url:'',source:'chatgpt_channel'};
 const saved=await call(env,'/jobs',draft);
 assert.equal(saved.status,201);
 assert.equal(saved.body.job.status,'QC_BLOCKED');
 assert.equal(saved.body.job.media_url,'');
 const id=saved.body.job.id;
 const replay=await call(env,'/jobs',draft);
 assert.equal(replay.body.duplicate,true);
 assert.equal(replay.body.job.id,id);
 const cannotApprove=await call(env,'/jobs/'+id+'/action',{action:'qc_pass',expected_version:1,rights_confirmed:true});
 assert.equal(cannotApprove.status,400);
 assert.equal(cannotApprove.body.error.code,'MEDIA_REQUIRED');
 const noSchedule=await call(env,'/schedule',{date:new Date(Date.parse(dateWita().date+'T00:00:00Z')+86400000).toISOString().slice(0,10)});
 assert.equal(noSchedule.body.scheduled.length,0);
 const badAttach=await call(env,'/jobs/'+id+'/action',{action:'attach_media',expected_version:1,media_url:'http://localhost/secret'});
 assert.equal(badAttach.status,400);
 const attached=await call(env,'/jobs/'+id+'/action',{action:'attach_media',expected_version:1,media_url:'https://cdn.example.test/creative.mp4',source:'chatgpt_channel'});
 assert.equal(attached.status,200);
 assert.equal(attached.body.job.status,'QC_PENDING');
 assert.equal(attached.body.job.version,2);
 const approved=await call(env,'/jobs/'+id+'/action',{action:'qc_pass',expected_version:2,rights_confirmed:true});
 assert.equal(approved.status,200);
 assert.equal(approved.body.job.status,'READY');
 assert.equal(db.raw.prepare('SELECT COUNT(*) AS n FROM social_jobs').get().n,1);
});
test('resolving unknown chat channel without media remains QC_BLOCKED',async()=>{
 const db=makeDB(),env={SOCIAL_DB:db,NADMO_SOCIAL_OWNER_EMAIL:ownerEmail};
 const result=await call(env,'/jobs',{...content('unknown-channel-media-1','new-internal-project'),media_url:''});
 assert.equal(result.body.job.status,'UNASSIGNED');
 const resolved=await call(env,'/jobs/'+result.body.job.id+'/action',{action:'resolve_channel',expected_version:1,channel_key:'nadmo-studio'});
 assert.equal(resolved.body.job.status,'QC_BLOCKED');
 const blocked=await call(env,'/jobs/'+result.body.job.id+'/action',{action:'qc_pass',expected_version:2,rights_confirmed:true});
 assert.equal(blocked.body.error.code,'MEDIA_REQUIRED');
});
