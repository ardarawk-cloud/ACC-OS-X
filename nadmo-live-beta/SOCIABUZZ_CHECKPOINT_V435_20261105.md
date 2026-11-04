# NADMO LIVE — SocialBuzz TRIBE checkpoint v435

Date: 2026-11-05 (WITA). Owner/final authority: Arda.

**Production ACTIVE:** Worker `nadmo-live-beta-20261009`, version **435** `d8dddf7f-3de2-475e-8ad8-73a49df419fa` at **100%**.
Production URL: https://live.nadmo.id/app/?tab=me&v=435

Previous fully stable rollback: **v433** `566fb390-ae7e-4a19-ae29-e4c6393415e0`. An intermediate v434 uploaded the backend but frontend HTML fallback failed because raw markup used `hidden` rather than `hidden=""`; corrected in v435.

## Scope delivered
- **ME → EDIT Profil → DUKUNGAN HOST:** Dedicated SociaBuzz TRIBE URL field beside existing Saweria and QRIS, excluding it from 12 ordinary profile links.
- Save through existing profile Save action. One source of host settings: existing Durable Object account record field `supportSociaBuzzUrl`. Existing Saweria link and QRIS image untouched.
- Support-methods POST validates actual official `https://sociabuzz.com/{creator}/...` and `https://www.sociabuzz.com/{creator}/...` domain, prohibits lookalike domains, credentials in URL, HTTP, unsupported base domain, overlong payloads. Missing SociaBuzz field on legacy client requests preserves the host's current value. An explicitly empty value clears the link without clearing Saweria/QRIS.
- Public host support endpoint and viewer DUKUNG HOST support-action return `support.sociabuzz`; a host with **only SociaBuzz** can be supported.
- **DUKUNG HOST** UI includes a separate cyberpunk pink “BUKA SOCIABUZZ TRIBE” hyperlink; hidden when not configured. Existing Saweria and QRIS controls preserved. Android WebView target handling mirrors existing Saweria handling.
- No SociaBuzz API callbacks, transaction verification, auto-alert, or payout claims: this is a direct external link, not payment processing. No new DANA changes.

## Evidence
- Live mobile rendered HTML v435 checked at 390px: input + viewer anchor + CSS + click handler exist; Saweria, QRIS, messaging, ME nav and v433 profile all present.
- Deployment 100% and 12 Worker bindings preserved; DANA_ENV remained `sandbox`.
- **9/9 real production smoke tests passed** in GitHub Actions run https://github.com/ardarawk-cloud/ACC-OS-X/actions/runs/41923619642
- QA verified disposable host registration, SociaBuzz-only host setup, reload persistence, public host link, support action self path with no payment-success claim, lookalike domain rejection, HTTP and generic domain rejection, old Saweria+QRIS clients preserving SociaBuzz, clearing SociaBuzz while preserving Saweria. Disposable QA account deleted (HTTP 200).
- Predeployment HTML QA tested raw Worker page and JavaScript parser: PASS. Initial v434 HTML rewrite mismatch found, fixed in v435.

## Git/source safety
- Development branch `feat/nadmo-live-sociabuzz-support-v434-20261105` contains provider validator, guarded frontend patch source and e2e QA workflow, **not** a byte-identical copy of live Worker (which includes direct v427-v435 Cloudflare patches).
- Do **not** merge/deploy entire old GitHub Worker bundle over production; reconcile live version and asset source first.
- Rollback code only: deploy v433 by version ID; do NOT roll back Durable Object message/payment/account storage.

## Owner action
Existing Saweria and QRIS settings need no reset. The host may fill the SociaBuzz TRIBE link in the new dedicated field and tap Simpan Profil. Genuine provider URL must already exist in the host's own SociaBuzz account.
