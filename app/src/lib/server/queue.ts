import { Queue } from 'bullmq';
import { env } from '$env/dynamic/private';

const connection = { url: env.REDIS_URL ?? 'redis://127.0.0.1:6379' };

const queues = new Map<string, Queue>();

function getQueue(name: string): Queue {
	const existing = queues.get(name);
	if (existing) return existing;
	const queue = new Queue(name, { connection });
	queues.set(name, queue);
	return queue;
}

export async function enqueueThumbnail(assetId: string, storagePath: string, mime: string) {
	await getQueue('thumbnail').add('generate', { assetId, storagePath, mime });
}

export async function enqueueSvgProcess(assetId: string, storagePath: string) {
	await getQueue('svg-process').add('process', { assetId, storagePath });
}

export async function enqueueLogoExport(assetId: string, storagePath: string) {
	await getQueue('logo-export').add('export', { assetId, storagePath });
}

export async function enqueueConvert(assetId: string, storagePath: string, format: 'webp' | 'avif') {
	await getQueue('convert').add('convert', { assetId, storagePath, format });
}

export async function enqueueVideo(assetId: string, storagePath: string) {
	await getQueue('video').add('generate', { assetId, storagePath });
}
