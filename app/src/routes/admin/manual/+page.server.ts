import type { PageServerLoad } from './$types';
import { db } from '$db';
import { manualPages } from '$db/schema';
import { asc } from 'drizzle-orm';
import { auditManual } from '$server/manual-audit';

export const load: PageServerLoad = async () => {
	const [pages, issues] = await Promise.all([
		db.select().from(manualPages).orderBy(asc(manualPages.sortOrder), asc(manualPages.title)),
		auditManual().catch((error) => {
			console.error('Manual audit failed', error);
			return null;
		}),
	]);
	const auditCounts = issues ? {
		error: issues.filter(i => i.severity === 'error').length,
		warning: issues.filter(i => i.severity === 'warning').length,
	} : null;

	return { pages, auditCounts };
};
