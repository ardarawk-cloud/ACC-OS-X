// KAI ONE — ACC OS X ROBLOX MAP ICON PROXY v1
// Stable same-origin image endpoint for MY MAPS. Source icons come from Roblox's official thumbnail API.
import baseWorker from "./worker-brain-runtime-rescue-v9.js";

const REVISION = "KAI_ONE_ROBLOX_MAP_ICON_PROXY_V1";
const ALLOWED_PLACE_IDS = new Set([
  "131894120482837",
  "85866320744490",
  "121603385909425",
  "80994730522893",
  "124843214013484",
  "79748872921213",
  "82661754996018",
  "93699016600671"
]);

function json(data, status = 200) {
  const headers = new Headers();
  headers.set("Content-Type", "application/json;charset=UTF-8");
  headers.set("Cache-Control", "no-store");
  headers.set("Access-Control-Allow-Origin", "*");
  return new Response(JSON.stringify(data), { status, headers });
}

async function mapIcon(request, ctx) {
  const url = new URL(request.url);
  const placeId = String(url.searchParams.get("placeId") || "").trim();
  if (!ALLOWED_PLACE_IDS.has(placeId)) {
    return json({ ok:false, error:"MAP_PLACE_ID_NOT_ALLOWED", revision:REVISION }, 404);
  }

  const cacheKey = new Request(`${url.origin}/api/roblox-map-icon?placeId=${encodeURIComponent(placeId)}&rev=${REVISION}`);
  const edgeCache = caches.default;
  const cached = await edgeCache.match(cacheKey);
  if (cached) return cached;

  const api = new URL("https://thumbnails.roblox.com/v1/places/gameicons");
  api.searchParams.set("placeIds", placeId);
  api.searchParams.set("returnPolicy", "PlaceHolder");
  api.searchParams.set("size", "150x150");
  api.searchParams.set("format", "Png");
  api.searchParams.set("isCircular", "false");

  const metaResponse = await fetch(api.toString(), {
    headers: { "Accept":"application/json" },
    cf: { cacheTtl:300, cacheEverything:true }
  });
  if (!metaResponse.ok) {
    return json({ ok:false, error:"ROBLOX_THUMBNAIL_LOOKUP_FAILED", status:metaResponse.status, revision:REVISION }, 502);
  }

  const payload = await metaResponse.json();
  const item = Array.isArray(payload?.data)
    ? (payload.data.find(entry => String(entry?.targetId || "") === placeId) || payload.data[0])
    : null;
  const imageUrl = String(item?.imageUrl || "").trim();
  if (!imageUrl) {
    return json({ ok:false, error:"ROBLOX_ICON_NOT_READY", state:item?.state || "UNKNOWN", revision:REVISION }, 502);
  }

  const imageResponse = await fetch(imageUrl, {
    headers: { "Accept":"image/avif,image/webp,image/png,image/*,*/*;q=0.8" },
    cf: { cacheTtl:86400, cacheEverything:true }
  });
  if (!imageResponse.ok) {
    return json({ ok:false, error:"ROBLOX_ICON_FETCH_FAILED", status:imageResponse.status, revision:REVISION }, 502);
  }

  const headers = new Headers();
  headers.set("Content-Type", imageResponse.headers.get("Content-Type") || "image/png");
  headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("X-ACC-Map-Icon-Revision", REVISION);
  const response = new Response(imageResponse.body, { status:200, headers });
  ctx?.waitUntil?.(edgeCache.put(cacheKey, response.clone()));
  return response;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/api/roblox-map-icon") {
      try {
        return await mapIcon(request, ctx);
      } catch (error) {
        return json({ ok:false, error:"ROBLOX_MAP_ICON_PROXY_FAILED", detail:String(error?.message || error), revision:REVISION }, 502);
      }
    }
    if (request.method === "GET" && url.pathname === "/api/roblox-map-icon-health") {
      return json({ ok:true, revision:REVISION, allowedPlaceIds:[...ALLOWED_PLACE_IDS] });
    }
    return baseWorker.fetch(request, env, ctx);
  }
};
