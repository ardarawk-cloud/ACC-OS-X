# ACC OS X R6.10B.2 — FRONTEND HOST / ORIGIN FIX

## Root cause
The R6.10B.1 frontend files themselves do not redirect to `acc-publish-connector`.
The JSON screen appears when the installed app/browser is opened on the backend Worker origin.

## Correct separation
- FRONTEND: `acc-os-x-baxkup.<your-subdomain>.workers.dev` (or your ACC frontend custom domain)
- BACKEND: `https://acc-publish-connector.ardarawk.workers.dev`

The backend Worker must never be used as the PWA start/home URL.

## This package
This repository is deploy-ready as a Cloudflare Workers Static Assets frontend.
`wrangler.jsonc` points to `./app` and uses SPA fallback to `/index.html`.

## Deployment target
Deploy this repository to the existing frontend Worker `acc-os-x-baxkup`.
Do NOT deploy it to `acc-publish-connector`.

After deployment:
1. Open the `acc-os-x-baxkup` workers.dev URL.
2. Confirm the ACC OS X UI loads.
3. In ACC OS X → SYSTEM, set Publish API URL to:
   `https://acc-publish-connector.ardarawk.workers.dev`
4. Test Publish API Health.
5. Only after the frontend URL is correct, reinstall/update the PWA shortcut if needed.

## Data
The previous Build 210/214 JSON backup remains a state backup and can be imported after the UI is restored.
