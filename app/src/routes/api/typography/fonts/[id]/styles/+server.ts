import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$db';
import { typographyStyles } from '$db/schema';
import type { StyleColorToken } from '$lib/db/schema/typography';
import { eq, asc } from 'drizzle-orm';
import { createId } from '$lib/db/id';

const DEFAULT_ALLOWED_COLORS: StyleColorToken[] = ['black', 'white'];

function isStyleColorToken(token: string): token is StyleColorToken {
	return token === 'black' || token === 'white' || token.startsWith('color:');
}

function sanitizeAllowedColors(value: unknown): StyleColorToken[] {
	if (!Array.isArray(value)) return [];
	return value
		.filter((token): token is string => typeof token === 'string')
		.filter(isStyleColorToken);
}

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');
	const styles = await db.select().from(typographyStyles)
		.where(eq(typographyStyles.fontId, params.id))
		.orderBy(asc(typographyStyles.order));
	return json(styles);
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') error(403, 'Forbidden');
	const body = await request.json();
	if (!body.name?.trim()) error(400, 'Name required');

	const existing = await db.select().from(typographyStyles).where(eq(typographyStyles.fontId, params.id));

	const [style] = await db.insert(typographyStyles).values({
		id: createId(),
		fontId: params.id,
		name: body.name.trim(),
		tag: body.tag ?? null,
		size: body.size ?? null,
		lineHeight: body.lineHeight ?? null,
		tracking: body.tracking ?? null,
		weight: body.weight ?? null,
		order: existing.length,
		theme: ['universal', 'light', 'dark'].includes(body.theme) ? body.theme : 'universal',
		allowedColors: body.allowedColors === undefined ? DEFAULT_ALLOWED_COLORS : sanitizeAllowedColors(body.allowedColors)
	}).returning();

	return json(style, { status: 201 });
};
