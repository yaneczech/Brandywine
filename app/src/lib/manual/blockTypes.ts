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
	'quote', 'callout', 'stats', 'embed', 'text_image', 'links',
	'color_ratio', 'contrast_checker', 'hotspots', 'logo_download', 'font_usage',
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

// These blocks render defaults or shared brand data without per-block config.
const DEFAULT_CONTENT_TYPES = new Set<string>([
	'colors', 'typography', 'text_styles', 'grid', 'contrast_checker',
	'divider', 'asset_gallery', 'download'
]);

export function isLandingBlockVisible(block: {
	type: string; enabled: boolean; config: Record<string, unknown> | null;
}): boolean {
	return block.enabled && (
		DEFAULT_CONTENT_TYPES.has(block.type) || Object.keys(block.config ?? {}).length > 0
	);
}
