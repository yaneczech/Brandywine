/**
 * Every queue the worker serves. To add one: write a processor in
 * src/processors/, add a definition here, and enqueue jobs with the same
 * name from the app (app/src/lib/server/queue.ts).
 */
import { eq, sql } from 'drizzle-orm';
import { defineQueue, toRel, type QueueDefinition } from './queue.js';
import { thumbnailProcessor, type ThumbnailResult } from './processors/thumbnail.js';
import { svgProcessor } from './processors/svg.js';
import { logoExportProcessor } from './processors/logoExport.js';
import { videoProcessor } from './processors/video.js';
import { convertProcessor, type ConvertJobData } from './processors/convert.js';
import { db, assets } from './db.js';

export const queues: QueueDefinition[] = [
	defineQueue({
		name: 'thumbnail',
		process: thumbnailProcessor,
		async onCompleted(job, result: ThumbnailResult) {
			const assetId = job.data.assetId;
			if (!assetId) return;
			const relThumb = result.thumbPath ? toRel(result.thumbPath) : null;
			const relPageThumbs = result.pageThumbs.map(toRel);
			await db.update(assets).set({
				thumbnailPath: relThumb,
				// Merge pageCount + pageThumbs into the existing metadata (Postgres jsonb ||)
				metadata: sql`COALESCE(${assets.metadata}, '{}'::jsonb) || ${JSON.stringify({
					pageCount: result.pageCount,
					pageThumbs: relPageThumbs,
				})}::jsonb`,
				updatedAt: new Date(),
			}).where(eq(assets.id, assetId));
			console.log(`[thumbnail] ${assetId} → ${relThumb} (${result.pageCount} page${result.pageCount !== 1 ? 's' : ''})`);
		},
	}),

	defineQueue({
		name: 'video',
		process: videoProcessor,
		async onCompleted(job, result: { thumbPath: string | null }) {
			if (!result?.thumbPath || !job.data.assetId) return;
			const rel = toRel(result.thumbPath);
			await db.update(assets)
				.set({ thumbnailPath: rel, updatedAt: new Date() })
				.where(eq(assets.id, job.data.assetId));
			console.log(`[video] ${job.data.assetId} → ${rel}`);
		},
	}),

	defineQueue({
		name: 'convert',
		process: convertProcessor,
		async onCompleted(job: { data: ConvertJobData }, result: { convertedPath: string | null }) {
			if (!result?.convertedPath || !job.data.assetId) return;
			const { assetId, format } = job.data;
			// Merge the new format into the asset's convertedPaths
			const [row] = await db.select({ convertedPaths: assets.convertedPaths })
				.from(assets).where(eq(assets.id, assetId)).limit(1);
			const merged = { ...(row?.convertedPaths ?? {}), [format]: result.convertedPath };
			await db.update(assets)
				.set({ convertedPaths: merged, updatedAt: new Date() })
				.where(eq(assets.id, assetId));
			console.log(`[convert] ${assetId} → ${format}: ${result.convertedPath}`);
		},
	}),

	defineQueue({ name: 'svg-process', process: svgProcessor }),
	defineQueue({ name: 'logo-export', process: logoExportProcessor }),
];
