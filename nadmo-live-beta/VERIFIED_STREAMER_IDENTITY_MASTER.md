# NADMO LIVE — VERIFIED STREAMER / ONE REAL PERSON, ONE CREATOR ACCOUNT
Product authority: user direction on 2026-10-09. Status: PRODUCT CONTRACT / NOT IMPLEMENTED.
Owner policy: Streamer freedom + demonstrable responsibility without public doxxing.

## Principle
1. Every streamer who can broadcast publicly must be a verified, real, adult person; one real person may control only ONE primary creator account. A user may have multiple brands, business pages, shows or channels attached to that single account, but not multiple fake/duplicated creator identities.
2. Viewers may watch PUBLIC broadcasts without uploading government IDs. Viewer comments and money transfers require appropriate account/abuse/payment controls as the features launch.
3. Stage names and display handles are allowed publicly. Verified legal identity is confidential, NEVER displayed on stream, posts, profile URLs, public moderator lists, or visible to ordinary viewers.
4. Verified means the identity was checked, NOT that a person is innocent of wrongdoing or that fraud is impossible. Stolen documents, impersonation and compromised accounts remain real risks.
5. Be viewpoint-neutral: verification does not give NADMO permission to suppress lawful disagreement, political criticism, sensitive speech or independent media. Never advertise anonymity from the operator or law enforcement.

## Future creator registration flow
1. Create/login to a recoverable account, confirm adult 18+ policy.
2. Before GO LIVE privileges, show clear notice of the narrow purpose of KYC, what is collected and by whom, lawful basis, retention, deletion/rights, vendor, support and appeal.
3. Start a secure identity verification session with a qualified IDV/KYC provider. Supported documents subject to provider rules: KTP for Indonesian residents, passport for supported domestic/international creators, SIM only if accepted by provider as sufficient identification. Do NOT claim Indonesian SIM is automatically sufficient. No KTP/SIM/passport image in NADMO WebView/localStorage/chat.
4. Provider validates document validity and links it to a living user, using anti-spoofing/liveness only if necessary, proportionate and supported by privacy/legal review. Do not store face templates or raw biometric data on NADMO platforms.
5. Provider sends signed server-to-server status, verified adult outcome and stable deduplication reference. NADMO holds minimal user-opaque creator ID, provider opaque reference, verification version, timestamp, status, revocation, verification audit trail.
6. Deduplicate IDs with a **secret keyed fingerprint** (e.g., HMAC stable provider identifier, server key held in secrets manager), NOT unkeyed SHA256 of NIK, ID photos, birthdate or unsalted identity. If the provider cannot reliably match a person who used distinct document types, block the claim of perfect unique-person checks; add manual identity review.
7. Only if VERIFIED + age >=18 + not suspended and account ownership valid, assign creator permission and allow room creation. Suspend creator privileges on expiry/revocation and handle errors/appeals. A duplicate applicant should be offered safe recovery of their original account and manual review, not an arbitrary permanent ban.

## Authorization boundary
- Implement server-side checks on every CREATE / RESUME host action, not merely disabled GO LIVE button in the browser. All host privileges (create, recover, private pricing, future tips/payouts) must be tied to an authenticated user/session, not to self-supplied WebSocket flags. Room ownership bound to account ID, never client nickname.
- Public viewers can access open broadcasts without sending ID documents.
- Sensitive admin actions require RBAC, MFA, audit logs and minimum necessary purpose.

## Incident response and cooperation
- Report/scam controls available for users, including evidence references and appeal.
- Preserve specifically relevant audit records under a formal legal hold where justified, with deletion after defined lawful retention periods. Examples of records subject to appropriate privacy rules: account ID, room IDs and UTC times, moderation actions, security/session events, payment provider transaction references and verified identity reference. IP/device/network records can support a properly scoped investigation but are not conclusive proof of a person's location/identity.
- On a substantiated incident, freeze suspicious creator permissions or payouts proportionately, triage evidence and escalate.
- Disclose identity/evidence only for valid, documented, appropriately reviewed legal process under applicable law. Require written requests/appropriate authority and purpose; minimize disclosure, keep approval trail and access log, preserve integrity/chain of custody; don't hand personal data to self-declared police or personal acquaintances.
- No promise of tracking a person's location in real time, no unauthorized surveillance, no blanket retention forever, no disclosure of legal name to viewers or the reported party.

## Privacy and legal gates (Indonesia / international)
- UU 27/2022 Pelindungan Data Pribadi: lawful and transparent basis, purpose limitation, security, finite retention, individual rights. Biometric data is SPECIFIC personal data; high-risk processing may require privacy impact assessment (Pasal 34). Get qualified counsel, privacy/data-security assessment and vendor contractual diligence BEFORE enabling.
- Clearly list a privacy controller contact, vendor/subprocessor role, hosting locations, data transfers and incident procedure. Consider PSE and payment sector compliance as applicable. Don't collect any ID until this is resolved.
- For providers processing documents outside Indonesia, validate cross-border personal data arrangements and specific lawful requirements.
- Prefer service provider's secure hosted flow with minimal signed webhook; never store raw documents in GitHub, GitHub secrets, Worker code, analytics, browser/Android device, or plain DO storage.
- Use appropriate encryption, limited retention, vendor deletion/deprovision process, access monitoring, periodic security review. Allow a manual support route for legitimate verification failures.

## Release acceptance criteria
- 2 separate humans, 2 separately verified accounts -> 2 creator privileges, each may operate their own brands.
- Same person tries a second creator account -> rejected/flagged and offered account recovery, including attempted switching between KTP / passport / SIM if provider supports reliable cross-document matching.
- Valid user posts and views using a public stage name; legal identity not exposed in UI/API/logs.
- Any unverified, underage, expired, suspended or impersonating user cannot create/restore rooms through API/WebSocket (verified SERVER side).
- Malformed/fake ID, replayed webhook, unauthorized status edits, spoofed "verified" client payloads, stolen creator tokens, CSRF or missing authorization -> rejected and logged safely.
- Legitimate appeals, identity mismatches, device loss and private-to-business channel relationships handled.
- Authorized law-enforcement request produces narrow audited disclosure with immutable evidence hash / timestamps; invalid informal requests receive no data.
- Privacy impact assessment, retention policy, breach-response plan, vendor contract, tested Android and PC onboarding, compliance sign-off completed BEFORE PUBLIC LAUNCH.

## Implementation and current beta
CURRENT 2026-10-09: NADMO LIVE has no account identity, secure KYC provider, persistent creator ownership, moderation operator or payment KYC. Existing beta WebSocket CREATE runs anonymous. This is a PRIVATE TEST ONLY. DO NOT announce identity checks active, request users upload IDs to a WhatsApp/chat, or open public creator onboarding.
Recommended sequence: auth and sessions -> secure provider contract + risk assessment -> IDV hosted link/token/webhook -> dedup + manual appeal -> guarded RoomHub create/resume -> audit/abuse response -> physical QA -> public pilot.

Canonical legal background: https://jdih.komdigi.go.id/produk_hukum/view/id/832/t/crc32/
