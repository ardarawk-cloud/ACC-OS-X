# NADMO LIVE — Independent Broadcast Resilience v0.1

Owner: PT Nadmo Studio Indonesia
Date: 9 November 2026
Status: STAGING CONTROL PLANE ONLY (NOT MASS VIDEO PRODUCTION)

## Owner's immutable product decisions
- One NADMO LIVE app and one GO LIVE button for each host. Technical complexity stays server-side.
- No per-viewer cap based on Free/Pro/Plus subscription. Unlimited Plus refers ONLY to Support Action clicks. Price and entitlement unchanged.
- NADMO platform takes 0% of tips. Licensed payment provider fees remain transparent.
- Independent broadcasting, low operating cost, open-source first; eventual optional OFFGRID/local mesh network.
- Provider accounts or upgrades NEVER auto-activated; user consent required for P2P upload data and any paid media plan.
- Do not terminate a currently playing stream merely because budget warning was triggered.

## Audited baseline
Production Cloudflare Worker nadmo-live-beta-20261009 still on production version v470 664db15e-32b9-424a-9b83-3a901a549003 (100%). Existing P2P mesh + STUN. Source limits 20 rooms, 4 viewers per room, 120 WebSockets per DO. TURN key count 0. Cloudflare Stream not enabled/permission 403. xl ive-stage is isolated, NOT a media backup. Cost stage separate, billing API 403.
DO NOT deploy older GitHub worker source over production v470; preserve tutorials and binding set.

## Proposed final broadcast data plane
Existing NADMO host front end
  -> future server-side publish adapter / WebRTC WHIP / RTMP
  -> MediaMTX origin A (NADMO-controlled, primary)
  -> HLS segments to viewers via separate video origin
  -> MediaMTX origin B (separate physical/network failure domain with independently maintained media source)
  -> HLS video fallback
  -> Optional P2P Media Loader (viewer informed and opted-in; HTTP fallback mandatory)
  -> Optional licensed CDN/Stream capacity ONLY by explicit owner approval

A backup origin with no incoming video is NOT valid redundancy. One publishing session may reconnect across ingress endpoints automatically, but no claim of uninterrupted video without real dual-ingest or independent relay and failover tests. Host keeps one GO LIVE UI; the app must acquire and maintain the proper publish session in future staging.

The metadata controller never proxies HLS manifests, video segments or stream content through generic Cloudflare Workers/CDN, in line with Cloudflare video delivery restrictions. It records which external approved video origin is ready.

## Implemented staging
- GitHub branch feat/nadmo-live-broadcast-failover-staging-20261109
- Source apps/nadmo-live-broadcast/worker.mjs and player.mjs
- Cloudflare Worker nadmo-live-broadcast-stage
- Private Durable Object BROADCAST_HUB per stage room
- Secret ADMIN_TOKEN for administrative configuration and audit; secret PROBE_TOKEN for authorized upstream health samples
- Allowlist ALLOWED_ORIGIN_HOSTS defaults unset so no media can be registered without explicit trusted origins
- Public GET /health
- Public GET /api/route/demo (returns WAITING until two valid streaming sources registered and probe checked)
- Public GET /watch/demo (isolated viewer preview with HLS.js, native HLS fallback and automatic client video retry)
- Authenticated POST /admin/configure/demo: body {"sources":[{"role":"primary","url":"https://primary.example.net/live/demo.m3u8"},{"role":"backup","url":"https://backup.example.net/live/demo.m3u8"}]}
- Authenticated POST /probe/demo with {role:"primary",healthy:true} for backend test only.
- Authenticated GET /admin/audit/demo.
- Automatic HEAD probe of each approved origin manifest approximately every 20 seconds, 4.5 second timeout, no redirects, 2 successful checks to mark ready, recovery hysteresis 60 seconds. If both down/stale return WAITING/DEGRADED_HOLD and keep host session unaffected.
- Stage never issues Cloudflare Stream/TURN/SFU/Container spend commands. P2P segment sharing remains off in stage until separate tests and opt-in UX.

## Security requirements
- Stream origin domain allowlist strict HTTPS, .m3u8, no URL query tokens, no username:password, fragment, localhost or IP literals.
- No stream keys or service tokens in browser, repository or route API.
- JWT/signed HLS playlists and URL lifetimes require a later audited access design. This stage only tests public non-sensitive origin URLs.
- Never expose platform admin credentials or private host session to the media origin.
- HLS origins must supply CORS only to allowed player origins, correct MIME types and supported HEAD responses; authenticate publisher separately.
- Require resource exhaustion, DRM/stream rights, moderation, and consent checks prior to public rollout.
- Peer-assisted streaming is not inherently free: viewer upload, NAT/TURN, mobile battery and potential IP discovery must be disclosed and user-controlled.

## Quality and release gates
Tests run on GitHub Actions: allowed/unallowed origins, token-protected admin/probe, 2-sample health, primary->backup, anti-flapping, backup->primary, stale data, missing database, no video proxy.
HTTP smoke on stage: /health, /api/route/demo, /watch/demo, unauthorized configuration.
NOT DONE: MediaMTX primary/backup installed, host-to-origin publish integration, real origin connectivity, real video playback, network switch/recovery, simultaneous 50/100/1K real viewers, actual egress billing; NEED owner approval to activate paid capacity or modify production.
No production changes allowed until verified staging and rollback tests.

## Cost & OFFGRID policies
Budget operational target: less than or equal to 20% of confirmed received subscription revenue; not a billing guarantee. Official invoice and verified settlement must be connected before scaling.
Use P2P mesh for small stage interactions, broadcast HLS for mass audience, and eventual peer-assisted HLS only where sensible. Avoid quality regressions by making fallback to HTTP automatic. Keep multiple media origins on different failure domains; using two Workers in the same Cloudflare account is not independent media redundancy.
OFFGRID is a separate local Wi-Fi/mesh delivery layer. It can keep local communication when public internet fails but cannot magically deliver video nationwide without a connected physical mesh/backhaul and power.

Sources:
https://mediamtx.org/docs/kickoff/introduction
https://mediamtx.org/docs/publish/webrtc
https://novage.github.io/p2p-media-loader/docs/latest/index.html
https://developers.cloudflare.com/fundamentals/reference/policies-compliances/delivering-videos-with-cloudflare/
