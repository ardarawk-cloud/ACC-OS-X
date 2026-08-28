package com.ardacore.accosx;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.BitmapDrawable;
import android.graphics.drawable.Drawable;
import android.util.Base64;
import android.webkit.JavascriptInterface;

import java.io.ByteArrayOutputStream;

final class AccAppBridge {
    private final Context context;

    AccAppBridge(Context context) {
        this.context = context.getApplicationContext();
    }

    @JavascriptInterface
    public boolean isInstalled(String packageName) {
        return AccNavigationPolicy.isPackageAllowed(packageName)
                && AccNavigationPolicy.isInstalled(context, packageName);
    }

    @JavascriptInterface
    public String appIcon(String packageName) {
        if (!AccNavigationPolicy.isPackageAllowed(packageName)) return "";
        try {
            Drawable drawable = context.getPackageManager().getApplicationIcon(packageName);
            Bitmap bitmap;
            if (drawable instanceof BitmapDrawable
                    && ((BitmapDrawable) drawable).getBitmap() != null) {
                Bitmap source = ((BitmapDrawable) drawable).getBitmap();
                bitmap = Bitmap.createScaledBitmap(source, 160, 160, true);
            } else {
                bitmap = Bitmap.createBitmap(160, 160, Bitmap.Config.ARGB_8888);
                Canvas canvas = new Canvas(bitmap);
                drawable.setBounds(0, 0, 160, 160);
                drawable.draw(canvas);
            }
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            if (!bitmap.compress(Bitmap.CompressFormat.PNG, 100, output)) return "";
            return "data:image/png;base64," + Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP);
        } catch (Exception ignored) {
            return "";
        }
    }
}
