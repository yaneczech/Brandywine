import type { Job } from 'bullmq';
import { UPLOAD_DIR } from './env.js';

/**
 * One background queue: the processor that does the work and an optional
 * hook that stores the result (usually on the asset row). The app enqueues
 * jobs by the same `name` (app/src/lib/server/queue.ts).
 */
export type QueueDefinition<Data = any, Result = any> = {
	name: string;
	process: (job: Job<Data>) => Promise<Result>;
	onCompleted?: (job: Job<Data>, result: Result) => Promise<void>;
};

export function defineQueue<Data, Result>(definition: QueueDefinition<Data, Result>): QueueDefinition<Data, Result> {
	return definition;
}

/** Absolute path under UPLOAD_DIR → the relative storage path the app expects */
export function toRel(abs: string): string {
	return abs.startsWith(UPLOAD_DIR)
		? abs.slice(UPLOAD_DIR.length).replace(/^[\\/]/, '')
		: abs;
}
