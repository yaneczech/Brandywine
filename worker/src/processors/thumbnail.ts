import type { Job } from 'bullmq';
import sharp from 'sharp';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { dirname } from 'path';
import { mkdir, unlink } from 'fs/promises';
import { safeJoin } from './pathGuard.js';

const execFileAsync = promisify(execFile);
const THUMB_SIZE  = 400;
const MAX_PAGES   = 20;  // generate at most 20 page thumbs per PDF

export interface ThumbnailResult {
	thumbPath:  string | null;  // page 1 (also stored as thumbnailPath in assets)
	pageCount:  number;
	pageThumbs: string[];       // relative paths for all generated pages
}

// ── GS helpers ────────────────────────────────────────────────────────────

async function gsPageCount(source: string): Promise<number> {
	try {
		const { stdout } = await execFileAsync('gs', [
			'-q', '-dNODISPLAY', '-dBATCH', '-dNOPAUSE', '-dNOSAFER',
			'-c', `(${source}) (r) file runpdfbegin pdfpagecount = quit`,
		]);
		const n = parseInt(stdout.trim(), 10);
		return isNaN(n) ? 1 : n;
	} catch {
		return 1;
	}
}

async function gsRenderPage(source: string, page: number, tmpPng: string): Promise<boolean> {
	try {
		await execFileAsync('gs', [
			'-dBATCH', '-dNOPAUSE', '-dSAFER',
			`-dFirstPage=${page}`, `-dLastPage=${page}`,
			'-sDEVICE=png16m',
			'-r150',
			`-sOutputFile=${tmpPng}`,
			source,
		]);
		return true;
	} catch {
		return false;
	}
}

async function pdfPageThumb(source: string, page: number, outWebp: string): Promise<boolean> {
	const tmpPng = outWebp.replace(/\.webp$/, `_gs_p${page}.png`);
	try {
		const ok = await gsRenderPage(source, page, tmpPng);
		if (!ok) return false;
		await sharp(tmpPng)
			.resize(THUMB_SIZE, THUMB_SIZE, { fit: 'inside', withoutEnlargement: true })
			.webp({ quality: 82, effort: 4 })
			.toFile(outWebp);
		return true;
	} finally {
		await unlink(tmpPng).catch(() => {});
	}
}

// ── Main processor ────────────────────────────────────────────────────────

function isPdf(mime: string) {
	return mime === 'application/pdf' || mime === 'application/postscript';
}

export async function thumbnailProcessor(
	job: Job<{ assetId: string; storagePath: string; mime?: string }>
): Promise<ThumbnailResult> {
	const source = safeJoin(job.data.storagePath);
	const mime   = job.data.mime ?? '';
	const stem   = source.replace(/(\.[^./\\]+)$/, '');

	await mkdir(dirname(stem + '_thumb.webp'), { recursive: true });

	// ── PDF / AI / EPS ─────────────────────────────────────────────────────
	if (isPdf(mime)) {
		const pageCount = await gsPageCount(source);
		const limit     = Math.min(pageCount, MAX_PAGES);
		const pageThumbs: string[] = [];

		for (let p = 1; p <= limit; p++) {
			const outWebp = p === 1 ? `${stem}_thumb.webp` : `${stem}_p${p}_thumb.webp`;
			const ok = await pdfPageThumb(source, p, outWebp);
			if (ok) pageThumbs.push(outWebp);
			else break; // stop on first failure
		}

		return {
			thumbPath:  pageThumbs[0] ?? null,
			pageCount,
			pageThumbs,
		};
	}

	// ── Raster / SVG images ────────────────────────────────────────────────
	if (mime.startsWith('image/') || mime === '') {
		const outWebp = `${stem}_thumb.webp`;
		const opts    = mime === 'image/svg+xml' ? { density: 150 } : {};
		await sharp(source, opts)
			.resize(THUMB_SIZE, THUMB_SIZE, { fit: 'inside', withoutEnlargement: true })
			.webp({ quality: 82, effort: 4 })
			.toFile(outWebp);
		return { thumbPath: outWebp, pageCount: 1, pageThumbs: [outWebp] };
	}

	return { thumbPath: null, pageCount: 1, pageThumbs: [] };
}
