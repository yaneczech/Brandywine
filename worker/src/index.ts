import { Worker } from 'bullmq';
import { queues } from './queues.js';

const connection = { url: process.env.REDIS_URL ?? 'redis://redis:6379' };

for (const queue of queues) {
	const worker = new Worker(queue.name, queue.process, { connection });
	if (queue.onCompleted) {
		const onCompleted = queue.onCompleted;
		worker.on('completed', (job, result) => {
			onCompleted(job, result).catch((e: Error) => console.error(`[${queue.name}] saving the result failed:`, e.message));
		});
	}
	worker.on('failed', (job, err) => {
		console.error(`[${queue.name}] job ${job?.id} failed:`, err.message);
	});
}

console.log(`Brandywine worker started — queues: ${queues.map((q) => q.name).join(', ')}`);
