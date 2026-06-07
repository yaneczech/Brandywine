import type { PageServerLoad } from './$types';
import { db } from '$db';
import { users, assets, colors, typographyFonts } from '$db/schema';
import { count } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const [[{ userCount }], [{ assetCount }], [{ colorCount }], [{ fontCount }]] = await Promise.all([
		db.select({ userCount: count() }).from(users),
		db.select({ assetCount: count() }).from(assets),
		db.select({ colorCount: count() }).from(colors),
		db.select({ fontCount: count() }).from(typographyFonts),
	]);
	return { stats: { users: userCount, assets: assetCount, colors: colorCount, fonts: fontCount } };
};
