import { relativeLuminance, rgbToHex } from '$lib/utils/colors';

/**
 * Pick ink or white text for a solid background, so a light brand colour
 * (a yellow, a pastel) still gets legible primary buttons.
 */
export function readableOn(hex: string | null | undefined): string {
	const m = /^#?([0-9a-f]{6})$/i.exec(String(hex ?? '').trim());
	if (!m) return '#ffffff';
	const L = relativeLuminance(`#${m[1]}`);
	// Contrast vs white = 1.05 / (L + .05); vs ink ≈ (L + .05) / .058
	return 1.05 / (L + 0.05) >= (L + 0.05) / 0.058 ? '#ffffff' : '#141414';
}

function parseHex(hex: string): [number, number, number] | null {
	const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
	if (!m) return null;
	const n = parseInt(m[1], 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance([r, g, b]: [number, number, number]): number {
	return relativeLuminance(rgbToHex({ r, g, b }));
}

/** Contrast ratio of two hex colours; 1 when either is not a 6-digit hex */
export function contrastRatio(a: string, b: string): number {
	const pa = parseHex(a), pb = parseHex(b);
	if (!pa || !pb) return 1;
	const [x, y] = [luminance(pa), luminance(pb)].sort((p, q) => q - p);
	return (x + 0.05) / (y + 0.05);
}

/**
 * The brand colour as an interface accent (indicators, focus, sliders): the
 * same hue, moved toward ink or white only as far as needed to reach `min`
 * contrast against `bg` (WCAG 1.4.11 asks 3:1 for UI graphics). A colour that
 * already passes is returned unchanged, so most brands keep their exact value.
 */
export function ensureContrast(hex: string | null | undefined, bg: string, min = 3): string {
	const c = parseHex(String(hex ?? ''));
	const b = parseHex(bg);
	if (!c || !b) return String(hex ?? '');
	const toHex = (rgb: number[]) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
	if (contrastRatio(toHex(c), bg) >= min) return toHex(c);
	const target = luminance(b) > 0.18 ? [0, 0, 0] : [255, 255, 255];
	for (let t = 0.05; t <= 1; t += 0.05) {
		const mixed = c.map((v, i) => v + (target[i] - v) * t);
		if (contrastRatio(toHex(mixed), bg) >= min) return toHex(mixed);
	}
	return toHex(target);
}
