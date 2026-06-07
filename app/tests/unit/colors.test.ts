import { describe, it, expect } from 'vitest';
import { hexToRgb, rgbToHex, rgbToHsl, rgbToCmyk, hexToAllFormats } from '../../src/lib/utils/colors';

describe('hexToRgb', () => {
	it('converts pure red', () => {
		expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
	});
	it('converts white', () => {
		expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
	});
	it('converts black', () => {
		expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
	});
});

describe('rgbToHex', () => {
	it('round-trips from hex', () => {
		expect(rgbToHex(hexToRgb('#1a2b3c'))).toBe('#1a2b3c');
	});
});

describe('rgbToHsl', () => {
	it('red is h=0, s=100, l=50', () => {
		expect(rgbToHsl({ r: 255, g: 0, b: 0 })).toEqual({ h: 0, s: 100, l: 50 });
	});
	it('white is h=0, s=0, l=100', () => {
		expect(rgbToHsl({ r: 255, g: 255, b: 255 })).toEqual({ h: 0, s: 0, l: 100 });
	});
});

describe('rgbToCmyk', () => {
	it('black is k=100', () => {
		expect(rgbToCmyk({ r: 0, g: 0, b: 0 })).toEqual({ c: 0, m: 0, y: 0, k: 100 });
	});
	it('white is all zeros', () => {
		expect(rgbToCmyk({ r: 255, g: 255, b: 255 })).toEqual({ c: 0, m: 0, y: 0, k: 0 });
	});
});

describe('hexToAllFormats', () => {
	it('returns all formats for a hex', () => {
		const result = hexToAllFormats('#ff0000');
		expect(result.hex).toBe('#ff0000');
		expect(result.rgb).toEqual({ r: 255, g: 0, b: 0 });
		expect(result.hsl.h).toBe(0);
		expect(result.cmyk.k).toBe(0);
	});
});
