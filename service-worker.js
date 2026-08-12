const CACHE="acc-os-x-build-253-kai-creative-engine";
const CORE=["./","./index.html","./app.js","./home-launchpad.js","./poster-studio-v1.js?rev=BUILD253_KAI_CREATIVE","./kai-creative-client.js?rev=BUILD253_KAI_CREATIVE_CLIENT_V1","./manifest.webmanifest","./acc-os-x-192-build250.png","./acc-os-x-512-build250.png","./acc-os-x-maskable-512-build250.png","./version.json"];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  const url=new URL(event.request.url);
  if(url.pathname.startsWith("/api/"))return;
  event.respondWith(fetch(event.request).then(response=>{
    if(response.ok&&url.origin===self.location.origin){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});}
    return response;
  }).catch(()=>caches.match(event.request).then(hit=>hit||caches.match("./index.html"))));
});
self.addEventListener("message",event=>{if(event.data?.type==="SKIP_WAITING")self.skipWaiting();});
