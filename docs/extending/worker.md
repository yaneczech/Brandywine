# Adding a worker queue

The worker (`worker/`) does slow media work outside the web request:
thumbnails, PDF page previews, video posters, format conversions, SVG
clean-up, logo exports. The app puts a job on a Redis queue; the worker picks
it up, writes files into the uploads volume and stores the result.

## 1. Write the processor

```ts
// worker/src/processors/palette.ts
import type { Job } from 'bullmq';
import sharp from 'sharp';
import { safeJoin } from './pathGuard.js';

export interface PaletteJobData { assetId: string; storagePath: string }

/** Dominant colour of an image asset */
export async function paletteProcessor(job: Job<PaletteJobData>): Promise<{ hex: string }> {
	const source = safeJoin(job.data.storagePath); // never trust paths from the queue
	const { dominant } = await sharp(source).stats();
	const hex = '#' + [dominant.r, dominant.g, dominant.b].map((v) => v.toString(16).padStart(2, '0')).join('');
	return { hex };
}
```

## 2. Register the queue

Add an entry to `worker/src/queues.ts`:

```ts
defineQueue({
	name: 'palette',
	process: paletteProcessor,
	async onCompleted(job, result) {
		// store the result, e.g. on the asset row
	},
}),
```

`worker/src/index.ts` starts a worker for every entry and logs failures.

## 3. Enqueue from the app

Add a function to `app/src/lib/server/queue.ts` using the same queue name and
call it where the job should start (usually after an upload in
`app/src/routes/api/assets/+server.ts`):

```ts
export async function enqueuePalette(assetId: string, storagePath: string) {
	await getQueue('palette').add('extract', { assetId, storagePath });
}
```

## Develop

```bash
docker compose -f docker-compose.yml -f compose.dev.yml up -d db redis
cd worker
npm install
DATABASE_URL=postgresql://brandywine:…@localhost:5432/brandywine \
REDIS_URL=redis://localhost:6379 UPLOAD_DIR=../uploads npm run dev
npm run check
```

System tools the processors call (FFmpeg, Ghostscript) are installed in
`worker/Dockerfile`; add new ones there.
