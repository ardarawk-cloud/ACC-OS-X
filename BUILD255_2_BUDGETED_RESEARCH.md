# BUILD 255.2 — Budgeted Research

Purpose: keep TechVerse newsroom-grade research inside Cloudflare Worker subrequest/concurrency limits without lowering quality thresholds.

## Changes
- TechVerse RESEARCH bypasses legacy research wrappers to prevent duplicate research/subrequest work.
- Sequential acquisition replaces large Promise.all fan-out.
- External request budget: 24 per research invocation.
- Browser Quick Action budget: 6 per research invocation.
- Up to 4 rotating official technology newsroom hubs are inspected.
- Direct HTTP extraction is attempted before Browser Markdown fallback.
- Redirects are handled manually and counted against the request budget.
- Acquisition stops as soon as enough usable evidence is collected.
- Targeted news corroboration is capped to 3 URLs.
- Research metadata records actual request/browser budget usage for diagnosis.

## Quality contract
- Latest First for TechVerse.
- Research Board threshold remains 8.5/10.
- Minimum 4 verified facts.
- Minimum 2 exact usable sources.
- No unsupported facts may be invented to satisfy the threshold.

## Safety scope
No changes to Meta connector, Facebook Page routing, tokens/secrets, caption cleaner, poster renderer, or publish payload/path.
