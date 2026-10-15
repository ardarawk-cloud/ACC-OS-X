# NADMO SOCIAL — deployment receipt (2026-10-15 WITA)

Status: **CLOUDFLARE DEPLOYED / OWNER MOBILE QC PENDING**. Do not label end-to-end publishing DONE or TikTok autopost LIVE.

- Production URL: https://contenthub.nadmo.id/social.html
- Worker: `nadmo-contenthub` on existing `contenthub.nadmo.id/*` route.
- GitHub PR: https://github.com/ardarawk-cloud/ACC-OS-X/pull/217 (merged).
- Source commit at deploy: `0f0dcfe8d8074cf15e52035168a052c536819527`.
- GitHub deploy run: https://github.com/ardarawk-cloud/ACC-OS-X/actions/runs/38652228988 — SUCCESS; healthcheck returned `{"ok":true,"service":"nadmo-cloudflare"}`.
- Cloudflare deployment: `2923eb9c-d96d-42e2-a896-b1cedf4760d4`.
- Active Worker version: `ea545f72-8e5c-4e38-85d5-8a0b32e5dce9`.
- Previous version preserved for rollback: `3e028e43-4b88-4938-ab58-0743af50d639`.
- Bindings read back after deploy: `ASSETS`, `SOCIAL_DB`, `NADMO_SOCIAL_OWNER_EMAIL`.
- D1: dedicated `nadmo-social-queue`; tables in place; verified `jobs=0`, `events=0`, `target_daily=10`.
- Cloudflare Access: existing application `nadmo social`, owner-only allow policy; protects `contenthub.nadmo.id/social*` and `contenthub.nadmo.id/api/social*`; exact Cloudflare owner email is held in the Worker binding, not checked into this receipt.
- Regression: Node/SQLite/JWT tests, production static asset build, Wrangler dry run, ACC OS X runtime tests all PASSED before merge.
- Outstanding owner device checks: login with Cloudflare account, mobile layout, submit one test content job, QC, 10-slot scheduling, pause/resume, TikTok share handoff and manually verified real TikTok post URL. Do not make a public test post without owner authorization.
- Not implemented: direct posting automatically from all ChatGPT conversations; media file upload to R2; native Android APK/Share Kit; autonomous public TikTok Direct Post (private/internal API use excluded by TikTok intended-use policy).

This receipt documents deployed source and Cloudflare state at the time of inspection. A passing healthcheck alone is not equivalent to authenticated owner QC.


## 2026-10-15 — Chat media transport milestone

**Cloudflare media bridge deployed; entire ChatGPT-to-public-social workflow NOT finished.**
- PR: https://github.com/ardarawk-cloud/ACC-OS-X/pull/220 (merged).
- Source commit: `f158748630b0696b88c90758b12520d6734f0aa3`.
- Deployment workflow: https://github.com/ardarawk-cloud/ACC-OS-X/actions/runs/38723552918 — SUCCESS and healthcheck PASS.
- Cloudflare Worker active version: `16dae35c-c030-4ad6-93ad-92f52dbdf824`; previous rollback version `f3a47cfd-404b-4066-b03a-12cd82e54697`.
- R2 bucket: `nadmo-social-private-media` (APAC, private, not public). Existing Worker has `SOCIAL_MEDIA` R2 binding, as well as unchanged ASSETS, SOCIAL_DB and NADMO_SOCIAL_OWNER_EMAIL.
- Endpoint `POST /api/social/media` handles streamed JPEG/PNG/WebP/MP4 with a 95 MiB cap and owner Access JWT; `GET /api/social/media/media/{uuid}.{ext}` retrieves bytes only through owner-authenticated API. All URLs stay under existing `contenthub.nadmo.id`.
- Queue submit, attach and QC guard require the corresponding private R2 object to exist when a private media URL is referenced.
- Cloudflare connector binary smoke test: real 68-byte PNG transferred to private R2 via Cloudflare R2 API; test draft created in D1 in QC_PENDING (not scheduled and not published), R2 object GET returned 200. Test job, event and test object deleted. Database reverified: **31 channels; 0 production jobs; 0 test events**.
- CI: SQLite regression, Cloudflare Access JWT, media binary tests, build + Wrangler dry run PASS on PR; OS X runtime regression PASS.
- Remaining restrictions: a tiny PNG fixture does not establish that arbitrary ChatGPT-generated image/video attachments automatically transfer from all conversations. The Cloudflare connector supports binary R2 objects when their bytes are supplied, but a generalized ChatGPT attachment-to-byte bridge and large video end-to-end test remain unverified. Cross-conversation global `POST` routing isn't installed as a ChatGPT-native custom action. A user-content media test is still required, without pasting media/caption manually.
- TikTok public auto-post remains unsupported for an internal-only utility under TikTok's official Direct Post API intended-use rules; private R2 and queue success MUST NOT be described as public-post success. Owner handoff and real published post URL/ID are separate milestones.
