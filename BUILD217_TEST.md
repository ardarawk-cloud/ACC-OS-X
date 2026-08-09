# BUILD217 HOTFIX TEST

1. Deploy exactly as BUILD216 was deployed.
2. Do not change Meta/Cloudflare secrets or connector configuration.
3. Open GM5 and run one mission.
4. If Research succeeds, continue the full mission.
5. If Research fails, the terminal MUST show a concrete reason such as:
   `AI_HTTP_401: ...`, `AI_HTTP_500: ...`, an error code, or a JSON detail.
   `[object Object]` is a FAIL for this hotfix.
6. Do not retry repeatedly if the returned reason indicates server/configuration failure.
7. Publish regression is accepted only after QC_PASS and a real Facebook post.
