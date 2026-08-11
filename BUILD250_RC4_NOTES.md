# ACC OS X — BUILD 250 RC4 Research Grounding Gate

## Trigger
TechVerse RC1/RC2/RC3 runs reached QC with `Research URLs: 1` even though the Research stage itself appeared successful.

## Confirmed root cause
`worker-research-reliability.js` only invokes its browser fallback when the original Research response is HTTP 422. A weak HTTP 200 Research response can therefore pass downstream even if it contains fewer than two usable URLs; deterministic QC catches the defect later.

## RC4 behavior
- Validates every successful Research response before downstream stages.
- `RESEARCH_PASS` requires at least two usable external URLs.
- If a successful Research packet has fewer than two URLs, Browser + AI source validation attempts to complete the same existing TOPIC/VERIFIED_FACTS grounding.
- If the two-source contract still cannot be satisfied, Research fails closed with HTTP 422 at RESEARCH instead of allowing Material/Poster/Caption to continue.
- RC3 source anchoring and RC2 QC fallback remain underneath as defense-in-depth.

## Frozen / untouched
- `worker.js`
- Meta Publish Connector
- Meta tokens / Page IDs / secrets
- publishing payload/path
- PWA build number
