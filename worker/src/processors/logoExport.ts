import type { Job } from 'bullmq';
import sharp from 'sharp';
import { safeJoin } from './pathGuard.js';

const EXPORT_FORMATS: Array<{ ext: string; format: 'png' | 'webp'; width: number }> = [
	{ ext: 'png', format: 'png', width: 1024 },
	{ ext: 'webp', format: 'webp', width: 1024 },
	{ ext: '2x.png', format: 'png', width: 2048 }
];

export async function logoExportProcessor(job: Job<{ assetId: string; storagePath: string }>) {
	const source = safeJoin(job.data.storagePath);

	for (const { ext, format, width } of EXPORT_FORMATS) {
		const out = source.replace(/\.svg$/i, `_export_${ext}`);
		await sharp(source).resize(width).toFormat(format).toFile(out);
	}
}
