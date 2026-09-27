import { describe, expect, it } from 'vitest';
import { adminModules, adminNav, moduleForPath } from '../../src/lib/modules';
import { hasRole } from '../../src/lib/auth/roles';

describe('roles', () => {
	it('orders member < editor < admin', () => {
		expect(hasRole('admin', 'editor')).toBe(true);
		expect(hasRole('editor', 'editor')).toBe(true);
		expect(hasRole('editor', 'admin')).toBe(false);
		expect(hasRole('member', 'editor')).toBe(false);
		expect(hasRole('unknown', 'member')).toBe(false);
		expect(hasRole(null, 'member')).toBe(false);
	});
});

describe('admin modules', () => {
	it('registers the built-in modules once', () => {
		const ids = adminModules.map((mod) => mod.id);
		expect(new Set(ids).size).toBe(ids.length);
		expect(ids).toEqual(expect.arrayContaining(['dashboard', 'brand', 'colors', 'typography', 'assets', 'manual', 'users', 'settings']));
	});

	it('hides admin-only modules from editors', () => {
		const hrefs = (role: string) => adminNav(role).flatMap((g) => g.items.map((i) => i.href));
		expect(hrefs('admin')).toEqual(expect.arrayContaining(['/admin/brand', '/admin/users', '/admin/settings']));
		expect(hrefs('editor')).not.toContain('/admin/users');
		expect(hrefs('editor')).not.toContain('/admin/brand');
		expect(hrefs('editor')).toContain('/admin/colors');
		expect(adminNav('editor').map((g) => g.group)).not.toContain('admin');
		expect(adminNav('member')).toEqual([]);
	});

	it('maps paths to the most specific module', () => {
		expect(moduleForPath('/admin')?.id).toBe('dashboard');
		expect(moduleForPath('/admin/users')?.id).toBe('users');
		expect(moduleForPath('/admin/manual/abc123')?.id).toBe('manual');
		expect(moduleForPath('/admin/usersettings')).toBeUndefined();
		expect(moduleForPath('/admin/login')).toBeUndefined();
	});
});
