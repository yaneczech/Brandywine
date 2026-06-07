import type { PageServerLoad } from './$types';
import { db } from '$db';
import { manualPages } from '$db/schema';
import { asc } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const pages = await db
		.select()
		.from(manualPages)
		.orderBy(asc(manualPages.sortOrder), asc(manualPages.title));

	return { pages };
};
