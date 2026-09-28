# ROAMINK — GitHub + Cloudflare Migration

Migrated from AppDeploy app `roamink-33bzpu`, source snapshot `1790579237043`.

## Hard lock

No ROAMINK product content, layout, pricing, public contact details, legal copy, or customer-facing workflow is intentionally changed by this migration.

The exact AppDeploy source snapshot is preserved under `appdeploy-source/`.

Cloudflare-only compatibility files are isolated:
- `src/appdeploy-client.js` replaces the former AppDeploy client transport.
- `worker.js` implements the same public API contract on Cloudflare Workers.
- `wrangler*.jsonc` contains Cloudflare deployment configuration.

Production hostname remains:

`https://roamink.nadmo.id`

## Payment secrets

AppDeploy does not expose secret values for export. Cloudflare must receive the same two secret values currently configured in AppDeploy:
- `IPAYMU_API_KEY`
- `IPAYMU_VA`

The deploy workflow looks for `ROAMINK_IPAYMU_API_KEY` / `ROAMINK_IPAYMU_VA`, with fallback to `IPAYMU_API_KEY` / `IPAYMU_VA`.
