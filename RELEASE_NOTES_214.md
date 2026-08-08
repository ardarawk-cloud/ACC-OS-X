# ACC OS X Build 214 R6.8 — Adaptive Identity + Wallpaper Lab

Added:
- Transparent adaptive ACC X logo using SVG + currentColor
- Logo follows Theme Deck accent color
- Custom Wallpaper Lab inside Experience OS
- Local wallpaper compression
- Opacity, blur and dim controls
- Wallpaper Creator achievement

Production Engine, Cloudflare Workers AI/KAI, Queue, Pipeline, Registry, Vault, Backup and Theme Deck are preserved.

---

## R6.9 — Publish Core Foundation (M001.1)

- Preserves Build 214 R6.8 UI, PWA identity, channel registry, production engine, AI workers, vault, queue, backup and wallpaper systems.
- Adds persistent `publishJobs` state with migration-safe normalization.
- Adds M001 Publish Job contract fields: platform, status, attempts, idempotency key, connector, external post ID, timestamps and error.
- Adds internal Mock Connector execution from a successful PUBLISHING worker task.
- Adds idempotency guard so an already-published job is not emitted twice.
- Emits publish lifecycle activity (`publish.started`, `publish.succeeded`) and stores a mock external post ID.
- Adds `TEST PUBLISH CORE` action only to successful PUBLISHING tasks.
- No real social-media credentials or API calls are included in R6.9. This revision is the internal proof-of-life gate before the first real connector.


## R6.9.1 — Publish Core UI Trigger Fix
- Fixes missing `TEST PUBLISH CORE` action on the Production screen after Step 8 / COMPLETED.
- Completed workflows can now enter the M001 Mock Publish Core directly.
- Preserves existing workflow state; no reset is required.
- Adds idempotent workflow-level mock publish job and external mock Post ID.

## R6.10A — Connector Backend Foundation
- Added same-origin `/api/acc-publish` Cloudflare Pages Function.
- Publish credentials remain server-side; browser receives only publish results.
- Added server-side mock connector as deployment proof before Facebook credentials are introduced.
- Existing R6.9 mock result can be promoted safely to server connector test.
- Facebook adapter intentionally remains gated until server connector proof passes.
