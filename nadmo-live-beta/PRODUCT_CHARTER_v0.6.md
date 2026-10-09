# NADMO LIVE — INDEPENDENT BROADCAST NETWORK
## PRODUCT CHARTER v0.6 · 9 October 2026

### Purpose
NADMO LIVE is an independent, adult-oriented social broadcasting network for creators, DJs, gamers, esports communities, talk shows, entertainment, community information and future public-interest alerts. The project optimizes for creator agency, low operating cost, fair revenue shares, audience choice, useful public information, and reliable access — not coercive engagement or maximal commission. "Underground" means independent editorial identity, not a promise of legal immunity or unmoderated harmful content.

### Independent civic speech — not a party or anti-government platform
- Mission: serve people, not power. NADMO LIVE is independent of parties, governments, corporate labels and organized harassment campaigns. Independence is not a declaration of hostility to any government or lawful institution.
- People may criticize governments, officials, political parties, corporations, media, powerful communities and NADMO itself; support viewpoints across the spectrum, subject to laws and rights of others.
- Do not equate a public-interest corruption discussion, peaceful organizing, whistleblowing about matters of public interest, or disagreement with wrongdoing solely because the subject is politically sensitive. Allow users to include evidence and make corrections.
- Distinguish criticism from targeted threats, intimidation, coordinated abuse, impersonation, doxing and allegations of fact presented deceptively. Provide proportionate controls, reasons and appeals.
- Never advertise absolute anonymity, untraceability, guaranteed resistance to surveillance or immunity from lawful processes. Protect users with data minimization, short retention wherever feasible, secure transmission, narrowly scoped access, vetted moderation and transparency reports; implement and independently test these controls before public claims.
- Add community safety tools: block/mute, anti-raid rate limits, optional pseudonyms, host moderators, report triage, appeals and safeguards for vulnerable participants.
- SIGNAL is for verified public-interest communication, not unverified claims or a one-sided political propaganda feed. Separate source submissions, editor review and published notices; maintain timestamps, evidence, corrections and provenance.
- Community communications should not become a mechanism for harassment, coordinated attacks, incitement, or retaliation. The same rules apply to all viewpoints.

### Gaming and esports — core community pillar
- Gaming is a first-class live category alongside Social, DJ & Music, Podcast and Nightlife. The first usable beta lets streamers label rooms as Gaming, viewers filter/search, join and chat.
- Creator future modes: mobile gameplay screen broadcast using explicit Android screen-capture consent, game + microphone audio where Android permissions allow, PC/OBS RTMP ingestion, webcam face-cam overlay, stream scenes, chat overlay, game/title tags, low-latency co-stream, and stream health feedback.
- Gaming viewers: game directory, esports events, squads / watch parties with legitimate stream rights, clips with creator controls, chat moderation and opt-in notifications.
- Revenue parity: transparent tips and ticketed creator experiences; gaming streamers receive the same fair revenue principles as musicians and civic/community creators.
- Do not claim device-screen capture, internal game audio, OBS ingestion or highlights work in v0.6 until real-device and rights testing proves them.
- Avoid unlicensed rebroadcast of esports matches, game music and third-party feeds; support rights management and disputes without blanket penalties.

### Social resilience architecture and boundaries
- No single CDN, DNS or streaming host should be a silent point of failure in the long term: plan alternate domain/service status, signed official notices and mirrored read-only emergency bulletins.
- Keep independent web access and APK distribution options, optional export of the user's own content/data, and portable communities.
- Never imply that an ordinary internet-only app works without network access. Cache verified non-sensitive text alerts as a separately tested offline feature; actual live broadcasting still needs a reachable communications network.
- Revisit threat modeling and independent security audits before sensitive civic reporting, whistleblower intake or public claims of secure anonymous communication.

### Research benchmarks (do not clone)
- Twitch mobile: live-first discovery, Following, clips, categories, activity and creator controls. https://blog.twitch.tv/en/2024/07/29/find-content-you-love-faster-with-the-new-twitch-mobile-app/
- Kick: Browse, Following, live channel page, streamer console, transparent 95/5 revenue treatment on eligible streams. https://help.kick.com/en/articles/7122686-understanding-kick-com-s-homepage and https://help.kick.com/en/articles/15159722-understanding-kick-s-revenue-split
- BIGO LIVE: video / audio / multi-guest / gifts / chat. https://www.bigo.tv/id/blog/bigo-live-wiki
- YouTube Live: live chat and viewer financial support. https://support.google.com/youtube/answer/7288782?hl=id
- Mixcloud Live: negotiate rights-holder licenses for music broadcasting rather than assuming subscribers have broadcast rights. https://help.mixcloud.com/hc/en-us/articles/360013505520-FAQ-Mixcloud-Live
- Owncast: reference for independent RTMP streaming / self hosting, not a scalable no-cost substitute for delivery bandwidth. https://owncast.online/docs/configuration/

### Primary navigation
1. LIVE: real-time feed and search, creator/category filters, join, favorite sessions.
2. FOLLOW: session bookmarks local to a device in beta. Authenticated creator follows pending.
3. GO LIVE: camera, mic, category, privacy, AFK / standby scene.
4. SIGNAL: future public-interest information and verifiable bulletins.
5. ME: age check, account/earnings roadmap, connectivity and privacy.

Gaming is a first-class category; TV and Radio live under discovery categories, and should only have fully functioning dedicated screens when an actual stream exists. Avoid "empty app" UI and decorative large buttons.

### Moderation principles
- Legal smoking, vaping, informal conversation, strong language, studio scenes, empty camera and AFK are NOT automatic causes of stream suspension.
- Allow a host to turn off camera and display a clear AFK scene while retaining permitted audio. Never silently infer misconduct from smoke or absence of a face.
- Safety-first exceptions still exist for child sexual exploitation, unlawful explicit sexual content, credible threats, serious targeted harassment, unlawful sales and infringement.
- Prefer clear rules, contextual review, warning first for non-serious cases, meaningful reason codes and appeal routes. Keep a path for urgent safety intervention.
- We cannot promise freedom from third-party payment processor, DNS, Android, hosting or law requirements.

### Music policy
- Users may stream music they own or have appropriate public streaming rights to, and use legally licensed radio / DJ catalogues.
- A personal Spotify Premium account does not confer public retransmission rights. Streaming from Spotify may conflict with service rules even if the user pays for it. https://support.spotify.com/id-en/article/spotify-public-commercial-use/
- Build proof-of-license and disputing copyrighted material; do not implement a broad opaque automatic music punishment.
- P0 AFK scene is camera-off canvas + existing mic audio only. Music file mix/upload, external DSP, native background service and OBS input are separate future features, not working today.

### Creator revenue
- Target transparent platform share: suggested 7% for tips and 10% for private tickets, subject to disclosed gateway fees, tax and actual operation costs. Not activated in beta.
- Use a licensed payment partner for rupiah transfers/splits/payouts. Never represent a placeholder as a paid ticket, wallet or completed transfer.
- Show payouts, fees and reversals unambiguously; avoid exploitative virtual currency exchange rates.
- Eligibility, age and abuse checks are required before public tipping / paid access.

### SIGNAL public-interest system
- Publicly verified alerts must contain timestamp, region, source link / provenance, verification status and correction history.
- User submissions (later) must be pending editorial review and NOT automatically appear as official warnings.
- Do not reveal private locations or identities of sensitive sources. Avoid panic amplification; retain corrections and audit trail.
- Future resilience plan: local caching of verified text alerts, alternate hosted read-only mirrors, domain failover, backup stream relays where legally permissible, exportable archives, and partnerships with local radio/other communications.
- Present limitations plainly: any internet-only APK fails when the device cannot access the internet. Offline cached bulletins may remain readable, but cannot transmit live without an alternative network. Multi-host resilience is a roadmap, not implemented.

### Current technical truth — Beta v0.6
- Cloudflare Workers + Durable Objects handle signalling rooms and chat.
- WebRTC P2P mesh with 4 viewer limit, STUN-only; not reliable at scale or behind all mobile NATs. TURN/SFU is a required upgrade.
- Web beta automatically uses Cloudflare backend, no user needs to input URLs.
- Room passwords are invitation gates, NOT robust paid/private commerce.
- Demo does not have account identity, verified age, persistent follows, credit balance, payment, moderation staff, immutable audit or multi-node disaster recovery.
- AFK canvas swap implemented in web beta; hardware Android test and microphone/background policy checks remain required.
- Do not share this beta publicly for unrestricted access until auth, moderation, abuse reporting and payment compliance are ready.

### Next release order
P0: two real-device stream tests, Gaming room filter/category and mobile bandwidth tests, reliable reconnect, TURN/SFU path, bandwidth budget alerts, metadata sync, optional mobile-friendly player.
P1: creator identity, game labels and webcam overlays, real FOLLOW, stream history, audience consent/age, appeals, policy moderation, replay opt-in, OBS interoperability.
P2: licensed payout processor, direct tips, private tickets, transparent statements, payout eligibility.
P3: screen-capture/OBS ingest after permissions and rights reviews, radio/TV programs, verified SIGNAL editorial console, offline read-only bulletins and communications redundancy.
P4: native Android audio/background service for authorized audio streaming and long-lived sessions.

No forced app reinstall for CSS / content changes. Use hosted web updates for presentation; ship a versioned, consistently signed Android app only for native capability or secure runtime changes.
