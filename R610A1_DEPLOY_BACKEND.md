# ACC OS X R6.10A.1 — Connector Backend Deployment

## Why R6.10A failed
The PWA was deployed, but the `/functions/api/acc-publish.js` file was not active on the deployment. This happens when the frontend is uploaded as static files without a Functions-capable deployment path.

## Mobile-friendly proof path
1. Cloudflare Dashboard → Workers & Pages.
2. Create application → Create Worker / Hello World → Deploy.
3. Open the new Worker → Edit code.
4. Replace the Worker code with `cloudflare-worker/acc-publish-worker.js` from this patch.
5. Deploy.
6. Copy the Worker `https://...workers.dev` URL.
7. In ACC OS X: SYSTEM → `SET PUBLISH API URL` → paste that Worker URL.
8. Tap `TEST PUBLISH API HEALTH`.
9. Target: `PUBLISH API ONLINE ✅ R6.10A.1`.
10. Return to PROD → completed workflow → `TEST SERVER CONNECTOR`.
11. Target: `R6.10A SERVER CONNECTOR: PUBLISHED ✅`.

## Security gate
Do not add Facebook tokens yet. R6.10A.1 is SERVER_MOCK only.
Before R6.10B LIVE Facebook, configure Worker secrets and `ACC_ALLOWED_ORIGIN`.
