# NADMO LIVE — Cyber Profile Cards v438 Checkpoint
**Tanggal:** 5 November 2026 (WITA)
**Owner:** Arda — final authority
**Status:** LIVE 100% on https://live.nadmo.id/app/?tab=me&v=438

## Deployment
- Cloudflare Worker: `nadmo-live-beta-20261009`
- Production **v438**: `91303501-d8bd-432c-9619-0fee47af5c59`, deployment `7210bcbc-8311-49b4-8973-24f4cf517d66` at 100%
- Immediate rollback **v437**: `2bc3bb03-2229-4e0b-97c8-ea4d42a68f75`
- Previous 12 bindings inherited and confirmed, including ASSETS, ROOM_HUB, SOCIAL_MEDIA and DANA configuration; DANA_ENV=`sandbox`.
- Existing v433 Cyber ME/public creator profile styling, v435 SocialBuzz, v430 messaging, v431 ME navigation and v437 favicon logic preserved.
- v438 is a **targeted Cloudflare HTMLRewriter CSS+JS addition** after the existing live v437 logo helper; no application/account data, assets, QRIS, Saweria, SocialBuzz or stream backend changes.

## Improvements
- Real, independently verified source icons:
  - **AM Sound Rental** `amsound.nadmo.id`: site's own inline SVG favicon, copied from actual `<link rel="icon">` (not invented).
  - **PPS Kertha Wisesa** `kerthawisesa.nadmo.id`: official emblem asset `https://kerthawisesa.nadmo.id/assets/kertha-wisesa-logo.webp?v=20261016-full` from authoritative `ardarawk-cloud/kertha-wisesa` repository.
- **Roamink:** retains genuine live icon `/logo.svg`, scaled + contrast-adjusted within the badge to improve legibility.
- **Arda Moron** and **Original Bali:** official deployed sites did not expose standalone favicon/logo files on tested common paths. Use clearly distinguished `AR`/`OB` monogram fallback, do not pretend these are original logos. Add verified logo assets later if published.
- Brand-aware fallback initials `AM`, `KW`, `OB`, etc.; soft neon color accents, while existing loaded provider icons are never replaced.
- Card names get up to **two readable lines** rather than premature one-line ellipsis; URL remains visible separately; hover title retains full label.
- Existing hrefs remain byte-identical.

## Verification evidence
- Isolated Browser Rendering at mobile 390px: initial preview validated official icon loading (AM SVG natural size 150, KW official image 1024), two-line clamps, fallback monograms, same href, horizontal overflow 0.
- After production deployment, live 390px Browser Rendering confirmed v438 CSS & JS; official AM/KW logos loaded, Original Bali fallback, Roamink icon loaded, CSS line clamp 2, overflow 0.
- Live production version v438 100%; bindings 12; DANA sandbox. Presence of existing SociaBuzz, Saweria, Messaging, ME route checked in HTML.
- **Physical owner device visual acceptance remains pending.** Do not claim independent device signoff or unrelated full-app feature testing.

## Git history caveat
- Branch `feat/nadmo-live-profile-cards-v438-20261105` contains source CSS/JS but **is not byte-identical** to the deployed Worker. v427-v438 production contains incremental direct Cloudflare hotpatches not synchronized into the historical GitHub Worker bundle.
- **Do not merge this branch and deploy the old Worker as a full replacement.** Reconcile deployed production source before full Worker source deployment.
- Code rollback to v437 must not touch Durable Object account/payment data.

## Next optional work
- Where the official Arda Moron / Original Bali sites publish dedicated logo assets, add exact verified URLs to `profile-cards-v438.js`. Never generate counterfeit brand logos.
- Public profile link order/presentation remains unchanged; separating personal social from business links is a separate layout request.
