# NADMO LIVE fee configuration — 22 October 2026

Authority: `payment-policy.mjs`, policy version `2026-10-22.1`. Owner requested platform deductions and taxes; use existing charter rates: gift/saweran 7%, private tickets 10%. Platform commission applies to gifts/tickets, not again to top-up or withdrawal. Payments remain closed until provider integration is complete.

Viewer credit used for gifts is distinct from host earnings. Gameplay is not an income source. This change does not modify historical wallet records or authorize any payment.

## Provider cost and taxes

- Prior Coda contract record dated 13 October 2026: QRIS fee 2.65%, fixed fee Rp0, tax 11%. The cost preview calculates 11% on the gateway fee, not on the whole top-up. This reference still requires matching to the actual provider invoice/settlement before use with real funds. No gateway fee is deducted again from each gift.
- The party bearing top-up costs has not been established in retrieved records. It is explicitly pending; the provider settlement estimate is not a promise of credit delivered to viewers or net earnings delivered to hosts.
- NADMO service VAT: applicability and PT PKP status are not recorded. Retain the reference formula 12% × 11/12, conditional on applicability, without collecting it or treating an unknown amount as zero.
- Host withholding: recipient status, payment classification and applicable base are not yet verified. No universal flat PPh rate is configured. The API returns `null`, never a misleading tax-free amount.
- Payout provider costs remain unknown and are not invented. The existing disabled payment/withdrawal gates are unchanged.

Primary tax references consulted 22 October 2026:

- https://www.pajak.go.id/id/peraturan/perlakuan-pajak-pertambahan-nilai-atas-impor-barang-kena-pajak-penyerahan-barang-kena (PMK 131/2024, Article 3; Article 4 exclusions)
- https://pajak.go.id/id/peraturan/petunjuk-pelaksanaan-pemotongan-pajak-atas-penghasilan-sehubungan-dengan-pekerjaan-jasa-1 (PMK 168/2023, Articles 12 and 16; classification required before application)

## API and display

`GET /api/payments/policy` exposes the versioned server configuration. `GET /api/payments/quote?kind=gift|ticket|topup&amountIDR=100000` returns a non-binding preview, no wallet changes. Requests cannot supply fee or tax overrides. Amounts must be whole rupiah between 1,000 and 10,000,000. Percentage calculations use integer basis points and half-up rounding to rupiah; actual provider charges must be reconciled independently.

The creator wallet has a visible fee/tax calculator. The gift sheet reads the same backend policy, replacing the hardcoded client-only 7% estimate. Offline or failed requests clear any stale estimate.

At Rp100,000: gift platform fee Rp7,000, host subtotal before unresolved taxes/costs Rp93,000; ticket fee Rp10,000, subtotal Rp90,000. Coda cost preview: fee Rp2,650, tax Rp292, estimated provider settlement Rp97,058. These are separate stages, not combined deductions from a host balance.

Before money processing is enabled, complete the provider order/webhook/reconciliation integration, viewer-credit/host-income transfer ledger, tax classification and evidence, top-up fee allocation, and payout integration. Each eventual financial transaction must store its policy version and actual fee/tax amounts once, with idempotency and reversals. Never calculate old transactions using a new policy.

Rollback: restore the prior commit `eb65763ee6137b7fd2825318fe46e0d2dc280028` through the existing deployment workflow; no storage migration is required.
