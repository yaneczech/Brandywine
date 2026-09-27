/**
 * Colour helpers for the colour blocks: display formats, WCAG badges and
 * print references. Shade and contrast maths come from $lib/utils/colors.
 */
import type { ColorRow, ProductionRef } from '../types';
import { contrastRatio } from '$lib/utils/colors';

// One implementation for the whole app — admin, token export and manual share it
export { generateShades, mixHex, relativeLuminance } from '$lib/utils/colors';

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

/** WCAG contrast ratio rounded to one decimal, as the colour cards show it */
export function wcagContrast(hex1: string, hex2: string): number {
	return Math.round(contrastRatio(hex1, hex2) * 10) / 10;
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
