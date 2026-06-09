/**
 * Block type registry — safe to import from both client and server.
 * (No Drizzle / server-only imports here.)
 */
export const BLOCK_TYPES = [
	'rich_text', 'image', 'image_gallery', 'carousel', 'before_after',
	'colors', 'typography', 'text_styles', 'typo_rules', 'grid',
	'logo_spec', 'do_dont', 'naming', 'icons', 'process',
	'chart', 'table', 'asset_gallery', 'download',
	'accordion', 'cards', 'html', 'code', 'divider',
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];
