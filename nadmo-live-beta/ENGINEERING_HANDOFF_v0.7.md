# NADMO LIVE — BETA ENGINEERING HANDOFF v0.7
Date: 2026-10-09
Status: PRIVATE BETA, not for unrestricted public launch.
Authority: NADMO LIVE Product Charter v0.6.

## Mission
**Dari pengguna, oleh pengguna, untuk pengguna.** Creators find their own fans: no forced PK battles, rankings, gift wars or popularity contests. A small loyal audience has value. NADMO prioritizes creator income opportunities, voluntary audience support, lawful expression, independence, fair treatment and public-interest information.

## Production beta architecture
- Isolated Cloudflare Worker `nadmo-live-beta-20261009`, Durable Object `RoomHub`, deployed only from branch `feat/nadmo-live-beta-worker-20261009` in `ardarawk-cloud/ACC-OS-X`.
- Browser UI: https://nadmo-live-beta-20261009.ardarawk.workers.dev/app/
- Health: https://nadmo-live-beta-20261009.ardarawk.workers.dev/health
- API: `/api/rooms` and `/ws`.
- All users auto-connect, no manual server address.
- Android source in isolated branch `feat/nadmo-live-android-beta-20261009` at `ardarawk-cloud/ACC-Builder-Apk`; loads hosted web client first with embedded offline fallback. Do not merge into main or disturb other NADMO apps.

## Features implemented and tested
- Host creates public/password private room (18+ self-attestation only; no strong age verification).
- Fans discover public live rooms through live-first feed, interest/category search and filters; Gaming is a first-class category. FOLLOW stores favorite sessions locally only.
- WebRTC P2P room with host and max four viewers, realtime room chat, STUN `stun:stun.cloudflare.com:3478` with fallback Google STUN. Corrected invalid prior STUN URI.
- Real headless Chrome browser E2E verifies two browser contexts: fake host camera+microphone, join, actual remote video+audio frames, standby AFK scene replacing camera video, and deliberate exit.
- Host can recover unexpected websocket loss within ~90 seconds using a secret resume token sent only to host; backend stores hash, hides offline room from discovery, preserves connected viewers and renegotiates WebRTC. Client retries up to ~85 seconds. Viewers get a user-readable state.
- The browser E2E also verifies media (not merely signaling) returns after simulated websocket network switch; video and audio are active on the same viewer again.
- When host deliberately ends room, viewer receives `room-ended` and returns to Explore with nonblocking notice.
- Fee transparency simulator proposes 7% share for tips and 10% for private ticket sales; NO actual payments, payouts, credit, wallets or transaction processing.
- SIGNAL is an information/public interest roadmap foundation, NOT yet a verified alert delivery system.
- Anti-competition Charter: no popularity leaderboard, no forced PK, no gift wars. No political viewpoint-based suspension.

## Verifiable CI
- E2E video/audio/AFK, media reconnect and room exit success: https://github.com/ardarawk-cloud/ACC-OS-X/actions/runs/37879353319
- Reconnect token authorization, room continuity, chat, signaling, end: https://github.com/ardarawk-cloud/ACC-OS-X/actions/runs/37878295416
- Initial full media E2E success: https://github.com/ardarawk-cloud/ACC-OS-X/actions/runs/37878988723
- Other automated QA workflows in `.github/workflows/nadmo-live-*.yml`.
- These are automated Chrome/GitHub tests. Two physical phones on different mobile operators still require testing. TURN and SFU are NOT ready.

## Safety, privacy and reliability limits
- No signup identity, creator account linking, moderation operator, integrated abuse reporting, trusted verified-age checks, paid rights management, licensed gateway, chargebacks or compliance pipeline. Beta is not a public commercial service.
- Browser WebRTC under mobile carrier NATs may fail with STUN only. Obtain TURN credentials / Cloudflare Realtime SFU before scaling or promising reliable multi-network live.
- Session recovery is for brief disconnection while web page and local media tracks remain alive; it is not an Android native persistent foreground service. Android can suspend/kill browser background streams.
- Rooms are not end-to-end encrypted by the app in an independently validated way; don't advertise secret/anonymous political safety or resilience to internet outages.
- Reactivate only with explicit access control, report/mute/block and age safeguards before broader public rollout.
- Stream audio using authorized rights; personal Spotify subscription does not grant broadcast licensing.
- Keep secrets/signing material out of repositories. CI Android beta currently uses ephemeral debug signing; do not ask user to install/uninstall repeated debug APKs. Establish private persistent release keystore for future updatable production APK.

## Next priorities
1. Owner test two physical Android phones on separate networks, after full QA is stable; capture media states and avoid reinstall if web beta suffices.
2. TURN/SFU and adaptive bitrate/backpressure, reliability and media usage alerting.
3. Creator accounts/fan following and moderation controls: account-level identity, report, anti-raid, mute, appeal, minimization.
4. Proper native Android signed release, game capture with explicit consent and OBS/RTMP ingestion.
5. Regulatory-compliant low-fee payments and transparent payout statements via licensed gateway, not before.
6. Verified SIGNAL editorial approval, sourcing, corrections, and future offline *read-only* cached bulletins.

Do not claim LIVE at scale or paid features until real functional validation and corresponding backend exist.

## OWNER DIRECTION — Verified human creator identity (9 Oct 2026)
Product-level lock: one REAL verified adult person = one primary creator account; multiple business brands/shows may belong to one verified owner; no 5–10 separate fake creator accounts per individual. Viewer browsing stays accessible without ID-upload. Public stage names remain permitted, legal ID remains confidential. The beta currently allows anonymous test room creation ONLY because official KYC/auth is not implemented; **BLOCK PUBLIC ONBOARDING until server-enforced auth and KYC exist**. Prefer independent hosted identity verification (KTP, supported passport, SIM only if legally/provider accepted), liveness as needed with data minimization/privacy impact review, secure dedup with recourse for false positives, controlled legal-process evidence disclosure and audit logs. Never accept document scans in insecure forms. Implement and independently QC the gate for WebSocket create/resume; UI-only gating does not count. Official implementation guide: `nadmo-live-beta/VERIFIED_STREAMER_IDENTITY_MASTER.md`. Related charter: `nadmo-live-beta/PRODUCT_CHARTER_v0.6.md`.
