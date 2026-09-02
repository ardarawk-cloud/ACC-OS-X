// KAI ONE — ACC OS X ROBLOX MAP ICON PROXY v2
// Resolve Place -> Universe first, then read the official experience icon shown by Roblox clients.
// Legacy deploy marker retained intentionally: KAI_ONE_ROBLOX_MAP_ICON_PROXY_V1
import baseWorker from "./worker-brain-runtime-rescue-v9.js";

const REVISION = "KAI_ONE_ROBLOX_MAP_ICON_PROXY_V2_UNIVERSE_ICON";
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

async function resolveUniverseId(placeId) {
  const endpoint = `https://apis.roblox.com/universes/v1/places/${encodeURIComponent(placeId)}/universe`;
  const response = await fetch(endpoint, {
    headers:{"Accept":"application/json"},
    cf:{cacheTtl:60, cacheEverything:true}
  });
  if (!response.ok) return "";
  const payload = await response.json().catch(() => null);
  return String(payload?.universeId ?? payload?.UniverseId ?? "").trim();
}

async function lookupIconByUniverse(universeId) {
  if (!universeId) return null;
  const api = new URL("https://thumbnails.roblox.com/v1/games/icons");
  api.searchParams.set("universeIds", universeId);
  api.searchParams.set("size", "150x150");
  api.searchParams.set("format", "Png");
  api.searchParams.set("isCircular", "false");
  const response = await fetch(api.toString(), {
    headers:{"Accept":"application/json"},
    cf:{cacheTtl:60, cacheEverything:true}
  });
  if (!response.ok) return null;
  const payload = await response.json().catch(() => null);
  const item = Array.isArray(payload?.data)
    ? (payload.data.find(entry => String(entry?.targetId || "") === universeId) || payload.data[0])
    : null;
  if (!item || String(item?.state || "").toLowerCase() !== "completed") return null;
  const imageUrl = String(item?.imageUrl || "").trim();
  return imageUrl ? {imageUrl, source:"UNIVERSE_GAME_ICON", universeId} : null;
}

async function lookupIconByPlace(placeId) {
  const api = new URL("https://thumbnails.roblox.com/v1/places/gameicons");
  api.searchParams.set("placeIds", placeId);
  api.searchParams.set("size", "150x150");
  api.searchParams.set("format", "Png");
  api.searchParams.set("isCircular", "false");
  const response = await fetch(api.toString(), {
    headers:{"Accept":"application/json"},
    cf:{cacheTtl:60, cacheEverything:true}
  });
  if (!response.ok) return null;
  const payload = await response.json().catch(() => null);
  const item = Array.isArray(payload?.data)
    ? (payload.data.find(entry => String(entry?.targetId || "") === placeId) || payload.data[0])
    : null;
  if (!item || String(item?.state || "").toLowerCase() !== "completed") return null;
  const imageUrl = String(item?.imageUrl || "").trim();
  return imageUrl ? {imageUrl, source:"PLACE_GAME_ICON", universeId:""} : null;
}

async function mapIcon(request, ctx) {
  const url = new URL(request.url);
  const placeId = String(url.searchParams.get("placeId") || "").trim();
  if (!ALLOWED_PLACE_IDS.has(placeId)) {
    return json({ok:false,error:"MAP_PLACE_ID_NOT_ALLOWED",revision:REVISION},404);
  }

  const edgeCache = caches.default;
  const cacheKey = new Request(`${url.origin}/api/roblox-map-icon?placeId=${encodeURIComponent(placeId)}&rev=${REVISION}`);
  const cached = await edgeCache.match(cacheKey);
  if (cached) return cached;

  const universeId = await resolveUniverseId(placeId);
  const icon = (await lookupIconByUniverse(universeId)) || (await lookupIconByPlace(placeId));
  if (!icon?.imageUrl) {
    return json({ok:false,error:"ROBLOX_ICON_NOT_READY",placeId,universeId:universeId || null,revision:REVISION},502);
  }

  const imageResponse = await fetch(icon.imageUrl, {
    headers:{"Accept":"image/avif,image/webp,image/png,image/*,*/*;q=0.8"},
    cf:{cacheTtl:300, cacheEverything:true}
  });
  if (!imageResponse.ok) {
    return json({ok:false,error:"ROBLOX_ICON_FETCH_FAILED",status:imageResponse.status,placeId,universeId:universeId || null,revision:REVISION},502);
  }

  const headers = new Headers();
  headers.set("Content-Type", imageResponse.headers.get("Content-Type") || "image/png");
  headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("X-ACC-Map-Icon-Revision", REVISION);
  headers.set("X-ACC-Map-Icon-Source", icon.source);
  if (universeId) headers.set("X-ACC-Roblox-Universe-Id", universeId);
  const response = new Response(imageResponse.body,{status:200,headers});
  ctx?.waitUntil?.(edgeCache.put(cacheKey,response.clone()));
  return response;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/api/roblox-map-icon") {
      try { return await mapIcon(request, ctx); }
      catch (error) {
        return json({ok:false,error:"ROBLOX_MAP_ICON_PROXY_FAILED",detail:String(error?.message || error),revision:REVISION},502);
      }
    }
    if (request.method === "GET" && url.pathname === "/api/roblox-map-icon-health") {
      return json({ok:true,revision:REVISION,mode:"PLACE_TO_UNIVERSE_TO_GAME_ICON",allowedPlaceIds:[...ALLOWED_PLACE_IDS]});
    }
    return baseWorker.fetch(request, env, ctx);
  }
};
