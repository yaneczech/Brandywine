/**
 * API routes of plugins: /api/x/<plugin>/<path>. Only signed-in editors and
 * admins reach a plugin's handler; plugins check finer rules themselves.
 * Runtime plugins may return any JSON value instead of a Response.
 */
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { hasRole } from '$lib/auth/roles';
import { getServerPlugin } from '$server/plugins';
import { getRuntimePlugin, pluginContext } from '$server/runtime-plugins';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const handle: RequestHandler = async (event) => {
	const user = event.locals.user;
	if (!hasRole(user?.role, 'editor')) error(user ? 403 : 401, 'Forbidden');
	const method = event.request.method as Method;

	const compiled = getServerPlugin(event.params.plugin)?.api?.[event.params.path];
	if (compiled) {
		const handler = compiled[method];
		if (!handler) error(405, 'Method not allowed');
		return handler(event);
	}

	const runtime = await getRuntimePlugin(event.params.plugin);
	const route = runtime?.server?.api?.[event.params.path];
	if (!runtime || !route) error(404, 'Not found');
	const handler = route[method];
	if (!handler) error(405, 'Method not allowed');
	const result = await handler(event.request, pluginContext(runtime, user ? { id: user.id, email: user.email, role: user.role } : null));
	return result instanceof Response ? result : json(result ?? null);
};

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
