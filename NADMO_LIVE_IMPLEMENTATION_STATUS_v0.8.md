# NADMO LIVE — Implementation status v0.8 (9 October 2026)

Authority: Owner's **MASTER PROJECT HANDOFF v0.8**, Product Charter v0.6. **PRIVATE BETA ONLY**.

## Verified delivered

### Cloudflare backend
- Repo: `ardarawk-cloud/ACC-OS-X`; branch: `feat/nadmo-live-beta-worker-20261009`.
- Beta URL: https://nadmo-live-beta-20261009.ardarawk.workers.dev/app/
- Worker DO `RoomHub`, WebSocket signaling, WebRTC P2P STUN-only, up to **4 concurrent viewers per room**.
- Fixed undefined-variable throw in DO heartbeat/alarm and safeguarded WebSocket create/resume.
- Stored user accounts use HttpOnly cookie and scrypt salted password hashing; login/session verification is checked from server storage on room creation and recovery.
- Recovery token is necessary but not sufficient to steal an authenticated creator's room: the new account session must match the room's owner. Logout or revoked session invalidates host privileges.
- **Isolated private beta only:** `BETA_TEST_HOSTS_ENABLED=true`; anonymous room hosts remain enabled for regression/media tests, while other environments fail closed without proper verified-creator permission. This is **NOT** public account verification. Production must remove this beta override and use a verified identity provider before opening public GO LIVE.
- Business profile links and clickable draft URLs verified on two browser contexts. Draft posts remain unpublished.

### Automation QA
- Last complete Cloudflare deployment + downstream E2E **SUCCESS**: https://github.com/ardarawk-cloud/ACC-OS-X/actions/runs/37929063785
- Run tests include:
  - deploy and health endpoint success;
  - beta account room creation, anonymous viewer, cross-account hijack prevention, legitimate owner recovery, revoked-session lockout;
  - Chrome two-context registration, HttpOnly session, profile link sync, clickable draft, unsafe URL rejection, account deletion/session invalidation.
- Standalone account E2E is manual-dispatch-only to avoid racing a newer deploy. Cloudflare deploy workflow now tests after confirmed deployment success.

### Android package
- Repo: `ardarawk-cloud/ACC-Builder-Apk`; branch: `feat/nadmo-live-android-beta-20261009`.
- Android package ID: `id.nadmo.live`; `versionCode=8`; `versionName=0.8.0-beta`.
- Adaptive launcher icon source: lime `N/` vector on dark background. Android launcher icon requires installing an updated APK; it cannot change by updating hosted web resources.
- Permanently signed private beta release **SUCCESS**: https://github.com/ardarawk-cloud/ACC-Builder-Apk/actions/runs/37928395667
- Verified installed cert SHA-256: `19896c08fbaf4437f6ea2514312168508e0e2c4cb6b65c0f09647887106c0787`. **Never rotate/recreate** signing material for subsequent versions.
- Direct GitHub signed APK artifact: https://github.com/ardarawk-cloud/ACC-Builder-Apk/actions/runs/37928395667/artifacts/11614669694
- Debug build also succeeded, but debug APK is not an upgrade substitute for the signed release.

## Product principles remain locked
Dari pengguna, oleh pengguna, untuk pengguna. No compulsory PK battles, tipping leaderboard or gift competition; voluntary rupiah tips with transparent small fee when payment gateway licensed; context-aware moderation allowing lawful adult speech; links in public profiles/posts; one verified human primary creator account, multiple brands; stage name public, ID private; viewers may watch publicly without ID-upload.

## Not built or not released
- Qualified hosted KYC identity verification, provider webhook, unique-human deduplication, manual appeals, and protected operator moderation/RBAC.
- Licensed payments, compliant creator tips/payouts, paid private access, reconciliation, and refunds.
- TURN/SFU and adaptive scaling; P2P is STUN-only and cannot guarantee mobile carrier network interconnection.
- Native long-running broadcast foreground service, screen capture/gameplay audio, OBS/RTMP ingestion.
- Two real physical Android devices on separate cellular networks have NOT been independently QC-verified in this patch.
- Public commercially available APK listing/website distribution, public creator onboarding, and unrestricted launch are NOT approved.

## Next engineering gate
1. Qualified IDV vendor + privacy/legal assessment then server-enforced creator gating with beta anonymous override disabled in the future public environment.
2. TURN/SFU and actual Android cross-carrier A/V, background/reconnect and crash/permission QC.
3. Integrated report/mute/block/moderation audit and appeals.
4. Licensed payment gateway with auditable ledger and low transparent fees; only then paid private show/tips.
5. Controlled public pilot after safety/security/performance acceptance; no direct production/main merge or unrelated app changes without review.


## 10 October development continuation — room safety beta (implemented 9 Oct 2026)

- Server-enforced WebSocket `report`, `moderate: mute/unmute/kick/block` commands delivered on the isolated Cloudflare beta Durable Object, with current host account session revalidation on moderator actions.
- Anonymous or signed-in viewers can report a room without government ID. The report receives a unique reference, limited to 1 per websocket session per 60 seconds.
- Report record includes an opaque room ID, optional opaque host account ID, restricted reason code, short explanation, timestamp, and PENDING_OPERATOR_REVIEW. Reports are private Durable Object records, **not publicly queryable**. Automatic 14-day expiry via DO alarms and capped storage of 100 reports are implemented; no staff review UI or human 24/7 moderation claim.
- Host can mute/unmute chat of a current viewer and kick anonymous viewers. Only logged-in viewers have a durable account-level room block; anonymous users can rejoin under a new connection. This must not be advertised as total anti-abuse protection.
- Mobile/desktop live chat exposes a compact report form for viewers and moderation panel for hosts; actual WebSocket actions, not mock buttons.
- Passed real Cloudflare backend E2E and browser mobile tests: https://github.com/ardarawk-cloud/ACC-OS-X/actions/runs/37930508394
- Retention scheduling tightened in commit `54c56b981c9217176a2cf4637096203f3af76ae4` (subsequent deploy/retest should be checked before treating the retention change as deployed).
- **Still blocked for public launch:** qualified ID verification vendor and KYC operator, staffed moderation/report triage dashboard, stronger anonymous abuse prevention, TURN/SFU with cross-carrier phones, payment provider and money settlement.
