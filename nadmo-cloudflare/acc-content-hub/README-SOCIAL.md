# NADMO SOCIAL — TikTok shared queue implementation

**Date:** 15 October 2026. **Status:** STAGING SOURCE / NOT DEPLOYED.
**Authority:** This implementation is inside the Content Hub Worker source associated with Cloudflare script `nadmo-contenthub`. The standalone legacy repository `ACC-Content-Hub` contains earlier Capacitor/PWA code and must not be treated as the live deployment source until reconciled.

## Implemented and tested in branch

- 31 source-channel keys, one locked logical TikTok target (`TIKTOK_SHARED_01`), unknown channels routed to manual UNASSIGNED QC.
- D1 schema with deduplicated submissions, 10 unique time slots/day, status/event history and optimistic version updates.
- Scheduler using **Asia/Makassar** with max 2 slots/channel/day and urgent/owner-pin priority.
- Explicit owner QC + video/photo HTTPS media URI + caption; empty or unverified content cannot schedule.
- Cloudflare Access owner-only email login; server validates JWT signature + audience + issuer + allowed email. Pause all, per-job cancel/resume, share handoff, self-reported link and owner-verified receipt.
- `/social.html` isolated mobile/desktop dashboard; no TikTok passwords, no API tokens in browser storage.
- TikTok public posting itself is MANUAL, through the TikTok app. Browser Web Share or media link is a handoff, not publication.
- A private owner utility is not eligible for TikTok Direct Post under its published intended-use guidelines. No hidden automation or scraping.

## Current stage: blocked from LIVE

Cloudflare verified **2026-10-15**: `nadmo-social-queue` (dedicated D1) exists in owner's account; migration `0001_social_queue.sql` executed successfully (11 statements); Worker `nadmo-contenthub` now has bindings **ASSETS + SOCIAL_DB + NADMO_SOCIAL_OWNER_EMAIL**. An Access app `nadmo social` protects `contenthub.nadmo.id/social*` and `contenthub.nadmo.id/api/social*`, with one owner-only Allow email policy and a Cloudflare identity provider. D1 settings verified target_daily=10, timezone=Asia/Makassar, paused=false. The new Worker source and dashboard are NOT deployed.

Outstanding blockers: the new Worker source and dashboard assets are NOT deployed, ChatGPT integration and Android native sharing are NOT implemented. The obsolete 32-character owner key is no longer required. Do not claim queue is live. Source stays on a separate branch until staging tests and owner-device QC.

## Staging + controlled production rollout checklist

1. Confirm current production Worker deployment commit/source and preserve rollback version. Never overwrite ACC OS X unrelated source.
2. VERIFIED: dedicated D1 `nadmo-social-queue`, UUID `e684674e-8e5b-4401-a771-cdd94d888b6a`, hosted APAC; never substitute booking/customer databases.
3. VERIFIED: `SOCIAL_DB` binding added to `nadmo-contenthub` while preserving existing `ASSETS`. Also recorded in branch `wrangler.template.json`. Preserve Worker name, domain, route, and current deployment rollback version.
4. VERIFIED: `migrations/0001_social_queue.sql` applied to dedicated D1: `social_jobs`, `social_events`, `social_settings` exist and settings have target_daily=10 and Asia/Makassar.
5. VERIFIED: Access application `nadmo social` with allowed owner-only email and paths `contenthub.nadmo.id/social*` plus `contenthub.nadmo.id/api/social*` (NOT the whole website). Worker binding `NADMO_SOCIAL_OWNER_EMAIL` is set to the owner's Cloudflare account email; do not commit a real email to public source. Before production, validate Access JWT signature and audience via `access-auth.mjs`, and confirm no other hostname can bypass the owner session. DO NOT configure the obsolete owner API key.
6. From `source/`, build assets using the existing Vite build, verify `dist/social.html`, `dist/social.js`, `dist/social.css`. Run CI `NADMO Social Queue CI`.
7. Deploy staged Worker + assets, verify `GET /api/_healthcheck`; unauthenticated `GET /api/social/meta` blocked by Access and origin JWT verification; signed owner session -> 200; missing owner identity binding -> 503; missing SOCIAL_DB -> 503. Preserve original asset handling. Test browser and API access from unrelated hostnames.
8. Submit a **test job** to `/api/social/jobs` using a unique idempotency key; repeat request and verify only 1 record. Perform QC, schedule, share handoff, and manually verify link without accidental TikTok posting. Inspect D1 log, statuses and version.
9. Regression-test original Content Hub desktop/mobile and all existing routes; test Android share on the actual device before marking that UX PASS.
10. Only then merge, deploy production in existing route, record Worker version, deployment source commit, rollback version and owner QC. Do not label LIVE based on GitHub CI alone.

## Current API contract (owner-only)

All requests to `/api/social/*` are behind Cloudflare Access. Worker verifies Cloudflare's signed `Cf-Access-Jwt-Assertion` token using the Access JWKS, exact audience, issuer, expiration and configured owner email. No 32-character key is entered in browser. Same-origin UI only; no permissive CORS.

| Route | Method | Purpose |
|---|---|---|
| `/api/social/meta` | GET | Routes, settings, channel list |
| `/api/social/jobs` | GET | Content queue |
| `/api/social/jobs` | POST | Idempotent submission |
| `/api/social/jobs/:id/action` | POST | QC / pause / resume / share / verify |
| `/api/social/schedule` | POST | Assign available slots for a WITA date |
| `/api/social/settings` | POST | Pause all scheduling |

Sample input: `{"source":"chatgpt_channel","platform":"tiktok","channel_key":"balinightlife","client_submission_key":"unique-request-20261015-1","title":"Demo","caption":"Example caption","media_url":"https://example.com/video.mp4","media_type":"video","priority":"NORMAL"}`. That content is an example **only**, not a real TikTok post.

`PUBLISHED_VERIFIED` is a manual owner-attested verification of a real TikTok link. Media-share handoff or clipboard success is never publication evidence.

## Not in this milestone

- ChatGPT custom connector/tool integration for cross-conversation direct submission, source conversation identity binding and artifact transfer.
- Direct in-app file upload to R2 and secure asset delivery; currently requires an accessible HTTPS media URL.
- Native Android TikTok Share Kit (SDK, client key, app registration and signing). Browser share sheet is implemented as an initial fallback, **not** production-certified native share.
- Fully automatic public TikTok posting, because the intended use here is private/internal.
- Social analytics, inbox, other-platform posting changes.

Official TikTok references: https://developers.tiktok.com/docs/en/content-sharing-guidelines and https://developers.tiktok.com/docs/en/share-kit-android-quickstart-v2

## Rollback

Existing production is unaffected while this PR is unmerged. After deployment, rollback to the recorded previous Worker version/commit and unbind the new isolated D1 if necessary; retain D1 data safely for troubleshooting. Never delete legacy Content Hub or OS X data.


## Instagram Business/Creator Login — setup and QC (2026-10-18)

Owner confirmed DISTORSI RAKYAT is now a Professional Instagram account. The old Facebook System User token does not automatically grant access to a separately authorized Instagram account.

New files: instagram-oauth.mjs, migration 0004_instagram_oauth.sql, dedicated Instagram OAuth endpoints under /api/social/instagram/* and a guarded Instagram Connect button in social-connect.html. Tokens are AES-256-GCM encrypted in private D1; no code, token or secret is delivered to the browser or APK.

External Meta setup required for activation:
1. In https://developers.facebook.com/apps/ configure Instagram > API setup with Instagram Login on an appropriate Meta app. The Instagram App ID can differ from Facebook App ID.
2. Add EXACT Valid OAuth Redirect URI: https://contenthub.nadmo.id/api/social/instagram/callback
3. Set Worker env SOCIAL_IG_APP_ID; add Worker secrets SOCIAL_IG_APP_SECRET and SOCIAL_IG_TOKEN_KEY (32 random bytes encoded base64url). Keep secrets off GitHub, APK, and chat.
4. Meta permissions: instagram_business_basic and instagram_business_content_publish. App test mode may need owner/tester app roles; broader use may need Meta approval.
5. Owner signs in and consents through Instagram; then selects an authorized account for channel distorsi-rakyat. This must never silently map to @nadmostudio.

Cloudflare Access owner verification remains enforced at the origin for start, status, callback routes. Tokens are stored encrypted and OAuth state is consumed exactly once. If app credentials are missing, the login button stays disabled. The user should not need to supply an Instagram password to NADMO or to ChatGPT.

IMPORTANT: Connecting Instagram is NOT publishing. The existing Facebook-page token connector does not accept Instagram Login credentials. A separate verified publisher path and real returned Instagram post ID are still needed before claiming auto-posting DONE.
