const ALLOWED_TAGS = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'h3', 'h4', 'a']);
const VOID_TAGS = new Set(['br']);

function safeHref(value: string): string | null {
	const normalized = value.trim().replace(/&colon;/gi, ':');
	if (/^(https?:|mailto:|tel:|\/|#)/i.test(normalized)) return normalized;
	return null;
}

function escapeAttribute(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

/**
 * Sanitizes the small rich-text subset emitted by the manual editor.
 * All element attributes are removed except a conservative href/title subset on links.
 */
export function sanitizeRichHtml(value: unknown): string {
	return String(value ?? '')
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/<[^>]*>/g, (token) => {
			const match = token.match(/^<\s*(\/?)\s*([a-z0-9]+)([\s\S]*?)\/?\s*>$/i);
			if (!match) return '';

			const closing = Boolean(match[1]);
			const tag = match[2].toLowerCase();
			const attributes = match[3] ?? '';
			if (!ALLOWED_TAGS.has(tag)) return '';
			if (closing) return VOID_TAGS.has(tag) ? '' : `</${tag}>`;
			if (tag !== 'a') return `<${tag}>`;

			const hrefMatch = attributes.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i);
			const titleMatch = attributes.match(/\btitle\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
			const href = safeHref(hrefMatch?.[1] ?? hrefMatch?.[2] ?? hrefMatch?.[3] ?? '');
			const title = titleMatch?.[1] ?? titleMatch?.[2];
			const safeAttributes = [
				href ? `href="${escapeAttribute(href)}"` : '',
				title ? `title="${escapeAttribute(title)}"` : '',
				href?.startsWith('http') ? 'rel="noopener noreferrer"' : ''
			].filter(Boolean).join(' ');
			return safeAttributes ? `<a ${safeAttributes}>` : '<a>';
		});
}
