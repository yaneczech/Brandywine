import type { PageServerLoad } from './$types';
import { db } from '$db';
import { typographyFonts, typographyStyles, typographyFontFiles } from '$db/schema';
import { asc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	const [fonts, styles, files] = await Promise.all([
		db.select().from(typographyFonts).orderBy(asc(typographyFonts.order)),
		db.select().from(typographyStyles).orderBy(asc(typographyStyles.order)),
		db.select().from(typographyFontFiles).orderBy(asc(typographyFontFiles.uploadedAt))
	]);

	const fontsWithData = fonts.map(f => ({
		...f,
		styles: styles.filter(s => s.fontId === f.id),
		files: files.filter(ff => ff.fontId === f.id)
	}));

	return { fonts: fontsWithData };
};
