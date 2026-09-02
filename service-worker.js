const CACHE="acc-os-x-build10-page-picker-v8";
const MAP_CACHE="acc-os-x-maps-v17-roblox-icon-proxy";
const MAP_ICON_REV="KAI_ONE_MY_MAPS_V17_ROBLOX_ICON_PROXY";
const MAP_CORE=[
  `./my-maps-launcher-v1.js?rev=${MAP_ICON_REV}`,
  "./launcher-layout-stability-v1.js?rev=KAI_ONE_LAUNCHER_LAYOUT_STABILITY_V4_ORDER_ONLY"
];
const CORE=[
  "./",
  "./index.html",
  "./app.js",
  "./home-launchpad.js",
  "./release-version-v257.js?rev=BUILD257_AUTONOMOUS_QUALITY_RECOVERY",
  "./produce-copilot-v2576.js?rev=BUILD257_6_PRODUCE_COPILOT",
  "./produce-copilot-preview-fix-v25762.js?rev=BUILD257_6_2_POSTER_PREVIEW_MEMORY_FIX",
  "./poster-studio-v1.js?rev=BUILD253_KAI_CREATIVE",
  "./kai-creative-client.js?rev=BUILD253_KAI_CREATIVE_CLIENT_V1",
  "./pwa-owner-safety-v1.js?rev=PWA_OWNER_SAFETY_V1",
  "./publishing-unmatched-meta-diagnostic-v1.js?rev=KAI_ONE_META_DIAGNOSTIC_V1",
  "./publishing-mobile-page-picker-v1.js?rev=KAI_ONE_DIRECT_OWNER_PAGE_MAP_V4_ALWAYS_VISIBLE",
  "./publishing-page-aliases-v1.js?rev=KAI_ONE_OWNER_PAGE_ALIASES_V4_SOCIAL_PAGE_GATEWAY",
  "./publishing-sync-reconcile-v2.js?rev=KAI_ONE_PUBLISH_SYNC_RECONCILE_V2_BUILD8",
  "./build8-ui-stabilization-v1.js?rev=KAI_ONE_BUILD8_UI_V1",
  "./bali-wedding-dj-launcher-v1.js?rev=KAI_ONE_BALI_WEDDING_DJ_LAUNCHER_V3_DIRECT_JPG",
  "./sync-cctv-launcher-v1.js?rev=KAI_ONE_SYNC_CCTV_LAUNCHER_V1_BUILD8",
  "./manifest.webmanifest",
  "./acc-os-x-192-build250.png",
  "./acc-os-x-512-build250.png",
  "./acc-os-x-maskable-512-build250.png",
  "./version.json",
  "./build-info.json",
  "./build.json"
];
const LEGACY_CONNECTOR_HOST="acc-publish-connector.ardarawk.workers.dev";
const V2_CONNECTOR_HOST="acc-publish-connectorv2.ardarawk.workers.dev";
const MAP_NETWORK_PATHS=new Set([
  "/my-maps-launcher-v1.js",
  "/launcher-layout-stability-v1.js"
]);
const FORCE_FRESH=new Set([
  "/",
  "/index.html",
  "/app.js",
  "/home-launchpad.js",
  "/service-worker.js",
  "/publishing-mobile-page-picker-v1.js",
  "/publishing-page-aliases-v1.js",
  "/publishing-sync-reconcile-v2.js",
  "/build8-ui-stabilization-v1.js",
  "/bali-wedding-dj-launcher-v1.js",
  "/sync-cctv-launcher-v1.js"
]);
self.addEventListener("install",event=>event.waitUntil(
  Promise.all([
    caches.open(CACHE).then(cache=>cache.addAll(CORE)),
    caches.open(MAP_CACHE).then(cache=>cache.addAll(MAP_CORE))
  ]).then(()=>self.skipWaiting())
));
self.addEventListener("activate",event=>event.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE&&key!==MAP_CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())
));
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

  if(url.pathname.startsWith("/__acc_native/")) return;

  if(MAP_NETWORK_PATHS.has(url.pathname)){
    const mapKey=new Request(`${url.origin}${url.pathname}`);
    const request=new Request(event.request,{cache:"reload"});
    event.respondWith(
      fetch(request).then(response=>{
        if(response.ok){
          const copy=response.clone();
          caches.open(MAP_CACHE).then(cache=>cache.put(mapKey,copy)).catch(()=>{});
        }
        return response;
      }).catch(()=>caches.open(MAP_CACHE).then(cache=>cache.match(mapKey)).then(hit=>hit||caches.match(event.request)).then(hit=>hit||Response.error()))
    );
    return;
  }

  const request=FORCE_FRESH.has(url.pathname)
    ? new Request(event.request,{cache:"reload"})
    : event.request;

  event.respondWith(fetch(request).then(response=>{
    if(response.ok&&url.origin===self.location.origin){
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});
    }
    return response;
  }).catch(()=>caches.match(event.request).then(hit=>hit||caches.match("./index.html"))));
});
self.addEventListener("message",event=>{if(event.data?.type==="SKIP_WAITING")self.skipWaiting();});
