// ACC OS X R6.10B — Real Meta Facebook Publisher
// Secrets/vars expected in Cloudflare Worker:
//   ACC_CONNECTOR_ACCESS_CODE (secret)
//   FB_PAGE_TOKEN_TUKANG_TAMBANG (secret)
//   FB_PAGE_ID_TUKANG_TAMBANG = 101420769205689 (var or secret)
//   META_GRAPH_VERSION = v26.0 (optional var)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-ACC-Access-Code",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function fail(code, message, status = 400, extra = {}) {
  return json({ ok: false, error: { code, message, ...extra } }, status);
}

const TARGETS = {
  "ch-tukang-tambang": {
    connector: "META_FACEBOOK",
    pageName: "Tukang Tambang",
    pageIdEnv: "FB_PAGE_ID_TUKANG_TAMBANG",
    tokenEnv: "FB_PAGE_TOKEN_TUKANG_TAMBANG",
    fallbackPageId: "101420769205689",
  },
};

async function metaPost({ version, pageId, edge, token, fields }) {
  const body = new URLSearchParams({ ...fields, access_token: token });
  const response = await fetch(`https://graph.facebook.com/${version}/${pageId}/${edge}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    const metaError = data?.error || {};
    throw Object.assign(new Error(metaError.message || `Meta HTTP ${response.status}`), {
      code: "META_API_ERROR",
      metaCode: metaError.code,
      metaSubcode: metaError.error_subcode,
      httpStatus: response.status,
    });
  }
  return data;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: { ...corsHeaders, "Access-Control-Max-Age": "86400" },
      });
    }

    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
      return json({
        ok: true,
        service: "ACC Publish Connector",
        system: "ACC OS X",
        status: "ONLINE",
        revision: "R6.10B",
        connectors: ["META_FACEBOOK"],
        liveTargets: Object.keys(TARGETS),
      });
    }

    if (request.method !== "POST" || !["/", "/publish", "/api/acc-publish"].includes(url.pathname)) {
      return fail("NOT_FOUND", "Endpoint not found", 404);
    }

    const expectedAccessCode = String(env.ACC_CONNECTOR_ACCESS_CODE || "");
    const suppliedAccessCode = String(request.headers.get("X-ACC-Access-Code") || "");
    if (!expectedAccessCode) return fail("CONNECTOR_ACCESS_NOT_CONFIGURED", "ACC connector access secret is not configured.", 503);
    if (!suppliedAccessCode || suppliedAccessCode !== expectedAccessCode) return fail("UNAUTHORIZED", "Invalid ACC connector access code.", 401);

    let job;
    try {
      job = await request.json();
    } catch {
      return fail("INVALID_JSON", "Invalid JSON body", 400);
    }

    if (!job || typeof job !== "object") return fail("INVALID_JOB", "Publish job is required", 400);
    const target = TARGETS[job.channelId];
    if (!target) return fail("TARGET_NOT_ENABLED", `Real publishing is not enabled for channel ${job.channelId || "unknown"}.`, 409);

    const pageId = String(env[target.pageIdEnv] || target.fallbackPageId || "");
    const pageToken = String(env[target.tokenEnv] || "");
    if (!pageId) return fail("PAGE_ID_MISSING", `${target.pageName} Page ID is not configured.`, 503);
    if (!pageToken) return fail("PAGE_TOKEN_MISSING", `${target.pageName} Page token is not configured.`, 503);

    const message = String(job?.content?.message || "").trim();
    const mediaUrl = String(job?.content?.mediaUrl || "").trim();
    if (!message && !mediaUrl) return fail("EMPTY_CONTENT", "Caption/message or media URL is required.", 400);

    const version = String(env.META_GRAPH_VERSION || "v26.0").replace(/^\/+|\/+$/g, "");

    try {
      let result;
      let publishMode;
      if (mediaUrl) {
        result = await metaPost({
          version,
          pageId,
          edge: "photos",
          token: pageToken,
          fields: { url: mediaUrl, caption: message },
        });
        publishMode = "PHOTO";
      } else {
        result = await metaPost({
          version,
          pageId,
          edge: "feed",
          token: pageToken,
          fields: { message },
        });
        publishMode = "TEXT";
      }

      return json({
        ok: true,
        connector: "META_FACEBOOK",
        pageId,
        pageName: target.pageName,
        status: "PUBLISHED",
        publishMode,
        externalPostId: result.post_id || result.id,
        publishedAt: new Date().toISOString(),
        idempotencyKey: job.idempotencyKey || null,
      });
    } catch (error) {
      return fail(error.code || "META_PUBLISH_FAILED", error.message || "Meta publish failed", error.httpStatus || 502, {
        metaCode: error.metaCode || null,
        metaSubcode: error.metaSubcode || null,
      });
    }
  },
};
