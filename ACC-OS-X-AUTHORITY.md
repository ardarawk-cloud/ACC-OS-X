# ACC OS X — RELEASE AUTHORITY

Status: ACTIVE HARD LOCK
Owner / final authority: Arda
Repository: ardarawk-cloud/ACC-OS-X

This file is operational authority. It exists so release behavior does not depend on chat memory.

## Core infrastructure

- Internal ACC work defaults to existing GitHub + GitHub Actions + Cloudflare infrastructure.
- Do not add a paid third-party service when the existing stack can perform the job.
- Paid infrastructure requires an explicit technical reason and owner approval.
- Client/order projects may use paid infrastructure when cost is deliberately included in the client price/maintenance model.

## Web / Cloudflare production authority

- GitHub `ardarawk-cloud/ACC-OS-X` branch `main` is the source of truth for ACC OS X web runtime.
- Canonical production Worker: `acc-os-x-baxkup`.
- Canonical web deployment path: `.github/workflows/cloudflare-worker-deploy.yml`.
- Direct/manual Wrangler or Cloudflare API deployment to `acc-os-x-baxkup` is not a normal production path and must not be used to bypass GitHub main + CI.
- Every root ACC OS X runtime change must trigger the canonical Cloudflare deployment workflow.
- A web change is not LIVE merely because it is committed. LIVE requires the canonical deploy workflow to pass and verify the deployed runtime/assets.
- `nadmo-contenthub` and all other NADMO Workers are separate deploy targets and must never be treated as ACC OS X production.
- Public Worker assets must exclude internal/project directories such as `.github/`, `android/`, `apps/`, `nadmo-cloudflare/`, `handoffs/`, `scripts/`, and `deploy-status/`.

## Android identity — immutable

- applicationId / package: `com.ardacore.accosx`
- app label: `ACC OS X`
- launcher icon resource: `@drawable/ic_acc_os_x`
- production signing alias: `accosx-production`
- canonical production certificate SHA-256:
  `33:76:70:DE:C0:F9:0B:72:74:8F:44:CC:F2:C0:52:9B:86:EA:E4:2C:1D:85:84:B4:C3:62:22:B2:B3:36:05:D5`

Any change to package identity or signing identity is a STOP condition unless Arda explicitly orders a migration.

## Distribution hard lock

- DEBUG / RC / validation APKs are internal CI artifacts only.
- Never hand a DEBUG / RC / candidate APK to Arda or a client as an update to an installed production app.
- The only normal install/update artifact is the production-signed APK created by `android-production-release.yml`.
- Android production release is deliberately manual (`workflow_dispatch`) after the milestone passes internal validation; ordinary web/docs/source commits must not mint or fail a duplicate production APK release.
- Production APK must update over the existing installed ACC OS X without uninstall.
- If production signing secrets are unavailable, status is `STOP — NO DISTRIBUTABLE APK`.
- Never recommend uninstalling the installed production app to work around a signature mismatch.
- A release is not PASS merely because Gradle compiles.

## Versioning hard lock

- `versionCode` must increase for every new Android production release.
- `versionName` must identify the release clearly.
- A production release tag must be unique. Existing release tags must not be silently overwritten.

## Android release Definition of Done

A milestone is eligible for owner/device QC only after all internal gates pass:

1. package identity verified
2. production certificate fingerprint verified against this file
3. versionCode/versionName verified
4. app name and launcher icon verified
5. signed release APK built successfully
6. APK signature verified
7. AAB signature verified when AAB is produced
8. release artifact published from the production workflow only
9. install-over-existing is the expected update path; uninstall is not part of normal QC
10. requested milestone scope is complete before asking owner to test

Owner/device QC happens at the end of the milestone, not after each subtask.

## Milestone operating rule

Work pattern:

`fresh-read authority + exact main HEAD -> define milestone -> implement complete scope -> internal CI/QC -> production artifact if needed -> owner QC once -> close milestone`

- Do not restart completed work without new evidence.
- Do not split a single milestone into repeated owner download/install cycles when internal QC can catch the issue first.
- A failed sub-gate is patched narrowly; already-passed unrelated sections stay closed.
- CI success is not device PASS. Device PASS requires owner evidence/confirmation.

## Current Android production baseline

Latest verified production release:

- versionName: `1.2.5`
- versionCode: `14`
- release tag: `acc-os-x-android-v1.2.5-build14`
- package: `com.ardacore.accosx`
- production certificate: canonical SHA-256 above
- production workflow: `android-production-release.yml`

Future releases must preserve identity and move versionCode forward.

## Produce / content production authority

- Active browser authority: `produce-copilot-v2578.js`; legacy v2576/v2577 clients must not compete.
- Owner production commands are `K` (material), `P` (poster), `C` (caption), and `N` (next).
- Single and batch production use the same runtime. Batch publishing is per item.
- Poster media is durable in IndexedDB and must not be stored as Base64 in localStorage.
- Generative POST endpoints are protected by the outer `PRODUCE_OWNER_ACCESS_GUARD_V1`; rescue layers must never bypass owner authentication.
- Produce must expose AI/server readiness in the Production UI and route missing/stale owner AI access into the existing ACC AI connection flow instead of failing silently.
- CI must pass `scripts/produce-e2e-smoke.mjs`, covering owner-auth rejection plus single K/P/C and 5-item batch K/P/C.
- A content package is not considered published until the external connector returns a real post ID. No synthetic success state is allowed.
