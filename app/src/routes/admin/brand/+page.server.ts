import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$db';
import {
	assets,
	brandSettings,
	colors,
	colorPalettes,
	manualPages,
	typographyFonts,
	typographyStyles
} from '$db/schema';
import { count, eq, asc } from 'drizzle-orm';
import { withoutManualPassword } from '$server/brand-settings';

const DEFAULTS = {
	systemName: 'Brandywine',
	logoPath: '/logo.svg',
	faviconPath: '/favicon.svg',
	primaryColor: '#4A1204',
	name: 'My Brand',
	manualThemeMode: 'light',
	manualBackgroundColor: '#FBFAF8',
	manualSurfaceColor: '#FFFFFF',
	manualTextColor: '#171717',
	manualMutedColor: '#737373',
	manualAccentColor: null,
	manualBorderRadius: 8,
	manualNumbering: false,
	accessMode: 'public',
	accessPassword: null,
	emailWhitelist: [],
	activeLanguages: ['en', 'cs'],
	defaultLanguage: 'en',
	showAttribution: true,
	customFooterText: null
};

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user?.role !== 'admin') redirect(302, '/admin');
	const [
		[settings],
		[{ value: colorCount }],
		[{ value: fontCount }],
		[{ value: styleCount }],
		[{ value: assetCount }],
		[{ value: manualPageCount }],
		[{ value: publishedPageCount }],
		brandColors,
		brandPalettes
	] = await Promise.all([
		db.select().from(brandSettings).where(eq(brandSettings.id, 1)),
		db.select({ value: count() }).from(colors),
		db.select({ value: count() }).from(typographyFonts),
		db.select({ value: count() }).from(typographyStyles),
		db.select({ value: count() }).from(assets),
		db.select({ value: count() }).from(manualPages),
		db.select({ value: count() }).from(manualPages).where(eq(manualPages.enabled, true)),
		db.select({ id: colors.id, name: colors.name, hex: colors.hex, paletteId: colors.paletteId })
			.from(colors).orderBy(asc(colors.order)),
		db.select({ id: colorPalettes.id, name: colorPalettes.name }).from(colorPalettes).orderBy(asc(colorPalettes.order))
	]);

	const resolvedSettings = settings ?? DEFAULTS;

	return {
		settings: {
			...withoutManualPassword(resolvedSettings),
			accessPasswordConfigured: Boolean(resolvedSettings.accessPassword)
		},
		health: { colorCount, fontCount, styleCount, assetCount, manualPageCount, publishedPageCount },
		brandColors,
		brandPalettes
	};
};
