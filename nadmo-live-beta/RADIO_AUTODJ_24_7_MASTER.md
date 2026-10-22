# NADMO LIVE — RADIO / AUTODJ 24/7 (product contract v1)
Date: 2026-10-09
Status: CLIENT RADIO PLAYER IMPLEMENTED ON FEATURE BRANCH; AUTODJ BACKEND NOT YET VERIFIED ACTIVE. Do not advertise continuous broadcast before server deployment and independent uptime test.

## 2026-10-12 client implementation checkpoint
- RADIO ONE mobile stage is now roughly camera-sized, not the former 310px placeholder.
- Public listener controls: play/pause; station ON AIR vs OFF AIR; song, artist and real listener count; 30-second now-playing refresh; persistent in-app mini-player on other tabs.
- Existing Worker route `/api/radio/status` integrates read-only with AzuraCast `RADIO_ORIGIN`, `RADIO_STATION` and optional `RADIO_STREAM_ORIGIN` as explicitly approved HTTPS media origin.
- Status outages do not cut an existing audio session. A confirmed OFF AIR stops the local player. The player remains muted/stopped until an explicit user tap.
- Spotify and YouTube Music are only separately opened personal music services; public stream rebroadcast is not permitted by ordinary subscriptions.
- The phone is never the 24/7 audio source. Do not enable GO RADIO, autoplay or "ON AIR" status until rights-cleared AutoDJ is deployed.
- Viewer chat, individual tipping, creator uploads, DJ takeover, per-station moderation and unattended 24-hour playback need separately verified backend implementation. UI does not claim these features are active.
- Native Android background playback while screen is locked is NOT promised by this web-only stage; evaluate media foreground service only if physically necessary, after GAME regression is stabilized.
- No new Android build or signing key is required for this web player.

## Correct product definition
AFK for music creators means "start a radio station, keep music and community live while owner is away, locks phone, changes apps or even closes the app." Merely replacing a camera frame with an AFK canvas is NOT this feature.

NADMO has two independent pipelines:

**CAMERA LIVE (existing beta):** Phone/WebView camera + microphone -> live WebRTC P2P -> viewers. A "KAMERA OFF" control changes video to a standby visual with the host microphone still live. It does NOT run on the server or support guaranteed 24-hour unattended music.

**NADMO RADIO / AUTODJ 24/7 (new platform feature):** Creator uploads files with documented broadcasting rights -> station-owned media library -> schedules and playlists -> always-running server AutoDJ (Liquidsoap) -> Icecast audio stream -> listeners through HTTPS audio player in NADMO web/APK. The creator's device is only a remote control and can disconnect with no effect on playback.

## Recommended initial engine
- AzuraCast (Docker), which combines Liquidsoap AutoDJ, Icecast station frontend, playlists, permissions and live DJ takeover.
- Dedicated hostname, HTTPS reverse proxy and authenticated admin API. Do not install on existing production services without an audit.
- Source docs: https://www.azuracast.com/docs/user-guide/station-management/ and https://www.azuracast.com/docs/user-guide/streamers-and-djs/ 
- Sizing: upstream recommendation approximately 4 CPUs/4 GB RAM/40 GB storage for several hobby stations; check disk, Docker compatibility, NAT routing and bandwidth. Do not promise arbitrary creator scale on a single VPS.
- Beta pilot: one NADMO-controlled station with 2-3 owned/cleared demo songs, run at least 24 hours uninterrupted. Multiple creator-owned stations follow after isolation, storage quotas, moderation and billing/resource accounting exist.
- Deployment gates: working legal media set; domain with TLS; stable streaming URL reachable on mobile networks; auto-start after reboot; health/stream silence alerts; CPU, bandwidth and listener testing; 24-hour playback; owner confirmation.

## Listener UI
- Radio is audio-first: cover/animated waveform, station name, now-playing track, listeners and persistent chat; mini player while browsing the rest of app; start/pause listening. No full-video camera requirement.
- Direct IDR tipping, including custom amounts and transparent fees, remains disabled until a licensed payment gateway, receipts and withdrawal/chargeback handling are ready.
- Stream has single global timeline; every listener hears the station's current song. Tuning in later does not restart tracks.
- Offline/resume: reconnect player at live point when network recovers; if internet entirely unavailable, cannot guarantee live distribution.

## Creator UI
1. Create radio station, choose station name/profile and audience settings.
2. Upload music which user has sufficient rights to rebroadcast (original, cleared artists/labels, authorized mixes), with simple documented claim/dispute flow and no arbitrary auto suspension without review.
3. Create playlist, schedule rotation, choose repeat/crossfade/jingle rules.
4. PRESS "GO RADIO / AUTODJ" to start a station-independent continuous stream; show actual server state.
5. DJ LIVE TAKEOVER: voice and DJ feed go live over AutoDJ output, then seamlessly return to AutoDJ playlist when DJ disconnects.
6. "STOP RADIO" is a distinct, deliberate server action requiring confirmation; closing app must never stop station.

## Boundaries
- Standard Spotify subscriptions and Spotify Web API do not grant station broadcasting rights. No silent audio capture of third-party paid apps.
- Creator freedom within predictable, published rules addressing actual rights, harassment, violence threats, and safety; appeals and human review over arbitrary music AFK bans.
- Never say 24/7 functionality is implemented based on a Cloudflare Worker alone: Workers/DO are signaling/metadata/control-plane here, not an indefinitely running audio producer.
- Station admin credentials must be server secrets. Browser must not directly receive AzuraCast admin API keys, Icecast source password, or private uploads.
- Permanent live audio requires real server-side player/playlist and sufficient operator resources, not a still image or JavaScript interval on a phone.

## Proposed integration
- NADMO Live backend Worker: /api/radio/stations (list approved public stations), /api/radio/nowplaying/:id, /api/radio/control via authenticated creator identity/role and validated events.
- Radio media in object storage or dedicated authorized station volume; stream served by HTTPS relay domain, not by WebRTC host peers.
- Streamer sessions and listener rooms linked by radioStationId. Chat can use existing Durable Object protocol but must not require the DJ phone to stay connected.
- Client UI distinguishes CAMERA OFF from RADIO AUTODJ so it never promises 24/7 broadcast through a button that only replaces video.
- Stage rollout: (1) self-hosted single station with real uploaded tracks; (2) listening in NADMO and stable background audio playback (Android may need foreground media service); (3) user stations and DJ takeover; (4) payments, scale, audits.

DO NOT claim this feature is operational until a radio engine is actually deployed, loaded with cleared audio, and uptime-tested.

## 2026-10-12 — OWNER CHANGE: OPEN MUSIC RADIO LIVE (separate from unattended AutoDJ)
The owner requests RADIO LIVE where a host starts a native live session and taps **OPEN MUSIC** to open an Android music app of their choosing, analogous to opening Roblox after a GAME session. **This is NOT the same as 24/7 unattended server AutoDJ.**

- Host: Studio → RADIO → MULAI RADIO LIVE → Android MediaProjection/audio consent → OPEN MUSIC → choose supported media app or return to phone Home to open any installed app → resume broadcasting via the existing privacy overlay; no auto-resume.
- Viewer: live room `broadcastKind=radio` shows a full **CAMERA-sized portrait** stage, never the compact GAME layout. Only the NADMO branded artwork/waveform is visible; app screen is never public.
- Native service ALWAYS replaces captured phone pixels with opaque frame *before* WebRTC encoding. Even after RESUME it cannot publish private app screens; client overlays rendered radio artwork.
- Audio: host microphone plus Android 10+ AudioPlaybackCapture when both OS and player explicitly permit. Protected content/players may be silent. Android full-display capture permission is still shown, even though private video is masked.
- No fixed Spotify/YT Music requirement. App opening alone does **not** grant rights to broadcast. Never claim Spotify/YT Music subscriptions are valid public radio broadcasting licenses.
- This feature is **phone-dependent**: closing the device/app, OS stopping foreground service, network disruption or withdrawal of permission will stop it. This is not a 24/7 station guarantee.
- Existing RADIO ONE AutoDJ client and its configured public station remain a different listener feature; only a verified deployed AutoDJ server can offer unattended 24-hour music.
- Native/Worker compatibility: Old APKs without `radioMusicSupported:true` cannot enable the new radio mode. Never repurpose old GAME capture silently.
- Companion source: ACC-OS-X PR #215 and ACC-Builder-Apk PR #57. Both remain unreleased development candidates pending two-phone music audio/visual/privacy QC and one coordinated signed APK update.
