# ACC OS X — BUILD 250 RC2 QC Source Recovery

## Trigger
TechVerse end-to-end RC1 run reached QC and halted on deterministic preflight with `researchGrounded` because QC received only one Research URL.

## Root cause
The Research stage itself enforces at least two cited URLs before returning `RESEARCH_PASS`. RC1 client context compaction can still truncate late Research sections before QC, especially `SOURCES`, because the compacted packet has a fixed total character budget while source URLs are appended near the end.

## RC2 behavior
- Leaves the existing Research Reliability wrapper authoritative.
- Runs only after the existing QC path still fails specifically with `researchGrounded` and `researchSourceCount = 1`.
- Browser-renders candidate pages for the exact existing TOPIC.
- AI-validates one additional page against the existing TOPIC and VERIFIED_FACTS.
- Appends only the validated URL to the same Research packet and retries QC once.
- If no valid additional source is found, preserves the original QC FAIL/HALT.
- Does not lower the two-source QC requirement.

## Frozen / untouched
- `worker.js`
- Meta Publish Connector
- Meta tokens / Page IDs / secrets
- Publishing payload/path
- PWA build number remains 250
