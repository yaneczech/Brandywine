-- Brings the drizzle snapshot up to date with the schema (earlier migrations
-- were partly hand-written) and drops an index that duplicated
-- idx_manual_blocks_page_sort.
DROP INDEX IF EXISTS "manual_blocks_page_order";
