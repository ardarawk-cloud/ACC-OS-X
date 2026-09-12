#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GRADLE="$ROOT/android/app/build.gradle"
MANIFEST="$ROOT/android/app/src/main/AndroidManifest.xml"
AUTHORITY="$ROOT/ACC-OS-X-AUTHORITY.md"

fail() {
  echo "::error::$*"
  exit 1
}

[ -f "$GRADLE" ] || fail "Missing android/app/build.gradle"
[ -f "$MANIFEST" ] || fail "Missing AndroidManifest.xml"
[ -f "$AUTHORITY" ] || fail "Missing ACC-OS-X-AUTHORITY.md"

APPLICATION_ID="$(sed -n "s/^[[:space:]]*applicationId '\([^']*\)'.*/\1/p" "$GRADLE" | head -n1)"
NAMESPACE="$(sed -n "s/^[[:space:]]*namespace '\([^']*\)'.*/\1/p" "$GRADLE" | head -n1)"
VERSION_CODE="$(sed -n 's/^[[:space:]]*versionCode \([0-9][0-9]*\).*/\1/p' "$GRADLE" | head -n1)"
VERSION_NAME="$(sed -n "s/^[[:space:]]*versionName '\([^']*\)'.*/\1/p" "$GRADLE" | head -n1)"

[ "$APPLICATION_ID" = "com.ardacore.accosx" ] || fail "applicationId drift: $APPLICATION_ID"
[ "$NAMESPACE" = "com.ardacore.accosx" ] || fail "namespace drift: $NAMESPACE"
[ -n "$VERSION_CODE" ] || fail "versionCode missing"
[ -n "$VERSION_NAME" ] || fail "versionName missing"

case "$VERSION_CODE" in
  *[!0-9]*|'') fail "versionCode must be numeric" ;;
esac

if [ "$VERSION_CODE" -lt 11 ]; then
  fail "versionCode regressed below locked baseline 11"
fi

grep -q 'android:label="ACC OS X"' "$MANIFEST" || fail "ACC OS X app label drift"
grep -q 'android:icon="@drawable/ic_acc_os_x"' "$MANIFEST" || fail "ACC OS X launcher icon drift"
grep -q 'com.ardacore.accosx' "$AUTHORITY" || fail "Authority package lock missing"
grep -q '33:76:70:DE:C0:F9:0B:72:74:8F:44:CC:F2:C0:52:9B:86:EA:E4:2C:1D:85:84:B4:C3:62:22:B2:B3:36:05:D5' "$AUTHORITY" || fail "Authority production certificate fingerprint missing"

echo "ACC OS X Android release contract PASS"
echo "package=$APPLICATION_ID versionName=$VERSION_NAME versionCode=$VERSION_CODE"
