import type { PageServerLoad } from './$types';
import { db } from '$db';
import { brandSettings } from '$db/schema';
import { eq } from 'drizzle-orm';

const DEFAULTS = {
	systemName: 'Brandywine',
	logoPath: null,
	faviconPath: null,
	primaryColor: '#4A1204',
	name: 'My Brand',
	showAttribution: true,
	customFooterText: null,
	accessMode: 'public',
	defaultLanguage: 'en'
};

export const load: PageServerLoad = async () => {
	const [row] = await db.select().from(brandSettings).where(eq(brandSettings.id, 1));
	return { settings: row ?? DEFAULTS };
};
