import type { Job } from 'bullmq';
import sharp from 'sharp';
import { dirname, join } from 'path';
import { mkdir } from 'fs/promises';
import { safeJoin } from './pathGuard.js';
import { UPLOAD_DIR } from '../env.js';

export type ConvertFormat = 'webp' | 'avif';

export interface ConvertJobData {
	assetId: string;
	storagePath: string;
	format: ConvertFormat;
}

/**
 * Converts an image asset to WebP or AVIF and saves alongside the original.
 * Returns the relative storagePath of the converted file.
 */
export async function convertProcessor(job: Job<ConvertJobData>): Promise<{ convertedPath: string }> {
	const { storagePath, format } = job.data;
	const source = safeJoin(storagePath);

	// Output sits next to the original: same dir, same stem, new extension
	const stem = source.replace(/(\.[^./\\]+)$/, '');
	const outAbs = `${stem}.converted.${format}`;

	await mkdir(dirname(outAbs), { recursive: true });

	const sharpInst = sharp(source).resize({
		width: 4096, height: 4096,
		fit: 'inside', withoutEnlargement: true
	});

	if (format === 'webp') {
		await sharpInst.webp({ quality: 85, effort: 5 }).toFile(outAbs);
	} else {
		await sharpInst.avif({ quality: 60, effort: 6 }).toFile(outAbs);
	}

	// Return relative path (strip UPLOAD_DIR prefix)
	const rel = outAbs.startsWith(UPLOAD_DIR)
		? outAbs.slice(UPLOAD_DIR.length).replace(/^[\\/]/, '')
		: outAbs;

	return { convertedPath: rel };
}
