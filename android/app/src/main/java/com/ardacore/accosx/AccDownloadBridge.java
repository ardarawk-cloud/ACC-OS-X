package com.ardacore.accosx;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.webkit.DownloadListener;
import android.widget.Toast;

import java.util.Locale;

final class AccDownloadBridge implements DownloadListener {
    private final Context context;

    AccDownloadBridge(Context context) {
        this.context = context;
    }

    @Override
    public void onDownloadStart(String url, String userAgentHeader, String contentDisposition,
                                String mimeType, long contentLength) {
        try {
            Uri uri = Uri.parse(url);
            if (!"https".equalsIgnoreCase(uri.getScheme())) {
                Toast.makeText(context, "Download non-HTTPS diblokir.", Toast.LENGTH_SHORT).show();
                return;
            }

            String lowerUrl = url == null ? "" : url.toLowerCase(Locale.ROOT);
            String lowerMime = mimeType == null ? "" : mimeType.toLowerCase(Locale.ROOT);
            boolean packagePayload = lowerMime.equals("application/vnd.android.package-archive")
                    || lowerUrl.matches(".*\\.(apk|apks|xapk|aab)(\\?.*)?$");

            if (packagePayload) {
                Toast.makeText(context, "Unduhan paket aplikasi diblokir di ACC OS X.", Toast.LENGTH_LONG).show();
                return;
            }

            Intent browser = new Intent(Intent.ACTION_VIEW, uri);
            browser.addCategory(Intent.CATEGORY_BROWSABLE);
            browser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(browser);
            Toast.makeText(context, "Download dibuka di browser.", Toast.LENGTH_SHORT).show();
        } catch (Exception error) {
            Toast.makeText(context, "Tidak ada browser untuk membuka download.", Toast.LENGTH_SHORT).show();
        }
    }
}
