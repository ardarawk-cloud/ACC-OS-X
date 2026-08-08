ACC OS X Build 214 R6.10B-GM2 — DEPLOY FIX

FIX: Cloudflare build sebelumnya mencari /app, sementara file hasil upload berada di root repo.
GM2 sengaja FLAT/ROOT: index.html, app.js, styles.css, manifest.json, service-worker.js dan wrangler.jsonc berada di level yang sama.
wrangler assets.directory = "."

UPLOAD:
- Upload SEMUA file di ZIP ini langsung ke ROOT repo ACC-OS-X branch main.
- Jangan buat folder app.
- Replace file lama yang namanya sama.
- Jangan deploy ke ACC-PUBLISH-CONNECTOR.
- Tunggu Cloudflare build hijau dan Active deployment mendapat Version ID baru.
