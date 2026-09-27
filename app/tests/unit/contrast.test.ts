import { describe, expect, it } from 'vitest';
import { contrastRatio, ensureContrast } from '../../src/lib/ui/contrast';

describe('ensureContrast', () => {
	it('keeps a brand colour that already passes', () => {
		expect(ensureContrast('#4A1204', '#fbfaf8')).toBe('#4a1204');
	});
	it('darkens a light brand colour on paper to 3:1', () => {
		const out = ensureContrast('#F5D90A', '#fbfaf8');
		expect(contrastRatio(out, '#fbfaf8')).toBeGreaterThanOrEqual(3);
	});
	it('lightens a dark brand colour on a dark background to 3:1', () => {
		const out = ensureContrast('#16213E', '#101010');
		expect(contrastRatio(out, '#101010')).toBeGreaterThanOrEqual(3);
	});
	it('passes invalid input through', () => {
		expect(ensureContrast('var(--x)', '#fff')).toBe('var(--x)');
	});
});
