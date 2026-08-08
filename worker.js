const JSON_HEADERS = {
  "content-type": "application/json; charset=UTF-8",
  "cache-control": "no-store"
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });

const normalizeMessages = (messages, context) => {
  const clean = Array.isArray(messages)
    ? messages
        .filter(m => m && typeof m.content === "string")
        .slice(-18)
        .map(m => ({
          role: ["system", "assistant", "user"].includes(m.role) ? m.role : "user",
          content: m.content.slice(0, 50000)
        }))
    : [];

  if (context) {
    clean.unshift({
      role: "system",
      content:
        "ACC OS X injected operational context follows. Treat it as the source of truth. " +
        "Do not invent completed work, approvals, publication, canon, or verified facts.\n\n" +
        JSON.stringify(context).slice(0, 70000)
    });
  }
  return clean;
};

const extractReply = result => {
  if (!result) return "";
  if (typeof result.response === "string") return result.response;
  if (typeof result.result === "string") return result.result;
  if (typeof result.output_text === "string") return result.output_text;
  if (typeof result.text === "string") return result.text;
  if (Array.isArray(result.choices)) {
    const value = result.choices[0]?.message?.content ?? result.choices[0]?.text;
    if (typeof value === "string") return value;
  }
  return "";
};

async function handleAi(request, env) {
  if (request.method === "GET") {
    return json({
      ok: true,
      service: "ACC OS X Server AI",
      revision: "R6.10C-GM4.1-AI-ROUTE-FIX",
      model: env.ACC_AI_MODEL || "@cf/meta/llama-3.1-8b-instruct-fast",
      aiBinding: Boolean(env.AI)
    });
  }

  if (request.method !== "POST") {
    return json({ ok: false, error: { code: "METHOD_NOT_ALLOWED" } }, 405);
  }

  const supplied = (request.headers.get("X-ACC-Access-Code") || "").trim();
  if (!supplied) {
    return json({ ok: false, error: { code: "ACCESS_CODE_REQUIRED" } }, 401);
  }

  // If a Cloudflare secret already exists, enforce it.
  // During current beta recovery, a non-empty device code remains accepted when
  // the server secret has not yet been configured, preserving the existing PWA flow.
  const expected = String(env.ACC_AI_ACCESS_CODE || env.ACC_ACCESS_CODE || "").trim();
  if (expected && supplied !== expected) {
    return json({ ok: false, error: { code: "ACCESS_DENIED" } }, 403);
  }

  if (!env.AI) {
    return json({ ok: false, error: { code: "AI_BINDING_MISSING" } }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: { code: "INVALID_JSON" } }, 400);
  }

  const messages = normalizeMessages(body?.messages, body?.context);
  if (!messages.length) {
    return json({ ok: false, error: { code: "MESSAGES_REQUIRED" } }, 400);
  }

  const model = env.ACC_AI_MODEL || "@cf/meta/llama-3.1-8b-instruct-fast";

  try {
    const result = await env.AI.run(model, {
      messages,
      max_tokens: 1200,
      temperature: 0.45
    });

    const reply = extractReply(result);
    if (!reply) {
      return json({
        ok: false,
        error: { code: "AI_EMPTY_RESPONSE" },
        providerPayloadType: typeof result
      }, 502);
    }

    return json({
      ok: true,
      reply,
      provider: "Cloudflare Workers AI",
      model,
      revision: "R6.10C-GM4.1-AI-ROUTE-FIX"
    });
  } catch (error) {
    return json({
      ok: false,
      error: {
        code: "AI_INFERENCE_FAILED",
        message: String(error?.message || error)
      }
    }, 502);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/acc-ai") {
      return handleAi(request, env);
    }

    return env.ASSETS.fetch(request);
  }
};
