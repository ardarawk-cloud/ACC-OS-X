# NADMO LIVE — RADIO / AUTODJ 24/7 (product contract v1)
Date: 2026-10-09
Status: PLANNED / NOT YET RUNNING. Do not advertise continuous broadcast before server deployment and independent uptime test.

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
