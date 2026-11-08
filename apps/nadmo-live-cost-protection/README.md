# NADMO LIVE — COST PROTECTION & AUTO-SCALING v1.0 (STAGING)

**Owner:** PT Nadmo Studio Indonesia. **Status:** staging only; production untouched. **No media relay, SFU, Stream, paid upgrades, tip commissions, or cloud spend automation.**

## Baseline verified 9 Nov 2026
- Production Worker: nadmo-live-beta-20261009; isolated RoomHub SQLite Durable Object, 12 bindings, durable rollback v470 version 664db15e-32b9-424a-9b83-3a901a549003. App uses WebRTC P2P mesh with STUN; 20 rooms, 4 viewers/room, 9 stage guest seats, 120 WebSockets per DO. No production TURN keys (0 in Cloudflare Realtime). Cloudflare Stream query returned 403; prior account verification says Stream not enabled.
- xl ive-stage is a separate existing staging Worker with independent XLIVE_ROOMS Durable Object and 2 KV namespaces: **do not edit it**.
- DANA_ENV=sandbox; subscription Free/Pro/Plus prices 0/19900/99900 per 30 days in source. Source has no payment-provider settlement or Cloudflare billing read entitlement in this staging app.
- Cloudflare Billing Usage and Spend Policies API returned 403. D1 creation hit the account limit of 10, so isolated SQLite Durable Object is used instead. Do not delete other D1 databases.

## Staging architecture
- GitHub source: apps/nadmo-live-cost-protection/worker.mjs
- Isolated Worker: nadmo-live-cost-stage
- Isolated SQLite Durable Object: CostLedger (COST_LEDGER binding), unique instance nadmo-live-cost-stage-v1
- Secrets: ADMIN_TOKEN and INGEST_TOKEN (Cloudflare secrets, never commit them)
- Admin dashboard: GET / (HTML lock screen, data requests require bearer token)
- Health: GET /health (read-only, shows isolation controls)
- Admin: GET /api/dashboard?period=day|week|month (bearer ADMIN_TOKEN)
- Telemetry: POST /api/ingest (bearer INGEST_TOKEN) JSON {items:[records]} max 50, idempotent record IDs.
- Admin history: POST /api/alert (bearer ADMIN_TOKEN), not a real external notification sender.
- STAGING ONLY. Ingested records are synthetic; no connected live host, payment settlements, or provider billing account.

## Telemetry contract (design for future guarded integration)
Each record must include unique id and timestamp in milliseconds (ts, within 40 days and no more than 5 minutes in future). Supported kinds:
- room_sample: roomId, viewerCount, seconds (0–60), bitrateKbps, relayBytes (reported and not billed).
- subscription_snapshot: proCount, plusCount representing authoritative active paid hosts. Source must later be verified against authenticated database.
- settlement: amountIdr with source "verified_settlement" only, and the server must verify provider reference/amount independently before ingestion. **Do not accept browser/client claims as payments.**
- provider_cost: amountIdr with source "provider_invoice", only after actual provider invoice and full coverage.
- network_fault: audit observation.

Records are partitioned logically by stage instance. This stage does not ingest production records and never changes subscription status. Actual provider billing endpoints were inaccessible; dashboard explicitly shows total actual cost, budget ratio, margin, and projected end-of-month as unknown. Synthetic MRR is *not* collected revenue. Rates for TURN/SFU are **scenario planning only**, not billing.

## Budget policy
- Budget = 20% of **confirmed collected subscription receipts**, not nominal MRR.
- Thresholds: Normal <60%, Warning 60–79%, Critical 80–99%, Emergency >=100%.
- Unknown/stale billing = UNKNOWN, fail-closed for **new paid scaling**, not a forced disconnection.
- No changes to active WebRTC sessions, bitrate profiles, host plan features, or infrastructure limits without owner authorization.
- Stage is read-only advisory. The engine never calls paid cloud provisioning APIs.

## Testing
Run: node apps/nadmo-live-cost-protection/qa/cost-guard.test.mjs
GitHub Actions: .github/workflows/nadmo-live-cost-guard-staging.yml
Scenarios: 50/100/500/1000/5000/10000 accounts; 1/2/4 average concurrent viewers per host; 2h/day, 30d, 1000kbps; Warning/Critical/Emergency; missing billing; paid relay holds; reconnect/quality changes are scenarios only (not real-media E2E).
Actual end-to-end stage SQLite read/write and true mobile streaming have not been validated until authorized runtime request evidence is recorded.

## Business & financial caveats
Current P2P sends video host→viewer, not Cloudflare. Host upload = viewerCount * target bitrate plus overhead. At 1 Mbps and 4 viewers, around 4 Mbps+ upload per host. The beta code allows at most 4 viewer connections per room; 20 rooms theoretically 80 viewers simultaneously, subject to mobile uplink and TURN reliability; not a proven safe performance rating.
Cloudflare Realtime TURN/SFU public reference (Sep 2026): $0.05 per GB egress and 1,000 GB pooled free tier account-wide. **Simulation defaults to 0 guaranteed free GB**, fx Rp16,000/USD illustration; not current FX and not official bill. Cloudflare Stream costs extra and is not enabled by this project.
At 50 Pro/Plus 50:50 paying hosts, nominal MRR Rp2,995,000 and illustrative budget Rp599,000; at 1,000 hosts nominal MRR Rp59,900,000 and illustrative budget Rp11,980,000. For 4 viewers average, 2h/day, 1000 kbps: 5,400 GB and 108,000 GB video egress respectively, *only if relay carries all streams*. This is not P2P Cloudflare bandwidth. Existing Workers/DO, moderation, gateway, taxes, operations and support must be included separately once actual billing available.

## Requirements before production
1. Admin authorizes integration design, access policy, Cloudflare billing permissions, costs and alert delivery channel.
2. Add a nonblocking, sampled telemetry adapter to RoomHub in the **current production source**, not a stale branch; instrument room start/stop, viewer joins/leaves, host live-time and WebRTC stats including relay candidate-pair usage where available.
3. Verify settlement provider server-to-server; invoice reconciliation and MRR from actual paid active entitlements.
4. Test 50 and 100 active hosts and simulate 1000 on staging **without changing existing 20-room beta hard cap in production**. Test network outages, media recovery, billing outage, budget spike, owner-approval gates, database errors.
5. Confirm cost projections and no downtime; prepare rollback and request explicit owner approval for production deployment.
