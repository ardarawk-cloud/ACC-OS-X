# NADMO LIVE — Profiles, Cross-Business Links and Clickable Posts
Date: 2026-10-09
Status: UX prototype implemented locally; PUBLIC IDENTITY / CROSS-DEVICE DATA NOT IMPLEMENTED.

## Product decision
NADMO LIVE does not lock users inside a closed social platform. Creator profiles may directly promote their own stores, brands, restaurants, service websites, event booking pages, social accounts, online portfolios, music distribution, personal sites, and even competing social platforms. Post captions may contain direct clickable URLs. Do not blanket-disable links just to retain platform traffic.

Example independent creator can list:
- Corporate/business website
- WhatsApp Business wa.me link
- Instagram, Facebook, TikTok, YouTube, Spotify artist, SoundCloud, Bandcamp etc.
- Multiple ventures/brands operated by the creator
- Booking/merchant pages and digital storefronts

## Profile model (next authenticated milestone)
- Unique account ID and stable @handle, display name, bio, avatar, optional cover
- Zero or more external links (beta cap 12); label, URL, order, optional category
- View any public profile, click link directly; never insert monetized redirect or forced NADMO landing page
- Follow individual creators, not room IDs; persistent across devices
- Accounts are the SAME for viewer and creator roles, not split

## Posts
- Rich enough to publish text and approved media later; plain URL in caption becomes a first-class clickable link.
- Posts may promote outside businesses; direct URLs should be allowed in both captions and optional CTA.
- Keep attribution, publishing date, editing, deletion, and optional audience controls.
- Later @handle tagging and #topic search must resolve actual users/topics before enabling; never treat arbitrary string as verified mention.
- Browser/Android external link should open destination; no mandatory copy-paste or in-app interstitial.
- Explicitly distinguish paid/sponsored content where required.

## Safety not arbitrary lock-in
- Only accept safe HTTP(S) schemes in public link backend with checks for dangerous/malformed URLs, credential-bearing URLs and deceptive redirects. Beta local drafts allow valid HTTPS URLs only, and do not whitelist a small set of large platforms.
- Do not allow javascript:, data:, file:, insecure app-URI handlers or executable HTML.
- Render user text via textContent and safe anchors; add rel=nofollow ugc noreferrer for user-supplied links.
- Clear reporting/appeal for scams, malware, doxxing, illegal goods and impersonation; don't prohibit legitimate businesses, criticism or competing-site links.
- User may remove or reorder own links and edit/delete posts after identity verification.

## Current implementation
- ME page contains working local-only profile editor, label/URL link list, creator name, @handle, bio.
- Posts can be saved as local drafts, with directly clickable HTTPS links in text, including punctuation handling, no unsafe HTML injection.
- localStorage keys: nadmo.beta.profile.draft.v1 and nadmo.beta.post.drafts.v1. Not an online social identity; cleared storage loses drafts; no sync across PC and phones.
- Host profile and post records are NOT currently indexed, public, or linked to live room. No account registration, follower persistence, media uploads, or official post publishing.
- UI explicitly labels content as LOCAL PREVIEW; do NOT mark PUBLIC / PUBLISHED without authenticated server storage and verification.

## Backend milestone checklist
1. Implement verified identity via email OTP / federated login or equivalent reputable auth, with account recovery and CSRF/session protections.
2. Durable account, profile and post storage, unique handles, ownership authorization, edited_at and created_at, indexes and moderation flags.
3. Public routes GET profile by username, GET posts by account, safe link render; authenticated owner-only PUT/POST/DELETE endpoints; limits and rate control.
4. Connect room host/viewer UI to authenticated actor ID and unique handle; make username tappable during chat and live.
5. Add profile link ordering, post editing/deletion and social follow, then cross-device sync QC.
6. Review links for malicious destinations without banning legitimate cross-platform promotion.
7. Test at least two distinct Android devices + PC, role access, unsafe URL rejection, post-click behavior and recovery.
