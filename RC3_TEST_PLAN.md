# RC3 Test Plan

1. Confirm Cloudflare auto-deploy from `main` completes.
2. Open `/health` or GET `/api/acc-ai` and verify `researchSourceAnchor = ACTIVE` and revision `BUILD250_RC3_RESEARCH_SOURCE_ANCHOR`.
3. In ACC OS X PWA, run one fresh TechVerse `RETRY MISSION` end-to-end.
4. Do not retry individual stages.
5. Expected QC preflight: Research URL count >= 2; `researchGrounded` true.
6. If QC still fails, capture the QC error/details before any further patch.
