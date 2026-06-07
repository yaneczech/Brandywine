#!/bin/sh
set -e

echo "Running database migrations..."
node -e "
const { drizzle } = require('drizzle-orm/postgres-js');
const { migrate } = require('drizzle-orm/postgres-js/migrator');
const postgres = require('postgres');
const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client);
migrate(db, { migrationsFolder: './drizzle/migrations' })
  .then(() => { console.log('Migrations complete'); client.end(); })
  .catch(e => { console.error('Migration failed:', e); process.exit(1); });
"

echo "Starting app..."
exec node build
