import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../public/app/index.html',import.meta.url),'utf8');
for(const [tab,label] of [['socialPage','SOSIAL'],['messagesPage','PESAN']]){
 assert.ok(html.includes('data-tab="'+tab+'" aria-label="'+(label==='SOSIAL'?'Sosial':'Pesan')+'"'));
 if(tab==='messagesPage')assert.ok(html.includes('>PESAN<span id="messageUnreadBadge" class="message-nav-badge" hidden></span></button>'),'PESAN label and unread badge must remain intact');
 else assert.ok(html.includes('>'+label+'</button>'));
}
for(const id of ['meFollowers','meFollowing','meFollowersCount','meFollowingCount','socialConnectionsPage'])assert.ok(html.includes('id="'+id+'"'));
assert.ok(html.includes('transform:skew(-10deg)'));
assert.ok(html.includes('data-tab="studio" class="broadcast"'));
// Repost is content-first: no avatar enlargement in ME, no duplicate heading.
assert.match(html,/#meRepostedFeed \.post-top img\{width:28px;height:28px/);
assert.match(html,/\.profile-post-card \.social-action-row\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
assert.ok(html.includes("const card=makePublicPost({...item.original,repostMe:true,repostId:item.id,repostCaption:item.caption||''});"));
assert.ok(html.includes("/api/account/social/unrepost"));
assert.ok(html.includes("if(item.originalId&&!item.repostMe)"));
assert.ok(html.includes("id=\"socialShareSheet\""));
assert.ok(html.includes("const stats=document.createElement('div');stats.className='social-stats'"));
assert.ok(html.includes("actions.append(like,comment,share);"));
assert.ok(html.includes("id=\"socialShareCaption\""));
assert.ok(html.includes("Selengkapnya"));
// Card author identity: only a compact avatar is interactive, name remains plain text.
assert.ok(html.includes("const avatarButton=document.createElement('button');avatarButton.type='button';avatarButton.className='social-avatar-open'"));
assert.ok(html.includes("avatarButton.onclick=()=>openCreatorProfile(entry.handle)"));
assert.ok(html.includes("const author=document.createElement('span');author.className='social-display-name'"));
assert.ok(!html.includes("const author=document.createElement('button');author.type='button';author.className='profile-open'"));
assert.ok(html.includes('.profile-post-card .post-top .social-avatar-open{display:grid;place-items:center;width:40px;height:40px;'));
console.log('PASS navigation signature, compact avatar navigation, plain names and repost actions');
