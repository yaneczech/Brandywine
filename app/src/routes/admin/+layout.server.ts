import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/db';
import { brandSettings } from '$lib/db/schema';
import { eq } from 'drizzle-orm';

const PUBLIC_ADMIN_PATHS = ['/admin/login', '/admin/setup'];

const DEFAULT_BRAND = {
	systemName: 'Brandywine',
	logoPath: '/logo.svg' as string | null,
	faviconPath: '/favicon.svg' as string | null,
	primaryColor: '#4A1204',
	name: 'My Brand',
	showAttribution: true,
	customFooterText: null as string | null,
};

export const load: LayoutServerLoad = async ({ locals, url }) => {
	// Load brand settings for all admin routes (needed for sidebar/title even on auth pages)
	const [brand] = await db.select().from(brandSettings).where(eq(brandSettings.id, 1));
	const brandData = brand ?? DEFAULT_BRAND;

	if (PUBLIC_ADMIN_PATHS.some((p) => url.pathname.startsWith(p))) {
		return { user: locals.user, brand: brandData };
	}

	if (!locals.user) {
		redirect(302, `/admin/login?redirect=${encodeURIComponent(url.pathname)}`);
	}
	if (locals.user.role !== 'admin') {
		redirect(302, '/');
	}
	return { user: locals.user, brand: brandData };
};
