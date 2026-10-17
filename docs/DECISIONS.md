# Decisions

- Use Satoshi with a Manrope fallback in place of the prompt's Inter font because the requested gpt-taste skill excludes Inter and the wordmark benefits from a geometric companion.
- Treat `COOKIE_SECURE=true` as the production cross-site cookie signal and set `SameSite=None`; local HTTP keeps `SameSite=Lax`.
- Keep demo-login controls out of Phase 0 until seeded demo accounts arrive in Phase 7.
- Sign badge claims as a compact HS256 JWT and compare every signed field with stored badge data so score or identity edits invalidate public verification.
- Defer Open Badges JSON-LD export because the build prompt lists it as an optional cut and the signed QR verification page covers the required trust flow.
