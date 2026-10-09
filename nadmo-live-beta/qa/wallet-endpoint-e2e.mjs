import assert from 'node:assert/strict';

const root='https://nadmo-live-beta-20261009.ardarawk.workers.dev';
const handle='walletqa'+crypto.randomUUID().replaceAll('-','').slice(0,12);
const password='NadmoWalletQA!'+crypto.randomUUID();
const origin={Origin:root,'Content-Type':'application/json'};
const json=async res=>({status:res.status,body:await res.json()});
const guest=await json(await fetch(root+'/api/wallet/me',{cache:'no-store'}));
assert.equal(guest.status,401,'Anonymous viewers never see wallet data');
const register=await fetch(root+'/api/account/register',{method:'POST',headers:origin,body:JSON.stringify({handle,name:'Wallet QA',password})});
assert.equal(register.status,201,'Test account registered');
const cookie=register.headers.get('set-cookie')?.split(';')[0];
assert.ok(cookie?.startsWith('nadmo_beta_session='));
const auth={...origin,Cookie:cookie};
try{
 const wallet=await json(await fetch(root+'/api/wallet/me',{headers:{Cookie:cookie}}));
 assert.equal(wallet.status,200,'Logged-in wallet must load');
 assert.equal(wallet.body.wallet.availableIDR,0,'No fictitious balance');
 assert.equal(wallet.body.wallet.pendingWithdrawalsIDR,0);
 assert.equal(wallet.body.capability.withdrawalsEnabled,false,'Payout gate must remain closed');
 const unauthorized=await json(await fetch(root+'/api/wallet/withdraw',{method:'POST',headers:auth,
  body:JSON.stringify({amountIDR:50000,destination:'attacker-supplied'})}));
 assert.equal(unauthorized.status,409,'Client cannot request money transfers before gateway');
 const forged=await fetch(root+'/api/wallet/credit',{method:'POST',headers:auth,body:JSON.stringify({amountIDR:1000000})});
 assert.ok([404,405].includes(forged.status),'No client credit endpoint may exist');
 const unchanged=await json(await fetch(root+'/api/wallet/me',{headers:{Cookie:cookie}}));
 assert.equal(unchanged.body.wallet.availableIDR,0,'Forged calls never increase funds');
 console.log('PASS private wallet, zero real balance, rejected withdrawal, no client credit');
}finally{
 const res=await fetch(root+'/api/account/delete',{method:'POST',headers:auth,body:JSON.stringify({password})});
 assert.equal(res.status,200,'QA account must be removed after test');
}
