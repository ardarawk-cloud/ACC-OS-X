ACC OS X — BUILD 250 RC1 END-TO-END CONTEXT FIX

WHY THIS RC EXISTS
We stop patching one failure at a time.

ROOT CAUSE FIXED
The PWA app only sends the first 2200 characters of each upstream asset to later workers.
That can make QC see incomplete Research/Material evidence even when earlier stages passed.

RC1 CHANGES
1) index.html — Client Context Bridge
   - Before /api/acc-ai requests, restores compact/full Research, Script, Poster direction
     and Caption text from the existing local ACC OS X state.
   - Never injects image bytes.
   - Preserves the live poster media row.
   - Applies only to downstream AI stages; RESEARCH itself is untouched.

2) worker-research-reliability.js
   - Keeps Research browser fallback.
   - Keeps QC Research URL guard.
   - Caption Integrity Guard NO LONGER rewrites a caption that has no concrete integrity defect.
   - If repair is required, it now respects the exact Channel Passport productionFormat.
   - HARD QC remains the final publication gate.

NOT TOUCHED
- worker.js
- wrangler.jsonc
- Meta Publish Connector
- R4 Page Token Resolution
- Meta secrets/tokens/Page IDs
- Build number (still 250)

GITHUB — PRODUCTION
Replace ONLY:
- index.html
- worker-research-reliability.js

Then wait for Cloudflare auto-deploy.

TEST POLICY
Do ONE end-to-end TechVerse mission after deployment.
Do not patch/retry individual stages before reviewing that single run.
