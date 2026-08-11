ACC OS X — BUILD 250 RESEARCH RELIABILITY FIX

PRODUCTION SCOPE
- Build remains 250.
- Adds Browser Search fallback ONLY after the existing Research engine returns RESEARCH_FAILED_NO_USABLE_SOURCES.
- Existing worker.js remains intact and is imported as the primary engine.
- Adds Cloudflare Browser Run binding BROWSER.
- Browser fallback requires at least 2 readable source pages before it may return RESEARCH_PASS.
- QC standards are NOT reduced.
- Meta Publish Connector / tokens / Page ID resolution / verified publish endpoint are NOT edited.
- Mobile terminal timestamp no longer wraps onto a second line.

FILES TO UPLOAD TO GITHUB ROOT
1. worker-research-reliability.js   (NEW)
2. wrangler.jsonc                  (REPLACE)
3. index.html                      (REPLACE)

DO NOT DELETE OR REPLACE
- worker.js
- acc-publish-worker.js
- acc-publish.js
- service-worker files
- Meta connector configuration/secrets

AFTER DEPLOY
1. Open /health and confirm:
   browserBinding = true
   researchReliabilityPatch = BUILD250_RESEARCH_RELIABILITY_V1
2. Run TechVerse START MISSION once.
3. If native/RSS discovery fails, Browser fallback activates automatically.
