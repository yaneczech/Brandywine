import type { LayoutServerLoad } from './$types';
import { db } from '$lib/db';
import { brandSettings, manualPages } from '$lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { error, redirect } from '@sveltejs/kit';
import {
	hasManualAccessGrant,
	isEmailAllowed,
	MANUAL_ACCESS_COOKIE
} from '$server/manual-access';
import { withoutManualSecrets } from '$server/brand-settings';

export const load: LayoutServerLoad = async ({ locals, cookies, url }) => {
	const [settings] = await db.select().from(brandSettings).where(eq(brandSettings.id, 1));
	const mode = settings?.accessMode ?? 'public';

	// ── Access control ──────────────────────────────────────────────────────
	if (mode === 'public') {
		// everyone in
	} else if (mode === 'password') {
		const granted = hasManualAccessGrant(cookies.get(MANUAL_ACCESS_COOKIE), settings?.accessPassword ?? null);
		if (!granted) {
			const returnTo = encodeURIComponent(`${url.pathname}${url.search}`);
			redirect(302, `/access?return=${returnTo}`);
		}
	} else if (mode === 'email_whitelist') {
		if (!locals.user) {
			const returnTo = encodeURIComponent(`${url.pathname}${url.search}`);
			redirect(302, `/admin/login?redirect=${returnTo}`);
		}
		if (!['admin', 'editor'].includes(locals.user.role) && !isEmailAllowed(locals.user.email, settings?.emailWhitelist)) {
			error(403, 'This email address is not allowed to view the manual');
		}
	} else if (mode === 'token') {
		if (!locals.user) error(403, 'Access restricted');
	}

	// ── Page tree for sidebar ───────────────────────────────────────────────
	const pages = await db
		.select({
			id: manualPages.id,
			parentId: manualPages.parentId,
			title: manualPages.title,
			slug: manualPages.slug,
			description: manualPages.description,
			sortOrder: manualPages.sortOrder,
			enabled: manualPages.enabled,
			isLanding: manualPages.isLanding,
		})
		.from(manualPages)
		.where(eq(manualPages.enabled, true))
		.orderBy(asc(manualPages.sortOrder), asc(manualPages.title));

	if (!settings) return { settings: null, pages };
	return { settings: withoutManualSecrets(settings), pages };
};
