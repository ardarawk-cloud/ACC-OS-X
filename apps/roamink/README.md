# ROAMINK — GitHub + Cloudflare Production

Migrated from AppDeploy app `roamink-33bzpu`, source snapshot `1790579237043`.

The original AppDeploy source snapshot is preserved under `appdeploy-source/`.

Production hostname:

`https://roamink.nadmo.id`

## Production architecture

- Frontend + application API: Cloudflare Worker `roamink`
- Public domain: `roamink.nadmo.id`
- iPaymu outbound relay: `https://relay.nadmo.id`
- Relay host: NADMO VPS
- Verified relay outbound IPv4: `151.243.222.93`
- Relay runtime: native Python systemd service behind Apache + TLS
- iPaymu API signing remains inside the ROAMINK Worker; the VPS relay only forwards allow-listed signed requests to iPaymu.
- iPaymu checkout is configured for Production/Live once production VA and API Key are present.

The payment relay exists because payment-provider IP allow-listing must see a stable backend outbound address rather than Cloudflare Worker egress.

## Merchant verification pages

The production website includes:
- Plans & pricing
- FAQ
- Terms & Conditions
- Refund Policy
- Privacy Policy
- Contact and legal entity information

Deployment QC fails if required merchant pages disappear or if public merchant pages expose preview/sandbox wording.

## Payment secrets

The Cloudflare deployment workflow expects production iPaymu credentials from GitHub Actions secrets:

- `ROAMINK_IPAYMU_API_KEY` (fallback: `IPAYMU_API_KEY`)
- `ROAMINK_IPAYMU_VA` (fallback: `IPAYMU_VA`)

The values are restored into Cloudflare Worker secrets as:
- `IPAYMU_API_KEY`
- `IPAYMU_VA`

No payment credential is committed to the repository.

## Payment readiness checks

- `GET /api/_healthcheck` — ROAMINK Worker health
- `GET /api/payment-relay-check` — Worker-to-VPS relay connectivity and egress check
- `GET /api/payment-credential-check` — iPaymu credential diagnosis through the VPS relay

The production deployment workflow verifies the public merchant site and payment relay on every deployment.

Credential sync trigger: production iPaymu secrets configured in GitHub Actions.
Digiflazz supplier credential sync trigger: configured.


## eSIM supplier

ROAMINK is wired to the same Digiflazz Buyer supply path used by BIDIGI, but keeps its own storefront, pricing, and payment flow.

Production supplier flow:

`Digiflazz eSIM → ROAMINK catalog cache → ROAMINK markup → iPaymu payment → Digiflazz fulfillment`

Supplier API traffic is relayed through `relay.nadmo.id` so Digiflazz sees the stable NADMO VPS outbound IPv4:

`151.243.222.93`

Required GitHub Actions secrets:

- `ROAMINK_DIGIFLAZZ_USERNAME` (fallback: `DIGIFLAZZ_USERNAME`)
- `ROAMINK_DIGIFLAZZ_API_KEY` (fallback: `DIGIFLAZZ_API_KEY`)

The deploy workflow restores those into Cloudflare Worker secrets as:

- `DIGIFLAZZ_USERNAME`
- `DIGIFLAZZ_API_KEY`

Catalog behavior:
- Calls Digiflazz Buyer `/v1/price-list` through the VPS relay.
- Requests prepaid products with brand `eSIM`.
- Only exposes products where both buyer and seller status are active and stock is available.
- Caches the catalog for 15 minutes to avoid excessive supplier price-list calls.
- Default ROAMINK retail pricing is supplier cost + 20%, with a minimum Rp5.000 markup, rounded up to Rp1.000.
- If supplier credentials are not configured, the existing static catalog remains as a safe fallback.
- If Digiflazz is configured but unavailable and no prior cache exists, checkout does not expose unavailable Digiflazz products.

Digiflazz Production IP must include `151.243.222.93`.


## Automatic eSIM fulfillment

ROAMINK is configured for automatic fulfillment after a verified iPaymu payment callback.

Flow:

`Customer → iPaymu Production → verified PAID callback → Digiflazz transaction → eSIM activation data → My eSIM`

Safety controls:
- Checkout is allowed only for a live Digiflazz product carrying a supplier SKU and supplier cost.
- Static fallback plans are display-only and cannot create payment sessions.
- Digiflazz purchase requests use a stable per-order `ref_id` for idempotent retries.
- `max_price` is pinned to the supplier cost captured at checkout, preventing an unexpected supplier price increase from silently consuming margin.
- Pending/transient supplier transactions are retried automatically by a Cloudflare cron every 5 minutes.
- The Digiflazz price list is cached for 15 minutes and rate-gated so the supplier endpoint is not queried more frequently than allowed.
- Successful supplier `sn` delivery data is stored with the order and exposed only through matching Order ID + checkout email.
- The customer can retrieve installation data from the public “My eSIM” flow without another external email provider.

A real Digiflazz purchase is never created before iPaymu payment is cryptographically verified as successful.
