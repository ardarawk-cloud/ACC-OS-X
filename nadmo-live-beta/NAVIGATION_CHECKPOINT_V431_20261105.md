# NADMO LIVE v431 — Navigation Back to ME checkpoint
**Date:** 2026-11-05 WITA
**Owner:** Arda
**Status:** production deployed and page-source verified

## Bug reported
From profile **ME → INTEGRASI HOST**, the KEMBALI link pointed to /subscription/, then subscription KEMBALI pointed to /app/ which defaulted to LIVE. User became lost navigating three unrelated screens. Screenshots were received for ME, Integration Center, blank Subscription and LIVE.

## Production fix
Worker `nadmo-live-beta-20261009` version **431**, ID `51ade058-7d4d-4468-838d-eda18509b65c`, 100% deployed.
Previous version **430**, ID `0b1af3b3-65bb-49d3-ad0d-9e6b894990b7`, is the exact rollback target.

- Route /integrations/ and /integrations/index.html: replace the sole secondary **KEMBALI** link `/subscription/` with `/app/?tab=me`, label `KEMBALI KE ME`.
- Route /subscription/ and /subscription/index.html: replace the sole secondary **KEMBALI** link `/app/` with `/app/?tab=me`, label `KEMBALI KE ME`.
- For both subpages, a click uses `location.replace(...)` to avoid redundant browser back-stack cycles; regular anchor fallback still works if JS unavailable.
- For /app/?tab=me, patch the existing sessionRestore() HTML script after account/me resolves and displayAccount() runs, to call `show('settings')`. No changes to /app/ default first-run LIVE, only explicit ?tab=me return links.
- Implementation uses targeted Worker HTML response transformations, retaining the existing static assets and data storage; no global redesign or payment code modifications.

## Verification
Verified live URLs from an app-page browser session via same-origin fetch and DOMParser:
- `/integrations/` HTTP 200, exact back href `/app/?tab=me`, label `KEMBALI KE ME`, location.replace script present.
- `/subscription/` HTTP 200, exact back href `/app/?tab=me`, label `KEMBALI KE ME`, location.replace script present.
- `/app/?tab=me`: sessionRestore handler includes the ME restoration branch; original ME nav, messenger search, Saweria link all remain present.
- Worker v431 100%; all 12 original bindings preserved, including ASSETS, Durable Object ROOM_HUB and R2 SOCIAL_MEDIA. DANA_ENV remains `sandbox`.

## Notes
- Logged-in real-phone gesture/click is not independently verified; this checkpoint verifies server-side routes, DOM targets, and patch in the browser page source.
- Subscription screenshot seemed blank below header; that symptom has not been reproduced with the user's authenticated session. Payment/plan logic was not modified.
- **GitHub code is not a byte-exact copy of live Worker** because live v427–v431 include direct Cloudflare patches. Do not redeploy older GitHub Worker bundle or static assets without reconciling. Preserve DANA/Saweria hooks and ME/profile/mobile fixes.
- Later changes must retain direct navigation to ME from both host subpages.
