import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

// SvelteKit imports server modules during post-build analysis, where deployment
// secrets are intentionally unavailable. The entrypoint validates DATABASE_URL
// before starting the production server; the no-argument client is never queried
// during the analysis pass.
const client = env.DATABASE_URL ? postgres(env.DATABASE_URL) : postgres();
export const db = drizzle(client, { schema });
