package com.ardacore.accosx;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.Toast;

final class AccNavigationPolicy {
    static final String FRONTEND_HOST = "acc-os-x-baxkup.ardarawk.workers.dev";

    private AccNavigationPolicy() {}

    static boolean isInternal(Uri uri) {
        if (uri == null) return false;
        return "https".equalsIgnoreCase(uri.getScheme())
                && FRONTEND_HOST.equalsIgnoreCase(uri.getHost());
    }

    static boolean openExternal(Context context, Uri uri) {
        if (uri == null) return true;
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();
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
}
