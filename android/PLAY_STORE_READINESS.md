# ACC OS X — Google Play Readiness

Status: PREPARED FOR PLAY PIPELINE

## Locked Android identity
- Application ID: `com.ardacore.accosx`
- App label: `ACC OS X`
- Current target SDK: 36
- Current compile SDK: 36
- Current minimum SDK: 26
- Current version: `versionCode 4`, `versionName 1.0.1`

Do not change the application ID after the first Google Play publication.
Every published update must use a higher `versionCode` than the previous Play release.

## Release artifacts
The production GitHub Actions workflow builds both:
- Signed Android App Bundle: `app-release.aab` — Play Store publication artifact.
- Signed APK: `app-release.apk` — direct/sideload distribution and device testing.

The workflow also verifies both signatures and exports the upload certificate fingerprints as a separate metadata artifact.

## Permanent signing model
The repository never stores the private keystore.
Production signing is fail-closed and requires these GitHub Actions Secrets:
- `ACC_OS_X_ANDROID_KEYSTORE_B64`
- `ACC_OS_X_ANDROID_KEYSTORE_PASSWORD`
- `ACC_ANDROID_KEY_ALIAS`
- `ACC_ANDROID_KEY_PASSWORD`

Treat this keystore as the permanent ACC OS X upload key. Keep an offline backup outside GitHub.

For a new Google Play app, enroll in Play App Signing. Google Play can manage the app-signing key while the ACC OS X production keystore remains the upload key used to sign each AAB before upload.

## Existing RC installation transition
Existing RC/pilot APKs may use the validation/debug signing lineage. If the first permanent production build uses a different certificate, Android will not accept it as an in-place update of that RC installation.

Expected transition:
1. Preserve/export any app-local information that matters.
2. Uninstall the old RC once if Android reports a signature mismatch.
3. Install the first permanently production-signed build.
4. From then onward, keep the same application ID + production upload/signing lineage and only increase `versionCode`; normal updates should install over the previous release.

## Google Play submission checklist
Before public release, complete in Play Console:
- Create the app using package `com.ardacore.accosx`.
- Enable Play App Signing.
- Upload the signed `.aab` artifact.
- Complete Store Listing assets/text.
- Publish an accurate privacy policy on a public URL and make it accessible in the app where required.
- Complete the Data safety declaration based on the full ACC OS X behavior, including any data transmitted by web content, APIs, SDKs, AI services, analytics, authentication, or third-party services.
- Complete App access instructions if reviewers need credentials or special steps.
- Complete ads declaration, target audience, content declarations, and IARC content rating.
- Confirm all current Google Play policy declarations before submission.

## Release rule
Never generate or replace the permanent production/upload key casually. Never commit keystore files or passwords to the repository. Never reuse debug signing for a public Play production release.

For every release:
1. Increase `versionCode`.
2. Set the desired `versionName`.
3. Build via `ACC OS X Android Production Release`.
4. Download the `ACC-OS-X-Android-Play-AAB` artifact for Play Console.
5. Keep the signed APK artifact for controlled direct testing/distribution.
