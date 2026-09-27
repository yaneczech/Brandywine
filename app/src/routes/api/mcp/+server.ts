/**
 * Read-only MCP server for the brand manual (Model Context Protocol, Streamable
 * HTTP transport, JSON responses only). Lets AI assistants — Claude, ChatGPT,
 * Cursor, VS Code — read pages, colours and typography while they work.
 *
 * Access follows the manual's access mode: public manuals are open; protected
 * ones require a session that can view the manual.
 */
import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import {
	canReadManual, colorsMarkdown, loadManualSnapshot, manualMarkdown, pageMarkdown, pagePath,
	searchManual, typographyMarkdown, type ManualSnapshot,
} from '$server/manual-export';

const SUPPORTED_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];

type RpcRequest = { jsonrpc: '2.0'; id?: string | number | null; method: string; params?: Record<string, unknown> };
type RpcResponse = { jsonrpc: '2.0'; id: string | number | null; result?: unknown; error?: { code: number; message: string } };

const TOOLS = [
	{
		name: 'list_pages',
		description: 'List all pages of the brand manual with their path, parent and short description.',
		inputSchema: { type: 'object', properties: {}, additionalProperties: false },
		annotations: { readOnlyHint: true },
	},
	{
		name: 'get_page',
		description: 'Get the full content of one manual page as Markdown (texts, rules, colour codes, typefaces, asset links). Identify the page by its path (e.g. "/logo") or title.',
		inputSchema: {
			type: 'object',
			properties: {
				path: { type: 'string', description: 'Page path as returned by list_pages, e.g. "/logo/usage"' },
				title: { type: 'string', description: 'Page title, used when path is not given' },
			},
			additionalProperties: false,
		},
		annotations: { readOnlyHint: true },
	},
	{
		name: 'search',
		description: 'Full-text search across the brand manual. Returns the best matching pages with a short excerpt.',
		inputSchema: {
			type: 'object',
			properties: {
				query: { type: 'string', description: 'Words to look for' },
				limit: { type: 'number', description: 'Maximum number of results (default 5)' },
			},
			required: ['query'],
			additionalProperties: false,
		},
		annotations: { readOnlyHint: true },
	},
	{
		name: 'get_colors',
		description: 'All brand colours grouped by palette, with HEX, RGB, CMYK and production references (Pantone, RAL…).',
		inputSchema: { type: 'object', properties: {}, additionalProperties: false },
		annotations: { readOnlyHint: true },
	},
	{
		name: 'get_typography',
		description: 'Brand typefaces with weights, roles, licences and the defined text styles (size, line height, weight, tracking).',
		inputSchema: { type: 'object', properties: {}, additionalProperties: false },
		annotations: { readOnlyHint: true },
	},
	{
		name: 'get_full_manual',
		description: 'The entire brand manual as a single Markdown document. Prefer get_page or search for focused questions.',
		inputSchema: { type: 'object', properties: {}, additionalProperties: false },
		annotations: { readOnlyHint: true },
	},
];

function text(value: string, isError = false) {
	return { content: [{ type: 'text', text: value }], ...(isError ? { isError: true } : {}) };
}

function callTool(name: string, args: Record<string, unknown>, snap: ManualSnapshot) {
	switch (name) {
		case 'list_pages': {
			const lines = snap.pages.map((p) => {
				const parent = snap.pages.find((x) => x.id === p.parentId);
				return `- ${p.isLanding ? '/' : pagePath(p, snap.pages)} — ${p.title}${p.isLanding ? ' (home)' : ''}${parent && !parent.isLanding ? ` [in ${parent.title}]` : ''}${p.description ? `: ${p.description}` : ''}`;
			});
			return text(lines.join('\n') || 'The manual has no pages yet.');
		}
		case 'get_page': {
			const rawPath = typeof args.path === 'string' ? args.path.trim() : '';
			const path = rawPath ? `/${rawPath.replace(/^\/+|\/+$/g, '')}` : null; // "/" = home page
			const title = String(args.title ?? '').trim().toLowerCase();
			const byPath = path ? snap.pages.find((p) => (p.isLanding ? '/' : pagePath(p, snap.pages)) === path) : undefined;
			const page = byPath
				?? (title ? snap.pages.find((p) => p.title.toLowerCase() === title) ?? snap.pages.find((p) => p.title.toLowerCase().includes(title)) : undefined);
			if (!page) return text('Page not found. Call list_pages to see the available paths.', true);
			return text(pageMarkdown(page, snap));
		}
		case 'search': {
			const query = String(args.query ?? '').trim();
			if (!query) return text('Provide a query.', true);
			const limit = Math.min(20, Math.max(1, Number(args.limit) || 5));
			const results = searchManual(snap, query, limit);
			if (!results.length) return text(`No results for "${query}".`);
			return text(results.map(({ page }) => {
				const md = pageMarkdown(page, snap);
				const idx = md.toLowerCase().indexOf(query.toLowerCase().split(/\s+/)[0]);
				const excerpt = md.slice(Math.max(0, idx - 160), idx + 240).replace(/\s+/g, ' ').trim();
				return `## ${page.title} (${pagePath(page, snap.pages)})\n…${excerpt}…`;
			}).join('\n\n'));
		}
		case 'get_colors':
			return text(colorsMarkdown(snap) || 'No colours defined.');
		case 'get_typography':
			return text(typographyMarkdown(snap) || 'No typefaces defined.');
		case 'get_full_manual':
			return text(manualMarkdown(snap));
		default:
			return null;
	}
}

async function handle(req: RpcRequest, origin: string, getSnap: () => Promise<ManualSnapshot>): Promise<RpcResponse | null> {
	const id = req.id ?? null;
	const isNotification = req.id === undefined;
	const ok = (result: unknown): RpcResponse => ({ jsonrpc: '2.0', id, result });
	const fail = (code: number, message: string): RpcResponse => ({ jsonrpc: '2.0', id, error: { code, message } });

	if (req?.jsonrpc !== '2.0' || typeof req.method !== 'string') return fail(-32600, 'Invalid request');
	if (req.method.startsWith('notifications/')) return null;

	switch (req.method) {
		case 'initialize': {
			const requested = String(req.params?.protocolVersion ?? '');
			const snap = await getSnap();
			return ok({
				protocolVersion: SUPPORTED_VERSIONS.includes(requested) ? requested : SUPPORTED_VERSIONS[0],
				capabilities: { tools: { listChanged: false } },
				serverInfo: { name: 'brandywine-manual', title: `${snap.brandName} brand manual`, version: '1.0.0' },
				instructions: `Read-only access to the ${snap.brandName} brand manual (${origin}). Use search or list_pages first, then get_page. Always follow the manual's rules when producing content for this brand.`,
			});
		}
		case 'ping':
			return ok({});
		case 'tools/list':
			return ok({ tools: TOOLS });
		case 'tools/call': {
			const name = String(req.params?.name ?? '');
			const args = (req.params?.arguments ?? {}) as Record<string, unknown>;
			const result = callTool(name, args, await getSnap());
			return result ? ok(result) : fail(-32602, `Unknown tool: ${name}`);
		}
		case 'resources/list':
			return ok({ resources: [] });
		case 'prompts/list':
			return ok({ prompts: [] });
		default:
			return isNotification ? null : fail(-32601, `Method not found: ${req.method}`);
	}
}

export const POST: RequestHandler = async ({ request, url, locals, cookies }) => {
	if (!(await canReadManual(locals.user, cookies))) {
		return json({ jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Manual access required' } }, { status: 403 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, { status: 400 });
	}

	// One snapshot per HTTP request, loaded lazily
	let snapPromise: Promise<ManualSnapshot> | null = null;
	const getSnap = () => (snapPromise ??= loadManualSnapshot(url.origin));

	const batch = Array.isArray(body);
	const requests = (batch ? body : [body]) as RpcRequest[];
	const responses = (await Promise.all(requests.map((r) => handle(r, url.origin, getSnap)))).filter((r): r is RpcResponse => r !== null);

	// Only notifications → 202 Accepted without a body (per Streamable HTTP)
	if (!responses.length) return new Response(null, { status: 202 });
	return json(batch ? responses : responses[0], { headers: { 'Cache-Control': 'no-store' } });
};

// No server-initiated stream: this server only answers requests.
export const GET: RequestHandler = () =>
	new Response('Method Not Allowed — use POST (MCP Streamable HTTP)', { status: 405, headers: { Allow: 'POST' } });

export const DELETE: RequestHandler = () => new Response(null, { status: 405, headers: { Allow: 'POST' } });
