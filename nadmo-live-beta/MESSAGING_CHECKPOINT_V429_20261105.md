# NADMO LIVE — PESAN v429 Production Checkpoint (2026-11-05 WITA)

**Owner:** Arda. **Production:** `https://live.nadmo.id/app/?v=429`

## Confirmed production
- Cloudflare Worker: `nadmo-live-beta-20261009`
- Version **429** ID `5e8fed8a-cf60-426f-8776-fb64f72afcd6`, 100% deployed.
- Previous rollback version **427** ID `68102ac7-8af8-4e4a-8a5e-4ea75daaea43`.
- Existing 12 bindings preserved including ASSETS, ROOM_HUB and SOCIAL_MEDIA; DANA_ENV remains sandbox.
- Production app HTML verified: message search, conversation menu, clear-chat, delete/everyone menu, existing Saweria link.
- CI Node 22: **18/18** messaging authorization/unit tests PASS (GitHub Actions run 41897999888).
- Real production QA: **8/8** e2e checks PASS (GitHub Actions run **41905805057**; job 126840006181): send & unread, delete for self, edit, reject unauthorized edit, recall everyone, reply quote, pin+mute user-specific, clear own thread. Two disposable test accounts each deleted successfully (HTTP 200).
- Source branch: `feat/nadmo-live-messaging-v1-20261105`; main modifications in `account.mjs`, `public/app/index.html`, tests and workflow.
- Production release **is a targeted Cloudflare patch over existing Worker 427**, not a build of the whole GitHub branch, to preserve direct production patches to DANA/Saweria and profile UI.
- The three production click handlers for opening DM from name/avatar were preserved.
- Important: Full production source and static asset synchronization to GitHub remains required BEFORE replacing or redeploying whole Worker. Do not merge unreviewed branch directly into current production.

## Messaging features delivered
- Delete for me (per-user visibility)
- Delete for everyone (sender only, within 24h; tombstone)
- Edit own message (within 15 minutes)
- Clear thread for oneself without deleting other participant's history
- Reply quote; copy message text
- Pin and mute per account
- Inbox search by name, handle, last message

## Still not part of v429
- True end-to-end encryption (E2EE); **do not claim it exists**
- Media/file/audio messages, voice/video calls, groups/channels, reactions, disappearing chats, multi-device encrypted backup
- Genuine Android signed APK rebuild; browser/PWA at live.nadmo.id/app/ confirmed, native APK not recertified
- Stress/load test and full human-device UX signoff

## Rollback safety
Re-deploy version 427 if critical regression; this only restores code, **not Durable Object user/message state**. Avoid reverting stored DM state. DANA callbacks, QRIS and production keys unchanged.
