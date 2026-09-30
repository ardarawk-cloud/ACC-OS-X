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
