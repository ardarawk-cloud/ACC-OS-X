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
            // ACC / owner apps
            "com.acc.cleaner",
            "com.kaitradex.app.dev",
            "com.kaitradex.app",
            "com.nadmo.ai",
            "com.kai.casinox",
            "com.accbuilder.accmediadownloader",
            "com.accbuilder.aimashupbootlegstudio",
            "com.acc.contenthub",
            "com.baliweddingdj.app",
            "com.kawanlama.smartklic",

            // Finance
            "com.bca.mybca.omni.android",
            "com.bcadigital.blu",
            "com.gojek.gopay",
            "id.dana",
            "com.shopeepay.id",
            "ovo.id",
            "com.honestbank.android",
            "com.dokuwallet.android",
            "com.bnc.finance",
            "id.co.bankbkemobile.digitalbank",
            "com.jago.digitalBanking",
            "com.alloapp.yump",
            "com.treasury.apps",
            "com.binance.cloud.tokocrypto",
            "id.co.bitcoin",
            "com.bibit.bibitid",
            "io.metamask",
            "id.co.bankfama.android",
            "com.paypal.android.p2pmobile",

            // Social
            "com.facebook.katana",
            "com.google.android.youtube",
            "com.google.android.apps.youtube.music",
            "com.google.android.apps.youtube.creator",
            "com.instagram.android",
            "com.zhiliaoapp.musically",
            "com.instagram.barcelona",
            "com.twitter.android",

            // Communication
            "com.whatsapp",
            "com.whatsapp.w4b",
            "org.telegram.messenger",
            "com.facebook.orca",
            "com.bitchat.droid",
            "com.discord",
            "us.zoom.videomeetings",

            // Commercial
            "com.gojek.app",
            "com.grabtaxi.passenger",
            "com.taxsee.taxsee",
            "com.shopee.id",
            "com.shopee.shopeeseller",
            "com.icon.pln123",
            "com.dafturn.mypertamina",
            "com.tokopedia.tkpd",

            // Health
            "app.bpjs.mobile",
            "com.bpjstku",
            "com.linkdokter.halodoc.android"
    ));

    private AccNavigationPolicy() {}

    static boolean isPackageAllowed(String packageName) {
        return packageName != null && ALLOWED_PACKAGES.contains(packageName);
    }

    static boolean isInstalled(Context context, String packageName) {
        if (!isPackageAllowed(packageName)) return false;
        try {
            context.getPackageManager().getApplicationInfo(packageName, 0);
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }

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
        if (!isPackageAllowed(packageName)) return false;
        try {
            Intent launch = context.getPackageManager().getLaunchIntentForPackage(packageName);
            if (launch == null) {
                launch = new Intent(Intent.ACTION_MAIN);
                launch.addCategory(Intent.CATEGORY_LAUNCHER);
                launch.setPackage(packageName);
            }
            launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
            context.startActivity(launch);
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }
}
