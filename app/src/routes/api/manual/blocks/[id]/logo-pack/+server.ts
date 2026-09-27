/**
 * GET /api/manual/blocks/[id]/logo-pack?px=10&py=10
 * Builds a ZIP with every logo variant of a `logo_download` block: the original
 * files, padded SVGs and PNG renders in common widths. Access follows the
 * public manual's access mode.
 */
import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import sharp, { type Sharp } from 'sharp';
import { env } from '$env/dynamic/private';
import { db } from '$db';
import { brandSettings, manualBlocks, manualPages } from '$db/schema';
import { eq } from 'drizzle-orm';
import { hasManualViewAccess, MANUAL_ACCESS_COOKIE } from '$server/manual-access';
import { createZip, type ZipEntry } from '$server/zip';
import { padSvg, svgBox } from '$lib/manual/svg-pad';

const UPLOAD_DIR = env.UPLOAD_DIR ?? './uploads';
const PNG_WIDTHS = [512, 1024, 2048];
const MAX_FILE_BYTES = 40 * 1024 * 1024;

type Variant = { label?: string; url?: string; files?: { label?: string; url?: string }[] };

function slug(value: string): string {
	return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'logo';
}

/** Maps a manual asset URL to a file inside UPLOAD_DIR; external URLs are skipped. */
function localPath(url: string | undefined): string | null {
	if (!url || /^(https?:)?\/\//i.test(url)) return null;
	const relative = url.replace(/^\/?uploads\//, '').replace(/^\/+/, '');
	if (!relative || relative.includes('\0')) return null;
	const root = resolve(UPLOAD_DIR);
	const full = resolve(join(root, relative));
	return full.startsWith(root + '/') ? full : null;
}

async function readUpload(url: string | undefined): Promise<{ data: Buffer; ext: string } | null> {
	const path = localPath(url);
	if (!path) return null;
	try {
		const data = await readFile(path);
		if (data.length > MAX_FILE_BYTES) return null;
		return { data, ext: extname(path).toLowerCase() };
	} catch {
		return null;
	}
}

function pct(value: string | null): number {
	const n = Number(value);
	return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
}

export const GET: RequestHandler = async ({ params, url, locals, cookies }) => {
	const [row] = await db
		.select({ block: manualBlocks, pageEnabled: manualPages.enabled })
		.from(manualBlocks)
		.innerJoin(manualPages, eq(manualPages.id, manualBlocks.pageId))
		.where(eq(manualBlocks.id, params.id))
		.limit(1);
	if (!row || row.block.type !== 'logo_download' || !row.block.enabled || !row.pageEnabled) {
		error(404, 'Logo pack not found');
	}

	const [settings] = await db.select().from(brandSettings).where(eq(brandSettings.id, 1));
	if (!hasManualViewAccess(settings, locals.user, cookies.get(MANUAL_ACCESS_COOKIE))) {
		error(403, 'Manual access required');
	}

	const padX = pct(url.searchParams.get('px'));
	const padY = pct(url.searchParams.get('py'));
	const config = (row.block.config ?? {}) as Record<string, unknown>;
	const variants = (Array.isArray(config.variants) ? config.variants : []) as Variant[];
	const entries: ZipEntry[] = [];
	const usedNames = new Set<string>();

	for (const [index, variant] of variants.entries()) {
		let folder = slug(variant.label || `logo-${index + 1}`);
		while (usedNames.has(folder)) folder = `${folder}-${index + 1}`;
		usedNames.add(folder);

		const source = await readUpload(variant.url);
		if (source) {
			entries.push({ name: `${folder}/${folder}-original${source.ext}`, data: source.data });

			let renderInput = source.data;
			let isVector = false;
			if (source.ext === '.svg') {
				const padded = padSvg(source.data.toString('utf8'), padX, padY);
				if (padX || padY) entries.push({ name: `${folder}/${folder}.svg`, data: Buffer.from(padded, 'utf8') });
				renderInput = Buffer.from(padded, 'utf8');
				isVector = true;
			}

			for (const width of PNG_WIDTHS) {
				try {
					let image: Sharp;
					if (isVector) {
						const box = svgBox(renderInput.toString('utf8'));
						// Rasterise at a density that yields at least the target width
						const density = box ? Math.min(2400, Math.max(72, Math.ceil(72 * width / box.width))) : 300;
						image = sharp(renderInput, { density }).resize({ width });
					} else {
						const meta = await sharp(renderInput).metadata();
						const w = meta.width ?? width;
						const h = meta.height ?? width;
						image = sharp(renderInput).extend({
							left: Math.round(w * padX / 100), right: Math.round(w * padX / 100),
							top: Math.round(h * padY / 100), bottom: Math.round(h * padY / 100),
							background: { r: 0, g: 0, b: 0, alpha: 0 },
						}).resize({ width, withoutEnlargement: true });
					}
					entries.push({ name: `${folder}/png/${folder}-${width}px.png`, data: await image.png().toBuffer() });
				} catch {
					// Skip renders the source format cannot produce; originals are still included.
				}
			}
		}

		for (const file of variant.files ?? []) {
			const extra = await readUpload(file.url);
			if (!extra) continue;
			entries.push({ name: `${folder}/${slug(file.label || 'soubor')}${extra.ext}`, data: extra.data });
		}
	}

	if (!entries.length) error(404, 'No downloadable logo files');

	const zip = createZip(entries);
	const name = slug(String(config.heading || 'logo-pack'));
	return new Response(new Uint8Array(zip), {
		headers: {
			'Content-Type': 'application/zip',
			'Content-Disposition': `attachment; filename="${name}.zip"`,
			'Content-Length': String(zip.length),
			'Cache-Control': 'private, no-store',
		},
	});
};
