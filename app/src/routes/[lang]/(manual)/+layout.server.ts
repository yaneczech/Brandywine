import type { LayoutServerLoad } from './$types';
import { db } from '$lib/db';
import { brandSettings, manualPages } from '$lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { error, redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ locals, cookies, url, params }) => {
	const [settings] = await db.select().from(brandSettings).where(eq(brandSettings.id, 1));
	const mode = settings?.accessMode ?? 'public';

	// ── Access control ──────────────────────────────────────────────────────
	if (mode === 'public') {
		// everyone in
	} else if (mode === 'password') {
		const granted = cookies.get('manual_access');
		if (!granted) {
			const returnTo = encodeURIComponent(url.pathname);
			redirect(302, `/${params.lang}/access?return=${returnTo}`);
		}
	} else if (mode === 'email_whitelist' || mode === 'token') {
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

	return { settings: settings ?? null, pages };
};
