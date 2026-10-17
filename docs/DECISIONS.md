# Decisions

- Use Manrope in place of the prompt's Inter font because the requested gpt-taste skill excludes Inter and the condensed wordmark benefits from a geometric companion.
- Treat `COOKIE_SECURE=true` as the production cross-site cookie signal and set `SameSite=None`; local HTTP keeps `SameSite=Lax`.
- Keep demo-login controls out of Phase 0 until seeded demo accounts arrive in Phase 7.
