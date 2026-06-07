import type { PageServerLoad } from './$types';
import { db } from '$db';
import {
	assets,
	brandSettings,
	colors,
	manualPages,
	typographyFonts,
	typographyStyles
} from '$db/schema';
import { count, eq } from 'drizzle-orm';

const DEFAULTS = {
	systemName: 'Brandywine',
	logoPath: '/logo.svg',
	faviconPath: '/favicon.svg',
	primaryColor: '#4A1204',
	name: 'My Brand',
	accessMode: 'public',
	accessPassword: null,
	emailWhitelist: [],
	activeLanguages: ['en', 'cs'],
	defaultLanguage: 'en',
	showAttribution: true,
	customFooterText: null
};

export const load: PageServerLoad = async () => {
	const [
		[settings],
		[{ value: colorCount }],
		[{ value: fontCount }],
		[{ value: styleCount }],
		[{ value: assetCount }],
		[{ value: manualPageCount }],
		[{ value: publishedPageCount }]
	] = await Promise.all([
		db.select().from(brandSettings).where(eq(brandSettings.id, 1)),
		db.select({ value: count() }).from(colors),
		db.select({ value: count() }).from(typographyFonts),
		db.select({ value: count() }).from(typographyStyles),
		db.select({ value: count() }).from(assets),
		db.select({ value: count() }).from(manualPages),
		db.select({ value: count() }).from(manualPages).where(eq(manualPages.enabled, true))
	]);

	return {
		settings: settings ?? DEFAULTS,
		health: {
			colorCount,
			fontCount,
			styleCount,
			assetCount,
			manualPageCount,
			publishedPageCount
		}
	};
};
