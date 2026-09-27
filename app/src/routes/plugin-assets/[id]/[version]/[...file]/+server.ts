/**
 * Public files of enabled runtime plugins: client.js and anything under
 * public/. The version in the URL lets browsers cache them for good.
 */
import { error } from '@sveltejs/kit';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import type { RequestHandler } from './$types';
import { pluginAssetPath } from '$server/runtime-plugins';

const TYPES: Record<string, string> = {
	'.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
	'.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
	'.gif': 'image/gif', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain',
};

export const GET: RequestHandler = async ({ params }) => {
	const path = await pluginAssetPath(params.id, params.version, params.file);
	if (!path) error(404, 'Not found');
	return new Response(await readFile(path), {
		headers: {
			'content-type': TYPES[extname(path).toLowerCase()] ?? 'application/octet-stream',
			'cache-control': 'public, max-age=31536000, immutable',
			'x-content-type-options': 'nosniff',
		},
	});
};
