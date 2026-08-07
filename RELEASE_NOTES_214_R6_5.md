# ACC OS X Build 214 R6.5 — Worker Execution Engine

## Fixed
- Specialized AI Workers now execute through the existing Cloudflare Workers AI endpoint instead of local simulated output.
- `RUN ACTIVE STAGE WITH AI` reuses a queued task, executes it, stores the real AI output, updates worker metrics, and auto-applies it to the matching pipeline stage.
- Manual Router now uses **ROUTE + RUN TASK**.
- READY worker state is visible instead of appearing as IDLE.
- Execution Tasks are shown before the worker metrics grid so queued work is not hidden far below the page.
- Worker context includes locked profile context plus recent upstream production assets.
- Duplicate READY/RUNNING tasks for the same profile + stage are reused instead of duplicated.
- If Server AI/access is unavailable, the task fails safely and offers RETRY; it does not silently mark a generic local template as production success.

## Scope
R6.5 activates text-based Research, Script, Poster Direction, Caption and QC workers. POSTER still produces direction/prompt only; real image generation remains a later integration. Human Approval remains mandatory.
