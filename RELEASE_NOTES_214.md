# ACC OS X Build 214 R3 — ACC AI Context Isolation Fix

## Fixes

- Fixed LOCAL SAFE assistant reporting `Workspace undefined`; active workspace now resolves from ACC workspace state.
- ACC AI Notes saved to Knowledge Vault are now `HISTORY ONLY` records and are never injected automatically into AI context.
- Existing `ACC AI Note — ...` records from R2 are migrated automatically to history-only mode.
- Active AI context is now limited to production context such as Production Profile Passport, Current State, Workflow Rules and Brand & Canon Lock.
- Knowledge Vault shows injected context count separately from AI Notes.
- System Control build label updated to Build 214 R3.
- Service worker cache revision bumped so installed PWA detects the R3 update.

## Data safety

- Same PWA identity (`/`).
- Same Build 214 storage key; no registry reset.
- Existing queue, assets, archives, chat history, backups and production state are preserved.
- Build 213 migration keys remain available.

## R4 — Owner Action Feedback Fix
- Makes Save to Vault, Send to Queue, and Apply to Pipeline explicitly tap-safe on mobile.
- Adds persistent in-console success feedback after each owner action.
- Raises toast notifications above the AI modal so confirmations are visible.
- Bumps service worker cache revision to R4.
