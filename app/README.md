# Brandywine — web app

The SvelteKit application: the admin, the public brand manual and the HTTP API.
Project overview, installation and contribution guide live in the
[repository README](../README.md) and [CONTRIBUTING.md](../CONTRIBUTING.md).

## Develop

```bash
# Postgres + Redis with published ports
docker compose -f ../docker-compose.yml -f ../compose.dev.yml up -d db redis

cp ../.env.example .env   # set DATABASE_URL, SESSION_SECRET
npm install
npm run db:migrate
npm run dev
```

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run check` | Svelte + TypeScript type check |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Playwright) |
| `npm run build` | Production build (adapter-node) |
| `npm run db:generate` | Generate a migration from schema changes |
| `npm run db:migrate` | Apply pending migrations |

See [docs/architecture.md](../docs/architecture.md) for how the code is organised.
