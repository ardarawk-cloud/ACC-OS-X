# BUILD 254.1 — DIRECT QWEN

Status: PRODUCTION CANDIDATE

## Fix
Build 254 no longer depends on the Build 253 GLM creative pass before Qwen can run.

## Flow
CORE WORKER → QWEN3-30B MASTER DIRECTOR → INDEPENDENT CRITIC → OPTIONAL REWRITE → STUDIO RENDERER → MASTER QC → PUBLISH.

## Resilience
- Qwen Director is primary.
- Each model call retries once on empty/error output.
- GLM is preferred as independent critic.
- If GLM critic is unavailable/empty, Qwen performs the critic pass rather than aborting solely because the secondary model failed.
- Quality thresholds remain fail-closed at 8.5.

## Safety
No changes to Meta connector, Page routing, Page IDs, tokens/secrets, caption cleaner, or publish payload/path.
