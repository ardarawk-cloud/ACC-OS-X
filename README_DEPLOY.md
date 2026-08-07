# Deploy ACC OS X Build 214 R2 — No-Agent

## Recommended path
Cloudflare is the primary host for this package. Netlify Agent Runner is not required.

### Static deploy from phone
1. Keep/export a Build 213 safety backup.
2. In Cloudflare Workers & Pages, create or update the ACC OS X static deployment.
3. Upload the Build 214 R2 files.
4. Open the new deployment and confirm `Build 214 • ACC AI Console / No-Agent`.
5. Test Profile, Registry, Backup Center and the floating AI icon.
6. ACC AI will work immediately in `LOCAL SAFE` mode.
7. Install/update the PWA only after QC.

### Optional real AI
For generative AI, deploy the included `cloudflare-worker.mjs` with `wrangler.jsonc` through GitHub/Wrangler, then add server secrets:
- `ACC_AI_ACCESS_CODE`
- `OPENAI_API_KEY`
Optional: `ACC_AI_MODEL` (default `gpt-5.6-luna`).

The browser never needs the OpenAI API key.

## PWA/data rules
- Manifest ID stays `/`.
- Build 213 storage is included in migration keys.
- Same origin: existing localStorage can migrate automatically.
- New Cloudflare origin: import the exported JSON backup.
- Do not uninstall the known-good PWA until the new build passes QC.
