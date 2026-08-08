# ACC OS X Build 214 R6.10B-GM1 — GOLDEN MASTER CANDIDATE

Tujuan paket ini: satu full frontend package untuk ACC OS X yang mempertahankan Theme/Wallpaper UI dan Publish Core sampai Real Meta Facebook Adapter, tanpa mencampur frontend dengan backend Worker.

## Deploy
1. Upload seluruh isi paket ini ke repository `ACC-OS-X`.
2. Cloudflare target harus `acc-os-x-baxkup`.
3. JANGAN deploy paket ini ke `acc-publish-connector`.
4. Backend publish tetap terpisah di `https://acc-publish-connector.ardarawk.workers.dev`.
5. Setelah deploy, buka URL frontend ACC OS X. Paket ini memakai cache identity baru agar shell PWA lama tidak mengambil alih.

## Yang sudah digabung
- Full PWA shell: index, manifest, icons, service worker.
- Build 214 UI termasuk Theme Deck / Wallpaper Lab.
- Production Engine + AI Worker state dari Build 214.
- Publish Core.
- Real Meta Facebook target untuk Tukang Tambang.
- Default Publish API diarahkan ke backend connector yang sudah ada, namun masih bisa dioverride dari SYSTEM.

## Golden Master rule
Belum disebut GOLDEN MASTER FINAL sampai deploy nyata berhasil dan 4 cek singkat lolos: UI modern tampil, Theme ada, Production ada, Publish ke Facebook berhasil. Setelah itu simpan ZIP ini sebagai recovery utama.
