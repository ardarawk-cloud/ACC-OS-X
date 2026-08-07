# ACC OS X Build 214 R5 — Cloudflare Workers AI

## Added
- Real generative KAI chat through same-origin `/api/acc-ai`.
- Cloudflare Workers AI binding (`env.AI`) — no OpenAI API key required.
- Server-side owner access-code validation.
- Active ACC workspace/profile/workflow/Knowledge Vault context injection.
- Local Safe fallback remains available if Workers AI is unavailable or daily allocation is exhausted.
- `/api/acc-ai` GET status endpoint for deployment diagnostics.

## Provider
Default model: `@cf/meta/llama-3.1-8b-instruct-fast`.
The model can be changed with `ACC_AI_MODEL` in Wrangler/Cloudflare variables.

## Security
`ACC_AI_ACCESS_CODE` must be configured as a Cloudflare secret/secret variable. Never commit it to GitHub.

## Preserved
- Build 214 registry and migration state
- PWA identity `/`
- Local data and backups
- Save to Vault
- Send to Queue
- Apply to Pipeline
- Mobile responsive fixes
