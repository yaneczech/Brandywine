import { describe, expect, it } from 'vitest';
import { actionEmail } from '../../src/lib/server/email';

describe('actionEmail', () => {
	const mail = actionEmail({
		title: 'Sign-in link', body: 'Click <here>', action: 'Sign in', footer: 'Ignore if unexpected',
		textIntro: 'Open this link:', link: 'https://brand.example.com/api/auth/magic?token=a&b="c"',
	});

	it('puts the link in the plain-text version', () => {
		expect(mail.text).toBe('Open this link:\n\nhttps://brand.example.com/api/auth/magic?token=a&b="c"\n\nIgnore if unexpected');
	});

	it('escapes copy and the link in HTML', () => {
		expect(mail.html).toContain('Click &lt;here&gt;');
		expect(mail.html).toContain('href="https://brand.example.com/api/auth/magic?token=a&amp;b=&quot;c&quot;"');
	});
});
