import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../public/app/index.html',import.meta.url),'utf8');
for(const [tab,label] of [['socialPage','SOSIAL'],['messagesPage','PESAN']]){
 assert.ok(html.includes('data-tab="'+tab+'" aria-label="'+(label==='SOSIAL'?'Sosial':'Pesan')+'"'));
 assert.ok(html.includes('>'+label+'</button>'));
}
for(const id of ['meFollowers','meFollowing','meFollowersCount','meFollowingCount','socialConnectionsPage'])assert.ok(html.includes('id="'+id+'"'));
assert.ok(html.includes('transform:skew(-10deg)'));
assert.ok(html.includes('data-tab="studio" class="broadcast"'));
console.log('PASS navigation signature and follow UI static contract');
