# NADMO SOCIAL — Chat-to-Queue Posting Contract v1 (15 Oct 2026)

Status: **direct ChatGPT/Cloudflare submission tested in private D1**. TikTok public post automation NOT implemented and not claimed.

## Operator behavior (every channel conversation)

Owner command: **POST** (or **JADWALKAN**) for a fully produced content item. Respond by invoking the **connected Cloudflare tool**, NOT by asking the owner to re-enter title/caption/URL in Content Hub.

For each job determine:
- **channel_key** from the active content-producing channel/project; check it against D1's `social_channels` registry. Never silently attribute unknown channels to NADMO Studio. Unknown channel becomes `UNASSIGNED` and cannot publish until owner maps it.
- `title`, final `caption`, `media_type` (`image` or `video`), `media_url` if an actual durable HTTPS asset exists, `priority` (normal by default).
- Platform destination for TikTok is always `TIKTOK_SHARED_01` (owner display handle currently configured separately in D1). Do not accept an arbitrary account ID from content.
- If image/video exists **only within ChatGPT** and is not accessible via a durable HTTPS URL, do not invent URLs, upload claims, or media IDs. Submit the copy package with empty `media_url` and `QC_BLOCKED`, tagged `WAITING_MEDIA_FROM_CHAT` until the asset-transfer connector is built.
- A lack of an actual content package is not permission to invent one. Do not submit random/test drafts merely because the owner asked for infrastructure work.

## Transport — connected Cloudflare account, not public GitHub

Use `Cloudflare.execute` through connected Cloudflare plugin targeting the already-authorized Cloudflare account and D1 `nadmo-social-queue` (database UUID is in `wrangler.template.json`). No passwords or new infrastructure.

1. D1 query `SELECT channel_key,channel_name,category,target_account FROM social_channels WHERE channel_key=? AND active=1` with the actual project channel key. If unknown, use `UNASSIGNED`, `other` and `unassigned` and report mapping needed.
2. Validate title and caption nonblank, title max 160 chars, caption max 2200, media_type `image|video`, and HTTPS URL only when provided. Never treat a sandbox:// link as public HTTPS or a viewable local attachment as transferred.
3. Generate a deterministic SHA256 fingerprint of source channel+title+caption+media URL+type. Use `submission_key='chat:v1:'+fingerprint.slice(0,32)`, `payload_hash=fingerprint`; use `crypto.randomUUID()` for `id` and `social_events.event_id`.
4. Parameterized D1 insert: `INSERT OR IGNORE INTO social_jobs(id,submission_key,payload_hash,channel_key,channel_name,category,target_account,title,caption,media_url,media_type,priority,status,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`. Values must be from validated content and channel registry. Status `QC_PENDING` if real HTTPS media URL provided, or `QC_BLOCKED` if unavailable; notes `WAITING_MEDIA_FROM_CHAT` when missing. No `READY`, no `SCHEDULED`, no `PUBLISHED` from this transport.
5. On an inserted row, write the audit event `CHAT_SUBMITTED` with actor `CHATGPT_CLOUDFLARE` and source project, without storing full private chat transcripts. For retries on existing `submission_key`, return the original job without adding a second event. Check `payload_hash` on collisions.
6. Query back `id,status,channel_key,target_account` and report verified receipt. Do not say a post was published.
7. Cloudflare Access owner session continues guarding the dashboard `/social.html`; direct Cloudflare tool writes use the ChatGPT user's already-authorized connected Cloudflare account instead of a forged JWT.

## Rights/QC

Missing media, third-party copyrights, missing owner consent for public post, or ambiguous account mapping all stay blocked. An optional later `attach_media` action on the protected publisher API moves `QC_BLOCKED -> QC_PENDING`, then QC pass may move it to READY. The ten WITA slots use the existing scheduler. **TikTok public share requires owner interaction and platform rules apply.**

## Actual bridge smoke test

On 15 Oct 2026, a test-only draft was directly created using Cloudflare connector, not UI:
- Channel: `nadmo-studio`.
- Target: `TIKTOK_SHARED_01`.
- Job ID: `a6f6f62c-b488-4150-befe-52121c47adbb`.
- Status: `QC_BLOCKED` because no media.
- Action logged as `CHAT_SUBMITTED`.
This was a **test item**, not public content, not scheduled or posted. Remove the test item during production cleanup, retaining this limited proof receipt.

## Limitations — don't hide these

- Cross-conversation calls work only where the owner-authorized Cloudflare plugin is connected and available to ChatGPT. This file does not install a global ChatGPT command or automatic background job.
- Transport of ChatGPT-generated image/video bytes into private R2 is **not yet connected**. Without that, media-only ChatGPT content cannot become READY automatically.
- TikTok Direct Post API cannot be used for this internal-only owner tool under the documented intended-use restrictions; public TikTok posting remains owner share/handoff.
- Do not expose unpublished captions/media via public GitHub repository/Issues; do not create a new Worker, domain, or public URL by default.
