# ProveIt setup

## Requirements

- Node.js 20 or newer and npm.
- MongoDB Atlas or a local MongoDB instance.
- An Anthropic API key for live challenge, follow-up, grading, and coaching requests. OpenAI is optional and enables Whisper transcription.

## MongoDB Atlas

1. Create a free MongoDB Atlas project and cluster.
2. Create a database user with read/write access to a database named `proveit`.
3. Add your development IP address to Network Access.
4. Copy the Node.js connection string and replace the username, password, and database name. URL-encode special characters in the username or password.

## Local development

1. Copy `server/.env.example` to `server/.env` and set `MONGODB_URI`, `JWT_SECRET`, and `BADGE_SIGNING_SECRET` to separate values. Keep each secret at least 32 characters.
2. Add `ANTHROPIC_API_KEY` for live AI. `OPENAI_API_KEY` is optional.
3. Set `DEMO_MODE=true` to exercise the seeded, cache-backed demo without live AI. Set it to `false` for live requests.
4. From the repository root, run `npm install`, then `npm run seed` to create demo accounts, challenges, scores, badges, opportunities, a Venture Card, and deterministic AI-cache responses.
5. Run `npm run dev` and open `http://localhost:5173`; the API listens at `http://localhost:5000`.

Seeded demo password: `ProveItDemo2026!`. Accounts are `fieldnote.startup@demo.proveit.test`, `fieldnote.founder@demo.proveit.test`, `demo.mentor@demo.proveit.test`, `pasted@demo.proveit.test`, and `genuine@demo.proveit.test`. The other six candidates follow the same `name@demo.proveit.test` pattern.

Useful commands from the repository root:

```sh
npm run seed
npm test
npm run lint
npm run build
npm run smoke
```

`npm run smoke` exercises registration, challenge generation and approval, a timed submission, three defense answers, grading, badge issuance, and public verification. The demo cache supports the canonical role description and sample answer used by `docs/DEMO_SCRIPT.md`.

## Deploy

Deploy `client` to Vercel or Netlify and `server` to Render or Railway. Set the server environment variables, set `CLIENT_ORIGIN` to the exact deployed client origin, and set `COOKIE_SECURE=true` for HTTPS. Cross-domain deployments use secure `SameSite=None` cookies. Configure the MongoDB Atlas network allowlist for the server host. Set `VITE_API_URL` and `VITE_PUBLIC_APP_URL` in the client environment. Never place AI or signing secrets in the client environment.
