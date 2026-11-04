# NADMO LIVE — Universal Support Engine checkpoint (2026-11-05, WITA)

**STATUS: DEVELOPMENT / DRAFT PR / NOT DEPLOYED.** Final authority: Owner Arda.

## Verified authoritative baseline
- GitHub repository: `ardarawk-cloud/ACC-OS-X`.
- Base branch: `feat/nadmo-live-host-support-beta-20261104` (`fb1fc4180358d93583b95406ee0568880abf78ae`).
- Feature branch: `feat/nadmo-live-universal-support-v1-20261105`.
- Cloudflare Worker production: `nadmo-live-beta-20261009` on `https://live.nadmo.id/app/`.
- Cloudflare production version at checkpoint: **427**, ID `68102ac7-8af8-4e4a-8a5e-4ea75daaea43`, deployment `3cd4bda6-05c1-40e4-8bf2-1cab54dc8a4c`.
- Existing 12 Cloudflare bindings must remain. DANA environment is **sandbox**, not approved production.
- User-approved QRIS and viewer flows: **PASS by Owner**; preserve exactly.
- Existing *production* Saweria integration: opaque per-host webhook `/api/integrations/saweria/{integrationSaweriaToken}`; validates `Saweria-Callback-Signature` with server-held streaming key. Existing tokenized overlay `/overlay/support/?token={integrationOverlayToken}` and storage `integration-latest:`, `integration-saweria-event:`. **Do not rotate tokens or request repeated host setup**.
- Existing server event records do not constitute bank settlement; do not call verified callback a reconciled payout.
- Existing Free/Pro/Plus plans: Free 50 support actions, Pro Rp19,900 / 30d 200 actions, Plus Rp99,900 / 30d unlimited. Support actions are *clicks*, not donations.
- Existing WebRTC P2P 4 viewers, 9 guests, DO heartbeat ~25s, host reconnect grace 90s. No SFU/encoded alert compositing verified.
- Existing signed Android APK release: NADMO LIVE `v0.10.25` OFFGRID embedded, Oct 26 2026; new feature not yet included in signed APK.

## Development changes
- `support-engine.mjs`: safe verified event normalization; Saweria HMAC; idempotent Durable Object storage; privacy; DEMO without financial records; host support settings; SociaBuzz link; fail-closed SociaBuzz/DANA hooks; **legacy signed Saweria event compatibility** (dedupe marker required).
- `public/support-center/index.html`: authenticates existing host login, preserves Saweria and QRIS, adds SociaBuzz and alert/wall settings, no secrets.
- `public/overlay/support/index.html`: verified-only overlay polling and safe text; **does not guarantee content is composited into WebRTC encoded video**.
- `public/app/index.html`: Host Studio entry + viewer on-screen alert + SociaBuzz support link, **not a replacement for production v427 UI**.
- `qa/universal-support-unit.test.mjs`: 18 test cases; Node 22 GitHub Actions workflow queued.
- Secure-browser isolated verification: 8/8 targeted tests PASS (signature, forgery, sanitization, privacy, dedupe, settlement handling, QRIS fail closed).

## Critical merge/release blockers
1. **Source drift:** production v427 was patched directly via Cloudflare API after older Git base; it contains DANA callback logic, real Saweria token integration, and mobile UI fixes absent from the source branch. **Reconcile and diff live Worker and static assets before merging/deploying**.
2. Do NOT replace live tokenized Saweria webhook or existing overlay with newly drafted handle-only endpoint. Legacy bridge reads only latest signed record, not complete historical transaction stream.
3. Provider real-world end-to-end acceptance for Saweria/SociaBuzz/DANA is pending. SociaBuzz webhook authenticating payload is not verified. DANA production approval/merchant credentials pending; static QRIS never creates automatic verified alerts.
4. Real video/audio compositing into outbound WebRTC and Android/PC hardware proof remain pending. Browser-only viewer popup/OBS browser source is not embedded video.
5. Node/GitHub CI, staging build, Android signed APK, official UAT and regression tests must pass before deployment.
6. Host offline event replay, per-live-session totals, and robust settlement reconciliation are not fully covered.
7. Do not alter admin permissions or subscription entitlements without explicit migration and review.

## Rollback & safety
- Code rollback: redeploy exact Cloudflare Worker version `68102ac7-8af8-4e4a-8a5e-4ea75daaea43` if no intervening newer version; **never rollback DO user/payment storage**.
- Feature branch PR is draft; no feature changes have been deployed to live Worker in this task.
- Preserve all bindings, R2/DO data, production keys, DANA callbacks and signed APK until full review and tests pass.
