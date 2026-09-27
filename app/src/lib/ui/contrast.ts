/**
 * Pick ink or white text for a solid background, so a light brand colour
 * (a yellow, a pastel) still gets legible primary buttons.
 */
export function readableOn(hex: string | null | undefined): string {
	const m = /^#?([0-9a-f]{6})$/i.exec(String(hex ?? '').trim());
	if (!m) return '#ffffff';
	const n = parseInt(m[1], 16);
	const lin = (c: number) => {
		const v = c / 255;
		return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
	};
	const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
	// Contrast vs white = 1.05 / (L + .05); vs ink ≈ (L + .05) / .058
	return 1.05 / (L + 0.05) >= (L + 0.05) / 0.058 ? '#ffffff' : '#141414';
}
