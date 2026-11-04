import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verifySaweriaSignature,normaliseVerifiedSupport,recordVerifiedSupport,publicSupport,supportEndpoint} from '../support-engine.mjs';
import {createHmac,createHash} from 'node:crypto';
const key='server-owned-saweria-streaming-key-test';
const callback=(id='receipt-001',amount=25000)=>({version:'2022.01',created_at:new Date().toISOString(),id,type:'donation',amount_raw:amount,cut:1250,donator_name:'Viewer <b>Test</b>',donator_email:'do-not-store@example.test',message:'Hello <script>alert(1)</script>'});
const sign=b=>createHmac('sha256',key).update(''+b.version+b.id+b.amount_raw+b.donator_name+b.donator_email).digest('hex');
class Store{
 constructor(){this.map=new Map()}
 async get(k){return this.map.get(k)}
 async put(k,v){this.map.set(k,structuredClone(v))}
 async delete(k){this.map.delete(k)}
 async list({prefix='',limit=999}={}){return new Map([...this.map.entries()].filter(([k])=>k.startsWith(prefix)).slice(0,limit))}
 async transaction(fn){return fn(this)}
}
async function harness(){
 const store=new Store(),host={id:'host-777',handle:'arda',name:'Arda',supportUrl:'https://saweria.co/arda',supportQrisUrl:'https://live.nadmo.id/api/social/media/host/qr.png',saweriaStreamingKey:key};
 await store.put('auth-handle:arda',host.id);await store.put('auth-user:'+host.id,host);
 const session='a'.repeat(64),fingerprint=createHash('sha256').update(session).digest('hex');
 await store.put('auth-session:'+fingerprint,{id:host.id,expiresAt:Date.now()+100000});
 const origin='https://live.nadmo.id',cookie='nadmo_beta_session='+session;
 const req=(path,body=null,headers={},method=body?'POST':'GET')=>new Request(origin+path,{method,headers:{...headers,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const asHost=(path,body=null)=>req(path,body,{'Cookie':cookie,'Origin':origin});
 return {store,host,req,asHost,origin};
}
test('Saweria HMAC official order valid',async()=>{const b=callback();assert.equal(await verifySaweriaSignature(b,sign(b),key),true)});
test('missing or wrong signature rejected',async()=>{const b=callback();assert.equal(await verifySaweriaSignature(b,'0'.repeat(64),key),false);assert.equal(await verifySaweriaSignature(b,'',key),false)});
test('invalid amount rejected',()=>{const b=callback('bad',-1);assert.throws(()=>normaliseVerifiedSupport({provider:'saweria',hostId:'host',providerRef:b.id,amount:b.amount_raw,occurredAt:b.created_at}),/INVALID_AMOUNT/)});
test('sanitization strips HTML and never stores email',()=>{const b=callback();const event=normaliseVerifiedSupport({provider:'saweria',hostId:'h1',providerRef:b.id,amount:b.amount_raw,name:b.donator_name,message:b.message,occurredAt:b.created_at});assert.ok(!JSON.stringify(event).includes('do-not-store'));assert.ok(!event.message.includes('<'));assert.ok(!event.message.includes('>'));assert.equal(event.settlementStatus,'not_confirmed')});
test('atomic provider reference deduplication',async()=>{const s=new Store();const b=callback();const x=normaliseVerifiedSupport({provider:'saweria',hostId:'id-1',providerRef:b.id,amount:b.amount_raw,occurredAt:b.created_at});assert.equal((await recordVerifiedSupport(s,x)).created,true);assert.equal((await recordVerifiedSupport(s,{...x,eventId:'another'})).created,false);assert.equal((await s.get('support-wall:id-1')).length,1)});
test('never accept unverified financial record',async()=>{const s=new Store();await assert.rejects(()=>recordVerifiedSupport(s,{amount:2,currency:'IDR',verificationStatus:'DEMO'}),/NOT_VERIFIED/)});
test('privacy hides name amount and message',()=>{const b=callback();const x=normaliseVerifiedSupport({provider:'saweria',hostId:'h',providerRef:b.id,amount:b.amount_raw,name:'X',message:'Text',occurredAt:b.created_at});const p=publicSupport(x,{showName:false,showAmount:false,showMessage:false});assert.equal(p.supporterName,'Anonim');assert.equal(p.amount,null);assert.equal(p.message,'')});
test('unsigned POST cannot write wallet or wall',async()=>{const {store,req}=await harness();const r=await supportEndpoint(store,req('/api/support/webhooks/saweria/arda',callback(),{'Saweria-Callback-Signature':'1'.repeat(64)}),{});assert.equal(r.status,401);assert.equal(await store.get('support-wall:host-777'),undefined)});
test('authenticated Saweria callback produces one event only',async()=>{const {store,req}=await harness();const b=callback();const a=()=>supportEndpoint(store,req('/api/support/webhooks/saweria/arda',b,{'Saweria-Callback-Signature':sign(b)}),{});const first=await a(),second=await a();assert.equal(first.status,200);assert.equal((await first.json()).duplicate,false);assert.equal((await second.json()).duplicate,true);const wall=await store.get('support-wall:host-777');assert.equal(wall.length,1);assert.ok(!JSON.stringify(wall).includes('do-not-store@example.test'))});
test('anonymous viewer support wall contains only public fields',async()=>{const {store,req}=await harness();const b=callback();await supportEndpoint(store,req('/api/support/webhooks/saweria/arda',b,{'Saweria-Callback-Signature':sign(b)}),{});const res=await supportEndpoint(store,req('/api/support/wall?handle=arda'),{});assert.equal(res.status,200);const j=await res.json();assert.equal(j.events.length,1);assert.equal(j.settlementConfirmed,false);assert.ok(!JSON.stringify(j).includes('donator_email'))});
test('QRIS and SocialBuzz webhooks fail closed, no success alert',async()=>{const {store,req}=await harness();for(const p of ['sociabuzz','dana_qris']){const r=await supportEndpoint(store,req('/api/support/webhooks/'+p+'/arda',{amount:50000,paid:true}),{});assert.equal(r.status,501);assert.equal((await r.json()).code,'PROVIDER_NOT_VERIFIED')}assert.equal(await store.get('support-wall:host-777'),undefined)});
test('GET host settings protected, no secret in response',async()=>{const {store,req,asHost}=await harness();assert.equal((await supportEndpoint(store,req('/api/support/me'),{})).status,401);const response=await supportEndpoint(store,asHost('/api/support/me'),{});assert.equal(response.status,200);const txt=await response.text();assert.ok(!txt.includes(key));assert.ok(txt.includes('webhookConnected'))});
test('settings save SocialBuzz URL and presets by owner session only',async()=>{const {store,asHost,req}=await harness();const data={socialBuzzUrl:'https://sociabuzz.com/arda/tribe',providers:['saweria','sociabuzz'],alertEnabled:true,durationSeconds:7,animation:'slide',sound:'chime',showName:false,showAmount:false,showMessage:false};const anonymous=await supportEndpoint(store,req('/api/support/settings',data,{'Origin':'https://live.nadmo.id'}),{});assert.equal(anonymous.status,401);const ok=await supportEndpoint(store,asHost('/api/support/settings',data),{});assert.equal(ok.status,200);assert.equal((await store.get('support-prefs:host-777')).durationSeconds,7)});
test('reject untrusted SociaBuzz lookalike link',async()=>{const {store,asHost}=await harness();const r=await supportEndpoint(store,asHost('/api/support/settings',{socialBuzzUrl:'https://sociabuzz.com.evil.example/arda'}),{});assert.equal(r.status,400)});
test('DEMO alert emitted but never persisted as transaction',async()=>{const {store,asHost}=await harness();let captured=[];const r=await supportEndpoint(store,asHost('/api/support/test-alert',{name:'Demo',message:'Test'}),{},async(id,event)=>captured.push(event));assert.equal(r.status,200);const j=await r.json();assert.equal(j.DEMO,true);assert.equal(j.persisted,false);assert.equal(await store.get('support-wall:host-777'),undefined);assert.equal(captured.length,0)});
test('provider authenticated signal sent only if enabled and not duplicated',async()=>{const {store,asHost,req}=await harness();await supportEndpoint(store,asHost('/api/support/settings',{alertEnabled:true}),{});let sent=0;const b=callback();const hit=()=>supportEndpoint(store,req('/api/support/webhooks/saweria/arda',b,{'Saweria-Callback-Signature':sign(b)}),{},async()=>{sent++});await hit();await hit();assert.equal(sent,1)});
