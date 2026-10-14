# NADMO SOCIAL — TikTok shared queue implementation

**Date:** 15 October 2026. **Status:** STAGING SOURCE / NOT DEPLOYED.
**Authority:** This implementation is inside the Content Hub Worker source associated with Cloudflare script `nadmo-contenthub`. The standalone legacy repository `ACC-Content-Hub` contains earlier Capacitor/PWA code and must not be treated as the live deployment source until reconciled.

## Implemented and tested in branch

- 31 source-channel keys, one locked logical TikTok target (`TIKTOK_SHARED_01`), unknown channels routed to manual UNASSIGNED QC.
- D1 schema with deduplicated submissions, 10 unique time slots/day, status/event history and optimistic version updates.
- Scheduler using **Asia/Makassar** with max 2 slots/channel/day and urgent/owner-pin priority.
- Explicit owner QC + video/photo HTTPS media URI + caption; empty or unverified content cannot schedule.
- Owner lock, pause all, per-job cancel/resume, share handoff, self-reported link, owner-verified receipt.
- `/social.html` isolated mobile/desktop dashboard; no TikTok passwords, no API tokens in browser storage.
- TikTok public posting itself is MANUAL, through the TikTok app. Browser Web Share or media link is a handoff, not publication.
- A private owner utility is not eligible for TikTok Direct Post under its published intended-use guidelines. No hidden automation or scraping.

## Current stage: blocked from LIVE

Cloudflare inventory verified `nadmo-contenthub` existing script; its settings contained **only ASSETS binding** on 15 Oct 2026. No SOCiAL_DB was bound; existing D1 databases belong to other apps and must NOT be repurposed.

Resource provisioning through the Cloudflare connector was blocked by the platform tooling; **no D1 database, owner secret, or new worker binding was created** in this task. Do not claim the route is live. All changes remain on a branch until Cloudflare staging and owner QC.

## Staging + controlled production rollout checklist

1. Confirm current production Worker deployment commit/source and preserve rollback version. Never overwrite ACC OS X unrelated source.
2. Create a **dedicated** Cloudflare D1 database named `nadmo-social-queue` (APAC region if available), note generated `database_id`. Do not substitute a booking/customer database.
3. Add D1 binding `SOCIAL_DB` to `nadmo-contenthub` Wrangler config along with the existing `ASSETS` binding; keep the same Worker name, domain, and production route. Do not add a new domain/VPS.
4. Apply `migrations/0001_social_queue.sql` to this database. Confirm `social_jobs`, `social_events`, `social_settings` exist.
5. Generate a random 32+ character owner credential. Store as Worker secret `NADMO_SOCIAL_OWNER_KEY`, **never in code, GitHub issue, chat, APK, asset or logs**. Protect HTTPS owner auth. Rotate after any suspected leak.
6. From `source/`, build assets using the existing Vite build, verify `dist/social.html`, `dist/social.js`, `dist/social.css`. Run CI `NADMO Social Queue CI`.
7. Deploy staged Worker + assets, verify `GET /api/_healthcheck`, unauthorized `GET /api/social/meta` -> 401, authorized meta -> 200, missing secret -> 503 and missing binding -> 503.
8. Submit a **test job** to `/api/social/jobs` using a unique idempotency key; repeat request and verify only 1 record. Perform QC, schedule, share handoff, and manually verify link without accidental TikTok posting. Inspect D1 log, statuses and version.
9. Regression-test original Content Hub desktop/mobile and all existing routes; test Android share on the actual device before marking that UX PASS.
10. Only then merge, deploy production in existing route, record Worker version, deployment source commit, rollback version and owner QC. Do not label LIVE based on GitHub CI alone.

## Current API contract (owner-only)

All requests to `/api/social/*` require header `X-NADMO-OWNER-KEY`. Same-origin requests only; no permissive CORS.

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
