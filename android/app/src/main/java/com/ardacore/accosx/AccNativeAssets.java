package com.ardacore.accosx;

import android.content.Context;
import android.net.Uri;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceResponse;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

/**
 * Build 10 native asset bridge.
 *
 * The MY MAPS sprite is bundled inside the APK as its existing Base64 source.
 * Web content requests a same-origin virtual URL; WebView serves the JPEG from
 * this bridge instead of depending on Cloudflare/WebView image fetching.
 */
public final class AccNativeAssets {
    public static final String MAP_SPRITE_PATH = "/__acc_native/maps-sprite.jpg";
    private static final String MAP_SPRITE_ASSET = "my-maps-icons-sprite.jpg.b64";

    private final byte[] mapSpriteBytes;

    public AccNativeAssets(Context context) {
        mapSpriteBytes = loadBase64Asset(context, MAP_SPRITE_ASSET);
    }

    @JavascriptInterface
    public boolean hasMapSprite() {
        return mapSpriteBytes.length > 0;
    }

    @JavascriptInterface
    public String getRevision() {
        return "ACC_OS_X_ANDROID_BUILD10_NATIVE_MAP_ASSETS_V1";
    }

    public static boolean isMapSpriteRequest(Uri uri) {
        return uri != null && MAP_SPRITE_PATH.equals(uri.getPath());
    }

    public WebResourceResponse openMapSpriteResponse() {
        if (mapSpriteBytes.length == 0) return null;
        WebResourceResponse response = new WebResourceResponse(
                "image/jpeg",
                null,
                new ByteArrayInputStream(mapSpriteBytes));
        response.setStatusCodeAndReasonPhrase(200, "OK");
        response.setResponseHeaders(java.util.Map.of(
                "Cache-Control", "no-store",
                "X-ACC-Native-Asset", "Build10"));
        return response;
    }

    private static byte[] loadBase64Asset(Context context, String name) {
        try (InputStream input = context.getAssets().open(name);
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] chunk = new byte[4096];
            int read;
            while ((read = input.read(chunk)) != -1) output.write(chunk, 0, read);
            String raw = output.toString(StandardCharsets.US_ASCII.name());
            String clean = raw.replaceAll("[^A-Za-z0-9+/=]", "");
            if (clean.isEmpty()) return new byte[0];
            byte[] decoded = Base64.decode(clean, Base64.DEFAULT);
            if (decoded.length < 4 || decoded[0] != (byte) 0xFF || decoded[1] != (byte) 0xD8) {
                return new byte[0];
            }
            return decoded;
        } catch (Exception ignored) {
            return new byte[0];
        }
    }
}
