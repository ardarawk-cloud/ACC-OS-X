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
