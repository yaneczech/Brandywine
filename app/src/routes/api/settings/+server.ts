import { json, error } from '@sveltejs/kit';
import { db } from '$lib/db';
import { brandSettings } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { invalidateLangCache } from '$lib/server/lang-cache';

type BrandSettingsInsert = typeof brandSettings.$inferInsert;
type BrandSettingsUpdate = Partial<Omit<BrandSettingsInsert, 'id'>>;
const manualThemeModes = new Set(['light', 'dark', 'system', 'toggle']);
const validUnitsDigital = new Set(['px', 'rem', 'em', 'vw']);
const validUnitsPrint   = new Set(['mm', 'cm', 'pt', 'in', 'pc']);
const validUnitsType    = new Set(['px', 'pt', 'rem', 'em']);
const colorKeys = new Set([
	'primaryColor',
	'manualBackgroundColor',
	'manualBackgroundColorDark',
	'manualSurfaceColor',
	'manualSurfaceColorDark',
	'manualTextColor',
	'manualTextColorDark',
	'manualMutedColor',
	'manualMutedColorDark',
	'manualAccentColor',
	'manualAccentColorDark'
]);
const hexColorRe = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function normalizeValue(key: string, value: unknown): unknown {
	if (key === 'manualThemeMode') {
		if (manualThemeModes.has(String(value))) return value;
		error(400, 'Invalid manual theme mode');
	}
	if (key === 'unitDigital') {
		if (validUnitsDigital.has(String(value))) return value;
		error(400, 'Invalid digital unit');
	}
	if (key === 'unitPrint') {
		if (validUnitsPrint.has(String(value))) return value;
		error(400, 'Invalid print unit');
	}
	if (key === 'unitType') {
		if (validUnitsType.has(String(value))) return value;
		error(400, 'Invalid type unit');
	}
	if (key === 'localeRules') {
		// accept any plain object — deeper validation happens in schema
		if (value !== null && typeof value === 'object' && !Array.isArray(value)) return value;
		error(400, 'Invalid locale rules');
	}
	if (key === 'manualBorderRadius') {
		const radius = Number(value);
		if (Number.isFinite(radius) && radius >= 0 && radius <= 32) return Math.round(radius);
		error(400, 'Invalid manual border radius');
	}
	if (colorKeys.has(key)) {
		if (value === null || value === '') return null;
		if (typeof value === 'string' && hexColorRe.test(value.trim())) return value.trim();
		error(400, `Invalid color value for ${key}`);
	}
	return value;
}

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user || locals.user.role !== 'admin') error(403, 'Forbidden');
	const [row] = await db.select().from(brandSettings).where(eq(brandSettings.id, 1));
	return json(row ?? null);
};

export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') error(403, 'Forbidden');
	const body = await request.json();

	const allowed = [
		'systemName',
		'logoPath',
		'logoDarkPath',
		'faviconPath',
		'primaryColor',
		'name',
		'manualThemeMode',
		'manualBackgroundColor',
		'manualBackgroundColorDark',
		'manualSurfaceColor',
		'manualSurfaceColorDark',
		'manualTextColor',
		'manualTextColorDark',
		'manualMutedColor',
		'manualMutedColorDark',
		'manualAccentColor',
		'manualAccentColorDark',
		'manualBorderRadius',
		'showAttribution',
		'customFooterText',
		'accessMode',
		'accessPassword',
		'emailWhitelist',
		'activeLanguages',
		'defaultLanguage',
		'unitDigital',
		'unitPrint',
		'unitType',
		'localeRules'
	] as const;
	const update: BrandSettingsUpdate = {};
	for (const key of allowed) {
		if (key in body) Object.assign(update, { [key]: normalizeValue(key, body[key]) });
	}

	// Atomic upsert — avoids TOCTOU race between SELECT + INSERT/UPDATE
	const [row] = await db
		.insert(brandSettings)
		.values({ id: 1, ...update })
		.onConflictDoUpdate({ target: brandSettings.id, set: update })
		.returning();

	// Invalidate in-memory language cache if the default language was changed
	if ('defaultLanguage' in body) invalidateLangCache();

	return json(row);
};
