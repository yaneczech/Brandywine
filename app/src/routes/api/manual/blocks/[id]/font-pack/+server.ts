/**
 * GET /api/manual/blocks/[id]/font-pack?font=<fontId>
 * ZIP of a typeface's uploaded files. Only served when the typography block has
 * downloads enabled (licences differ per font) and the reader may view the manual.
 */
import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { env } from '$env/dynamic/private';
import { db } from '$db';
import { brandSettings, manualBlocks, manualPages, typographyFonts, typographyFontFiles } from '$db/schema';
import { eq } from 'drizzle-orm';
import { hasManualViewAccess, MANUAL_ACCESS_COOKIE } from '$server/manual-access';
import { createZip, type ZipEntry } from '$server/zip';

const UPLOAD_DIR = env.UPLOAD_DIR ?? './uploads';

function safeName(value: string): string {
	return value.replace(/[\\/:*?"<>|\r\n]+/g, '-').trim() || 'font';
}

export const GET: RequestHandler = async ({ params, url, locals, cookies }) => {
	const fontId = url.searchParams.get('font') ?? '';

	const [row] = await db
		.select({ block: manualBlocks, pageEnabled: manualPages.enabled })
		.from(manualBlocks)
		.innerJoin(manualPages, eq(manualPages.id, manualBlocks.pageId))
		.where(eq(manualBlocks.id, params.id))
		.limit(1);
	const config = (row?.block.config ?? {}) as Record<string, unknown>;
	const pickedIds = Array.isArray(config.fontIds) ? (config.fontIds as string[]) : [];
	if (
		!row || row.block.type !== 'typography' || !row.block.enabled || !row.pageEnabled ||
		config.allowDownload !== true || !fontId || (pickedIds.length && !pickedIds.includes(fontId))
	) {
		error(404, 'Font download not available');
	}

	const [settings] = await db.select().from(brandSettings).where(eq(brandSettings.id, 1));
	if (!hasManualViewAccess(settings, locals.user, cookies.get(MANUAL_ACCESS_COOKIE))) {
		error(403, 'Manual access required');
	}

	const [font] = await db.select().from(typographyFonts).where(eq(typographyFonts.id, fontId)).limit(1);
	if (!font) error(404, 'Font not found');
	const files = await db.select().from(typographyFontFiles).where(eq(typographyFontFiles.fontId, fontId));

	const root = resolve(UPLOAD_DIR);
	const entries: ZipEntry[] = [];
	const used = new Set<string>();
	for (const file of files) {
		const full = resolve(join(root, file.storagePath));
		if (!full.startsWith(root + '/')) continue;
		try {
			let name = safeName(file.originalName);
			for (let n = 2; used.has(name); n++) name = `${n}-${safeName(file.originalName)}`;
			used.add(name);
			entries.push({ name: `${safeName(font.name)}/${name}`, data: await readFile(full) });
		} catch {
			// Missing file on disk — skip it rather than failing the whole pack.
		}
	}
	if (font.license) {
		entries.push({ name: `${safeName(font.name)}/LICENSE.txt`, data: new TextEncoder().encode(`${font.name}\n${font.foundry ?? ''}\n\n${font.license}\n`) });
	}
	if (!entries.length) error(404, 'No font files');

	const zip = createZip(entries);
	const filename = safeName(font.name).replace(/\s+/g, '-');
	return new Response(new Uint8Array(zip), {
		headers: {
			'Content-Type': 'application/zip',
			'Content-Disposition': `attachment; filename="${filename}.zip"`,
			'Content-Length': String(zip.length),
			'Cache-Control': 'private, no-store',
		},
	});
};
