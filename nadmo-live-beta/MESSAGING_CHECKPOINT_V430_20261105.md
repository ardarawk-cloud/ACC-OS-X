# NADMO LIVE — Messaging v430 checkpoint (5 Nov 2026, WITA)

## Production verified
- **Worker** `nadmo-live-beta-20261009`, URL `https://live.nadmo.id/app/?v=430`.
- **Production version 430**: `0b1af3b3-65bb-49d3-ad0d-9e6b894990b7`, 100% active.
- **Rollback 429**: `5e8fed8a-cf60-426f-8776-fb64f72afcd6` (do not roll back Durable Object storage).
- **Bindings 12/12 retained**, including ASSETS, ROOM_HUB, SOCIAL_MEDIA, all DANA bindings. DANA remains sandbox.
- Browser mobile viewport 390x844 confirmed presence of archive, starred filter, react actions, in-chat search, existing Saweria and Cyberpunk theme.
- Existing v429 DM features: delete for self/all, clear own thread, edit in 15 min, recall in 24h, reply quote, pin & mute threads, inbox search.
- New v430 features: one reaction per account per message, private starred messages, per-account archive, manual mark unread, per-conversation text search, starred-only filter.
- GitHub **26/26 Node tests PASS**: https://github.com/ardarawk-cloud/ACC-OS-X/actions/runs/41907152450
- **8/8 real production v430 smoke PASS**: https://github.com/ardarawk-cloud/ACC-OS-X/actions/runs/41907892185 ; job 126847334059, two disposable QA accounts both deleted with HTTP 200.
- GitHub branch `feat/nadmo-live-messaging-v2-20261105` derives from `feat/nadmo-live-messaging-v1-20261105`; source changes are not byte-identical to live Worker due direct Cloudflare hotpatches.
- Live v430 deployed as targeted Cloudflare Worker code patch; do not deploy entire unmerged GitHub branch on top of it without reconciling production source first.

## Security/semantics
- Reactions stored in Durable Object shared DM records, only aggregate counts and current-user mine flag returned; no reactor IDs leaked to chat UI.
- Stars and archives private to the logged-in account; manual unread resets when chat is opened; all mutations require authenticated server-side session, same origin, input validation and rate limits.
- Unknown or deleted message IDs rejected; new reactions and stars cannot be attached to deleted-for-everyone messages.
- Existing pass: QRIS, viewer interactions by Owner, DANA sandbox, Saweria webhook and support overlays were not replaced.

## Still NOT done
- Upload photo/video/documents, voice notes and video/audio calling, groups/channels, polls, disappearing messages, delivery receipts/typing indicators in realtime, cryptographically sound end-to-end encryption and encrypted backup.
- No newly built signed Android APK from v430. PWA/web can load v430; APK WebView cache/app integration must be tested separately.
- The full “all messengers in one” objective requires independent backend/media/security work. Do not claim COMPLETE.
- Need per-provider live infrastructure compatibility and staging before changing crypto or media systems.
