type Palette = { id: string; name: string };

/** IDs survive palette renames; names remain supported for existing manuals. */
export function resolveColorPalette(source: unknown, palettes: Palette[]): Palette | undefined {
	if (typeof source !== 'string') return undefined;
	return palettes.find(p => p.id === source) ??
		palettes.find(p => p.name.toLowerCase() === source.trim().toLowerCase());
}

export function colorsForSource<T extends { paletteId: string | null }>(
	colors: T[], palettes: Palette[], source: unknown = 'all'
): T[] {
	if (!source || source === 'all') return colors;
	const palette = resolveColorPalette(source, palettes);
	return palette ? colors.filter(c => c.paletteId === palette.id) : [];
}
