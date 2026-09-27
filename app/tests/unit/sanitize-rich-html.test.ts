import { describe, expect, it } from 'vitest';
import { sanitizeRichHtml } from '../../src/lib/utils/sanitize-rich-html';

describe('sanitizeRichHtml', () => {
	it('keeps the editor formatting subset and safe links', () => {
		expect(sanitizeRichHtml('<p><strong>Brand</strong> <a href="https://example.com" title="Guide">guide</a></p>'))
			.toBe('<p><strong>Brand</strong> <a href="https://example.com" title="Guide" rel="noopener noreferrer">guide</a></p>');
	});

	it('removes executable elements and event attributes', () => {
		const value = '<script>alert(1)</script><img src=x onerror=alert(2)><p onclick="alert(3)">Safe</p>';
		expect(sanitizeRichHtml(value)).toBe('alert(1)<p>Safe</p>');
	});

	it('drops unsafe link protocols, including encoded colons', () => {
		expect(sanitizeRichHtml('<a href="javascript:alert(1)">bad</a>')).toBe('<a>bad</a>');
		expect(sanitizeRichHtml('<a href="javascript&colon;alert(1)">bad</a>')).toBe('<a>bad</a>');
		expect(sanitizeRichHtml('<a href="/downloads/logo.svg">good</a>')).toBe('<a href="/downloads/logo.svg">good</a>');
	});
});
