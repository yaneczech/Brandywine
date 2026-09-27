# Contributing to Brandywine

Thanks for helping. Bug reports, translations, documentation, new manual
blocks and admin modules are all welcome.

## Before you start

- **Bugs:** open an issue with steps to reproduce, what you expected and what
  happened. Security problems go to [SECURITY.md](SECURITY.md), not to issues.
- **Features:** open an issue first so we can agree on the shape before you
  write code. Small fixes can go straight to a pull request.
- Read [docs/architecture.md](docs/architecture.md) for how the code is
  organised and [DESIGN.md](DESIGN.md) for the UI rules.

## Set up

Requirements: Node 22 (`app/.nvmrc`), Docker with Compose v2.

```bash
# fork on GitHub first, then
git clone https://github.com/<your-account>/Brandywine.git
cd Brandywine
cp .env.example .env                       # set POSTGRES_PASSWORD and SESSION_SECRET

# PostgreSQL and Redis with published ports
docker compose -f docker-compose.yml -f compose.dev.yml up -d db redis

cd app
cp ../.env .env                            # plus DATABASE_URL and REDIS_URL, see .env.example
npm install
npm run db:migrate
npm run dev                                # http://localhost:5173
```

The first visit to `/admin` creates the first admin account. For media
processing run the worker too (see [docs/extending/worker.md](docs/extending/worker.md)).

The whole stack in containers, with hot reload for the app:

```bash
docker compose -f docker-compose.yml -f compose.dev.yml up --build
```

## Make a change

1. Branch from `main`: `git switch -c fix/short-description`.
2. Keep the change focused; unrelated clean-ups go in their own PR.
3. Follow the existing code: TypeScript, Svelte 5 runes, tabs, English code
   and comments. UI copy goes into `app/src/messages/*.json` in English and
   Czech (leave the Czech entry in English if you cannot translate it and say
   so in the PR).
4. Extending? Use the registries — [blocks](docs/extending/blocks.md),
   [modules](docs/extending/modules.md), [worker queues](docs/extending/worker.md).
5. Schema change? Edit `app/src/lib/db/schema/`, run `npm run db:generate`
   and commit the generated migration.
6. Add or update tests in `app/tests/unit/` for logic you change.

## Check before you push

```bash
cd app
npm run check     # types
npm run lint      # ESLint
npm test          # unit tests
npm run build     # production build
```

CI runs the same checks on every pull request. For UI changes also look at the
result in light and dark mode and at phone width, and include a screenshot in
the PR.

## Commits and pull requests

- Commit messages: a short imperative subject ("Add a pull-quote block"),
  then a body explaining why when it is not obvious.
- One logical change per commit; rebase on `main` before opening the PR.
- Fill in the pull request template. A maintainer reviews within a few days.

## License

Brandywine is licensed under the [Apache License 2.0](LICENSE). By
contributing you agree that your contributions are licensed under the same
terms.
