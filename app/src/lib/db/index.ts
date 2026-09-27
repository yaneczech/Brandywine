import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

// SvelteKit imports server modules during post-build analysis, where deployment
// secrets are intentionally unavailable. The entrypoint validates DATABASE_URL
// before starting the production server; the no-argument client is never queried
// during the analysis pass.
//
// The client is kept on globalThis so dev hot reloads reuse one pool instead of
// opening a new one per reload (which exhausts Postgres' connection limit), and
// idle connections close after a minute.
const globalForDb = globalThis as typeof globalThis & { __brandywineSql?: ReturnType<typeof postgres> };
const options = { idle_timeout: 60 };
const client = globalForDb.__brandywineSql
	?? (globalForDb.__brandywineSql = env.DATABASE_URL ? postgres(env.DATABASE_URL, options) : postgres(options));
export const db = drizzle(client, { schema });
