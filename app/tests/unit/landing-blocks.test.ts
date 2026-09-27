import { describe, expect, it } from 'vitest';
import { isLandingBlockVisible } from '../../src/lib/blocks';

describe('landing block visibility', () => {
	it.each(['colors', 'typography', 'text_styles', 'grid', 'contrast_checker', 'divider', 'asset_gallery', 'download'])('keeps default %s blocks', type => {
		expect(isLandingBlockVisible({ type, enabled: true, config: {} })).toBe(true);
	});
	it('keeps navigation cards available for an untouched empty text block', () => {
		expect(isLandingBlockVisible({ type: 'rich_text', enabled: true, config: {} })).toBe(false);
	});
	it('never renders disabled blocks', () => {
		expect(isLandingBlockVisible({ type: 'colors', enabled: false, config: {} })).toBe(false);
	});
});
