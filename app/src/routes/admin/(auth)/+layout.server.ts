import type { LayoutServerLoad } from './$types';
import { db } from '$lib/db';
import { brandSettings } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { withoutManualSecrets } from '$server/brand-settings';

const DEFAULT_BRAND = {
	systemName: 'Brandywine',
	logoPath: null as string | null,
	faviconPath: null as string | null,
	primaryColor: '#4A1204',
	name: 'My Brand',
	manualThemeMode: 'light',
	manualBackgroundColor: '#FBFAF8',
	manualSurfaceColor: '#FFFFFF',
	manualTextColor: '#171717',
	manualMutedColor: '#737373',
	manualAccentColor: null as string | null,
	manualBorderRadius: 8,
	manualTypographyPreset: 'neutral',
	manualLandingLayout: 'grid',
	showAttribution: true,
	customFooterText: null as string | null
};

export const load: LayoutServerLoad = async ({ locals }) => {
	const [brand] = await db.select().from(brandSettings).where(eq(brandSettings.id, 1));
	const safeBrand = brand
		? withoutManualSecrets(brand)
		: DEFAULT_BRAND;
	return { user: locals.user, brand: safeBrand };
};
