const DISCORD_API = "https://discord.com/api/v10";
const STATUSES = ["open", "investigating", "fixing", "resolved", "closed"];
const LABELS = {
  open: "Baru",
  investigating: "Investigasi",
  fixing: "Diperbaiki",
  resolved: "Selesai",
  closed: "Ditutup"
};
const COLORS = {
  open: 0x38bdf8,
  investigating: 0xf59e0b,
  fixing: 0x8b5cf6,
  resolved: 0x22c55e,
  closed: 0x64748b
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
}
function ephemeral(message) {
  return { type: 4, data: { content: message, flags: 64 } };
}
function clean(value, max = 1400) {
  return String(value || "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim().slice(0, max);
}
function hexBytes(value, length) {
  if (typeof value !== "string" || value.length !== length * 2 || !/^[0-9a-f]+$/i.test(value)) return null;
  return Uint8Array.from(value.match(/../g), x => parseInt(x, 16));
}
export async function verifySignature(request, rawBody, publicKey) {
  const signature = hexBytes(request.headers.get("x-signature-ed25519"), 64);
  const keyData = hexBytes(publicKey, 32);
  const timestamp = request.headers.get("x-signature-timestamp");
  if (!signature || !keyData || !timestamp || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  try {
    const key = await crypto.subtle.importKey("raw", keyData, "Ed25519", false, ["verify"]);
    return crypto.subtle.verify("Ed25519", key, signature, new TextEncoder().encode(timestamp + rawBody));
  } catch {
    return false;
  }
}
function userId(interaction) {
  return interaction.member?.user?.id || interaction.user?.id || "";
}
function isModerator(interaction) {
  try {
    const p = BigInt(interaction.member?.permissions || "0");
    return Boolean((p & 8n) || (p & 32n)); // Administrator or Manage Server
  } catch {
    return false;
  }
}
function option(interaction, name) {
  return interaction.data?.options?.find(x => x.name === name)?.value;
}
function modalField(interaction, name) {
  for (const row of interaction.data?.components || []) {
    for (const field of row.components || []) {
      if (field.custom_id === name) return clean(field.value, 1400);
    }
  }
  return "";
}
function modal() {
  const input = (name, label, style, min, max, required = true) => ({
    type: 1,
    components: [{
      type: 4,
      custom_id: name,
      label,
      style,
      required,
      min_length: min,
      max_length: max
    }]
  });
  return {
    type: 9,
    data: {
      custom_id: "nadmo_bug_form",
      title: "NADMO LIVE | Laporkan Bug",
      components: [
        input("title", "Judul masalah", 1, 6, 100),
        input("detail", "Apa yang terjadi?", 2, 15, 1200),
        input("device", "HP / Versi Android / Browser", 1, 2, 100),
        input("steps", "Cara mengulangi masalah (opsional)", 2, 0, 500, false)
      ]
    }
  };
}
function keyFor(id) {
  if (!/^NML-[0-9A-Z]{6,20}$/.test(id)) return null;
  return "tickets/" + id + ".json";
}
async function readTicket(env, id) {
  const key = keyFor(id);
  if (!key || !env.BUG_REPORTS) return null;
  const object = await env.BUG_REPORTS.get(key);
  return object ? object.json() : null;
}
async function saveTicket(env, ticket) {
  const key = keyFor(ticket.id);
  if (!key || !env.BUG_REPORTS) throw new Error("Storage unavailable");
  await env.BUG_REPORTS.put(key, JSON.stringify(ticket), {
    httpMetadata: { contentType: "application/json" }
  });
}
function embedFor(ticket) {
  return {
    title: "NADMO LIVE BUG | " + ticket.id,
    color: COLORS[ticket.status] || COLORS.open,
    description: clean(ticket.detail, 1200),
    fields: [
      { name: "Status", value: LABELS[ticket.status] || ticket.status, inline: true },
      { name: "Perangkat", value: clean(ticket.device, 100) || "Tidak disebut", inline: true },
      { name: "Pelapor", value: "<@" + ticket.userId + ">", inline: true },
      { name: "Judul", value: clean(ticket.title, 100) },
      { name: "Langkah", value: clean(ticket.steps, 500) || "Belum ada" }
    ],
    footer: { text: "NADMO LIVE | Technical Support" },
    timestamp: ticket.createdAt
  };
}
async function discordBot(env, method, path, payload) {
  const response = await fetch(DISCORD_API + path, {
    method,
    headers: {
      authorization: "Bot " + env.DISCORD_BOT_TOKEN,
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error("Discord API " + response.status);
  if (response.status === 204) return null;
  return response.json();
}
async function editEphemeral(interaction, content) {
  const url = DISCORD_API + "/webhooks/" + interaction.application_id +
    "/" + interaction.token + "/messages/@original";
  const response = await fetch(url, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content: clean(content, 1800), allowed_mentions: { parse: [] } })
  });
  if (!response.ok) throw new Error("Unable to deliver Discord response: " + response.status);
}
async function notifyOwner(env, ticket) {
  const adminId = String(env.DISCORD_ADMIN_USER_ID || "");
  if (!/^\d{16,22}$/.test(adminId) || !env.DISCORD_BOT_TOKEN) return false;
  const user = await discordBot(env, "POST", "/users/@me/channels", { recipient_id: adminId });
  if (!user?.id) throw new Error("Discord admin DM channel was not created");
  const ticketUrl = "https://discord.com/channels/" +
    env.DISCORD_GUILD_ID + "/" + env.DISCORD_BUG_CHANNEL_ID +
    (ticket.messageId ? "/" + ticket.messageId : "");
  await discordBot(env, "POST", "/channels/" + user.id + "/messages", {
    content: "**NADMO LIVE | LAPORAN BUG BARU**\n" +
      "Tiket: **" + ticket.id + "**\n" +
      "Judul: " + clean(ticket.title, 100) + "\n" +
      "Status: Baru\n" + ticketUrl,
    allowed_mentions: { parse: [] }
  });
  return true;
}
async function processBug(interaction, env) {
  if (!env.BUG_REPORTS || !env.DISCORD_BOT_TOKEN) {
    return "Bot belum diaktifkan oleh admin. Silakan coba lagi nanti.";
  }
  const title = modalField(interaction, "title");
  const detail = modalField(interaction, "detail");
  const device = modalField(interaction, "device");
  const steps = modalField(interaction, "steps");
  if (title.length < 6 || detail.length < 15 || device.length < 2) {
    return "Laporan kurang lengkap. Ulangi dengan /bug.";
  }
  // The interaction snowflake is globally unique; no shared sequence or race condition.
  const id = "NML-" + BigInt(interaction.id).toString(36).toUpperCase();
  const existing = await readTicket(env, id);
  if (existing) return "Laporan yang sama sudah diterima. Kode: " + id;
  const ticket = {
    id,
    discordInteractionId: interaction.id,
    guildId: interaction.guild_id,
    userId: userId(interaction),
    title,
    detail,
    device,
    steps,
    status: "open",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messageId: null
  };
  await saveTicket(env, ticket);
  try {
    const adminId = String(env.DISCORD_ADMIN_USER_ID || "");
    const mention = /^\d{16,22}$/.test(adminId) ? "<@" + adminId + ">" : "";
    const posted = await discordBot(env, "POST", "/channels/" + env.DISCORD_BUG_CHANNEL_ID + "/messages", {
      content: mention ? mention + " laporan baru masuk: **" + id + "**" : undefined,
      embeds: [embedFor(ticket)],
      allowed_mentions: { parse: [], users: mention ? [adminId] : [] }
    });
    ticket.messageId = posted?.id || null;
    await saveTicket(env, ticket);
    // Discord mention is the primary push channel. DM is an additional best-effort alert.
    try {
      ticket.adminNotifiedByDM = await notifyOwner(env, ticket);
    } catch (e) {
      ticket.adminNotifiedByDM = false;
      console.warn("DM notification unavailable (channel mention remains):", String(e?.message || e));
    }
    await saveTicket(env, ticket);
    return "Laporan diterima! Kode tiket **" + id +
      "**. Gunakan /cekbug untuk memantau perbaikannya.";
  } catch {
    // Data remains durable even if Discord is temporarily unavailable.
    return "Laporan **" + id +
      "** sudah tersimpan, tetapi notifikasi channel belum berhasil. Admin akan memeriksa.";
  }
}
function formatWita(timestamp) {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return "Tidak tersedia";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(date) + " WITA";
}
async function processLookup(interaction, env) {
  const id = clean(option(interaction, "kode"), 32).toUpperCase();
  const ticket = await readTicket(env, id);
  if (!ticket) return "Tiket tidak ditemukan. Periksa kode NML-....";
  if (ticket.userId !== userId(interaction) && !isModerator(interaction)) {
    return "Hanya pelapor atau admin yang dapat melihat status tiket ini.";
  }
  return "**" + ticket.id + "** | " + ticket.title + "\nStatus: **" +
    (LABELS[ticket.status] || ticket.status) + "**\nDiperbarui: " + formatWita(ticket.updatedAt);
}
async function processStatus(interaction, env) {
  if (!isModerator(interaction)) return "Perintah ini hanya untuk admin server.";
  const id = clean(option(interaction, "kode"), 32).toUpperCase();
  const status = clean(option(interaction, "status"), 30);
  if (!STATUSES.includes(status)) return "Status tidak dikenal.";
  const ticket = await readTicket(env, id);
  if (!ticket) return "Tiket tidak ditemukan.";
  ticket.status = status;
  ticket.updatedBy = userId(interaction);
  ticket.updatedAt = new Date().toISOString();
  await saveTicket(env, ticket);
  if (ticket.messageId && env.DISCORD_BOT_TOKEN) {
    try {
      await discordBot(
        env,
        "PATCH",
        "/channels/" + env.DISCORD_BUG_CHANNEL_ID + "/messages/" + ticket.messageId,
        { embeds: [embedFor(ticket)], allowed_mentions: { parse: [] } }
      );
    } catch {
      return "Status **" + id + "** tersimpan, tetapi pesan Discord gagal diperbarui.";
    }
  }
  return "Tiket **" + id + "** sekarang: **" + LABELS[status] + "**.";
}
async function processDeferred(interaction, env) {
  try {
    let message;
    if (interaction.type === 5) message = await processBug(interaction, env);
    else if (interaction.data?.name === "cekbug") message = await processLookup(interaction, env);
    else if (interaction.data?.name === "setbug") message = await processStatus(interaction, env);
    else message = "Perintah tidak dikenali.";
    await editEphemeral(interaction, message);
  } catch (error) {
    console.error("NADMO bugbot request failed:", error?.message || "error");
    try {
      await editEphemeral(interaction, "Terjadi gangguan teknis. Silakan ulangi laporan.");
    } catch {}
  }
}
async function registerGuildCommands(env, appId) {
  if (!env.DISCORD_BOT_TOKEN || !env.DISCORD_GUILD_ID || !appId) return;
  const codeOption = () => ({
    type: 3, name: "kode", description: "Kode tiket NML-...", required: true
  });
  const commands = [
    { name: "bug", type: 1, description: "Laporkan masalah NADMO LIVE melalui formulir" },
    { name: "cekbug", type: 1, description: "Cek status laporan bug", options: [codeOption()] },
    {
      name: "setbug", type: 1, description: "Admin: ubah status laporan bug",
      default_member_permissions: "32",
      options: [
        codeOption(),
        {
          type: 3, name: "status", description: "Status baru", required: true,
          choices: [
            { name: "Baru", value: "open" },
            { name: "Investigasi", value: "investigating" },
            { name: "Diperbaiki", value: "fixing" },
            { name: "Selesai", value: "resolved" },
            { name: "Ditutup", value: "closed" }
          ]
        }
      ]
    }
  ];
  const response = await fetch(DISCORD_API + "/applications/" + appId +
    "/guilds/" + env.DISCORD_GUILD_ID + "/commands", {
    method: "PUT",
    headers: {
      authorization: "Bot " + env.DISCORD_BOT_TOKEN,
      "content-type": "application/json"
    },
    body: JSON.stringify(commands)
  });
  if (!response.ok) throw new Error("Discord command registration HTTP " + response.status);
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      if (!env.BUG_REPORTS || !env.DISCORD_BOT_TOKEN || !env.DISCORD_GUILD_ID) {
        console.error("Command registration skipped: missing bot configuration");
        return;
      }
      const key = "ops/discord-command-registration.json";
      if (await env.BUG_REPORTS.get(key)) return;
      await registerGuildCommands(env, "1568360275109879918");
      await env.BUG_REPORTS.put(key, JSON.stringify({
        application_id: "1568360275109879918",
        guild_id: env.DISCORD_GUILD_ID,
        commands: ["bug", "cekbug", "setbug"],
        registered_at: new Date().toISOString()
      }), {httpMetadata:{contentType:"application/json"}});
      console.log("NADMO LIVE Discord commands registered");
    })().catch(e => console.error("Discord command registration failed:", String(e?.message || e))));
  },
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;
    if (request.method === "GET" && path === "/health") {
      const registration = env.BUG_REPORTS ?
        await env.BUG_REPORTS.get("ops/discord-command-registration.json") : null;
      return json({
        service: "nadmo-live-discord-bugbot",
        configured: Boolean(env.DISCORD_PUBLIC_KEY && env.DISCORD_BOT_TOKEN &&
          env.DISCORD_GUILD_ID && env.DISCORD_BUG_CHANNEL_ID && env.BUG_REPORTS),
        commands_registered: Boolean(registration)
      });
    }
    if (request.method !== "POST" || path !== "/interactions") {
      return json({ error: "Not found" }, 404);
    }
    if (!env.DISCORD_PUBLIC_KEY) return json({ error: "Not configured" }, 503);
    const raw = await request.text();
    if (!(await verifySignature(request, raw, env.DISCORD_PUBLIC_KEY))) {
      return json({ error: "Invalid signature" }, 401);
    }
    let interaction;
    try { interaction = JSON.parse(raw); }
    catch { return json({ error: "Invalid payload" }, 400); }
    if (interaction.type === 1) {
      ctx.waitUntil(registerGuildCommands(env, interaction.application_id).catch(e => {
        console.error("Discord command registration:", e?.message || "error");
      }));
      return json({ type: 1 }); // Discord PING (register guild commands asynchronously)
    }
    if (!env.DISCORD_GUILD_ID || !env.DISCORD_BUG_CHANNEL_ID ||
        interaction.guild_id !== env.DISCORD_GUILD_ID ||
        interaction.channel_id !== env.DISCORD_BUG_CHANNEL_ID) {
      return json(ephemeral("Gunakan bot ini di channel #bugreport pada server NADMO LIVE."));
    }
    if (interaction.type === 2 && interaction.data?.name === "bug") return json(modal());
    if ((interaction.type === 2 && ["cekbug", "setbug"].includes(interaction.data?.name)) ||
        (interaction.type === 5 && interaction.data?.custom_id === "nadmo_bug_form")) {
      ctx.waitUntil(processDeferred(interaction, env));
      return json({ type: 5, data: { flags: 64 } }); // defer ephemeral response
    }
    return json(ephemeral("Perintah tidak dikenal."));
  }
};
