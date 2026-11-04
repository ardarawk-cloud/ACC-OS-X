# NADMO LIVE — MOSHI MESSENGER V2
Checkpoint: 5 November 2026 (WITA)
Owner / final authority: Arda
Source: `ardarawk-cloud/ACC-OS-X`
Branch: `feat/nadmo-live-moshi-messages-v2-20261105`
Status: **STAGING ONLY — DO NOT DEPLOY TO EXISTING PRODUCTION v427 BEFORE SOURCE RECONCILIATION**

## Product direction

MOSHI is the private-message layer inside NADMO LIVE. Do not replace or imitate another company's app, UI identity, or proprietary protocol. Select useful patterns from official references:

| Application | Pattern | MOSHI plan |
| --- | --- | --- |
| WhatsApp | Delete for me / everyone, edit sent message within 15 min, reply, clear conversations | V2 implemented |
| Telegram | Pin and archive conversations, unified search, cross-device sync | V2 implemented for current stored messages |
| Signal | Per-person privacy, blocking, requests, future disappearing messages | Existing request/block/privacy preserved; disappearing deferred pending retention design |
| Discord | Find messages, star/pin important items, contextual menus | V2 in-chat search, starred messages and chat pin; advanced indexed search deferred |
| Messenger | Simple mobile inbox, contact/profile entry, quick actions | V2 implemented with accessible responsive actions |

Official reference links:
- https://faq.whatsapp.com/1370476507114859/
- https://faq.whatsapp.com/6614640168569481/
- https://telegram.org/faq
- https://support.signal.org/hc/en-us/articles/360007320491-Delete-messages-alerts-or-chats
- https://support.signal.org/hc/en-us/articles/360007320771-Set-and-manage-disappearing-messages
- https://support.discord.com/hc/en-us/articles/115000468588-How-to-Use-Search-on-Discord

## V2 implemented and validated

1. **DELETE FOR ME** hides an individual message only for the authenticated user, persists in Durable Object `dm-view:user:peer`; recipient retains it.
2. **DELETE FOR EVERYONE** can only be requested by the sender; server replaces message text with a tombstone for both, never accepts sender identity from the client.
3. **CLEAR CHAT (MY ACCOUNT)** hides all existing messages for one account, preserving recipient's history. A new later message can bring the conversation back.
4. **EDIT** for own message only within 15 minutes from server timestamp. Updates are marked, no client backdating.
5. **REPLY** to a visible message; if its original is deleted, the preview is replaced by "Pesan tidak tersedia".
6. **COPY TEXT**, **STAR** favorites, **SEARCH** within currently retained messages, **SEARCH INBOX** by name/preview.
7. **PIN / MUTE / ARCHIVE / MARK UNREAD**, individually per account. Inbox has filters All, Unread, Pinned and Archive.
8. **QUICK INBOX ACTIONS** to pin, mute, archive or clear chat from the list.
9. Existing privacy modes (all/following/requests), pending message requests, block/unblock, and unread counts remain intact.
10. Avoid XSS: incoming messages rendered as text nodes, no innerHTML from sender.

### Current constraints, no false claims

- Backend is **server-readable**, not end-to-end encrypted. Never describe as Signal-like E2EE until proper audited protocol and key management are deployed.
- Current message thread storage retains the latest 100 messages; local search is limited to the data returned by the server. Do not promise unlimited historical search.
- Delete for everyone changes the live data record; copies previously captured by recipients, screenshots, backups and retention requirements are not guaranteed removable.
- Mute is persisted as a preference, not a guarantee of Android OS push suppression; push notifications are not part of this release.
- Message edit's deadline is 15 minutes; delete for all of **sender-authored** messages has no artificial 15 minute edit limit.
- Text-only DM flow. No new file upload, private image hosting, URL preview fetching, E2EE key handling or calls has been silently activated.
- No links to public on-platform payments or premium entitlements were altered.
- Existing production v427 contains direct Cloudflare patches and DANA/Saweria integrations not yet reconciled into GitHub branch. Deploying the branch to production would overwrite functioning features.

## Technical footprint

- `nadmo-live-beta/messages-v2.mjs` policy module
- `nadmo-live-beta/account.mjs` authenticated account-owned endpoints
- `nadmo-live-beta/public/app/index.html` touch-friendly UI under existing PESAN tab
- `nadmo-live-beta/qa/moshi-messages-v2.test.mjs`: 19 Node 22 cases
- `nadmo-live-beta/wrangler.moshi-staging.json`: **independent Worker and Durable Object, NO production route, NO R2, NO DANA credentials**
- `.github/workflows/nadmo-live-moshi-v2-qa.yml`: syntax and account integration tests
- `.github/workflows/nadmo-live-moshi-v2-staging.yml`: isolated staging build/test/deploy

Staging URL: https://nadmo-live-moshi-v2-staging.ardarawk.workers.dev/app/
Production remains: https://live.nadmo.id/app/ (v427).

## Actual test evidence

- Node CI: 19/19 cases PASS, including authorization, delete scope, edit window, message reply, privacy, pin/mute/archive, unread marker, star and old record compatibility.
- Browser-rendered live staging API: **19/19** scripted scenarios PASS on two newly created test users (actual Durable Object).
- Mobile viewport 390x844: inbox and conversation 390px document width, no horizontal overflow; message input/button/menu fit.
- Staging Worker has bindings only ASSETS, ROOM_HUB, BETA_TEST_HOSTS_ENABLED, NADMO_MOSHI_STAGING, VERIFY_CREATOR_REQUIRED.
- Payment production, Social Media R2, DANA secrets not bound to staging.
- Production Worker version remained unchanged through staging tests.
- Physical Android touch, actual APK WebView, and PC physical browser manual QA are still pending.

## Next release groups: unified value without unsafe shortcuts

### V2.1 — Messaging polish
- Reactions, advanced message selection, optional read receipts / presence with privacy consent
- Robust draft syncing, bookmarks, message search with indexed pagination
- Consent-aware reporting / anti-abuse moderation and notification controls
- Optional message expiration with verified backend lifecycle and documented retention semantics

### V2.2 — Media and accessibility
- Voice notes, image and document attachments through **private** endpoints, scanning, MIME verification, per-user access
- Media compression, captions, accessible transcripts (with consent), limited offline queue
- Browser/Android notification permissions, push retry, quiet hours, abuse throttles

### V3 — Collaboration
- Groups, channels, roles, pinned announcements, polls, moderated communities
- Account-level message export/backup with privacy policy and secure restore
- Search within authorized chat history with pagination and retention

### V4 — Calls and strong privacy
- 1:1 and group WebRTC calls using tested signaling, TURN, network handoffs, permissions, and NAT troubleshooting
- E2EE research/protocol selection, independent audit and recovery before making encryption claims
- End-to-end QA on Android APK, WebView and desktop plus load/latency tests

## Acceptance gates before production

- Merge carefully with existing production code **including** directly patched v427 payment callbacks, Saweria integration and cyberpunk themes.
- No data migration or billing changes without controlled authorization.
- Compare live assets, manifest and bindings; preserve 12 production bindings.
- Real device tests Android portrait/landscape and PC, including long-press/click actions and blocked accounts.
- Rollback code safely to known-good Cloudflare Worker v427 without undoing user message data.
