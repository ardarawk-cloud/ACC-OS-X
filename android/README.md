# ACC OS X Android

Official hybrid Android shell for ACC OS X.

## Architecture
- Web core remains hosted at `https://acc-os-x-baxkup.ardarawk.workers.dev/`.
- Android provides the native application shell, file picker, secure download bridge, navigation isolation, retry/error handling, launcher icon, and splash screen.
- The web/PWA source remains the primary product core and can continue to deploy independently.

## Security defaults
- HTTPS-only app transport (`usesCleartextTraffic=false`).
- In-app navigation is restricted to the ACC OS X frontend host; external links are delegated to Android.
- Mixed content is blocked.
- Direct WebView file access is disabled.
- WebView debugging follows the APK debuggable flag and is disabled in release builds.
- Downloads require HTTPS and use Android DownloadManager.

## Production signing
The production release workflow requires these GitHub Actions secrets:
- `ACC_OS_X_ANDROID_KEYSTORE_B64`
- `ACC_OS_X_ANDROID_KEYSTORE_PASSWORD`
- `ACC_OS_X_ANDROID_KEY_ALIAS`
- `ACC_OS_X_ANDROID_KEY_PASSWORD`

Never commit the release keystore or passwords to this repository.
