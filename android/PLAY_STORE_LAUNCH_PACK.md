# ACC OS X — Play Store Launch Pack

Status: PLAY-FIRST ANDROID RELEASE TRACK

## Product identity
- App name: ACC OS X
- Application ID: `com.ardacore.accosx`
- Primary distribution target: Google Play
- Secondary distribution target: signed APK for controlled direct install/testing

## Technical release lock
1. Keep `applicationId` permanent after first Play publication.
2. Use the permanent production upload keystore only for public release builds.
3. Increase `versionCode` for every Play submission.
4. Keep `targetSdk` aligned with current Google Play requirements.
5. Production workflow must be started manually or by a version tag; ordinary development pushes must not create public release artifacts.
6. Build both signed `.aab` and `.apk` from the same release source.
7. Verify signatures before distributing either artifact.

## Play Console launch sequence
1. Create Google Play developer account / organization profile as applicable.
2. Create app entry for ACC OS X using package `com.ardacore.accosx`.
3. Enroll in Play App Signing.
4. Upload the first production `.aab` to Internal testing first.
5. Complete App content declarations before production submission.
6. Complete Store Listing and required graphics/screenshots.
7. Publish a public privacy policy URL and link it where required.
8. Complete Data safety from the actual behavior of the native shell, web application, APIs, AI services and third-party services.
9. Complete App access instructions if any reviewer-only login/access code is required.
10. Complete ads declaration, target audience, content rating and any applicable policy declarations.
11. Run internal/closed testing and fix crashes, WebView/navigation, file upload/download and authentication issues before production.
12. Submit the production track only after the release checklist is green.

## Store listing working draft
Short description:
`AI-powered operating system for managing ACC digital content and production workflows.`

Long-description direction:
Explain ACC OS X as a centralized operating workspace for ACC Enterprise channels: channel-specific production workflows, content preparation, media operations, research-assisted production and controlled publishing. Do not promise capabilities that are not available in the submitted build.

## Data Safety inventory — must be verified before answering Play Console
Native Android manifest currently requests only Internet permission, but Data Safety must cover the complete product behavior, not only Android permissions.
Review and document:
- Account/access-code or authentication data, if any.
- Content entered by the owner/user.
- Files/images uploaded through the WebView/native picker.
- Content sent to AI/model providers.
- Requests sent to Cloudflare Workers/APIs.
- Facebook/Meta publishing or Page data when enabled.
- Analytics/crash reporting, if added later.
- Device identifiers or diagnostics, if collected by any dependency/service.
- Data retention/deletion behavior for server-side and browser/local storage.

Never declare `no data collected` solely because the native manifest has minimal permissions.

## Review-access rule
If ACC OS X requires a private access code, login or special account state, prepare permanent Play reviewer instructions and test credentials/access path that remain valid during review.

## First public-signing transition
RC/pilot builds may use a different certificate. If Android rejects the first production-signed APK as an update, perform the one-time RC uninstall transition. After the first permanent production build, preserve the same signing lineage forever.

## Release stages
- DEV: normal commits; no production artifact generation.
- RC: validation/testing build.
- INTERNAL PLAY: first AAB upload and reviewer/testing validation.
- CLOSED/OPEN TESTING: optional rollout stage based on product readiness.
- PRODUCTION: public Google Play release.

## Non-negotiable release gate
No production Play submission while any of these are unresolved:
- signing key uncertainty
- versionCode conflict
- broken startup/navigation
- broken access/auth flow
- inaccurate privacy policy or Data Safety declaration
- missing reviewer access instructions
- known critical crash/data-loss issue
- store listing that describes features not present in the submitted build
