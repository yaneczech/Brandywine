/**
 * Adds transparent padding around an SVG by growing its viewBox.
 * Pure string manipulation so the same code runs in the browser (live logo
 * export) and on the server (ZIP logo pack).
 */

export type SvgBox = { x: number; y: number; width: number; height: number };

const ROOT_TAG = /<svg\b[^>]*>/i;

function attr(tag: string, name: string): string | null {
	const match = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'));
	return match ? (match[2] ?? match[3] ?? null) : null;
}

function setAttr(tag: string, name: string, value: string): string {
	const re = new RegExp(`\\s${name}\\s*=\\s*("[^"]*"|'[^']*')`, 'i');
	if (re.test(tag)) return tag.replace(re, ` ${name}="${value}"`);
	return tag.replace(/^<svg\b/i, `<svg ${name}="${value}"`);
}

function length(value: string | null): number | null {
	if (!value) return null;
	const num = parseFloat(value);
	// Percentages cannot be resolved without a viewport — treat as unknown
	return Number.isFinite(num) && num > 0 && !value.trim().endsWith('%') ? num : null;
}

/** Intrinsic box of the SVG (viewBox, falling back to width/height). */
export function svgBox(svg: string): SvgBox | null {
	const tag = svg.match(ROOT_TAG)?.[0];
	if (!tag) return null;
	const viewBox = attr(tag, 'viewBox')?.trim().split(/[\s,]+/).map(Number);
	if (viewBox && viewBox.length === 4 && viewBox.every(Number.isFinite) && viewBox[2] > 0 && viewBox[3] > 0) {
		return { x: viewBox[0], y: viewBox[1], width: viewBox[2], height: viewBox[3] };
	}
	const width = length(attr(tag, 'width'));
	const height = length(attr(tag, 'height'));
	return width && height ? { x: 0, y: 0, width, height } : null;
}

/**
 * @param padX horizontal padding on each side, in % of the logo width (0–100)
 * @param padY vertical padding on each side, in % of the logo height (0–100)
 */
export function padSvg(svg: string, padX: number, padY: number): string {
	const match = svg.match(ROOT_TAG);
	const box = svgBox(svg);
	if (!match || !box) return svg;

	const px = (box.width * Math.max(0, padX)) / 100;
	const py = (box.height * Math.max(0, padY)) / 100;
	const next: SvgBox = { x: box.x - px, y: box.y - py, width: box.width + 2 * px, height: box.height + 2 * py };
	const fmt = (n: number) => String(Math.round(n * 1000) / 1000);

	let tag = setAttr(match[0], 'viewBox', [next.x, next.y, next.width, next.height].map(fmt).join(' '));
	const width = length(attr(match[0], 'width'));
	const height = length(attr(match[0], 'height'));
	if (width) tag = setAttr(tag, 'width', fmt(width * next.width / box.width));
	if (height) tag = setAttr(tag, 'height', fmt(height * next.height / box.height));
	if (!/\sxmlns\s*=/.test(tag)) tag = setAttr(tag, 'xmlns', 'http://www.w3.org/2000/svg');

	return svg.replace(match[0], tag);
}

/** Aspect ratio (height / width) after padding. */
export function paddedRatio(box: SvgBox, padX: number, padY: number): number {
	return (box.height * (1 + 2 * padY / 100)) / (box.width * (1 + 2 * padX / 100));
}
