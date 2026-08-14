# ACC OS X Android production shell.
# Keep JavaScript bridge methods callable after release minification.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
