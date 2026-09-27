import { hasRole } from '$lib/auth/roles';
import { moduleForPath } from '$lib/modules';
import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/db';
import { brandSettings } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { withoutManualSecrets } from '$server/brand-settings';

const PUBLIC_ADMIN_PATHS = ['/admin/login', '/admin/setup'];

const DEFAULT_BRAND = {
	systemName: 'Brandywine',
	logoPath: '/logo.svg' as string | null,
	faviconPath: '/favicon.svg' as string | null,
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
	customFooterText: null as string | null,
};

export const load: LayoutServerLoad = async ({ locals, url }) => {
	// Load brand settings for all admin routes (needed for sidebar/title even on auth pages)
	const [brand] = await db.select().from(brandSettings).where(eq(brandSettings.id, 1));
	const brandData = brand
		? withoutManualSecrets(brand)
		: DEFAULT_BRAND;

	if (PUBLIC_ADMIN_PATHS.some((p) => url.pathname.startsWith(p))) {
		return { user: locals.user, brand: brandData };
	}

	if (!locals.user) {
		redirect(302, `/admin/login?redirect=${encodeURIComponent(url.pathname)}`);
	}
	// Members have no access to admin; editors and admins are allowed
	if (!hasRole(locals.user.role, 'editor')) {
		redirect(302, '/');
	}
	// Each admin module declares the lowest role that may open it
	const mod = moduleForPath(url.pathname);
	if (mod && !hasRole(locals.user.role, mod.minRole ?? 'editor')) {
		redirect(302, '/admin');
	}
	return { user: locals.user, brand: brandData };
};
