import { describe, expect, it } from 'vitest';
import {
	hasManualAccessGrant,
	isEmailAllowed,
	manualAccessGrant,
	safeReturnPath,
	verifyManualPassword
} from '../../src/lib/server/manual-access';
import { withoutManualPassword, withoutManualSecrets } from '../../src/lib/server/brand-settings';

describe('manual access', () => {
	it('accepts exact and wildcard-domain email rules', () => {
		const rules = ['owner@example.com', '*@partner.com'];
		expect(isEmailAllowed('OWNER@example.com', rules)).toBe(true);
		expect(isEmailAllowed('designer@partner.com', rules)).toBe(true);
		expect(isEmailAllowed('designer@evilpartner.com', rules)).toBe(false);
	});

	it('only allows local return paths and prevents the access loop', () => {
		expect(safeReturnPath('/logos?theme=dark')).toBe('/logos?theme=dark');
		expect(safeReturnPath('//malicious.example')).toBe('/');
		expect(safeReturnPath('https://malicious.example')).toBe('/');
		expect(safeReturnPath('/access?return=/access')).toBe('/');
	});

	it('signs grants and invalidates them when the stored password changes', () => {
		const secret = 'test-session-secret-with-32-characters';
		const grant = manualAccessGrant('password-hash-a', secret);
		expect(hasManualAccessGrant(grant, 'password-hash-a', secret)).toBe(true);
		expect(hasManualAccessGrant(grant, 'password-hash-b', secret)).toBe(false);
	});

	it('supports legacy plain-text manual passwords during migration', async () => {
		expect(await verifyManualPassword('correct horse', 'correct horse')).toBe(true);
		expect(await verifyManualPassword('wrong', 'correct horse')).toBe(false);
	});
});

describe('brand settings serialization', () => {
	it('removes secrets without mutating the database row', () => {
		const row = { name: 'Brand', accessPassword: 'hash', emailWhitelist: ['a@example.com'] };
		expect(withoutManualPassword(row)).toEqual({ name: 'Brand', emailWhitelist: ['a@example.com'] });
		expect(withoutManualSecrets(row)).toEqual({ name: 'Brand' });
		expect(row.accessPassword).toBe('hash');
	});
});
