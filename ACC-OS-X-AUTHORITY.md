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

## Current Android baseline

At creation of this authority file:

- versionName: `1.2.2`
- versionCode: `11`
- package: `com.ardacore.accosx`
- production certificate: canonical SHA-256 above

Future releases must preserve identity and move versionCode forward.