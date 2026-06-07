# Brandywine

Open-source brand platform — brand manual + asset management.
Self-hosted, Docker-based, AGPL v3.

## Quick start

```bash
cp .env.example .env
# Edit .env — set POSTGRES_PASSWORD and SESSION_SECRET
docker compose up
```

Open `http://localhost:3000/en/manual` for the brand manual.  
Admin panel: `http://localhost:3000/admin`

## Development

```bash
cd app
npm install
npm run dev
```

## Stack

- **Frontend/Backend**: SvelteKit + TypeScript
- **Database**: PostgreSQL 16 + Drizzle ORM
- **Queue**: BullMQ + Redis
- **Media worker**: Sharp, FFmpeg, SVGO, Ghostscript
- **i18n**: Paraglide.js (CS + EN out of the box)
- **Proxy**: Caddy (automatic HTTPS)

## License

AGPL v3 — see [LICENSE](LICENSE)
