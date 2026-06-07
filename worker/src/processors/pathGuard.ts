import { resolve } from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? '/uploads';
const RESOLVED_UPLOAD_DIR = resolve(UPLOAD_DIR);

export function safeJoin(relativePath: string): string {
	const full = resolve(UPLOAD_DIR, relativePath);
	if (!full.startsWith(RESOLVED_UPLOAD_DIR + '/') && full !== RESOLVED_UPLOAD_DIR) {
		throw new Error(`Path traversal attempt: ${relativePath}`);
	}
	return full;
}
