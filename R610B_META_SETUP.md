# ACC OS X R6.10B — Meta Facebook Live Setup

## Live target for this gate
- ACC channel: `ch-tukang-tambang`
- Facebook Page: `Tukang Tambang`
- Page ID: `101420769205689`

## Cloudflare Worker repository
Use the files inside `cloudflare-worker/` as the source for the existing `ACC-PUBLISH-CONNECTOR` GitHub repository.

Required Cloudflare Worker secrets/variables:

1. Secret: `ACC_CONNECTOR_ACCESS_CODE`
   - Set this to the same ACC AI access code already saved in the ACC OS X device.
   - Do not commit this value to GitHub.

2. Secret: `FB_PAGE_TOKEN_TUKANG_TAMBANG`
   - Use the Page Access Token for Tukang Tambang obtained from Meta Graph API Explorer.
   - Do not paste it into app.js, GitHub, screenshots, or chat.

3. Variable: `FB_PAGE_ID_TUKANG_TAMBANG`
   - Value: `101420769205689`

4. Variable: `META_GRAPH_VERSION`
   - Value: `v26.0`

## Safety gate
R6.10B permits real publishing only for Tukang Tambang. Requests for other ACC channels return `TARGET_NOT_ENABLED`.

## First APK live-fire test
1. Deploy the updated Cloudflare connector.
2. Verify `/health` returns `revision: R6.10B`.
3. Deploy the PWA patch files.
4. Open Tukang Tambang in ACC OS X.
5. Complete one production workflow through approval.
6. Press `PUBLISH TO FACEBOOK`.
7. Confirm `FACEBOOK PUBLISHED ✅` in ACC and verify the post appears on the Page.

## Current image behavior
If the latest POSTER asset contains a direct public HTTPS image URL, the Worker publishes through `/{page-id}/photos`. If not, R6.10B publishes the caption through `/{page-id}/feed` as text only. A generated-image storage pipeline is the next engineering gate.
