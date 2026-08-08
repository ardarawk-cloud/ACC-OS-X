ACC OS X GM5.1 — REAL AI POSTER PIPELINE

Purpose:
READY -> RESEARCH -> MATERIAL -> POSTER -> CAPTION -> QC -> PUBLISH -> VERIFY -> DONE

What changes:
1) ACC-OS-X/app.js
   - Generates a real AI poster after the POSTER worker.
   - Sends image bytes to the publish connector.
   - QC recognizes generated poster media.
   - Uses first-line QC decision parsing.

2) ACC-OS-X/worker.js
   - Adds POST /api/acc-image.
   - Uses Cloudflare Workers AI image generation.
   - Default image model: @cf/black-forest-labs/flux-1-schnell

3) ACC-PUBLISH-CONNECTOR/worker.js
   - R3 accepts imageBase64.
   - Uploads image bytes to Meta /photos with caption.
   - Keeps URL-image and text-only fallbacks.

DEPLOY ORDER:
A. Replace ACC-OS-X/worker.js and app.js, commit/deploy.
B. Replace ACC Publish Connector worker.js, deploy.
C. In ACC OS X, TEST PUBLISH API HEALTH.
   Expected connector revision: REAL_META_R3_BASE64
D. Run START ONE-BUTTON MISSION on Tukang Tambang.

Do not change current Meta secrets/access codes.
