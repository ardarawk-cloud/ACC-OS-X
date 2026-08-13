# BUILD 257 — KAI Autonomous Quality Recovery

Status: RELEASE CANDIDATE

## Problem
BUILD254.2 correctly fails closed below the 8.5 Studio Board threshold, but a weak MATERIAL could halt after three rewrite passes even when the weakness was specifically recoverable, such as insufficient factual support.

## Objective
Keep the 8.5 quality threshold unchanged while giving KAI a bounded self-recovery path before halting the mission.

## Flow
RESEARCH → core MATERIAL → BUILD254.2 Studio Board (max 3 passes) → if PASS continue → if rejected, BUILD257 diagnoses the failure:

- accuracy / factual relevance weak → re-render grounded source URLs, build a conservative evidence ledger, regenerate from supported facts;
- originality / hook / story weak → discard weak framing and rebuild from first principles;
- other weakness → first-principles editorial/art-direction rebuild.

Recovery is limited to 2 additional passes. If the strict 8.5 threshold is still not met, production still fails closed.

## Health contract
- `packageRevision`: `BUILD257_KAI_AUTONOMOUS_QUALITY_RECOVERY`
- `kaiBrainRevision`: `BUILD257_KAI_AUTONOMOUS_QUALITY_RECOVERY`
- `kaiRecovery`: `ACTIVE`
- normal Studio Board passes: 3
- bounded recovery passes: 2
- max re-rendered evidence pages during recovery: 4

## Release identity
- App Build: 257
- Data schema: 250 (unchanged)
- KAI System Orchestrator: Build 256 (unchanged)
- Installed PWA manifest ID remains `/acc-os-x-build250` for continuity.

## Safety scope
No changes to Meta connector, Page mapping, Facebook Page IDs, access tokens/secrets, caption cleaner, publishing payload/path, storage schema, or existing channel data.
