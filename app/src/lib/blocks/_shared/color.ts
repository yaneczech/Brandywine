/**
 * Colour maths for the colour blocks: conversions, WCAG contrast, tints and
 * print references. Values match what the colour cards have always shown.
 */
import type { ColorRow, ProductionRef } from '../types';

export function hexParts(hex: string) {
	return {
		r: parseInt(hex.slice(1,3),16),
		g: parseInt(hex.slice(3,5),16),
		b: parseInt(hex.slice(5,7),16),
	};
}

export function hexToRgbStr(hex: string, color: ColorRow): string {
	if (color.rgb) return `${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}`;
	const { r,g,b } = hexParts(hex);
	return `${r}, ${g}, ${b}`;
}

// WCAG 2.1 relative luminance
export function relativeLuminance(hex: string): number {
	const { r,g,b } = hexParts(hex);
	const ch = [r,g,b].map(v => {
		const s = v / 255;
		return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
	});
	return 0.2126*ch[0] + 0.7152*ch[1] + 0.0722*ch[2];
}

export function wcagContrast(hex1: string, hex2: string): number {
	const l1 = relativeLuminance(hex1);
	const l2 = relativeLuminance(hex2);
	const light = Math.max(l1, l2), dark = Math.min(l1, l2);
	return Math.round(((light + 0.05) / (dark + 0.05)) * 10) / 10;
}

export function contrastOnColor(hex: string): string {
	return wcagContrast(hex, '#ffffff') >= wcagContrast(hex, '#000000') ? '#ffffff' : '#171717';
}

export function wcagBadge(ratio: number): 'AAA' | 'AA' | 'AA Large' | null {
	if (ratio >= 7)   return 'AAA';
	if (ratio >= 4.5) return 'AA';
	if (ratio >= 3)   return 'AA Large';
	return null;
}

export function computeHsl(hex: string): { h: number; s: number; l: number } {
	const { r, g, b } = hexParts(hex);
	const rp = r/255, gp = g/255, bp = b/255;
	const max = Math.max(rp,gp,bp), min = Math.min(rp,gp,bp);
	const l = (max+min)/2;
	if (max === min) return { h:0, s:0, l: Math.round(l*100) };
	const d = max-min;
	const s = l > 0.5 ? d/(2-max-min) : d/(max+min);
	let h: number;
	if      (max===rp) h = (gp-bp)/d + (gp<bp ? 6 : 0);
	else if (max===gp) h = (bp-rp)/d + 2;
	else               h = (rp-gp)/d + 4;
	return { h: Math.round(h/6*360), s: Math.round(s*100), l: Math.round(l*100) };
}

export function computeCmyk(hex: string): { c: number; m: number; y: number; k: number } {
	const { r, g, b } = hexParts(hex);
	const rp = r/255, gp = g/255, bp = b/255;
	const k = 1 - Math.max(rp,gp,bp);
	if (k >= 0.999) return { c:0, m:0, y:0, k:100 };
	const inv = 1-k;
	return {
		c: Math.round((1-rp-k)/inv*100),
		m: Math.round((1-gp-k)/inv*100),
		y: Math.round((1-bp-k)/inv*100),
		k: Math.round(k*100),
	};
}

export function fmtHsl(hsl: { h:number; s:number; l:number }): string {
	return `${hsl.h}° ${hsl.s}% ${hsl.l}%`;
}

export function fmtCmyk(c: { c:number;m:number;y:number;k:number }): string {
	return `C${c.c} M${c.m} Y${c.y} K${c.k}`;
}

// Mix two hex colors (ratio: 0 = original, 1 = target)
export function mixHex(hex: string, target: string, ratio: number): string {
	const { r: r1, g: g1, b: b1 } = hexParts(hex);
	const { r: r2, g: g2, b: b2 } = hexParts(target);
	const r = Math.round(r1 + (r2 - r1) * ratio).toString(16).padStart(2, '0');
	const g = Math.round(g1 + (g2 - g1) * ratio).toString(16).padStart(2, '0');
	const b = Math.round(b1 + (b2 - b1) * ratio).toString(16).padStart(2, '0');
	return `#${r}${g}${b}`;
}

// Generate 9 tints/shades (100–900) from a base hex
export function generateShades(hex: string): Array<{ label: string; hex: string }> {
	return [
		{ label: '100', hex: mixHex(hex, '#ffffff', 0.88) },
		{ label: '200', hex: mixHex(hex, '#ffffff', 0.72) },
		{ label: '300', hex: mixHex(hex, '#ffffff', 0.54) },
		{ label: '400', hex: mixHex(hex, '#ffffff', 0.32) },
		{ label: '500', hex },
		{ label: '600', hex: mixHex(hex, '#000000', 0.18) },
		{ label: '700', hex: mixHex(hex, '#000000', 0.36) },
		{ label: '800', hex: mixHex(hex, '#000000', 0.54) },
		{ label: '900', hex: mixHex(hex, '#000000', 0.70) },
	];
}

export function productionRefsFor(color: ColorRow): ProductionRef[] {
	if (Array.isArray(color.productionRefs) && color.productionRefs.length) {
		return color.productionRefs
			.map((ref) => ({
				type: ref.type ?? 'other',
				label: ref.label || productionLabel(ref.type ?? 'other'),
				value: ref.value ?? ''
			}))
			.filter((ref) => ref.value);
	}
	const refs: ProductionRef[] = [];
	if (color.pantoneRef) refs.push({ type: 'pantone', label: 'Pantone', value: color.pantoneRef });
	if (color.ralRef) refs.push({ type: 'ral', label: 'RAL', value: color.ralRef });
	return refs;
}

export function productionLabel(type: ProductionRef['type']) {
	if (type === 'pantone') return 'Pantone';
	if (type === 'ral') return 'RAL';
	if (type === 'ncs') return 'NCS';
	if (type === 'foil') return 'Signmaking fólie';
	return 'Reference';
}
