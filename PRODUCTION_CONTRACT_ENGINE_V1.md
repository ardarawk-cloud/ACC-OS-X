# ACC OS X — Production Contract Engine v1

## Goal
Make semi-automatic and future automatic production reliable by removing workflow decisions from generative AI.

## Core rule
**Contract decides. AI creates. Gate verifies.**

The selected channel resolves to one explicit Production Contract. The contract defines interaction mode, batch count and series order, research policy, visual template/hero policy, caption rules, publish requirements, and NEXT behavior.

## Runtime

`Selected Channel → Contract Resolver → K → P → C → Publish Preflight → Meta Publish`

Automatic Mission remains separate and can migrate to the same contracts after the semi-auto lane is stable.

### K — Material
- AI may write material but may not decide batch count or workflow.
- `CHOICE_REQUIRED` channels may ask only the choices declared by their contract.
- Research-first channels remain grounded by the existing research stack.
- Research insufficiency becomes a waiting/verification state instead of allowing fabricated news.

### P — Poster
- Batch count and series order come from the contract.
- Visual hero subject must follow the contract's subject lock.
- Structured planner JSON is preferred.
- If planner JSON is invalid, a deterministic visual brief is built from material + contract instead of returning `POSTER_PLAN_INVALID`.
- Hero generation receives two bounded attempts.

### C — Caption
- Uses the material and contract-resolved master context.
- Language, fixed prefix, credits/tags, and batch count belong to the contract, not AI discretion.

### Publish Preflight
The client tracks the latest package state independently from the legacy Copilot store.

Publish is blocked when the new contract package has:
- no fresh K material,
- no fresh P,
- no fresh C,
- insufficient verified evidence for contracts that explicitly require it.

Existing pre-Build-258 packages are marked `LEGACY PACKAGE`; they are not silently deleted.

## Failure policy

| Failure | Engine behavior |
|---|---|
| AI planner JSON invalid | deterministic poster-plan fallback |
| First poster image attempt fails | one bounded retry |
| Research has only partial verification | hold/verification state; do not fabricate |
| Contract requires owner choice | show only declared choices |
| Unknown channel | generic one-item contract fallback |
| Meta permission rejected | preserve package; report publish error |

## Current contract coverage
ACC Enterprise channels CH-101 through CH-128 have explicit contract entries. Unknown/future channels fall back to `generic-channel.v1` until a contract is added.

## Migration plan to full automation
1. Stabilize K/P/C/Publish with contracts in Produce Copilot.
2. Add contract conformance telemetry per channel.
3. Promote channels with stable success rates to Automatic Mission.
4. Automatic Mission consumes the exact same Production Contract; no separate workflow prompt is allowed.
5. Channel-specific adapters are added only for capabilities that truly differ (news research, Meta/Instagram, character-reference visual generation, etc.).

## Safety boundaries
- No production Meta token/Page mapping changes.
- No data-schema migration.
- No installed PWA identity change.
- Automatic Mission workflow remains delegated unchanged in this release.
