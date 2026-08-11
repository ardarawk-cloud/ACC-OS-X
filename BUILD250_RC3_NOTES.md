# ACC OS X — BUILD 250 RC3 Research Source Anchor

## Trigger
TechVerse RC2 run still reached deterministic QC with `researchGrounded` failed and `Research URLs: 1`.

## Root cause
The Research worker already requires at least two cited URLs before `RESEARCH_PASS`, but the mobile client bridge reconstructs a compact Research packet and can lose late `SOURCES` content before QC.

## RC3 behavior
- Leaves the existing Research Reliability and RC2 QC recovery wrappers in place.
- On successful RESEARCH only, takes the first two already-validated URLs from the final Research reply.
- Anchors those exact URLs inside `SOURCE_NOTES` as `GROUNDING_URLS`.
- `SOURCE_NOTES` is preserved early by the existing BUILD250 context bridge, so the two validated source URLs survive downstream compaction into QC.
- Adds health metadata: `researchSourceAnchor = ACTIVE` and revision `BUILD250_RC3_RESEARCH_SOURCE_ANCHOR`.
- Does not lower the two-source QC requirement.

## Frozen / untouched
- `worker.js`
- Meta Publish Connector
- Meta tokens / Page IDs / secrets
- Publishing payload/path
- PWA build number remains 250
