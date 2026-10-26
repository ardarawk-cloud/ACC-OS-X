# NADMO LIVE — Unified Live & Voluntary PK Candidate
Date: 2026-10-12
Status: DEVELOPMENT CANDIDATE; NOT RELEASED / NOT FIELD-TESTED.

## Single update target
Preserve current camera, talk/audio, Android GAME overlay/privacy, 9 guest camera/mic stage, per-guest recipient selector, free public chat, live duration with 1-hour break reminders, and listener-size RADIO interface. No new APK or signature rotation until integrated hardware QC.

## Working feature added in this branch
- Voluntary friendly PK challenge within ONE active live room, host versus an already-consenting on-stage guest (1v1) or host+guest versus two guests (2v2).
- Host sends PK invitations through settings; all invited guests must opt in. 45-second consent timeout, 3/5/10-minute battle, deterministic server-authoritative clock, server-authoritative free supporter points with signed-in account rate cap, expiry/end result, no automatic end of live.
- PK controls remain under host Settings, no button stack over video. The viewer can send FREE SUPPORT; values are not paid gifts and do not imply real balances.
- Guest media still uses the existing P2P architecture and 4-viewer beta limit, not a claim to production-capacity SFU.

## Not implemented/verified in this branch
- Matching PK against a host in a SECOND live room, global random matchmaking across rooms, both hosts' media transport and moderation across simultaneous rooms: requires dedicated cross-room signaling and a media layer / SFU readiness. Do not fake host-versus-host media.
- Payment gateway, individual guest real-money ledgers/withdrawals, payment-driven battle scores, gift ranking: existing tip selector is UI only. Payment and paid scores stay disabled until licensed payment, webhook receipts and tamper-safe settlement exist.
- AzuraCast/Liquidsoap 24/7 backend and licensed songs: RADIO client already merged but server uptime is not verified; no public claim of 24/7 ON AIR.
- Production Android GAME fix in ACC-Builder-Apk PR #56 and tests on two physical devices are an independent prerequisite.

## Acceptance before public release
Run existing browser media, guest-stage, radio, duration, presence, portrait, GAME privacy and new PK tests. Verify 320/390/430 mobile viewport, permission denials, disconnect/reconnect, no phantom payment, no camera/mic leakage, guest consent/withdrawal, room ends during PK, scoreboard doesn't block video/chat. Build sign with existing pinned owner certificate and install OVER the existing package; no uninstall or new package ID.
