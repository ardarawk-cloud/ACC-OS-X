# NADMO LIVE — Real Website Logos on Profile Links (v436)

Date: 2026-11-05 WITA. Owner: Arda.

## Production
- **LIVE**: https://live.nadmo.id/app/?tab=me&v=436
- Worker: `nadmo-live-beta-20261009`, version **436**, ID `474bee42-8b1c-4384-a7de-82207c2c96a1`, 100% deployed.
- Rollback code: previous stable **435** `d8dddf7f-3de2-475e-8ad8-73a49df419fa` (do not roll back Durable Object data).
- GitHub source branch `feat/nadmo-live-link-favicons-v436-20261105`, source assets `nadmo-live-beta/link-favicons-v436.js` and `.css`.
- This was a **targeted Cloudflare Worker HTMLRewriter patch**, not deployment of an old GitHub bundle. Source branch is not byte-identical to live Worker; reconcile before future full deploy.

## What changed
- On ME and public creator profile, existing cyberpunk social/business link cards now use the website's actual favicon/logo image where available.
- Trusted direct site paths for NADMO sites: `/logo.svg`, `/favicon.svg`, `/favicon.ico`; other sites use direct favicon/Apple icon with Google S2 favicon fallback (domain only). Known social media favors favicon resolution via Google S2 before direct-icon fallback.
- Only the saved link's hostname is used for icon requests, never full profile URL/path/query; external image has `referrerPolicy=no-referrer`.
- No URL rewrites, no changes to labels or saved profile data. An image failure is not an error: a distinctive two-letter website monogram or existing platform symbol is shown instead. Google's 16x16 generic placeholder for unknown NADMO subdomains is treated as fallback, not called an original logo.
- CSS only changes icon treatment (actual favicon inside existing neon cards). Mobile grid and action links retained.

## Verification
- Live version 436 100%, all 12 Worker bindings, assets and compatibility unchanged from v435. DANA_ENV remains `sandbox`; existing SociaBuzz, Saweria, QRIS, Messenger, profile and return-to-ME markup still present.
- Isolated browser UI test (390px) confirmed `https://nadmo.id/logo.svg` loaded as real 150px image, Instagram Google-provided favicon loaded 64px, `ardamoron.nadmo.id` had no recognized favicon and fell back to branded `AR`, no horizontal overflow. User's full link URLs were unchanged.
- Browser test used temporary DOM-only links, no account record writes.
- Production browser rendering confirmed new v436 CSS+JS tags and compatibility with prior UI.
- Signed native APK and user's real device screenshot not independently verified; browser/PWA version is deployed.

## Owner guidance
Open `/app/?tab=me&v=436` and scroll to SOSIAL MEDIA & LINK. If one of the websites still shows a monogram rather than its actual logo, that website itself needs a favicon/logo file or accessible image URL. This is not a failure to preserve the stored link.
