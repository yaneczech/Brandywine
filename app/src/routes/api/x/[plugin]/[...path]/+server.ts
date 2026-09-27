/**
 * API routes of plugins: /api/x/<plugin>/<path>. Only signed-in editors and
 * admins reach a plugin's handler; plugins check finer rules themselves.
 */
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hasRole } from '$lib/auth/roles';
import { getServerPlugin } from '$server/plugins';

const handle: RequestHandler = async (event) => {
	if (!hasRole(event.locals.user?.role, 'editor')) error(event.locals.user ? 403 : 401, 'Forbidden');
	const route = getServerPlugin(event.params.plugin)?.api?.[event.params.path];
	const handler = route?.[event.request.method as keyof typeof route];
	if (!route) error(404, 'Not found');
	if (!handler) error(405, 'Method not allowed');
	return handler(event);
};

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
