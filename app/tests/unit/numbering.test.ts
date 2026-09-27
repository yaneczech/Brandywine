import { describe, expect, it } from 'vitest';
import { pageNumbers, sectionNumbers } from '../../src/lib/manual/numbering';

const pages = [
	{ id: 'home', parentId: null, isLanding: true, sortOrder: 0, title: 'Home' },
	{ id: 'logo', parentId: null, sortOrder: 1, title: 'Logo' },
	{ id: 'colors', parentId: null, sortOrder: 2, title: 'Barvy' },
	{ id: 'symbol', parentId: 'logo', sortOrder: 2, title: 'Symbol' },
	{ id: 'wordmark', parentId: 'logo', sortOrder: 1, title: 'Wordmark' },
	{ id: 'deep', parentId: 'wordmark', sortOrder: 0, title: 'Detail' }
];

describe('pageNumbers', () => {
	const n = pageNumbers(pages);
	it('numbers top-level chapters in navigation order', () => {
		expect(n.get('logo')).toBe('1');
		expect(n.get('colors')).toBe('2');
	});
	it('nests subpages by sort order', () => {
		expect(n.get('wordmark')).toBe('1.1');
		expect(n.get('symbol')).toBe('1.2');
		expect(n.get('deep')).toBe('1.1.1');
	});
	it('numbers subpages after the parent page\'s own sections', () => {
		const m = pageNumbers(pages, { logo: 2 });
		expect(m.get('wordmark')).toBe('1.3');
		expect(m.get('symbol')).toBe('1.4');
		expect(m.get('deep')).toBe('1.3.1');
	});
	it('leaves the landing page unnumbered', () => {
		expect(n.has('home')).toBe(false);
	});
	it('treats children of the landing page as top-level chapters', () => {
		const m = pageNumbers([...pages, { id: 'extra', parentId: 'home', sortOrder: 9, title: 'Extra' }]);
		expect(m.get('extra')).toBe('3');
	});
});

describe('sectionNumbers', () => {
	it('continues the page number and skips untitled blocks', () => {
		expect(sectionNumbers('1.2', ['Úvod', null, '', 'Pravidla'])).toEqual(['1.2.1', null, null, '1.2.2']);
	});
	it('returns nothing without a page number', () => {
		expect(sectionNumbers(undefined, ['A'])).toEqual([null]);
	});
});
