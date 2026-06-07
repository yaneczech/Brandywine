export interface RGB { r: number; g: number; b: number }
export interface HSL { h: number; s: number; l: number }
export interface CMYK { c: number; m: number; y: number; k: number }
export interface LAB { l: number; a: number; b: number }

export function hexToRgb(hex: string): RGB {
	const n = parseInt(hex.replace('#', ''), 16);
	return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex({ r, g, b }: RGB): string {
	return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

export function rgbToHsl({ r, g, b }: RGB): HSL {
	const rn = r / 255, gn = g / 255, bn = b / 255;
	const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
	let h = 0, s = 0;
	const l = (max + min) / 2;
	if (max !== min) {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6; break;
			case gn: h = ((bn - rn) / d + 2) / 6; break;
			case bn: h = ((rn - gn) / d + 4) / 6; break;
		}
	}
	return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function rgbToCmyk({ r, g, b }: RGB): CMYK {
	const rn = r / 255, gn = g / 255, bn = b / 255;
	const k = 1 - Math.max(rn, gn, bn);
	if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
	return {
		c: Math.round(((1 - rn - k) / (1 - k)) * 100),
		m: Math.round(((1 - gn - k) / (1 - k)) * 100),
		y: Math.round(((1 - bn - k) / (1 - k)) * 100),
		k: Math.round(k * 100)
	};
}

export function cmykToRgb({ c, m, y, k }: CMYK): RGB {
	const f = (x: number) => Math.round(255 * (1 - x / 100) * (1 - k / 100));
	return { r: f(c), g: f(m), b: f(y) };
}

export function hslToRgb({ h, s, l }: HSL): RGB {
	const sn = s / 100, ln = l / 100;
	const a = sn * Math.min(ln, 1 - ln);
	const f = (n: number) => {
		const k = (n + h / 30) % 12;
		return Math.round((ln - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255);
	};
	return { r: f(0), g: f(8), b: f(4) };
}

export function hexToAllFormats(hex: string) {
	const rgb = hexToRgb(hex);
	return { hex, rgb, hsl: rgbToHsl(rgb), cmyk: rgbToCmyk(rgb) };
}

// ── Shades generation ────────────────────────────────────────────────────────

export interface Shade { step: number; hex: string; label: string }

/**
 * Generate a 9-step shade scale (50, 100…900) from a base hex color.
 * Uses HSL interpolation: keeps hue, adjusts lightness toward white (50) and black (900).
 * The base color is mapped to the step closest to its natural lightness.
 */
export function generateShades(hex: string): Shade[] {
	const rgb = hexToRgb(hex);
	const { h, s } = rgbToHsl(rgb);

	// Lightness values for steps 50→900 (Tailwind-inspired)
	const steps = [
		{ step: 50,  l: 96 },
		{ step: 100, l: 90 },
		{ step: 200, l: 80 },
		{ step: 300, l: 68 },
		{ step: 400, l: 54 },
		{ step: 500, l: 40 },
		{ step: 600, l: 30 },
		{ step: 700, l: 22 },
		{ step: 800, l: 15 },
		{ step: 900, l: 9  },
	];

	return steps.map(({ step, l }) => {
		// Slightly desaturate at extremes for a more realistic look
		const sAdj = step <= 100 ? Math.round(s * 0.5) : step >= 800 ? Math.round(s * 0.6) : s;
		const shadeRgb = hslToRgb({ h, s: sAdj, l });
		return { step, hex: rgbToHex(shadeRgb), label: String(step) };
	});
}

// ── WCAG Contrast ────────────────────────────────────────────────────────────

/** Relative luminance per WCAG 2.1 */
export function relativeLuminance(hex: string): number {
	const { r, g, b } = hexToRgb(hex);
	const lin = (c: number) => {
		const s = c / 255;
		return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
	};
	return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Contrast ratio between two hex colors (1–21) */
export function contrastRatio(hex1: string, hex2: string): number {
	const L1 = relativeLuminance(hex1);
	const L2 = relativeLuminance(hex2);
	return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
}

export type WcagLevel = 'AAA' | 'AA' | 'AA Large' | 'Fail';

/** WCAG 2.1 compliance level for a given contrast ratio */
export function wcagLevel(ratio: number): WcagLevel {
	if (ratio >= 7) return 'AAA';
	if (ratio >= 4.5) return 'AA';
	if (ratio >= 3) return 'AA Large';
	return 'Fail';
}

export interface ContrastResult {
	ratio: number;
	ratioDisplay: string;
	level: WcagLevel;
	passes: boolean;
}

export function checkContrast(foreground: string, background: string): ContrastResult {
	const ratio = contrastRatio(foreground, background);
	const level = wcagLevel(ratio);
	return {
		ratio,
		ratioDisplay: ratio.toFixed(1) + ':1',
		level,
		passes: level !== 'Fail'
	};
}

/** Returns contrast on white AND black — useful for showing both at once */
export function colorContrast(hex: string) {
	return {
		onWhite: checkContrast(hex, '#FFFFFF'),
		onBlack: checkContrast(hex, '#000000')
	};
}

// ── Gradient CSS ─────────────────────────────────────────────────────────────

export interface GradientStop { color: string; position: number }
export type GradientType = 'linear' | 'radial' | 'conic'

export function gradientToCss(
	type: GradientType,
	angle: number,
	stops: GradientStop[]
): string {
	const sorted = [...stops].sort((a, b) => a.position - b.position);
	const stopStr = sorted.map(s => `${s.color} ${s.position}%`).join(', ');
	if (type === 'radial') return `radial-gradient(circle, ${stopStr})`;
	if (type === 'conic') return `conic-gradient(from ${angle}deg, ${stopStr})`;
	return `linear-gradient(${angle}deg, ${stopStr})`;
}
