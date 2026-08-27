const CACHE="acc-os-x-build-25767-full-owner-app-launcher-v2";
const CORE=["./","./index.html","./app.js","./home-launchpad.js","./release-version-v257.js?rev=BUILD257_AUTONOMOUS_QUALITY_RECOVERY","./produce-copilot-v2576.js?rev=BUILD257_6_PRODUCE_COPILOT","./produce-copilot-preview-fix-v25762.js?rev=BUILD257_6_2_POSTER_PREVIEW_MEMORY_FIX","./poster-studio-v1.js?rev=BUILD253_KAI_CREATIVE","./kai-creative-client.js?rev=BUILD253_KAI_CREATIVE_CLIENT_V1","./pwa-owner-safety-v1.js?rev=PWA_OWNER_SAFETY_V1","./publishing-unmatched-meta-diagnostic-v1.js?rev=KAI_ONE_META_DIAGNOSTIC_V1","./publishing-mobile-page-picker-v1.js?rev=KAI_ONE_MOBILE_PAGE_PICKER_V1","./publishing-page-aliases-v1.js?rev=KAI_ONE_OWNER_PAGE_ALIASES_V1","./owner-app-launcher-v2.js?rev=KAI_ONE_OWNER_APP_LAUNCHER_V2","./manifest.webmanifest","./acc-os-x-192-build250.png","./acc-os-x-512-build250.png","./acc-os-x-maskable-512-build250.png","./version.json","./build-info.json","./build.json"];
const LEGACY_CONNECTOR_HOST="acc-publish-connector.ardarawk.workers.dev";
const V2_CONNECTOR_HOST="acc-publish-connectorv2.ardarawk.workers.dev";
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{
  const url=new URL(event.request.url);
  if(url.hostname===LEGACY_CONNECTOR_HOST){
    const target=new URL(event.request.url);
    target.hostname=V2_CONNECTOR_HOST;
    event.respondWith(fetch(new Request(target.toString(),event.request)));
    return;
  }
  if(event.request.method!=="GET")return;
  if(url.pathname.startsWith("/api/"))return;
  event.respondWith(fetch(event.request).then(response=>{
    if(response.ok&&url.origin===self.location.origin){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});}
    return response;
  }).catch(()=>caches.match(event.request).then(hit=>hit||caches.match("./index.html"))));
});
self.addEventListener("message",event=>{if(event.data?.type==="SKIP_WAITING")self.skipWaiting();});
