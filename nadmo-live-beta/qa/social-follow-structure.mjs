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
// Repost is content-first: no avatar enlargement in ME, no duplicate heading.
assert.match(html,/#meRepostedFeed \.post-top img\{width:28px;height:28px/);
assert.match(html,/\.profile-post-card \.social-action-row\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
assert.ok(html.includes("const card=makePublicPost({...item.original,repostMe:true,repostId:item.id});"));
assert.ok(html.includes("/api/account/social/unrepost"));
assert.ok(html.includes("if(item.originalId&&!item.repostMe)"));
console.log('PASS navigation signature, tiny avatar, compact social controls and repost removal static contract');
