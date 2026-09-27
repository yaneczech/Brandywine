/** Rich text: sanitised HTML items, the legacy Markdown fallback and sandboxed HTML previews. */
import { sanitizeRichHtml } from '$lib/utils/sanitize-rich-html';

export type RichContentItem = { type: 'text' | 'attention' | 'alert'; html: string };

export function escapeHtml(value: string) {
	return value
		.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

/** Minimal Markdown (paragraphs, line breaks, **bold**, *italic*) for legacy content */
export function markdownFallback(value: unknown) {
	const text = String(value ?? '').trim();
	if (!text) return '';
	const inline = (s: string) => s
		.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
		.replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<em>$2</em>');
	return text.split(/\n{2,}/).map(part => `<p>${inline(escapeHtml(part)).replace(/\n/g, '<br>')}</p>`).join('');
}

/** A block's `content` items (sanitised), or its legacy `markdown` as one text item */
export function richContent(config: Record<string, unknown>): RichContentItem[] {
	if (Array.isArray(config.content)) {
		return config.content
			.map((item) => {
				const record = item as Record<string, unknown>;
				const type: RichContentItem['type'] =
					record.type === 'attention' || record.type === 'alert' ? record.type : 'text';
				return { type, html: sanitizeRichHtml(record.html) };
			})
			.filter((item) => item.html.trim());
	}
	const fallback = markdownFallback(config.markdown);
	return fallback ? [{ type: 'text', html: fallback }] : [];
}

/** Standalone document for an `<iframe srcdoc>`; a strict CSP blocks scripts and network access */
export function sandboxedHtmlPreview(value: unknown): string {
	return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src 'unsafe-inline' https:; font-src https: data:;"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html{color-scheme:light}body{margin: 16px;font:14px/1.5 system-ui,sans-serif;color:#171717}</style></head><body>${String(value ?? '')}</body></html>`;
}
