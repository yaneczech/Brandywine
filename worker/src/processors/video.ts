import type { Job } from 'bullmq';
import { execFile } from 'child_process';
import { promisify } from 'util';
import sharp from 'sharp';
import { unlink } from 'fs/promises';
import { safeJoin } from './pathGuard.js';

const execFileAsync = promisify(execFile);

export async function videoProcessor(job: Job<{ assetId: string; storagePath: string }>) {
	const source = safeJoin(job.data.storagePath);
	// Extract raw frame via ffmpeg, then optimise to WebP via Sharp
	const rawJpg  = source.replace(/\.[^.]+$/, '_thumb_raw.jpg');
	const webpOut = source.replace(/\.[^.]+$/, '_thumb.webp');

	await execFileAsync('ffmpeg', [
		'-i', source,
		'-ss', '00:00:01',
		'-vframes', '1',
		'-q:v', '2',
		'-y', rawJpg
	]);

	await sharp(rawJpg)
		.resize(400, 400, { fit: 'inside', withoutEnlargement: true })
		.webp({ quality: 82, effort: 4 })
		.toFile(webpOut);

	await unlink(rawJpg).catch(() => {});
	return { thumbPath: webpOut };
}
