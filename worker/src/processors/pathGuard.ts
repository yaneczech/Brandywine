import { resolve } from 'path';
import { UPLOAD_DIR } from '../env.js';

const RESOLVED_UPLOAD_DIR = resolve(UPLOAD_DIR);

/** Absolute path of an upload; throws when the relative path escapes UPLOAD_DIR */
export function safeJoin(relativePath: string): string {
	const full = resolve(UPLOAD_DIR, relativePath);
	if (!full.startsWith(RESOLVED_UPLOAD_DIR + '/') && full !== RESOLVED_UPLOAD_DIR) {
		throw new Error(`Path traversal attempt: ${relativePath}`);
	}
	return full;
}
