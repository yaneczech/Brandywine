import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$db';
import { brandSettings } from '$db/schema';
import { eq } from 'drizzle-orm';
import { withoutManualSecrets } from '$server/brand-settings';

type SafeBrandSettings = Omit<typeof brandSettings.$inferSelect, 'accessPassword' | 'emailWhitelist'>;

const DEFAULTS: SafeBrandSettings = {
	id: 1,
	systemName: 'Brandywine',
	logoPath: '/logo.svg',
	logoDarkPath: null,
	faviconPath: '/favicon.svg',
	primaryColor: '#4A1204',
	name: 'My Brand',
	manualThemeMode: 'light',
	manualBackgroundColor: '#FBFAF8',
	manualBackgroundColorDark: null,
	manualSurfaceColor: '#FFFFFF',
	manualSurfaceColorDark: null,
	manualTextColor: '#171717',
	manualTextColorDark: null,
	manualMutedColor: '#737373',
	manualMutedColorDark: null,
	manualAccentColor: null,
	manualAccentColorDark: null,
	manualBorderRadius: 8,
	manualNumbering: false,
	showAttribution: true,
	customFooterText: null,
	accessMode: 'public',
	activeLanguages: ['en', 'cs'],
	defaultLanguage: 'en',
	unitDigital: 'px',
	unitPrint: 'mm',
	unitType: 'px',
	localeRules: {}
};

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user?.role !== 'admin') redirect(302, '/admin');
	const [row] = await db.select().from(brandSettings).where(eq(brandSettings.id, 1));
	if (!row) return { settings: DEFAULTS };
	return { settings: withoutManualSecrets(row) };
};
