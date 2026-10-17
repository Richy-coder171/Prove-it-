# ProveIt setup

## Requirements

- Node.js 20 or newer and npm.
- MongoDB Atlas or a local MongoDB instance.

## Local development

1. Copy `server/.env.example` to `server/.env` and set `MONGODB_URI`, `JWT_SECRET`, and `BADGE_SIGNING_SECRET` to distinct values.
2. Copy `client/.env.example` to `client/.env` if the API is not at its default local URL.
3. From the repository root, run `npm install`, then `npm run dev`.
4. Open `http://localhost:5173`; the API listens on `http://localhost:5000`.

The root commands `npm run seed`, `npm test`, `npm run smoke`, and `npm run build` are completed in later build phases.

## Deploy

Deploy `client` to Vercel or Netlify and `server` to Render or Railway. Configure all server environment variables, set `CLIENT_ORIGIN` to the deployed client origin, and set `COOKIE_SECURE=true` for HTTPS. Cross-domain deployments use secure `SameSite=None` cookies. Configure the MongoDB Atlas network allowlist for the server host.
