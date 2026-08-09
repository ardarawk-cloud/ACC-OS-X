# ACC OS X — BUILD216 / AI QUALITY HARDENING v1.0

Baseline: BUILD215 R6.11I META PAGE TOKEN RESOLUTION.

## Changed
- ACC-OS-X/app.js only
- Added this release note

## Frozen / untouched
- ACC-PUBLISH-CONNECTOR/worker.js
- Meta tokens
- Page ID resolution
- Cloudflare publish secrets
- Facebook permissions
- verified publish endpoint and Publish Core transport path

## AI quality changes
- Research: one-topic, evidence-first structured contract; unsupported facts fail instead of being invented.
- Material: research-derived, no filler, explicit PUBLIC_HEADLINE/PUBLIC_SUBTITLE.
- Poster: image AI generates clean visual only; no generative text/logo; browser Canvas adds deterministic headline/subtitle and branding.
- Branding: uses original logo asset from Asset Library when available; otherwise deterministic channel-name mark. Image AI never recreates a logo.
- Caption: worker output is cleaned and must be final publication copy only.
- QC: deterministic local preflight + worker QC. Only QC_PASS is accepted. PASS WITH REVISION is removed. Any failure stops before Publish Core with QC_FAILED reason.

## Real acceptance test
A mission passes only after quality Research → Material → Poster → Branding → Caption → QC_PASS → existing R6.11I Publish Core/Meta flow → real Facebook post ID.
