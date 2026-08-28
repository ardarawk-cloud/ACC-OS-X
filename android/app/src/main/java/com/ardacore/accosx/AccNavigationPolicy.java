package com.ardacore.accosx;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.Toast;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

final class AccNavigationPolicy {
    static final String FRONTEND_HOST = "acc-os-x-baxkup.ardarawk.workers.dev";

    private static final Set<String> ALLOWED_PACKAGES = new HashSet<>(Arrays.asList(
            "com.acc.cleaner",
            "com.kaitradex.app.dev",
            "com.kaitradex.app",
            "com.nadmo.ai",
            "com.kai.casinox",
            "com.accbuilder.accmediadownloader",
            "com.accbuilder.aimashupbootlegstudio",
            "com.acc.contenthub",
            "com.baliweddingdj.app"
    ));

    private AccNavigationPolicy() {}

    static boolean isInternal(Uri uri) {
        if (uri == null) return false;
        return "https".equalsIgnoreCase(uri.getScheme())
                && FRONTEND_HOST.equalsIgnoreCase(uri.getHost());
    }

    static boolean openExternal(Context context, Uri uri) {
        if (uri == null) return true;
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();

        if (scheme.equals("accapp") && "launch".equalsIgnoreCase(uri.getHost())) {
            String packages = uri.getQueryParameter("packages");
            if (packages == null || packages.trim().isEmpty()) {
                Toast.makeText(context, "Target APK kosong.", Toast.LENGTH_SHORT).show();
                return true;
            }
            for (String pkg : packages.split(",")) {
                if (launchAllowedPackage(context, pkg.trim())) return true;
            }
            Toast.makeText(context, "APK belum terpasang di HP.", Toast.LENGTH_SHORT).show();
            return true;
        }

        if (scheme.equals("intent")) {
            try {
                Intent parsed = Intent.parseUri(uri.toString(), Intent.URI_INTENT_SCHEME);
                String pkg = parsed.getPackage();
                if (pkg != null && launchAllowedPackage(context, pkg)) return true;
            } catch (Exception ignored) {
            }
            Toast.makeText(context, "Target APK tidak dikenali.", Toast.LENGTH_SHORT).show();
            return true;
        }

        if (!(scheme.equals("https") || scheme.equals("http") || scheme.equals("mailto") || scheme.equals("tel"))) {
            Toast.makeText(context, "Tautan diblokir oleh ACC OS X.", Toast.LENGTH_SHORT).show();
            return true;
        }
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            context.startActivity(intent);
        } catch (Exception error) {
            Toast.makeText(context, "Tidak ada aplikasi untuk membuka tautan ini.", Toast.LENGTH_SHORT).show();
        }
        return true;
    }

    private static boolean launchAllowedPackage(Context context, String packageName) {
        if (!ALLOWED_PACKAGES.contains(packageName)) return false;
        Intent launch = context.getPackageManager().getLaunchIntentForPackage(packageName);
        if (launch == null) return false;
        launch.addFlags(Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
        context.startActivity(launch);
        return true;
    }
}
