# ACC OS X Content Hub

Mobile-first PWA backup for ACC OS X content operations.

## MVP scope

- Home dashboard with Generated / Ready / Scheduled / Published counters
- Channel Manager and persistent Channel Passport data
- Active-channel switching
- Local content draft generation from a brief
- Content Library with Ready → Scheduled → Published workflow
- Publishing Queue view
- AI provider settings placeholder
- Meta Multi-Page Manager placeholder without fake credentials or publishing
- Local persistence through `localStorage`
- Minimal installable-PWA shell

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

## Next backend phase

1. Replace local draft generation with a server-side AI endpoint.
2. Store API secrets server-side only; never expose them in browser bundles.
3. Add database-backed Channel Passport and Content entities.
4. Add Meta OAuth, Page discovery, token lifecycle, permissions and App Review flow.
5. Add queue worker, retry policy, publish logs and failure reasons.
6. Add image/video asset handling and approval history.

This branch is intentionally isolated from the main ACC OS X application until the Content Hub workflow is validated.
