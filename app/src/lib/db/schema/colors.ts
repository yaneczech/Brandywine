import { pgTable, text, integer, jsonb, boolean } from 'drizzle-orm/pg-core';
import { createId } from '../id';

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
	pantoneRef: text('pantone_ref'),
	ralRef: text('ral_ref'),
	order: integer('order').notNull().default(0)
});

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
});
