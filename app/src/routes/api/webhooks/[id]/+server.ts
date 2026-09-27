/**
 * PATCH  /api/webhooks/[id] — change { url?, events?, enabled? }
 * DELETE /api/webhooks/[id]
 */
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eq } from 'drizzle-orm';
import { db } from '$db';
import { webhooks } from '$db/schema';
import { isValidWebhookUrl, parseEvents, requireAdmin } from '$server/webhooks';

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	requireAdmin(locals.user);
	const body = await request.json().catch(() => null) as { url?: unknown; events?: unknown; enabled?: unknown } | null;
	if (!body) error(400, 'Invalid JSON');
	const updates: Partial<typeof webhooks.$inferInsert> = {};
	if ('url' in body) {
		if (!isValidWebhookUrl(body.url)) error(400, 'A valid http(s) URL is required');
		updates.url = body.url;
	}
	if ('events' in body) updates.events = parseEvents(body.events);
	if ('enabled' in body) updates.enabled = Boolean(body.enabled);
	const [row] = await db.update(webhooks).set(updates).where(eq(webhooks.id, params.id)).returning();
	if (!row) error(404, 'Webhook not found');
	return json(row);
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	requireAdmin(locals.user);
	const [row] = await db.delete(webhooks).where(eq(webhooks.id, params.id)).returning({ id: webhooks.id });
	if (!row) error(404, 'Webhook not found');
	return new Response(null, { status: 204 });
};
