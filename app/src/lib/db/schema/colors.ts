import { pgTable, text, integer, jsonb, index } from 'drizzle-orm/pg-core';
import { createId } from '../id';

export type ColorProductionRef = {
	type: 'pantone' | 'ral' | 'ncs' | 'foil' | 'other';
	label: string;
	value: string;
};

export const colorPalettes = pgTable('color_palettes', {
	id: text('id').primaryKey().$defaultFn(createId),
	name: text('name').notNull(),
	order: integer('order').notNull().default(0)
});


export const colors = pgTable('colors', {
	id: text('id').primaryKey().$defaultFn(createId),
	paletteId: text('palette_id').references(() => colorPalettes.id, { onDelete: 'set null' }),
	name: text('name').notNull(),
	hex: text('hex').notNull(),
	rgb: jsonb('rgb').$type<{ r: number; g: number; b: number }>(),
	cmyk: jsonb('cmyk').$type<{ c: number; m: number; y: number; k: number }>(),
	hsl: jsonb('hsl').$type<{ h: number; s: number; l: number }>(),
	lab: jsonb('lab').$type<{ l: number; a: number; b: number }>(),
	// pantoneRef + ralRef are legacy scalar fields kept for backwards compatibility.
	// New code should use productionRefs (JSONB array) which supports any ref type.
	pantoneRef: text('pantone_ref'),
	ralRef: text('ral_ref'),
	productionRefs: jsonb('production_refs').$type<ColorProductionRef[]>().notNull().default([]),
	order: integer('order').notNull().default(0)
}, (t) => [
	index('idx_colors_palette_id').on(t.paletteId),
	index('idx_colors_order').on(t.paletteId, t.order),
]);

export type GradientStop = { color: string; position: number };
export type GradientType = 'linear' | 'radial' | 'conic';

export const colorGradients = pgTable('color_gradients', {
	id: text('id').primaryKey().$defaultFn(createId),
	paletteId: text('palette_id').references(() => colorPalettes.id, { onDelete: 'set null' }),
	name: text('name').notNull(),
	type: text('type').$type<GradientType>().notNull().default('linear'),
	angle: integer('angle').notNull().default(135),
	stops: jsonb('stops').$type<GradientStop[]>().notNull().default([]),
	order: integer('order').notNull().default(0)
}, (t) => [
	index('idx_color_gradients_palette').on(t.paletteId),
]);
