ACC OS X Build 214 — GM4.3 REAL MEDIA PUBLISH

MISSION ALPHA-2
Target:
ACC OS X PWA -> REAL_META_R2 connector -> Meta /photos -> Facebook Page

Changes:
- Preserves the successful GM4.2 real-text publish path.
- Adds a public static test poster: /alpha2-test-poster.png
- Publish payload now includes content.mediaUrl.
- If a POSTER asset already contains a public HTTPS image URL, that URL wins.
- Otherwise Alpha-2 uses the bundled public test poster.
- Social caption sanitizer removes basic Markdown **bold** / __bold__ / # headings before Facebook publish.
- No workflow reset and no QC repeat required.

IMPORTANT:
Deploy this ZIP ONLY to ACC-OS-X root.
Keep GM4.2 as recovery baseline.

Test after connector R2 is active:
1. TEST CONNECTOR must say REAL_META_R2.
2. Tukang Tambang -> Publish Gate should show ALPHA-2 TEST MEDIA READY (or PUBLIC POSTER URL READY).
3. Press PUBLISH NOW once.
4. Facebook should show a real image + caption post.
