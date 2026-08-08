ACC OS X Build 214 — GM4.1 AI ROUTE FIX

Purpose
- Surgical repair for Research/AI Worker HTTP 405.
- Preserves GM4 UI, Theme Deck, X branding, Production Engine and Real Publish Gate.

Root deployment
- Upload every file in this package directly to the ACC-OS-X repository root.
- Do not create an /app folder.
- Do not modify ACC-PUBLISH-CONNECTOR.

What changed
- Added worker.js to handle POST /api/acc-ai.
- Added Workers AI binding AI.
- Added static asset binding ASSETS.
- Worker runs first only for /api/*.
- PWA cache revision bumped.
- Publish code was not changed.

Expected check
1. Cloudflare build succeeds and a new Active Deployment becomes 100%.
2. Open ACC OS X.
3. On the failed Research task press RETRY once.
4. Expected: Research Worker -> SUCCESS.
5. Then continue to Publish Gate.

Recovery
- Keep the last known-good GM4/GM3.1 package until this patch is confirmed in production.
