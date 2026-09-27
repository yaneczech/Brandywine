import { describe, expect, it } from 'vitest';
import { manualPagePath } from '../../src/lib/manual/paths';

const pages = [
	{ id: 'home', parentId: null, slug: 'home', isLanding: true },
	{ id: 'logo', parentId: null, slug: 'logo' },
	{ id: 'symbol', parentId: 'logo', slug: 'symbol' },
	{ id: 'intro', parentId: 'home', slug: 'intro' },
];

describe('manualPagePath', () => {
	it('joins ancestor slugs', () => {
		expect(manualPagePath(pages[2], pages)).toBe('/logo/symbol');
		expect(manualPagePath(pages[1], pages)).toBe('/logo');
	});
	it('puts the landing page at the root and its children at the top level', () => {
		expect(manualPagePath(pages[0], pages)).toBe('/');
		expect(manualPagePath(pages[3], pages)).toBe('/intro');
	});
});
