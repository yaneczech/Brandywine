import { describe, expect, it } from 'vitest';
import { BLOCK_GROUPS, BLOCK_TYPES, blockDefinitions, getBlockDefinition, isLandingBlockVisible } from '../../src/lib/blocks';

describe('block registry', () => {
	it('discovers every block folder', () => {
		expect(BLOCK_TYPES.length).toBeGreaterThanOrEqual(35);
		expect(new Set(BLOCK_TYPES).size).toBe(BLOCK_TYPES.length);
	});

	it.each(blockDefinitions.map((d) => [d.type, d] as const))('%s is a complete definition', (_type, def) => {
		expect(def.type).toMatch(/^[a-z][a-z0-9_]*$/);
		expect(BLOCK_GROUPS).toContain(def.group);
		expect(typeof def.Render).toBe('function');
		expect(typeof def.icon).toBe('function');
		if (def.Editor) expect(typeof def.Editor).toBe('function');
	});

	it('orders definitions by picker group', () => {
		const groups = blockDefinitions.map((d) => BLOCK_GROUPS.indexOf(d.group));
		expect(groups).toEqual([...groups].sort((a, b) => a - b));
	});

	it('looks blocks up by type', () => {
		expect(getBlockDefinition('rich_text')?.type).toBe('rich_text');
		expect(getBlockDefinition('no_such_block')).toBeUndefined();
		expect(isLandingBlockVisible({ type: 'no_such_block', enabled: true, config: {} })).toBe(false);
	});

	it('exports every block that has content to Markdown', () => {
		const withoutExport = blockDefinitions.filter((d) => !d.toMarkdown).map((d) => d.type);
		expect(withoutExport).toEqual(['divider']);
	});
});
