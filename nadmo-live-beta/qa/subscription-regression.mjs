import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const root=new URL('../',import.meta.url);
const file=p=>readFileSync(fileURLToPath(new URL(p,root)),'utf8');
const html=file('public/subscription/index.html');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script,'subscription UI inline JavaScript is missing');
assert.doesNotThrow(()=>new Function(script),'subscription UI must parse');

const source=file('subscription.mjs');
const code=source.replace(/^import[^\n]*\n/,'').replace('export async function subscriptionEndpoint','async function subscriptionEndpoint');
const getAccount=async storage=>storage.get('auth-user:owner');
const subscriptionEndpoint=new Function('getAccount','urlOK',code+'\nreturn subscriptionEndpoint;')(getAccount,x=>x);
const origin='https://live.nadmo.id';
const user={id:'owner',handle:'owner',name:'Owner',createdAt:1,subscriptionTier:'pro',subscriptionExpiresAt:Date.now()+86400000,supportActionCount:250,subscriptionUsageStartCount:200};
const data=new Map([['auth-user:owner',user]]);
const storage={
 get:async key=>data.get(key),
 put:async(key,value)=>data.set(key,value),
 list:async({prefix})=>new Map([...data].filter(([key])=>key.startsWith(prefix)))
};
const env={NADMO_ADMIN_HANDLE:'owner',DANA_ENV:'sandbox',DANA_API_ORIGIN:'https://api.sandbox.dana.id',DANA_PRIVATE_KEY:'sandbox-test',DANA_X_PARTNER_ID:'sandbox-test',DANA_MERCHANT_ID:'sandbox-test'};
const call=async(path,body)=>{
 const options=body?{method:'POST',headers:{'Content-Type':'application/json','Origin':origin},body:JSON.stringify(body)}:{};
 const response=await subscriptionEndpoint(storage,new Request(origin+path,options),env);
 return {status:response.status,data:await response.json()};
};

const me=await call('/api/subscription/me');
assert.equal(me.status,200);
assert.equal(me.data.subscription.count,50);
assert.equal(me.data.subscription.remaining,150);
assert.equal(me.data.paymentGateway.enabled,false,'sandbox must not offer real checkout');

const sandbox=await call('/api/subscription/dana/create',{targetTier:'plus'});
assert.equal(sandbox.status,503);
assert.equal(sandbox.data.code,'DANA_NOT_READY');

data.set('subscription-order:gateway',{id:'gateway',userId:'owner',targetTier:'plus',status:'pending',provider:'dana-payment-gateway',price:99900});
const unsafe=await call('/api/admin/subscriptions/action',{orderId:'gateway',action:'approve'});
assert.equal(unsafe.status,409);
assert.equal(unsafe.data.code,'GATEWAY_VERIFICATION_REQUIRED');
assert.equal(data.get('subscription-order:gateway').status,'pending');

data.set('subscription-order:manual',{id:'manual',userId:'owner',targetTier:'pro',status:'pending',price:19900});
const approved=await call('/api/admin/subscriptions/action',{orderId:'manual',action:'approve'});
assert.equal(approved.status,200);
assert.equal(data.get('subscription-order:manual').paymentStatus,'verified_manual');
assert.equal(data.get('auth-user:owner').subscriptionUsageStartCount,250);

const renewed=await call('/api/subscription/me');
assert.equal(renewed.data.subscription.count,0);
assert.equal(renewed.data.subscription.remaining,200);

console.log('NADMO LIVE subscription regression: PASS (UI parse, paid cycle usage, sandbox gate, admin payment protection, manual approval, renewal quota)');
