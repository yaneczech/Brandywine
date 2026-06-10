/**
 * Shared helpers for color production references (Pantone, RAL, NCS, …).
 * Used by both /api/colors and /api/colors/[id].
 */

export type ProductionRef = {
	type: 'pantone' | 'ral' | 'ncs' | 'foil' | 'other';
	label: string;
	value: string;
};

export function defaultProductionLabel(type: ProductionRef['type']): string {
	if (type === 'pantone') return 'Pantone';
	if (type === 'ral') return 'RAL';
	if (type === 'ncs') return 'NCS';
	if (type === 'foil') return 'Signmaking fólie';
	return 'Reference';
}

export function normalizeProductionRefs(value: unknown): ProductionRef[] {
	if (!Array.isArray(value)) return [];
	return value
		.map((item) => {
			const record = item as Record<string, unknown>;
			const rawType = String(record.type ?? 'other');
			const type: ProductionRef['type'] =
				rawType === 'pantone' || rawType === 'ral' || rawType === 'ncs' || rawType === 'foil'
					? rawType
					: 'other';
			const label = String(record.label ?? '').trim();
			const refValue = String(record.value ?? '').trim();
			return {
				type,
				label: label || defaultProductionLabel(type),
				value: refValue
			};
		})
		.filter((item) => item.value);
}
