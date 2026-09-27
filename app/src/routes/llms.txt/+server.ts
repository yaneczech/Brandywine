/**
 * GET /llms.txt — entry point for AI agents (https://llmstxt.org): what this
 * site is and where the machine-readable manual and the MCP server live.
 */
import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { canReadManual, loadManualSnapshot, pagePath } from '$server/manual-export';

export const GET: RequestHandler = async ({ url, locals, cookies }) => {
	if (!(await canReadManual(locals.user, cookies))) error(403, 'Manual access required');
	const snap = await loadManualSnapshot(url.origin);
	const pages = snap.pages
		.filter((p) => !p.isLanding)
		.map((p) => `- [${p.title}](${url.origin}${pagePath(p, snap.pages)})${p.description ? `: ${p.description}` : ''}`);
	const body = [
		`# ${snap.brandName} — Brand manual`,
		'',
		`> Official brand guidelines for ${snap.brandName}: logo, colours, typography, tone of voice and assets.`,
		'',
		'## Machine-readable',
		'',
		`- [Full manual as Markdown](${url.origin}/api/manual/export.md): every page, colour code, typeface and rule in one file`,
		`- [MCP server](${url.origin}/api/mcp): read-only Model Context Protocol endpoint (Streamable HTTP) with list_pages, get_page, search, get_colors and get_typography`,
		`- [Design tokens](${url.origin}/api/brand/tokens.json): colour design tokens as JSON`,
		'',
		'## Pages',
		'',
		...pages,
		'',
	].join('\n');
	return new Response(body, {
		headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'private, max-age=300' },
	});
};
