# ACC OS X Android 1.0.0 RC1

Production-hardening release candidate for the official ACC OS X Android shell.

- Exact ACC OS X frontend host allowlist for in-app navigation.
- External links isolated to Android apps/browser.
- HTTPS-only internal transport and downloads.
- Mixed-content blocking and direct WebView file access disabled.
- Native file picker/upload.
- Native DownloadManager integration.
- Native connection error screen with retry.
- WebView debugging disabled for non-debuggable release builds.
- Official ACC OS X launcher asset and Android splash.
- Debug and release/minify CI validation.
- Separate production release workflow requiring a permanent release keystore from GitHub Actions Secrets.

The RC artifact uses the existing validation/debug signing lineage for device upgrade testing. The first permanently production-signed APK will require a one-time transition from the pilot/RC certificate.
