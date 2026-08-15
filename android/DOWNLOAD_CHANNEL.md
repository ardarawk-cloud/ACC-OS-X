# ACC OS X — Official Android Download Channel

Status: PREPARED

## Public download URLs
After the first tagged Android production release is published, these URLs become the permanent public download entry points:

- Latest production APK:
  https://github.com/ardarawk-cloud/ACC-OS-X/releases/latest/download/ACC-OS-X.apk

- Latest Google Play AAB:
  https://github.com/ardarawk-cloud/ACC-OS-X/releases/latest/download/ACC-OS-X-Play.aab

- Google Play Store page after publication:
  https://play.google.com/store/apps/details?id=com.ardacore.accosx

## Release rule
Production Android releases use tags matching:
`acc-os-x-android-v*`

The production GitHub Actions workflow creates stable filenames (`ACC-OS-X.apk` and `ACC-OS-X-Play.aab`) and attaches them to the GitHub Release for that tag.

Do not circulate transient GitHub Actions artifact URLs as the official public download link. Use the GitHub Release URL above until Google Play is live; after Google Play publication, Play Store becomes the primary public install/update channel and GitHub APK remains a controlled secondary distribution path.

## Signing continuity
The official download channel must use the permanent production signing lineage. Do not replace the upload keystore casually. Every release must increase `versionCode`.
