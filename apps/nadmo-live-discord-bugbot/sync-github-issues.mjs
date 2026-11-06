// NADMO LIVE bug → GitHub Issue bridge. Runs within the existing GitHub Actions runner.
// No Discord usernames, report descriptions, or device fingerprints are published.
const GH_REPO = "ardarawk-cloud/ACC-OS-X";
const CF_BUCKET = "nadmo-live-bugreports";
const GUILD = "1567884416095752213";
const CHANNEL = "1567884582101983333";
const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN || "";
const GH_TOKEN = process.env.GITHUB_TOKEN || "";
const DRY_RUN = process.env.GITHUB_REF !== "refs/heads/main";
const cfBase = "https://api.cloudflare.com/client/v4/accounts/" +
  encodeURIComponent(CF_ACCOUNT) + "/r2/buckets/" + CF_BUCKET + "/objects";
const ghBase = "https://api.github.com";
if (!CF_ACCOUNT || !CF_TOKEN || !GH_TOKEN) {
  throw new Error("Missing existing CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN or workflow GITHUB_TOKEN");
}
async function fetchJson(url, token, opts = {}) {
  const response = await fetch(url, {
    ...opts,
    headers: {
      accept: "application/vnd.github+json",
      authorization: "Bearer " + token,
      ...(opts.body ? { "content-type": "application/json" } : {}),
      ...(opts.headers || {})
    }
  });
  if (!response.ok) {
    throw new Error("Remote API " + new URL(url).host + " returned HTTP " + response.status);
  }
  return response.json();
}
function keyPattern(key) {
  return /^tickets\/NML-[0-9A-Z]{6,20}\.json$/.test(key);
}
function normalizeStatus(value) {
  return ["open", "investigating", "fixing", "resolved", "closed"].includes(value) ? value : null;
}
function issueTitle(code) {
  return "[NADMO LIVE] Bug " + code;
}
function messageUrl(ticket) {
  return "https://discord.com/channels/" + GUILD + "/" + CHANNEL +
    (ticket.messageId && /^\d{16,22}$/.test(ticket.messageId) ? "/" + ticket.messageId : "");
}
async function listTicketKeys() {
  const keys = [];
  let cursor = "";
  for (let page = 0; page < 10; page++) {
    const u = new URL(cfBase);
    u.searchParams.set("prefix", "tickets/");
    u.searchParams.set("per_page", "100");
    if (cursor) u.searchParams.set("cursor", cursor);
    const response = await fetchJson(u.href, CF_TOKEN);
    const results = Array.isArray(response.result) ? response.result :
      Array.isArray(response.result?.objects) ? response.result.objects : [];
    keys.push(...results.map(x => x.key).filter(keyPattern));
    const next = response.result_info?.cursor || response.result?.cursor || "";
    if (!next || next === cursor) break;
    cursor = next;
  }
  return Array.from(new Set(keys));
}
async function findExistingIssue(id) {
  const q = "repo:" + GH_REPO + " is:issue in:title \"" + id + "\"";
  const result = await fetchJson(ghBase + "/search/issues?q=" + encodeURIComponent(q) + "&per_page=10", GH_TOKEN);
  const wanted = issueTitle(id);
  return (result.items || []).find(x => x.title === wanted) || null;
}
async function issueCreate(ticket) {
  const url = messageUrl(ticket);
  const body = [
    "## NADMO LIVE — automated bug ticket",
    "",
    "Ticket: \`" + ticket.id + "\`",
    "Status saat diterima: \`" + ticket.status + "\`",
    "Tercatat: " + (Number.isFinite(Date.parse(ticket.createdAt)) ?
      new Date(ticket.createdAt).toISOString() : "Tidak tersedia"),
    "",
    "Detail laporan tersedia di Discord internal: " + url,
    "",
    "> Laporan lengkap, identitas pelapor, dan data perangkat tidak disalin ke issue publik.",
    "> Perbaikan kode harus melalui pemeriksaan dan pengujian sebelum rilis."
  ].join("\n");
  return fetchJson(ghBase + "/repos/" + GH_REPO + "/issues", GH_TOKEN, {
    method: "POST",
    body: JSON.stringify({ title: issueTitle(ticket.id), body })
  });
}
async function issueClose(issue) {
  return fetchJson(ghBase + "/repos/" + GH_REPO + "/issues/" + issue.number, GH_TOKEN, {
    method: "PATCH",
    body: JSON.stringify({ state: "closed", state_reason: "completed" })
  });
}
const keys = await listTicketKeys();
let created = 0, closed = 0, untouched = 0;
for (const key of keys) {
  const ticket = await fetchJson(cfBase + "/" + encodeURIComponent(key), CF_TOKEN);
  if (!ticket?.id || key !== "tickets/" + ticket.id + ".json" ||
      !normalizeStatus(ticket.status) ||
      ticket.guildId !== GUILD ||
      typeof ticket.title !== "string" || ticket.title.trim().length < 6 ||
      typeof ticket.detail !== "string" || ticket.detail.trim().length < 15) continue;
  const isClosed = ticket.status === "closed" || ticket.status === "resolved";
  if (DRY_RUN) {
    untouched++;
    continue;
  }
  const existing = await findExistingIssue(ticket.id);
  if (!existing && !isClosed) {
    await issueCreate(ticket);
    created++;
  } else if (existing && isClosed && existing.state === "open") {
    await issueClose(existing);
    closed++;
  } else {
    untouched++;
  }
}
console.log(JSON.stringify({
  status: "ok",
  mode: DRY_RUN ? "permission-check (no writes)" : "scheduled issue sync",
  ticketCount: keys.length, created, closed, unchanged: untouched
}));
