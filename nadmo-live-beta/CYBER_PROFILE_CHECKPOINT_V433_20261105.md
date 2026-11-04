# NADMO LIVE Cyberpunk Profile v433 — 5 November 2026 (WITA)

Owner/Final Authority: Arda.
Status: **Deployed to production**, with browser HTML and isolated responsive CSS/JS checks.

## Production
- URL: https://live.nadmo.id/app/?tab=me&v=433
- Worker: `nadmo-live-beta-20261009` version 433, ID `566fb390-ae7e-4a19-ae29-e4c6393415e0`, 100% deployed.
- Rollback v432: `7ee75283-c434-4181-b011-365eeb07a7ca`.
- Prior v431 navigation fix retained; v430 DM features retained.
- All 12 Worker bindings, static assets, Durable Object and R2 preserved. DANA_ENV=sandbox and Saweria callbacks unchanged.
- Production gets targeted HTMLRewriter CSS/JS injection after existing theme, profile fix and nav processing, NOT a raw replacement of older GitHub Worker bundle.

## Design implementation
- Profile ME and public creator profile: sharper cyberpunk neon HUD frames, geometric corners, patterned bio, refined large readable typography, enhanced avatar/name frame, stronger action buttons and follower stat panels.
- `profileDisplayBio` and `publicCreatorBio` keep the exact creator's data; no fabricated profile copy.
- Social link cards and icons created only from links already saved by the creator. CSS features responsive 2-column layout, 1-column at <=330px, provider labels based on validated URL/label, safe DOM textContent and original anchor href.
- If no connected social link, a **Tambah Link Sosial** button opens the existing Edit Profile action. No fake Instagram/TikTok/YouTube destinations.
- Existing photo/cover pixels are not modified, video/live UI unaffected, no payout changes.
- Account theme IDs remain under existing theme engine; cyberneon keeps neon colors.

## Verification
- Browser simulation 390px: existing BIO unchanged, pseudo BIO label rendered, Instagram YouTube and business link cards styled, external hrefs preserved, creator-card inserted, image filter none, no horizontal overflow.
- Browser simulation 320px: social grid reduces to 1 column, scroll width matches viewport width, link cards decorated.
- v433 empty-social browser test 390px: Add Social CTA present, click invoked existing Edit Profile button, CTA removed when real link added, real link card appears, original href intact, no horizontal overflow.
- Live production browser rendering at 390px: CSS/JS v433 present, BIO and public profile present, messaging and Saweria hooks present, v431 ME restoring script present. All 12 bindings preserved.
- Logged-in user device screenshots of v433 and real external link opening still require manual acceptance testing; do not claim this check has been completed.

## Release rule
- This branch is not a byte-identical export of the live v433 Worker. Production includes Cloudflare hotpatches not yet merged into GitHub source. Before any full deployment, reconcile live Worker and assets to protect DANA, Saweria, profile, messaging and v431 nav.
- Future LIVE/PESAN global cyberpunk skins are separate design rollout; v433 is scoped to ME and public creator profile.
