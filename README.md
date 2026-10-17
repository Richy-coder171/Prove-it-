# ProveIt

ProveIt turns a job description or founder idea into a reviewed micro-challenge. Candidates solve it under a timer, explain their choices, and receive a rubric score with evidence checked against their answers. People make the final hiring and team decisions.

## Run locally

Requires Node.js 20+, npm, and MongoDB Atlas or a local MongoDB server.

1. Copy `server/.env.example` to `server/.env`; configure MongoDB and distinct 32+ character `JWT_SECRET` and `BADGE_SIGNING_SECRET` values.
2. Set `DEMO_MODE=true` for the cache-backed sample flow. Add `ANTHROPIC_API_KEY` for live AI generation and grading. `OPENAI_API_KEY` enables Whisper voice transcription.
3. Run `npm install`, `npm run seed`, and `npm run dev`.
4. Open `http://localhost:5173`. Demo password: `ProveItDemo2026!`.

See [the full setup and deployment guide](docs/README.md) and [three-minute demo walkthrough](docs/DEMO_SCRIPT.md).

## Checks

```sh
npm test
npm run lint
npm run build
npm run smoke
```

The smoke script uses the canonical cached demo inputs and requires a running API and seeded MongoDB.
