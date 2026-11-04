# NADMO LIVE — PESAN / Messenger Benchmark & Engineering Handoff
**Tanggal:** 5 November 2026 (WITA)  
**Owner:** Arda / PT Nadmo Studio Indonesia  
**Repository:** ardarawk-cloud/ACC-OS-X  
**Branch:** feat/nadmo-live-messaging-v1-20261105  
**Mode:** Preserve production features, iterate safely.

## 1. Audit repository (source verified)
Already present before this branch:
- NADMO account-based DMs and mutual chat inbox using RoomHub Durable Object storage.
- Private messages with server-side sender identity, basic read counters, request-to-chat, privacy modes (everyone/following/requests), account blocking, daily rate limits and chat refresh.
- Web/PWA UI already supports Android/mobile and desktop without a replacement app.
- Not yet built: message deletion/edit/recall, rich threads, multiple recipient groups, attachments within private DMs, E2EE key infrastructure.

## 2. App research (official docs)
| Product | Proven useful pattern | NADMO interpretation |
| --- | --- | --- |
| WhatsApp | Delete for me/everyone, edit sent messages within 15m, disappearing messages | Distinct delete scopes and limited edit, follow-up timed retention |
| Signal | Best-effort delete for everyone sent <24h, disappearing messages and privacy controls | 24-hour recall, do not promise screenshots/notifications can be deleted |
| Telegram | Two-sided delete/clear and saved cloud chat experiences | Independent chat history deletion per account, quick access and pinned chats |
| LINE | Distinct Unsend versus Delete, reply/reactions | Explicit delete scope and quoted replies |
| Discord | Pinned messages, categorized favorites and persistent discussions | Pinned DM threads, search/favorites in later phase |
| Viber | Hide chats, edit/delete, media/link gallery, disappearing timers | Muted chat, follow-up media controls/retention |
| Messenger | Edit, reactions, group communications and E2EE by design | Plan reactions and group DM after security architecture review |
| Google Messages | Edited-label and 15-minute edit window for supported messages | Display 'diedit' state for allowed edits |

Official primary references:
- https://faq.whatsapp.com/1370476507114859/
- https://faq.whatsapp.com/6614640168569481/
- https://support.signal.org/hc/en-us/articles/360050426432-Delete-for-everyone
- https://support.signal.org/hc/en-us/articles/360007320771-Set-and-manage-disappearing-messages
- https://telegram.org/faq
- https://help.line.me/line/?contentId=20007159
- https://support.discord.com/hc/en-us/articles/221421867-Pin-Messages-FAQ
- https://help.viber.com/hc/en-us/articles/9423180947869-Chat-knowledge-base
- https://about.fb.com/news/2023/12/default-end-to-end-encryption-on-messenger/
- https://support.google.com/messages/answer/14929292

## 3. Implemented in this source branch
- Delete message for **me** using account-scoped hiddenFor; peer's message is preserved.
- Recall message **for everyone** with sender-only server authorization, 24-hour limit and tombstone (message text no longer exposed).
- Edit sender's message within 15 minutes; shows edited indicator.
- Clear chat locally for one account using a cutoff; does not erase other participant's data.
- Pin or mute DM thread as per-account settings and persistent storage.
- Reply-to ID and sanitized 120-character bounded quoted message; copy text action.
- Inbox search on recent chat preview, name and username.
- Message menu optimized for Android (button and long-press contextmenu) and desktop.
- Existing DM request, privacy, blocking and unread logic retained and regression tested.
- Backend protects message ownership; only valid sessions can edit/recall.
- Text is rendered with textContent to avoid HTML injection.

## 4. Known limits / next prioritized phases
1. Production source reconciliation: Cloudflare v427 contains direct patches not reflected in this branch, including existing Saweria and DANA integration. DO NOT deploy entire GitHub branch to production.
2. A staging Worker **version 428 candidate** was uploaded via Cloudflare (ID 0042cfd0-4aa2-41d7-9127-b9e662ab7fa3); it is **NOT deployed**. Its source-exact HTML patch does NOT match the current production asset in at least one section (production already had navigation fixes). **Do not deploy this candidate**; rebuild a DOM-safe incremental patch after reconciliation.
3. Add reactions, forwarding, message stars, archive/folders, full-text search, selection/mass deletion, group DMs, media/file uploads, voice notes, notifications, typing indicators, voice/video calls, and timed disappearance in later gated releases.
4. E2EE requires audited cryptographic protocol, multi-device key management, recovery/rekey and abuse reporting model. **Never claim encrypted end-to-end messaging based solely on HTTPS, Cloudflare storage or this DM release.**
5. Message deletion is best effort with respect to recipient screenshots and outside copies; server cannot retract screenshots.
6. Android signed APK update and manual HP/PC end-to-end QA remain to be carried out before full acceptance.
7. For user privacy, do not automatically expose message content in LIVE overlay or public chats.
8. Future design must respect existing NADMO LIVE Cyberdeck/theme designs and priority QRIS/Viewer PASS.

## 5. Tests / Safety
- Node 22 GitHub Actions: `nadmo-live-messaging-qa.yml`, 18 server authorization/regression cases, checks `account.mjs` and frontend script parse.
- Tests use synthetic accounts and simulated Durable Object storage. No user messaging data or payments were touched.
- Production Cloudflare Worker remains v427 (unless explicitly verified changed in a later check).
- Source drift prevents immediate safe deploy until deployed Worker compiled code and assets are reconciled.
