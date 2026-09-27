import type { PageServerLoad } from './$types';
import { db } from '$db';
import { colors, colorPalettes, colorGradients } from '$db/schema';
import { asc, eq } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const [palettes, allColors, gradients] = await Promise.all([
		db.select().from(colorPalettes).orderBy(asc(colorPalettes.order)),
		db.select({
			color: colors,
			palette: { id: colorPalettes.id, name: colorPalettes.name }
		})
		.from(colors)
		.leftJoin(colorPalettes, eq(colors.paletteId, colorPalettes.id))
		.orderBy(asc(colors.order), asc(colors.name)),
		db.select().from(colorGradients).orderBy(asc(colorGradients.order))
	]);

	return { palettes, colors: allColors, gradients };
};
