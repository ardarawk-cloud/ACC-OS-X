const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 40;
const buckets = globalThis.__ACC_AI_RATE_BUCKETS__ || new Map();
globalThis.__ACC_AI_RATE_BUCKETS__ = buckets;

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer"
  }
});

const digest = async value => new Uint8Array(
  await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(value || "")))
);

const safeEqual = async (a, b) => {
  if (!a || !b) return false;
  const [aa, bb] = await Promise.all([digest(a), digest(b)]);
  if (aa.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < aa.length; i++) diff |= aa[i] ^ bb[i];
  return diff === 0;
};

const rateAllowed = request => {
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  const now = Date.now();
  const current = buckets.get(ip);
  if (!current || now - current.startedAt > WINDOW_MS) {
    buckets.set(ip, { startedAt: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= MAX_REQUESTS;
};

const compactContext = (context = {}) => JSON.stringify(context, null, 2).slice(0, 16000);

const systemInstructions = context => `You are KAI — ACC AI, the embedded operational assistant inside ACC OS X for owner Arda.

Rules:
- Reply in Indonesian unless Arda explicitly requests another language.
- Use injected ACC context as the source of truth for workspace, profile, canon, workflow, current state, registry, and owner rules.
- Answer the user's actual question, not merely list the available context.
- Never invent locked canon, balances, registry entities, current-state progress, approvals, or executed actions.
- If context is insufficient, say exactly what is missing.
- Keep answers concise, operational, and useful for ACC workflows.
- Distinguish facts from suggestions.
- You do not have access to private ChatGPT history. Continuity comes only from the injected ACC context and the chat messages in this request.
- Never claim Save to Vault, Send to Queue, Apply to Pipeline, publishing, or any other action happened unless the owner triggered that action in ACC OS X.

ACC_CONTEXT:
${compactContext(context)}`;

const extractReply = payload => {
  if (typeof payload?.response === "string") return payload.response.trim();
  if (typeof payload?.result?.response === "string") return payload.result.response.trim();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) return content.map(part => part?.text || part?.content || "").join("").trim();
  return "";
};

async function handleAi(request, env) {
  const model = env.ACC_AI_MODEL || "@cf/meta/llama-3.1-8b-instruct-fast";

  if (request.method === "GET") {
    return json({
      ok: true,
      provider: "Cloudflare Workers AI",
      model,
      aiBindingConfigured: Boolean(env.AI),
      accessCodeConfigured: Boolean(env.ACC_AI_ACCESS_CODE)
    });
  }

  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (!rateAllowed(request)) return json({ error: "Terlalu banyak permintaan. Coba lagi beberapa menit." }, 429);
  if (!env.AI) return json({ error: "Cloudflare Workers AI binding belum aktif." }, 503);
  if (!env.ACC_AI_ACCESS_CODE) return json({ error: "ACC_AI_ACCESS_CODE belum dipasang sebagai Cloudflare secret." }, 503);

  const supplied = request.headers.get("x-acc-access-code");
  if (!(await safeEqual(supplied, env.ACC_AI_ACCESS_CODE))) return json({ error: "Access code tidak cocok." }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Payload JSON tidak valid." }, 400);
  }

  const messages = (Array.isArray(body?.messages) ? body.messages : [])
    .slice(-14)
    .map(item => ({
      role: item?.role === "assistant" ? "assistant" : "user",
      content: String(item?.content || "").slice(0, 5000)
    }))
    .filter(item => item.content.trim());

  if (!messages.length) return json({ error: "Pesan kosong." }, 400);
  if (messages.reduce((n, item) => n + item.content.length, 0) > 26000) {
    return json({ error: "Riwayat percakapan terlalu panjang. Bersihkan chat lalu coba lagi." }, 413);
  }

  try {
    const result = await env.AI.run(model, {
      messages: [{ role: "system", content: systemInstructions(body?.context || {}) }, ...messages],
      max_tokens: 700,
      temperature: 0.35,
      top_p: 0.9
    });

    const reply = extractReply(result);
    if (!reply) return json({ error: "Workers AI mengembalikan respons kosong." }, 502);
    return json({ reply, model, provider: "Cloudflare Workers AI" });
  } catch (error) {
    return json({ error: `Workers AI gagal: ${String(error?.message || error)}` }, 502);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/acc-ai") return handleAi(request, env);
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response("ACC OS X asset binding missing.", { status: 500 });
  }
};
