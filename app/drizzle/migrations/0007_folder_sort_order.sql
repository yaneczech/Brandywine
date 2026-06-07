-- Add sort_order to folders for manual drag-and-drop ordering within the same parent level.
-- Default 0 — existing folders get assigned sequential order by path on first use via the
-- PATCH /api/folders/[id]/move endpoint which normalises siblings automatically.
ALTER TABLE folders ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- Index for efficient sibling-order queries (parent + sort_order)
CREATE INDEX IF NOT EXISTS idx_folders_parent_sort ON folders (parent_id, sort_order);
