import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { db } from '$db';
import { colors } from '$db/schema';

export const GET: RequestHandler = async () => {
	const allColors = await db.select().from(colors);
	const tokens: Record<string, unknown> = {};
	for (const c of allColors) {
		const key = c.name.toLowerCase().replace(/\s+/g, '-');
		tokens[key] = { $value: c.hex, $type: 'color' };
	}
	return json({ color: tokens });
};
