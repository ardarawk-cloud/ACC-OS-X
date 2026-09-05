// KAI ONE — ACC OS X ROBLOX PUBLISH PROBE v1
// Safe capability probe only. No Roblox publish mutation is performed by this revision.
import baseWorker from "./worker-map-icon-proxy-v1.js";

const REVISION = "KAI_ONE_ROBLOX_PUBLISH_PROBE_V1";
const TARGET = Object.freeze({ universeId: "10745364913", placeId: "76001567401911" });

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json;charset=UTF-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function robloxCredentialConfigured(env) {
  return Boolean(
    String(env?.ROBLOX_API_KEY || "").trim() ||
    String(env?.ROBLOX_OPEN_CLOUD_API_KEY || "").trim() ||
    String(env?.ROBLOX_OPEN_CLOUD_MASTER_V2 || "").trim()
  );
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/api/roblox-publish-health") {
      return json({
        ok: true,
        revision: REVISION,
        target: TARGET,
        robloxCredentialConfigured: robloxCredentialConfigured(env),
        mutationEnabled: false,
        note: "Capability probe only; no Roblox publish action is exposed in this revision.",
      });
    }
    return baseWorker.fetch(request, env, ctx);
  },
};
