import fs from 'node:fs';
const files=['home-launchpad.js','my-admin-launcher-v1.js','my-projects-launcher-v1.js','division-sync-hub-v2.js','my-maps-launcher-v1.js','owner-phone-launcher-v1.js','home-quick-access-v1.js','sync-cctv-launcher-v1.js'];
const urls=new Map();
for(const file of files){
  const source=fs.readFileSync(file,'utf8');
  for(const url of source.match(/https?:\/\/[^\s'"`<>]+/g)||[]){
    if(url.includes('${'))continue;
    urls.set(url,[...(urls.get(url)||[]),file]);
  }
}
for(const match of fs.readFileSync('my-maps-launcher-v1.js','utf8').matchAll(/placeId:"(\d+)"/g))urls.set(`https://apis.roblox.com/universes/v1/places/${match[1]}/universe`,['my-maps-launcher-v1.js']);
const results=[];
const queue=[...urls.entries()];
await Promise.all(Array.from({length:5},async()=>{
  while(queue.length){
    const [url,sources]=queue.shift();
    try{
      const r=await fetch(url,{signal:AbortSignal.timeout(15000)}),text=await r.text(),host=new URL(url).hostname;
      const image=/\.(png|svg|jpg)(?:\?|$)/i.test(url);
      const gate=[401,403,429].includes(r.status)||(/chatgpt\.com$/.test(host)&&/login|sign.in|challenge/i.test(text));
      const validImage=!image||(r.headers.get('content-type')||'').startsWith('image/');
      results.push({url,sources,status:r.status,finalUrl:r.url,result:gate?'ACCESS_RESTRICTED':r.ok&&validImage?'OK':'NEEDS_REVIEW',title:text.match(/<title[^>]*>([^<]*)/i)?.[1]||null});
    }catch(error){results.push({url,sources,result:'UNVERIFIED_NETWORK',error:error.message});}
  }
}));
const java=fs.readFileSync('android/app/src/main/java/com/ardacore/accosx/AccNavigationPolicy.java','utf8');
const packages=[...new Set(files.flatMap(file=>(fs.readFileSync(file,'utf8').match(/"(?:com|id|app|io|org|us)\.[\w.]+"/g)||[]).map(x=>x.slice(1,-1))))];
const missing=packages.filter(name=>!java.includes(`"${name}"`));
const report={checkedAt:new Date().toISOString(),webLinks:results.length,nativePackages:packages.length,missingNativeAllowlist:missing,results:results.sort((a,b)=>a.url.localeCompare(b.url))};
fs.writeFileSync('launcher-link-audit.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(missing.length)process.exitCode=1;
