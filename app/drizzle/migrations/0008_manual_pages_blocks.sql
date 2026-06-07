-- Drop old stub table (was never used in production data)
DROP TABLE IF EXISTS manual_sections CASCADE;
DROP TYPE IF EXISTS section_type CASCADE;

-- ── Pages ──────────────────────────────────────────────────────────────────────
-- Hierarchical page tree for the brand manual.
-- The root "landing" page (is_landing = true) is auto-created by the app on first use.
CREATE TABLE manual_pages (
	id          TEXT PRIMARY KEY,
	parent_id   TEXT REFERENCES manual_pages(id) ON DELETE SET NULL,
	title       TEXT NOT NULL,
	slug        TEXT NOT NULL,          -- URL segment, e.g. "loga" or "pouziti"
	description TEXT,
	sort_order  INTEGER NOT NULL DEFAULT 0,
	enabled     BOOLEAN NOT NULL DEFAULT true,
	is_landing  BOOLEAN NOT NULL DEFAULT false,
	created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Full slug path is computed at read time by joining ancestors.
-- Enforce uniqueness of (parent_id, slug) so siblings can't collide.
CREATE UNIQUE INDEX manual_pages_parent_slug ON manual_pages (COALESCE(parent_id, ''), slug);
CREATE INDEX manual_pages_parent_order ON manual_pages (parent_id, sort_order);

-- ── Blocks ─────────────────────────────────────────────────────────────────────
-- Each page contains an ordered list of blocks.
-- `type` is an app-level enum stored as text (easier to extend without migrations).
-- `config` holds the type-specific configuration as JSONB.
-- `anchor` is a URL-safe slug for TOC links, auto-set from block title/type.
CREATE TABLE manual_blocks (
	id         TEXT PRIMARY KEY,
	page_id    TEXT NOT NULL REFERENCES manual_pages(id) ON DELETE CASCADE,
	type       TEXT NOT NULL,           -- 'rich_text' | 'image' | 'colors' | … (see app)
	config     JSONB NOT NULL DEFAULT '{}',
	sort_order INTEGER NOT NULL DEFAULT 0,
	enabled    BOOLEAN NOT NULL DEFAULT true,
	anchor     TEXT,                    -- e.g. "nase-barvy" for TOC
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX manual_blocks_page_order ON manual_blocks (page_id, sort_order);

-- ── Seed: landing page ─────────────────────────────────────────────────────────
INSERT INTO manual_pages (id, title, slug, is_landing, sort_order)
VALUES ('landing', 'Brand Manual', '', true, 0)
ON CONFLICT DO NOTHING;
