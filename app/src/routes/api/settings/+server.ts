import { json, error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { brandSettings } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user || locals.user.role !== 'admin') error(403, 'Forbidden');
	const [row] = await db.select().from(brandSettings).where(eq(brandSettings.id, 1));
	return json(row ?? null);
};

export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') error(403, 'Forbidden');
	const body = await request.json();

	const allowed = ['systemName', 'logoPath', 'faviconPath', 'primaryColor', 'name', 'showAttribution', 'customFooterText', 'accessMode', 'defaultLanguage'];
	const update: Record<string, unknown> = {};
	for (const key of allowed) {
		if (key in body) update[key] = body[key];
	}

	// Upsert singleton
	const existing = await db.select({ id: brandSettings.id }).from(brandSettings).where(eq(brandSettings.id, 1));
	if (existing.length === 0) {
		await db.insert(brandSettings).values({ id: 1, ...update } as Parameters<typeof db.insert>[0]['values']);
	} else {
		await db.update(brandSettings).set(update).where(eq(brandSettings.id, 1));
	}

	const [row] = await db.select().from(brandSettings).where(eq(brandSettings.id, 1));
	return json(row);
};
