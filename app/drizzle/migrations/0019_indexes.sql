-- ── Performance indexes ─────────────────────────────────────────────────────
-- None of the FK columns or common filter/sort columns had indexes.
-- Postgres does NOT auto-create indexes on FK columns (unlike MySQL).
-- All CREATE INDEX statements use IF NOT EXISTS to be idempotent.

-- assets ─────────────────────────────────────────────────────────────────────
-- Primary list query: ORDER BY created_at DESC  → sort index
CREATE INDEX IF NOT EXISTS idx_assets_created_at     ON assets (created_at DESC);
-- Type-filter query: WHERE mime LIKE 'image/%'  → prefix scan
CREATE INDEX IF NOT EXISTS idx_assets_mime           ON assets (mime);
-- Folder filter: WHERE folder_id = ?            → FK + equality
CREATE INDEX IF NOT EXISTS idx_assets_folder_id      ON assets (folder_id);
-- Dedup detection: WHERE hash = ?
CREATE INDEX IF NOT EXISTS idx_assets_hash           ON assets (hash) WHERE hash IS NOT NULL;

-- asset_versions ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_asset_versions_asset_id ON asset_versions (asset_id);

-- folders ────────────────────────────────────────────────────────────────────
-- Tree navigation: WHERE parent_id = ?
CREATE INDEX IF NOT EXISTS idx_folders_parent_id     ON folders (parent_id);

-- manual_pages ────────────────────────────────────────────────────────────────
-- URL routing on every public page load: WHERE slug = ?
CREATE INDEX IF NOT EXISTS idx_manual_pages_slug     ON manual_pages (slug);
-- Landing page lookup: WHERE is_landing = true
CREATE INDEX IF NOT EXISTS idx_manual_pages_landing  ON manual_pages (is_landing) WHERE is_landing = true;
-- Tree navigation: WHERE parent_id = ?
CREATE INDEX IF NOT EXISTS idx_manual_pages_parent   ON manual_pages (parent_id);

-- manual_blocks ───────────────────────────────────────────────────────────────
-- Every page load fetches blocks: WHERE page_id = ? ORDER BY sort_order
CREATE INDEX IF NOT EXISTS idx_manual_blocks_page_sort ON manual_blocks (page_id, sort_order);

-- colors ─────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_colors_palette_id     ON colors (palette_id);
CREATE INDEX IF NOT EXISTS idx_colors_order          ON colors (palette_id, "order");

-- color_gradients ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_color_gradients_palette ON color_gradients (palette_id);

-- sessions ────────────────────────────────────────────────────────────────────
-- Auth check: WHERE user_id = ? (cascade delete + lookup)
CREATE INDEX IF NOT EXISTS idx_sessions_user_id      ON sessions (user_id);
-- Expired session cleanup: WHERE expires_at < now()
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at   ON sessions (expires_at);

-- share_links ─────────────────────────────────────────────────────────────────
-- Expiry check + cleanup
CREATE INDEX IF NOT EXISTS idx_share_links_expires_at ON share_links (expires_at) WHERE expires_at IS NOT NULL;

-- typography ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_typography_styles_font    ON typography_styles (font_id);
CREATE INDEX IF NOT EXISTS idx_typography_files_font     ON typography_font_files (font_id);

-- analytics ───────────────────────────────────────────────────────────────────
-- Time-based analytics: WHERE created_at >= ? ORDER BY created_at
CREATE INDEX IF NOT EXISTS idx_analytics_created_at  ON analytics_events (created_at DESC);
-- Asset-specific analytics: WHERE asset_id = ?
CREATE INDEX IF NOT EXISTS idx_analytics_asset_id    ON analytics_events (asset_id) WHERE asset_id IS NOT NULL;
-- Event type filter: WHERE event_type = ?
CREATE INDEX IF NOT EXISTS idx_analytics_event_type  ON analytics_events (event_type);

-- teams ───────────────────────────────────────────────────────────────────────
-- "What teams is this user in?" — very frequent for permission checks
CREATE INDEX IF NOT EXISTS idx_team_members_user_id  ON team_members (user_id);
-- Permission lookups: WHERE resource_type = ? AND resource_id = ?
CREATE INDEX IF NOT EXISTS idx_team_perms_resource   ON team_permissions (resource_type, resource_id);
