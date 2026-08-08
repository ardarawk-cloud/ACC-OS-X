// ACC OS X — REAL META FACEBOOK Publish Connector R3
// Mission Alpha-3: real AI image bytes + caption publish to a Facebook Page.
// Preserves R2 public media URL and R1 text-only fallbacks.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-ACC-Access-Code",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function firstText(...values) {
  for (const v of values) if (typeof v === "string" && v.trim()) return v.trim();
  return "";
}

function getMessage(job) {
  return firstText(
    job?.message, job?.caption, job?.text,
    job?.content?.message, job?.content?.caption, job?.content?.text,
    job?.payload?.message, job?.payload?.caption, job?.payload?.text
  );
}

function getMediaUrl(job) {
  return firstText(
    job?.mediaUrl, job?.imageUrl,
    job?.content?.mediaUrl, job?.content?.imageUrl,
    job?.payload?.mediaUrl, job?.payload?.imageUrl
  );
}

function getImageBase64(job) {
  return firstText(
    job?.imageBase64,
    job?.content?.imageBase64,
    job?.payload?.imageBase64
  ).replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: { ...corsHeaders, "Access-Control-Max-Age": "86400" }
      });
    }

    if (
      request.method === "GET" &&
      (url.pathname === "/" || url.pathname === "/health" || url.pathname === "/api/acc-publish")
    ) {
      return json({
        ok: true,
        service: "ACC Publish Connector",
        system: "ACC OS X",
        status: "ONLINE",
        revision: "REAL_META_R3_BASE64",
        connector: "META_FACEBOOK",
        mode: "REAL",
        capabilities: ["TEXT_FEED", "PHOTO_URL_CAPTION", "PHOTO_BASE64_CAPTION"],
        configured: Boolean(env.META_PAGE_ID && env.META_PAGE_ACCESS_TOKEN),
      });
    }

    if (request.method === "POST" && ["/", "/publish", "/api/acc-publish"].includes(url.pathname)) {
      if (env.ACC_ACCESS_CODE) {
        const supplied = request.headers.get("X-ACC-Access-Code") || "";
        if (supplied !== env.ACC_ACCESS_CODE) {
          return json({ ok: false, error: { code: "UNAUTHORIZED", message: "Invalid ACC access code" } }, 401);
        }
      }

      if (!env.META_PAGE_ID || !env.META_PAGE_ACCESS_TOKEN) {
        return json({
          ok: false,
          connector: "META_FACEBOOK",
          status: "NOT_PUBLISHED",
          error: {
            code: "META_NOT_CONFIGURED",
            message: "META_PAGE_ID / META_PAGE_ACCESS_TOKEN belum dipasang di Cloudflare Worker secrets."
          },
        }, 503);
      }

      let job;
      try { job = await request.json(); }
      catch {
        return json({ ok: false, status: "NOT_PUBLISHED", error: { code: "INVALID_JSON", message: "Invalid JSON body" } }, 400);
      }

      const message = getMessage(job);
      const mediaUrl = getMediaUrl(job);
      const imageBase64 = getImageBase64(job);
      const mimeType = firstText(job?.mimeType, job?.content?.mimeType, job?.payload?.mimeType) || "image/jpeg";

      if (!message && !mediaUrl && !imageBase64) {
        return json({
          ok: false,
          status: "NOT_PUBLISHED",
          error: { code: "EMPTY_CONTENT", message: "Caption/message dan media kosong; publish dibatalkan." }
        }, 400);
      }

      if (mediaUrl && !/^https:\/\/\S+$/i.test(mediaUrl)) {
        return json({
          ok: false,
          connector: "META_FACEBOOK",
          status: "NOT_PUBLISHED",
          error: { code: "INVALID_MEDIA_URL", message: "mediaUrl harus public HTTPS URL." }
        }, 400);
      }

      if (imageBase64 && imageBase64.length > 20_000_000) {
        return json({
          ok: false,
          connector: "META_FACEBOOK",
          status: "NOT_PUBLISHED",
          error: { code: "IMAGE_TOO_LARGE", message: "Base64 image terlalu besar untuk connector beta." }
        }, 413);
      }

      const graphVersion = firstText(env.META_GRAPH_VERSION) || "v23.0";
      const base = `https://graph.facebook.com/${graphVersion}/${encodeURIComponent(env.META_PAGE_ID)}`;

      let endpoint;
      let requestBody;
      let publishMode;

      if (imageBase64) {
        endpoint = `${base}/photos`;
        const form = new FormData();
        const bytes = base64ToBytes(imageBase64);
        form.set("source", new Blob([bytes], { type: mimeType }), "acc-os-x-poster.jpg");
        if (message) form.set("caption", message);
        form.set("access_token", env.META_PAGE_ACCESS_TOKEN);
        requestBody = form;
        publishMode = "PHOTO_BASE64_CAPTION";
      } else {
        const form = new URLSearchParams();
        if (mediaUrl) {
          endpoint = `${base}/photos`;
          form.set("url", mediaUrl);
          if (message) form.set("caption", message);
          publishMode = "PHOTO_URL_CAPTION";
        } else {
          endpoint = `${base}/feed`;
          form.set("message", message);
          publishMode = "TEXT_FEED";
        }
        form.set("access_token", env.META_PAGE_ACCESS_TOKEN);
        requestBody = form;
      }

      let metaResponse;
      let metaData;
      try {
        metaResponse = await fetch(endpoint, { method: "POST", body: requestBody });
        metaData = await metaResponse.json();
      } catch (err) {
        return json({
          ok: false,
          connector: "META_FACEBOOK",
          status: "NOT_PUBLISHED",
          error: { code: "META_NETWORK_ERROR", message: String(err?.message || err) }
        }, 502);
      }

      if (!metaResponse.ok || !(metaData?.id || metaData?.post_id)) {
        return json({
          ok: false,
          connector: "META_FACEBOOK",
          status: "NOT_PUBLISHED",
          error: {
            code: "META_PUBLISH_FAILED",
            message: metaData?.error?.message || `Meta HTTP ${metaResponse.status}`,
            type: metaData?.error?.type || null,
            metaCode: metaData?.error?.code || null,
            metaSubcode: metaData?.error?.error_subcode || null,
          },
        }, metaResponse.status >= 400 && metaResponse.status < 600 ? metaResponse.status : 502);
      }

      return json({
        ok: true,
        connector: "META_FACEBOOK",
        mode: "REAL",
        publishMode,
        status: "PUBLISHED",
        externalPostId: metaData.post_id || metaData.id,
        publishedAt: new Date().toISOString(),
        idempotencyKey: job?.idempotencyKey || null,
        revision: "REAL_META_R3_BASE64"
      });
    }

    return json({ ok: false, error: { code: "NOT_FOUND", message: "Endpoint not found" } }, 404);
  },
};
