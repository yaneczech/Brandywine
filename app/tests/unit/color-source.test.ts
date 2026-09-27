import { describe, expect, it } from 'vitest';
import { colorsForSource } from '../../src/lib/manual/color-source';

const palettes = [{ id: 'p1', name: 'Primary' }, { id: 'p2', name: 'Neutrální' }];
const colors = [{ id: 'red', paletteId: 'p1' }, { id: 'gray', paletteId: 'p2' }, { id: 'loose', paletteId: null }];

describe('manual palette selection', () => {
	it('includes unassigned colors in the default selection', () => {
		expect(colorsForSource(colors, palettes)).toEqual(colors);
	});
	it('keeps an ID selection after a palette is renamed', () => {
		expect(colorsForSource(colors, [{ id: 'p1', name: 'Nový název' }], 'p1')).toEqual([colors[0]]);
	});
	it('supports existing name-based selections', () => {
		expect(colorsForSource(colors, palettes, 'primary')).toEqual([colors[0]]);
	});
	it('does not substitute every brand color for a deleted palette', () => {
		expect(colorsForSource(colors, palettes, 'deleted')).toEqual([]);
	});
});
