/**
 * GET  /api/webhooks — list webhooks (admin)
 * POST /api/webhooks — create one: { url, events? } → generates its signing secret
 */
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { asc } from 'drizzle-orm';
import { db } from '$db';
import { webhooks } from '$db/schema';
import { isValidWebhookUrl, newWebhookSecret, parseEvents, requireAdmin } from '$server/webhooks';

export const GET: RequestHandler = async ({ locals }) => {
	requireAdmin(locals.user);
	return json(await db.select().from(webhooks).orderBy(asc(webhooks.createdAt)));
};

export const POST: RequestHandler = async ({ locals, request }) => {
	requireAdmin(locals.user);
	const body = await request.json().catch(() => null) as { url?: unknown; events?: unknown } | null;
	if (!body || !isValidWebhookUrl(body.url)) error(400, 'A valid http(s) URL is required');
	const [row] = await db.insert(webhooks)
		.values({ url: body.url, events: parseEvents(body.events), secret: newWebhookSecret() })
		.returning();
	return json(row, { status: 201 });
};
