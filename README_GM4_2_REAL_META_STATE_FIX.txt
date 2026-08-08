ACC OS X Build 214 — GM4.2 REAL META STATE FIX

Fix:
- Recognizes legacy mock_/server_mock_ publish IDs as mock state.
- PUBLISH NOW creates a fresh META_FACEBOOK job instead of stopping on stale idempotency state.
- Keeps Theme, logo X, AI route, workflow, QC, production data and REAL_META_R1 endpoint unchanged.

Deploy:
- Upload all files directly to root of ACC-OS-X.
- Do NOT deploy this ZIP to ACC-PUBLISH-CONNECTOR.

Test:
1. Cloudflare ACC OS X deployment active.
2. PWA -> Tukang Tambang -> PROD -> Pipeline.
3. TEST CONNECTOR => REAL_META_R1.
4. Press PUBLISH NOW exactly once.
5. Success must show a Post ID that does NOT start with mock_ or server_mock_.
6. Confirm the new Facebook post.
