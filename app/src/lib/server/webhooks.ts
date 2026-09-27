/**
 * Outgoing webhooks: POST a JSON event to every enabled webhook subscribed
 * to it. Bodies are signed with the webhook's secret:
 *   X-Brandywine-Signature: sha256=<hex HMAC-SHA256 of the raw body>
 */
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { db } from '$db';
import { webhooks } from '$db/schema';
import { hasRole } from '$lib/auth/roles';
import { EVENT_NAMES } from '$lib/events';

type Webhook = typeof webhooks.$inferSelect;

const TIMEOUT_MS = 5000;

/** Webhook management is admin-only */
export function requireAdmin(user: App.Locals['user']) {
	if (!user) error(401, 'Unauthorized');
	if (!hasRole(user.role, 'admin')) error(403, 'Forbidden');
}

/** Known event names only; empty means "every event" */
export function parseEvents(value: unknown): string[] {
	if (value === undefined || value === null) return [];
	if (!Array.isArray(value) || value.some((e) => !(EVENT_NAMES as readonly string[]).includes(e))) error(400, 'Unknown event');
	return [...new Set(value as string[])];
}

export function newWebhookSecret(): string {
	return randomBytes(24).toString('hex');
}

export function signBody(secret: string, body: string): string {
	return 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
}

/** Only absolute http(s) URLs are accepted */
export function isValidWebhookUrl(value: unknown): value is string {
	if (typeof value !== 'string' || value.length > 2000) return false;
	try {
		const url = new URL(value);
		return url.protocol === 'https:' || url.protocol === 'http:';
	} catch {
		return false;
	}
}

/** Send one event to one webhook and record the outcome on the webhook row. */
export async function deliver(hook: Webhook, event: string, data: unknown): Promise<{ status: number; error: string | null }> {
	const body = JSON.stringify({ id: randomUUID(), event, createdAt: new Date().toISOString(), data });
	let status = 0;
	let error: string | null = null;
	try {
		const res = await fetch(hook.url, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'user-agent': 'Brandywine-Webhook/1',
				'x-brandywine-event': event,
				'x-brandywine-signature': signBody(hook.secret, body),
			},
			body,
			redirect: 'manual', // never follow redirects to other hosts
			signal: AbortSignal.timeout(TIMEOUT_MS),
		});
		status = res.status;
		if (!res.ok) error = `HTTP ${res.status}`;
	} catch (e) {
		error = e instanceof Error ? e.message : String(e);
	}
	await db.update(webhooks)
		.set({ lastStatus: status, lastError: error, lastDeliveredAt: new Date() })
		.where(eq(webhooks.id, hook.id));
	return { status, error };
}

/** Deliver an event to every enabled webhook that subscribes to it. */
export async function deliverToWebhooks(event: string, data: unknown): Promise<void> {
	const hooks = await db.select().from(webhooks).where(eq(webhooks.enabled, true));
	const targets = hooks.filter((h) => !h.events.length || h.events.includes(event));
	await Promise.allSettled(targets.map((h) => deliver(h, event, data)));
}
