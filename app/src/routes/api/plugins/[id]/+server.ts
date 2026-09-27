/**
 * PATCH  /api/plugins/[id] — { enabled } switches a runtime plugin on or off
 * DELETE /api/plugins/[id] — removes its files (stored data and blocks stay)
 */
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$server/webhooks';
import { setPluginEnabled, uninstallPlugin } from '$server/runtime-plugins';

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	requireAdmin(locals.user);
	const body = await request.json().catch(() => null) as { enabled?: unknown } | null;
	if (typeof body?.enabled !== 'boolean') error(400, '{ enabled: boolean } expected');
	if (!(await setPluginEnabled(params.id, body.enabled))) error(404, 'Plugin not found');
	return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	requireAdmin(locals.user);
	if (!(await uninstallPlugin(params.id))) error(404, 'Plugin not found');
	return new Response(null, { status: 204 });
};
