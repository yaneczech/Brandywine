import type { PageServerLoad } from './$types';
import { db } from '$db';
import { users, assets, colors, typographyFonts, manualPages, brandSettings } from '$db/schema';
import { count, eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	const [[{ userCount }], [{ assetCount }], [{ colorCount }], [{ fontCount }], [{ pageCount }]] = await Promise.all([
		db.select({ userCount: count() }).from(users),
		db.select({ assetCount: count() }).from(assets),
		db.select({ colorCount: count() }).from(colors),
		db.select({ fontCount: count() }).from(typographyFonts),
		db.select({ pageCount: count() }).from(manualPages),
	]);
	// Offer the welcome wizard to administrators until it is finished or skipped
	const [settings] = await db.select({ onboardedAt: brandSettings.onboardedAt }).from(brandSettings).where(eq(brandSettings.id, 1));
	const showOnboarding = locals.user?.role === 'admin' && !settings?.onboardedAt;
	return { stats: { users: userCount, assets: assetCount, colors: colorCount, fonts: fontCount, pages: pageCount }, showOnboarding };
};
