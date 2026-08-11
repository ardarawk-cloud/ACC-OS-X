ACC OS X — BUILD 250 QC RESEARCH CONTEXT FIX

WHAT THE TEST PROVED
- RESEARCH now passes.
- MATERIAL / POSTER / CAPTION also pass.
- QC fails because the QC context sees only 1 Research URL.

ROOT CAUSE
- The mobile app trims each upstream asset output before sending it to downstream workers.
- Research SOURCES are at the end of the Research packet, so the QC request can receive only one URL even though server Research passed with >=2 sources.

THIS PATCH
- Updates ONLY worker-research-reliability.js.
- Before a QC request reaches the frozen original worker:
  1) Detect Research context with fewer than 2 URLs.
  2) Browser-search the exact existing Research TOPIC.
  3) Render candidate source pages.
  4) AI-validates that each selected page supports the SAME existing TOPIC and VERIFIED_FACTS.
  5) Append 2-4 validated URLs to the server-side QC context.
- If 2 valid pages cannot be confirmed, it FAILS CLOSED and QC remains blocked.
- QC threshold is NOT reduced.
- Meta Publish Connector, Page ID resolution, tokens, permissions and publish endpoint are NOT touched.
- Build remains 250.

GITHUB — PRODUCTION
Replace ONLY:
  worker-research-reliability.js

Do NOT replace:
  worker.js
  wrangler.jsonc
  index.html
  Meta connector files

After Cloudflare deploy finishes:
- Reopen PWA.
- TechVerse → PRODUCE → RETRY MISSION.
