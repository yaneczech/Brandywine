import { Queue } from 'bullmq';
import { REDIS_URL } from '$env/static/private';

const connection = { url: REDIS_URL };

export const thumbnailQueue = new Queue('thumbnail', { connection });
export const svgProcessQueue = new Queue('svg-process', { connection });
export const logoExportQueue = new Queue('logo-export', { connection });

export async function enqueueThumbnail(assetId: string, storagePath: string) {
	await thumbnailQueue.add('generate', { assetId, storagePath });
}

export async function enqueueSvgProcess(assetId: string, storagePath: string) {
	await svgProcessQueue.add('process', { assetId, storagePath });
}

export async function enqueueLogoExport(assetId: string, storagePath: string) {
	await logoExportQueue.add('export', { assetId, storagePath });
}
