# NADMO LIVE Discord Bug Bot

Dedicated, isolated Cloudflare Worker for the **NADMO LIVE** Discord \`#bugreport\` channel. Does **not** modify ACC OS X, NADMO SUPPORT creator payments, current APK, or \`#general\`.

Official NADMO LIVE CS invite: https://discord.gg/zEstQXh4xc

## Features
- \`/bug\` opens Discord's native form with title, details, device and reproduction steps.
- Posts a single ticket embed to configured channel; keeps a durable record in R2.
- \`/cekbug kode:<id>\` checks ticket status for reporter/admin.
- \`/setbug kode:<id> status:<choice>\` updates status for moderators.
- Non-ephemeral ticket messages contain the reporter mention, not uncontrolled \`@everyone\`.
- Signed Discord interactions verified with Ed25519 and a five-minute timestamp tolerance.
- Only one configured guild/channel is permitted.
- No privileged message-content intent, no Gateway connection, no third-party subscription.

## Cloudflare
Existing main account R2 bucket: \`nadmo-live-bugreports\`.
D1 was intentionally **not used**, because existing account reached its D1 database-count quota.
Source: \`worker.mjs\`. Config: \`wrangler.jsonc\`. App source is isolated under \`apps/\`, outside ACC OS X static assets.

Secrets/configuration required:
- \`DISCORD_PUBLIC_KEY\` (from Developer Portal)
- \`DISCORD_BOT_TOKEN\` (secret; never send in chat or commit)
- \`DISCORD_GUILD_ID\` (server ID)
- \`DISCORD_BUG_CHANNEL_ID\` (channel ID)

To enable:
1. Create a Discord application at https://discord.com/developers/applications.
2. Create its bot and install it in the NADMO LIVE server. Grant only View Channel, Send Messages, Embed Links in \`#bugreport\` and Use Application Commands.
3. Deploy the isolated Cloudflare Worker with \`BUG_REPORTS\` R2 binding and set the four values above via Cloudflare encrypted secrets.
4. Configure application's **Interactions Endpoint URL**: \`https://<worker-origin>/interactions\`.
5. Run \`node register-commands.mjs\` with DISCORD_APPLICATION_ID, DISCORD_GUILD_ID, DISCORD_BOT_TOKEN exported **locally**, not stored in Git.
6. Test \`/bug\`, \`/cekbug\`, and admin-only \`/setbug\` in \`#bugreport\`.

Do not claim the bot is active until the bot is installed, secrets are configured, and signed Discord PING and ticket end-to-end tests pass.

## Local security test
\`\`\`sh
node --test test.mjs
\`\`\`

## Safety notes
Ticket metadata is stored in private R2; never expose a public listing endpoint. Avoid sensitive personal details or passwords in reports. Message details sent to Discord \`#bugreport\` are visible to channel members. Future optional GitHub Issue integration must be behind admin review and use a scoped GitHub token stored as a Cloudflare secret.
