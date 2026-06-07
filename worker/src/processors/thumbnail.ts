import type { Job } from 'bullmq';
import sharp from 'sharp';
import { dirname } from 'path';
import { mkdir } from 'fs/promises';
import { safeJoin } from './pathGuard.js';

const SIZES = [200, 400, 800];

export async function thumbnailProcessor(job: Job<{ assetId: string; storagePath: string }>) {
	const source = safeJoin(job.data.storagePath);

	for (const size of SIZES) {
		const outPath = source.replace(/(\.[^.]+)$/, `_${size}w$1`);
		await mkdir(dirname(outPath), { recursive: true });
		await sharp(source).resize(size, size, { fit: 'inside', withoutEnlargement: true }).toFile(outPath);
	}
}
