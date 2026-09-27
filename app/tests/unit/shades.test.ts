import { describe, expect, it } from 'vitest';
import { generateShades } from '../../src/lib/utils/colors';
import { generateShades as blockShades } from '../../src/lib/blocks/_shared/color';

describe('shade scale', () => {
	const shades = generateShades('#c0392b');

	it('has steps 100–900 with the brand colour at 500', () => {
		expect(shades.map((s) => s.step)).toEqual([100, 200, 300, 400, 500, 600, 700, 800, 900]);
		expect(shades.find((s) => s.step === 500)?.hex).toBe('#c0392b');
	});

	it('runs from light to dark', () => {
		const light = (hex: string) => parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16);
		const values = shades.map((s) => light(s.hex));
		expect(values).toEqual([...values].sort((a, b) => b - a));
	});

	it('is the same scale in the admin and the manual', () => {
		expect(blockShades('#c0392b')).toEqual(shades);
	});
});
