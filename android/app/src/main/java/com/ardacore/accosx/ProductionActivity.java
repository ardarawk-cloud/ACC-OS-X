package com.ardacore.accosx;

import android.app.Activity;
import android.content.ClipData;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import java.io.File;
import java.io.FileOutputStream;

public class ProductionActivity extends Activity {
    private static final int FILE_CHOOSER_REQUEST = 4101;
    private static final String HOME_URL = "https://acc-os-x-baxkup.ardarawk.workers.dev/?native=android";
    private static final long MAX_SHARE_IMAGE_BYTES = 12L * 1024L * 1024L;

    private WebView webView;
    private LinearLayout errorPanel;
    private ValueCallback<Uri[]> filePathCallback;
    private String lastInternalUrl = HOME_URL;
    private boolean loadFailed;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        buildUi();
        configureWebView();
        webView.loadUrl(HOME_URL);
    }

    private void buildUi() {
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(2, 6, 23));

        webView = new WebView(this);
        root.addView(webView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));

        errorPanel = new LinearLayout(this);
        errorPanel.setOrientation(LinearLayout.VERTICAL);
        errorPanel.setGravity(Gravity.CENTER);
        errorPanel.setPadding(dp(28), dp(28), dp(28), dp(28));
        errorPanel.setBackgroundColor(Color.rgb(2, 6, 23));
        errorPanel.setVisibility(View.GONE);

        TextView title = new TextView(this);
        title.setText("ACC OS X tidak dapat terhubung");
        title.setTextColor(Color.WHITE);
        title.setTextSize(20);
        title.setGravity(Gravity.CENTER);
        errorPanel.addView(title, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT));

        TextView detail = new TextView(this);
        detail.setText("Periksa koneksi internet lalu coba lagi. Data ACC OS X tidak dihapus.");
        detail.setTextColor(Color.rgb(148, 163, 184));
        detail.setTextSize(14);
        detail.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams detailParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT);
        detailParams.topMargin = dp(10);
        errorPanel.addView(detail, detailParams);

        Button retry = new Button(this);
        retry.setText("COBA LAGI");
        retry.setOnClickListener(v -> retryLastPage());
        LinearLayout.LayoutParams retryParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT);
        retryParams.topMargin = dp(20);
        retryParams.gravity = Gravity.CENTER_HORIZONTAL;
        errorPanel.addView(retry, retryParams);

        root.addView(errorPanel, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(root);
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setSafeBrowsingEnabled(true);
        settings.setUserAgentString(settings.getUserAgentString() + " ACCOSXAndroid/1.0.2");

        boolean debuggable = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        WebView.setWebContentsDebuggingEnabled(debuggable);
        webView.addJavascriptInterface(new AccAndroidBridge(), "ACCAndroid");
        webView.setWebViewClient(new ProductionWebViewClient());
        webView.setWebChromeClient(new ProductionChromeClient());
        webView.setDownloadListener(new AccDownloadBridge(this, settings.getUserAgentString()));
    }

    private void retryLastPage() {
        hideError();
        webView.loadUrl(lastInternalUrl);
    }

    private void showError() {
        loadFailed = true;
        errorPanel.setVisibility(View.VISIBLE);
    }

    private void hideError() {
        loadFailed = false;
        errorPanel.setVisibility(View.GONE);
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private String safeShareFilename(String requested) {
        String name = requested == null ? "ACC-OS-X-Poster.jpg" : requested.trim();
        name = name.replaceAll("[^A-Za-z0-9._-]", "-");
        if (name.isEmpty()) name = "ACC-OS-X-Poster.jpg";
        if (!name.toLowerCase().endsWith(".jpg") && !name.toLowerCase().endsWith(".jpeg")) name += ".jpg";
        return name.length() > 96 ? name.substring(0, 92) + ".jpg" : name;
    }

    private final class AccAndroidBridge {
        @JavascriptInterface
        public boolean isNativeShareAvailable() {
            return true;
        }

        @JavascriptInterface
        public boolean sharePackage(String imageBase64, String caption, String filename) {
            try {
                if (imageBase64 == null || imageBase64.trim().isEmpty()) return false;
                String clean = imageBase64.trim();
                int comma = clean.indexOf(',');
                if (clean.startsWith("data:") && comma >= 0) clean = clean.substring(comma + 1);

                byte[] imageBytes = Base64.decode(clean, Base64.DEFAULT);
                if (imageBytes.length == 0 || imageBytes.length > MAX_SHARE_IMAGE_BYTES) return false;

                File shareDir = new File(getCacheDir(), "shared");
                if (!shareDir.exists() && !shareDir.mkdirs()) return false;
                File[] previous = shareDir.listFiles();
                if (previous != null) {
                    for (File file : previous) {
                        if (file.isFile()) file.delete();
                    }
                }

                File poster = new File(shareDir, safeShareFilename(filename));
                try (FileOutputStream output = new FileOutputStream(poster, false)) {
                    output.write(imageBytes);
                    output.flush();
                }

                Uri uri = FileProvider.getUriForFile(
                        ProductionActivity.this,
                        getPackageName() + ".fileprovider",
                        poster);

                Intent send = new Intent(Intent.ACTION_SEND);
                send.setType("image/jpeg");
                send.putExtra(Intent.EXTRA_STREAM, uri);
                if (caption != null && !caption.trim().isEmpty()) send.putExtra(Intent.EXTRA_TEXT, caption);
                send.setClipData(ClipData.newRawUri("ACC OS X Poster", uri));
                send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                runOnUiThread(() -> {
                    try {
                        startActivity(Intent.createChooser(send, "Bagikan dari ACC OS X"));
                    } catch (Exception error) {
                        Toast.makeText(ProductionActivity.this, "Share Android tidak tersedia.", Toast.LENGTH_SHORT).show();
                    }
                });
                return true;
            } catch (Exception error) {
                runOnUiThread(() -> Toast.makeText(
                        ProductionActivity.this,
                        "Gagal menyiapkan poster untuk dibagikan.",
                        Toast.LENGTH_SHORT).show());
                return false;
            }
        }
    }

    private final class ProductionWebViewClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (AccNavigationPolicy.isInternal(uri)) return false;
            return AccNavigationPolicy.openExternal(ProductionActivity.this, uri);
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            Uri uri = Uri.parse(url);
            if (AccNavigationPolicy.isInternal(uri)) return false;
            return AccNavigationPolicy.openExternal(ProductionActivity.this, uri);
        }

        @Override
        public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
            Uri uri = Uri.parse(url);
            if (AccNavigationPolicy.isInternal(uri)) lastInternalUrl = url;
            hideError();
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            if (!loadFailed) errorPanel.setVisibility(View.GONE);
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request.isForMainFrame()) showError();
        }

        @Override
        public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
            if (request.isForMainFrame() && response.getStatusCode() >= 400) showError();
        }
    }

    private final class ProductionChromeClient extends WebChromeClient {
        @Override
        public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
            if (filePathCallback != null) filePathCallback.onReceiveValue(null);
            filePathCallback = callback;
            try {
                startActivityForResult(params.createIntent(), FILE_CHOOSER_REQUEST);
                return true;
            } catch (Exception error) {
                filePathCallback = null;
                Toast.makeText(ProductionActivity.this, "File picker tidak tersedia.", Toast.LENGTH_SHORT).show();
                return false;
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_CHOOSER_REQUEST || filePathCallback == null) return;
        Uri[] result = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
        filePathCallback.onReceiveValue(result);
        filePathCallback = null;
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (filePathCallback != null) {
            filePathCallback.onReceiveValue(null);
            filePathCallback = null;
        }
        if (webView != null) {
            webView.removeJavascriptInterface("ACCAndroid");
            webView.stopLoading();
            webView.setWebChromeClient(null);
            webView.setWebViewClient(null);
            webView.removeAllViews();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
