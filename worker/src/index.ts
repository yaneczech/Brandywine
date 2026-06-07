import { Worker } from 'bullmq';
import { eq, sql } from 'drizzle-orm';
import { thumbnailProcessor, type ThumbnailResult } from './processors/thumbnail.js';
import { svgProcessor } from './processors/svg.js';
import { logoExportProcessor } from './processors/logoExport.js';
import { videoProcessor } from './processors/video.js';
import { convertProcessor } from './processors/convert.js';
import { db, assets } from './db.js';
import { UPLOAD_DIR } from './env.js';

const connection = { url: process.env.REDIS_URL ?? 'redis://redis:6379' };

/** Convert absolute path to relative (strip UPLOAD_DIR prefix) */
function toRel(abs: string): string {
	return abs.startsWith(UPLOAD_DIR)
		? abs.slice(UPLOAD_DIR.length).replace(/^[\\/]/, '')
		: abs;
}

// ── Thumbnail ──────────────────────────────────────────────────────────────
const thumbWorker = new Worker('thumbnail', thumbnailProcessor, { connection });

thumbWorker.on('completed', async (job, result: ThumbnailResult) => {
	const assetId = job.data.assetId;
	if (!assetId) return;

	const relThumb      = result.thumbPath ? toRel(result.thumbPath) : null;
	const relPageThumbs = result.pageThumbs.map(toRel);

	// Merge page metadata into existing metadata JSONB
	await db.update(assets).set({
		thumbnailPath: relThumb,
		// Merge pageCount + pageThumbs into existing metadata using Postgres jsonb ||
		metadata: sql`COALESCE(${assets.metadata}, '{}'::jsonb) || ${JSON.stringify({
			pageCount:  result.pageCount,
			pageThumbs: relPageThumbs,
		})}::jsonb`,
		updatedAt: new Date(),
	}).where(eq(assets.id, assetId))
	  .catch(e => console.error('[thumbnail] db write-back failed:', e.message));

	console.log(`[thumbnail] ${assetId} → ${relThumb} (${result.pageCount} page${result.pageCount !== 1 ? 's' : ''})`);
});

thumbWorker.on('failed', (job, err) => {
	console.error(`[thumbnail] job ${job?.id} failed:`, err.message);
});

// ── Video ──────────────────────────────────────────────────────────────────
const videoWorker = new Worker('video', videoProcessor, { connection });

videoWorker.on('completed', async (job, result: { thumbPath: string | null }) => {
	if (!result?.thumbPath || !job.data.assetId) return;
	const rel = toRel(result.thumbPath);
	await db.update(assets)
		.set({ thumbnailPath: rel, updatedAt: new Date() })
		.where(eq(assets.id, job.data.assetId))
		.catch(e => console.error('[video] db write-back failed:', e.message));
	console.log(`[video] ${job.data.assetId} → ${rel}`);
});

videoWorker.on('failed', (job, err) => {
	console.error(`[video] job ${job?.id} failed:`, err.message);
});

// ── Convert ────────────────────────────────────────────────────────────────
const convertWorker = new Worker('convert', convertProcessor, { connection });

convertWorker.on('completed', async (job, result: { convertedPath: string | null }) => {
	if (!result?.convertedPath || !job.data.assetId) return;
	const { assetId, format } = job.data;

	// Read current convertedPaths, merge in the new format
	const [row] = await db.select({ convertedPaths: assets.convertedPaths })
		.from(assets).where(eq(assets.id, assetId)).limit(1)
		.catch(() => [] as { convertedPaths: { webp?: string; avif?: string } | null }[]);

	const merged = { ...(row?.convertedPaths ?? {}), [format]: result.convertedPath };
	await db.update(assets)
		.set({ convertedPaths: merged, updatedAt: new Date() })
		.where(eq(assets.id, assetId))
		.catch(e => console.error('[convert] db write-back failed:', e.message));
	console.log(`[convert] ${assetId} → ${format}: ${result.convertedPath}`);
});

convertWorker.on('failed', (job, err) => {
	console.error(`[convert] job ${job?.id} failed:`, err.message);
});

// ── Other queues ───────────────────────────────────────────────────────────
new Worker('svg-process', svgProcessor,        { connection });
new Worker('logo-export', logoExportProcessor,  { connection });

console.log('Brandywine worker started — queues: thumbnail, video, convert, svg-process, logo-export');
