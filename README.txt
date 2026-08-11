ACC OS X — BUILD 250 CAPTION GUARD V4 FALSE-POSITIVE FIX

WHAT FAILED IN V3
- The Caption Integrity Guard itself halted TechVerse at CAPTION.
- Root causes fixed in V4:
  1) Apostrophes were treated like quotation marks, so normal words/contractions
     could trigger unsupportedQuotedText.
  2) GM5 stores Scriptwriter output under stage MATERIAL, while V3 only looked
     for SCRIPT, so the repair model was missing material evidence.
  3) Soft quality preferences (length / CTA / hashtags) were treated as hard
     integrity failures before the existing QC gate.

V4 BEHAVIOR
- Only concrete integrity defects hard-block at CAPTION:
  internal/debug leakage, wrappers, placeholders/pseudo-text, unsupported
  double-quoted claims, empty output.
- TechVerse length / discussion prompt / hashtags become repair hints only.
  The existing HARD QC gate still makes the final publication-quality decision.
- Research Reliability + QC Research Context Guard stay active.
- Build remains 250.
- Meta Publish Connector R4 is NOT touched.

GITHUB — PRODUCTION
Replace ONLY:
  worker-research-reliability.js

DO NOT TOUCH:
- worker.js
- wrangler.jsonc
- index.html
- acc-publish-connector
- Meta secrets, Page IDs or tokens

AFTER DEPLOY
PWA → TechVerse → PRODUCE → RETRY MISSION once.
