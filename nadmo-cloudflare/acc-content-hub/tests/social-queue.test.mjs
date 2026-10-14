import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CHANNELS,SLOTS_WITA,selectSchedule,dateWita} from '../social-queue.mjs';
const make=(id,ch)=>({id,channel_key:ch,category:'editorial',priority:'NORMAL',status:'READY',created_at:'2026-10-15T00:00:00Z'});
test('31 channels point to one logical TikTok target',()=>{
 assert.equal(CHANNELS.length,31);
 assert.equal(new Set(CHANNELS.map(c=>c.key)).size,31);
 assert.equal(new Set(CHANNELS.map(c=>c.target)).size,1);
});
test('ten unique time slots in WITA',()=>{
 assert.equal(SLOTS_WITA.length,10);
 assert.equal(new Set(SLOTS_WITA).size,10);
 assert.deepEqual(dateWita(new Date('2026-10-14T17:30:00Z')),{date:'2026-10-15',time:'01:30'});
});
test('queue stops after 10 slots',()=>{
 const list=Array.from({length:25},(_,i)=>make(String(i),'c'+i));
 assert.equal(selectSchedule(list).length,10);
});
test('fairness caps two jobs for any one channel',()=>{
 const list=Array.from({length:20},(_,i)=>make(String(i),i<10?'A':i<15?'B':'C'));
 const chosen=selectSchedule(list);
 assert.equal(chosen.length,6);
 assert.ok(['A','B','C'].every(ch=>chosen.filter(x=>x.channel_key===ch).length===2));
});
test('rejects non-ready jobs',()=>{
 assert.equal(selectSchedule([{...make('a','A'),status:'QC_PENDING'}]).length,0);
});
