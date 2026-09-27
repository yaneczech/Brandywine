import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { isValidWebhookUrl, newWebhookSecret, parseEvents, signBody } from '../../src/lib/server/webhooks';

describe('webhooks', () => {
	it('signs the raw body with HMAC-SHA256', () => {
		const body = '{"event":"ping"}';
		expect(signBody('s3cret', body)).toBe('sha256=' + createHmac('sha256', 's3cret').update(body).digest('hex'));
	});

	it('generates long random secrets', () => {
		const a = newWebhookSecret(), b = newWebhookSecret();
		expect(a).toMatch(/^[0-9a-f]{48}$/);
		expect(a).not.toBe(b);
	});

	it('accepts only http(s) URLs', () => {
		expect(isValidWebhookUrl('https://example.com/hook')).toBe(true);
		expect(isValidWebhookUrl('http://127.0.0.1:5199/hook')).toBe(true);
		expect(isValidWebhookUrl('ftp://example.com')).toBe(false);
		expect(isValidWebhookUrl('javascript:alert(1)')).toBe(false);
		expect(isValidWebhookUrl('not a url')).toBe(false);
		expect(isValidWebhookUrl(42)).toBe(false);
	});

	it('accepts known events only, de-duplicated', () => {
		expect(parseEvents(undefined)).toEqual([]);
		expect(parseEvents(['page.saved', 'page.saved'])).toEqual(['page.saved']);
		expect(() => parseEvents(['page.exploded'])).toThrow();
		expect(() => parseEvents('page.saved')).toThrow();
	});
});
