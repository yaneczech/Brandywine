import { Worker } from 'bullmq';
import { thumbnailProcessor } from './processors/thumbnail.js';
import { svgProcessor } from './processors/svg.js';
import { logoExportProcessor } from './processors/logoExport.js';
import { videoProcessor } from './processors/video.js';

const connection = { url: process.env.REDIS_URL ?? 'redis://redis:6379' };

new Worker('thumbnail', thumbnailProcessor, { connection });
new Worker('svg-process', svgProcessor, { connection });
new Worker('logo-export', logoExportProcessor, { connection });
new Worker('video', videoProcessor, { connection });

console.log('Brandywine worker started — queues: thumbnail, svg-process, logo-export, video');
