# Cybersecurity Game Pilot

A modular Next.js pilot build for a cryptography education study. This phase intentionally implements the study shell before the gameplay module.

## Current Scope

- quick participant entry and dev bypass
- consent and session creation
- 3-item pre-test
- 3 gameplay levels
- 3-item post-test
- optional perception survey
- Mongo-backed event and session storage
- admin invite generation and raw or analysis exports

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- MongoDB
- Vercel Analytics

## Environment

Copy `.env.example` to `.env.local` and set:

- `MONGODB_URI`
- `MONGODB_DB_NAME`
- `ADMIN_SECRET`
- `APP_BASE_URL`
- `NEXT_PUBLIC_ENABLE_DEV_BYPASS`

## Docker MongoDB

This repo includes a local MongoDB service in [`compose.yaml`](/Users/harshsaw/Cybersecurity/compose.yaml).

Start the database:

```bash
npm run db:up
```

Check status:

```bash
npm run db:status
```

Stop the database:

```bash
npm run db:down
```

The default connection string already matches the Docker service:

```bash
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB_NAME=cybersecurity_game
```

## Local Run

```bash
npm install
npm run db:up
npm run dev
```

Participant flow starts at `http://localhost:3000/start`.

Admin flow starts at `http://localhost:3000/admin`.

## Study Flow

1. Resolve invite token from `/start?token=...`
2. Collect consent and participant profile fields
3. Run the 3-item pre-test
4. Hold a reserved slot for the future gameplay module
5. Run the 3-item post-test
6. Collect the short survey
7. Mark the session complete and expose data through admin export

## Modular Structure

- `src/modules/invites` token lookup and invite creation
- `src/modules/study` study flow state and persistence
- `src/modules/instrumentation` event logging and indexes
- `src/modules/admin` admin auth, summary counts, exports
- `src/modules/game` gameplay stub for the later level work
- `src/lib` Mongo and utility helpers
- `src/config` study content and runtime config
- `src/types` shared contracts

## Notes

- Invite email records remain separate from participant gameplay data.
- Vercel Analytics is enabled at the app root, and the `token` query parameter is removed before page-view URLs are sent.
