-- manual_sections (and its section_type enum) predate manual_pages/manual_blocks
-- and have not been read or written by the app since migration 0008.
DROP TABLE IF EXISTS "manual_sections";
DROP TYPE IF EXISTS "section_type";
