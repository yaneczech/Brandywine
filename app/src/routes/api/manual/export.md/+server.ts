/**
 * GET /api/manual/export.md — the whole published manual as one Markdown file,
 * ready to attach to ChatGPT, Claude or any other AI tool.
 */
import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { canReadManual, loadManualSnapshot, manualMarkdown } from '$server/manual-export';

export const GET: RequestHandler = async ({ url, locals, cookies }) => {
	if (!(await canReadManual(locals.user, cookies))) error(403, 'Manual access required');
	const snap = await loadManualSnapshot(url.origin);
	const slug = snap.brandName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'brand';
	const download = url.searchParams.has('download');
	return new Response(manualMarkdown(snap), {
		headers: {
			'Content-Type': 'text/markdown; charset=utf-8',
			'Cache-Control': 'private, no-store',
			...(download ? { 'Content-Disposition': `attachment; filename="${slug}-brand-manual.md"` } : {}),
		},
	});
};
