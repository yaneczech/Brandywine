-- ── Normalize all timestamp columns to TIMESTAMPTZ ──────────────────────────
-- DB timezone is UTC so AT TIME ZONE 'UTC' is a no-op for existing data.
-- USING clause casts existing values safely.

ALTER TABLE analytics_events
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

ALTER TABLE asset_versions
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

ALTER TABLE assets
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE folders
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

ALTER TABLE sessions
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN expires_at TYPE timestamptz USING expires_at AT TIME ZONE 'UTC';

ALTER TABLE share_links
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN expires_at TYPE timestamptz USING expires_at AT TIME ZONE 'UTC';

ALTER TABLE team_invitations
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN expires_at TYPE timestamptz USING expires_at AT TIME ZONE 'UTC';

ALTER TABLE team_members
  ALTER COLUMN invited_at  TYPE timestamptz USING invited_at  AT TIME ZONE 'UTC',
  ALTER COLUMN accepted_at TYPE timestamptz USING accepted_at AT TIME ZONE 'UTC';

ALTER TABLE teams
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';

ALTER TABLE users
  ALTER COLUMN created_at             TYPE timestamptz USING created_at             AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at             TYPE timestamptz USING updated_at             AT TIME ZONE 'UTC',
  ALTER COLUMN magic_token_expires_at TYPE timestamptz USING magic_token_expires_at AT TIME ZONE 'UTC';
