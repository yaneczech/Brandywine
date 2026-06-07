import type { Job } from 'bullmq';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { safeJoin } from './pathGuard.js';

const execFileAsync = promisify(execFile);

export async function videoProcessor(job: Job<{ assetId: string; storagePath: string }>) {
	const source = safeJoin(job.data.storagePath);
	const thumb = source.replace(/\.[^.]+$/, '_thumb.jpg');

	await execFileAsync('ffmpeg', [
		'-i', source,
		'-ss', '00:00:01',
		'-vframes', '1',
		'-q:v', '2',
		'-y', thumb
	]);
}
