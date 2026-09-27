import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ rows: [] as unknown[][], index: 0 }));
vi.mock('$env/dynamic/private', () => ({ env: {} }));
vi.mock('$db', () => ({
	db: { select: () => {
		const result = state.rows[state.index++];
		const query = {
			from: () => query, where: () => query, orderBy: () => query,
			then: (resolve: (rows: unknown) => unknown) => Promise.resolve(result).then(resolve)
		};
		return query;
	} }
}));
import { auditManual } from '../../src/lib/server/manual-audit';

function block(type: string, config = {}, enabled = true) {
	return { id: type, pageId: 'home', type, config, enabled, anchor: null };
}
function fixtures(blocks: ReturnType<typeof block>[]) {
	state.rows = [
		[{ id: 'home', title: 'Home', enabled: true, isLanding: true }],
		blocks, [], [], [], [], [{ logoPath: '/logo.svg' }]
	];
}
beforeEach(() => { state.index = 0; });

describe('manual content audit', () => {
	it('allows a standalone contrast checker without brand colors', async () => {
		fixtures([block('contrast_checker')]);
		expect(await auditManual()).toEqual([]);
	});
	it('does not count hidden blocks as duplicate public anchors', async () => {
		fixtures([block('divider', { heading: 'Section' }), block('divider', { heading: 'Section' }, false)]);
		expect((await auditManual()).some(issue => issue.code === 'duplicate_anchor')).toBe(false);
	});
	it('reports empty typography rules', async () => {
		fixtures([block('typo_rules', { languages: [{ lang: 'cs', rules: [] }] })]);
		expect(await auditManual()).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'block_empty' })]));
	});
	it('reports a missing palette even if other palettes contain colors', async () => {
		fixtures([block('colors', { source: 'deleted' })]);
		state.rows[3] = [{ id: 'red', paletteId: 'primary' }];
		state.rows[5] = [{ id: 'primary', name: 'Primary' }];
		expect(await auditManual()).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'no_colors' })]));
	});
});
