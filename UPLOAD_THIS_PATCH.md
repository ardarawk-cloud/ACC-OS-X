# ACC OS X Build 214 R6.1 — PWA Icon Refresh

Upload every file in this patch to the root of the `ACC-OS-X` GitHub repository on branch `main`, replacing same-name files when prompted. The three `*-r61.png` files are new and must be added. Cloudflare will auto-deploy.

This patch changes the PWA manifest and icon URLs to versioned filenames so Android/Chrome cannot reuse the old icon URL cache.
