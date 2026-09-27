import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { canEdit } from '$server/permissions';
import { auditManual } from '$server/manual-audit';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) error(401, 'Unauthorized');
	if (!canEdit(locals.user.role)) error(403, 'Forbidden');
	return { issues: await auditManual(), checkedAt: new Date().toISOString() };
};
