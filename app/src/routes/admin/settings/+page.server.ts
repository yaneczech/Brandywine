import type { PageServerLoad } from './$types';
import { db } from '$db';
import { brandSettings } from '$db/schema';
import { eq } from 'drizzle-orm';

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
	showAttribution: true,
	customFooterText: null,
	accessMode: 'public',
	defaultLanguage: 'en'
};

export const load: PageServerLoad = async () => {
	const [row] = await db.select().from(brandSettings).where(eq(brandSettings.id, 1));
	return { settings: row ?? DEFAULTS };
};
