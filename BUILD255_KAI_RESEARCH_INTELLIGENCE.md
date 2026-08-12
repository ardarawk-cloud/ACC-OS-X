# BUILD 255 — KAI RESEARCH INTELLIGENCE

Status: PRODUCTION CANDIDATE

## Objective
Raise source material quality before KAI Brain MATERIAL generation. A creative model cannot produce studio-grade journalism from stale, generic or weakly grounded research without inventing facts.

## Flow
1. Existing core research creates an initial grounded packet.
2. KAI Research Director discovers and renders real source pages.
3. TechVerse uses LATEST FIRST policy based on server date.
4. Primary / official sources are preferred when available.
5. Qwen3-30B creates a newsroom evidence packet using only rendered source evidence.
6. Independent Research Standards Board scores recency, source authority, evidence, specificity and editorial value.
7. Below 8.5 triggers a full research rebuild using the board critique.
8. Still below 8.5 blocks production before MATERIAL.
9. Approved research feeds BUILD 254.2 Iterative Studio Board.

## Required research packet
- RESEARCH_PASS
- TOPIC
- PUBLIC_HEADLINE
- RECENCY
- at least 4 VERIFIED_FACTS
- CONTEXT
- WHY_IT_MATTERS
- COUNTERPOINT_OR_RISK
- ANGLE
- KEY_POINTS
- VISUAL_FACTS
- RISK_NOTES
- GROUNDING_URLS
- at least 2 exact rendered SOURCES

## TechVerse policy
- Latest First
- Prefer consequential developments from the last 30 days when supported
- Reject stale evergreen topics when newer supported developments are available
- Prefer official / primary evidence before secondary commentary

## Quality threshold
Research >= 8.5 / 10.

## Fail closed
Weak research is not passed downstream. The system must not invent stronger facts merely to satisfy MATERIAL or POSTER quality thresholds.

## Safety scope
No change to Meta connector, Facebook Page routing, Page IDs, tokens/secrets, caption cleaner or publish payload/path.
