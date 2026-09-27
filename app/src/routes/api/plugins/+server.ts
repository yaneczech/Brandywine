/**
 * GET  /api/plugins — installed runtime plugins (admin)
 * POST /api/plugins — install or update one from a zip (multipart field "package")
 */
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$server/webhooks';
import { installPackage, listInstalled } from '$server/runtime-plugins';

const MAX_UPLOAD = 20 * 1024 * 1024;

export const GET: RequestHandler = async ({ locals }) => {
	requireAdmin(locals.user);
	return json(await listInstalled());
};

export const POST: RequestHandler = async ({ locals, request }) => {
	requireAdmin(locals.user);
	const form = await request.formData().catch(() => null);
	const file = form?.get('package');
	if (!(file instanceof File)) error(400, 'Upload a .zip file in the "package" field');
	if (file.size > MAX_UPLOAD) error(413, 'The package is larger than 20 MB');
	try {
		const manifest = await installPackage(new Uint8Array(await file.arrayBuffer()));
		return json(manifest, { status: 201 });
	} catch (e) {
		error(400, e instanceof Error ? e.message : String(e));
	}
};
