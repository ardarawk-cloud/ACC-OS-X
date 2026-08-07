# Build 214 R5 Setup

1. Upload the R5 patch files to GitHub repo `ardarawk-cloud/ACC-OS-X`, branch `main`.
2. Cloudflare auto-deploys `wrangler.jsonc` with:
   - Worker main: `cloudflare-worker.mjs`
   - Static Assets binding: `ASSETS`
   - Workers AI binding: `AI`
3. In Cloudflare Worker > Settings/Bindings or Variables and secrets, add secret:
   - Name: `ACC_AI_ACCESS_CODE`
   - Value: owner-only access code
4. Do not put the access code in GitHub.
5. Open `/api/acc-ai` in browser. It should report `provider: Cloudflare Workers AI`, `aiBindingConfigured: true`, `accessCodeConfigured: true`.
6. In ACC AI Console press CONNECT AI and enter the same owner access code.
7. Send a test question. If provider fails, Local Safe fallback remains active.
