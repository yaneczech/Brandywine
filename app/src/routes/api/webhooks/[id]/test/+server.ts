/** POST /api/webhooks/[id]/test — send a `ping` event now and report the result */
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eq } from 'drizzle-orm';
import { db } from '$db';
import { webhooks } from '$db/schema';
import { deliver, requireAdmin } from '$server/webhooks';

export const POST: RequestHandler = async ({ locals, params }) => {
	requireAdmin(locals.user);
	const [hook] = await db.select().from(webhooks).where(eq(webhooks.id, params.id));
	if (!hook) error(404, 'Webhook not found');
	const result = await deliver(hook, 'ping', { message: 'Test delivery from Brandywine' });
	return json(result);
};
