-- One-time fix: replace /api/assets/{id}/download URLs stored by AssetPickerModal
-- with public /uploads/{storage_path} paths accessible to unauthenticated visitors.
-- Affected config keys discovered from BlockPrimaryEditor: url, beforeUrl, afterUrl, logoUrl.

-- Fix manual_pages.feature_image
UPDATE manual_pages mp
SET feature_image = '/uploads/' || a.storage_path
FROM assets a
WHERE mp.feature_image = '/api/assets/' || a.id || '/download';

-- Fix manual_blocks.config->>'url' (image / hero blocks)
UPDATE manual_blocks mb
SET config = jsonb_set(config, '{url}', to_jsonb('/uploads/' || a.storage_path))
FROM assets a
WHERE mb.config->>'url' = '/api/assets/' || a.id || '/download';

-- Fix before/after block
UPDATE manual_blocks mb
SET config = jsonb_set(config, '{beforeUrl}', to_jsonb('/uploads/' || a.storage_path))
FROM assets a
WHERE mb.config->>'beforeUrl' = '/api/assets/' || a.id || '/download';

UPDATE manual_blocks mb
SET config = jsonb_set(config, '{afterUrl}', to_jsonb('/uploads/' || a.storage_path))
FROM assets a
WHERE mb.config->>'afterUrl' = '/api/assets/' || a.id || '/download';

-- Fix logo block
UPDATE manual_blocks mb
SET config = jsonb_set(config, '{logoUrl}', to_jsonb('/uploads/' || a.storage_path))
FROM assets a
WHERE mb.config->>'logoUrl' = '/api/assets/' || a.id || '/download';
