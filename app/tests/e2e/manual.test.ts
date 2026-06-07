import { test, expect } from '@playwright/test';

test('brand manual home redirects or loads', async ({ page }) => {
	await page.goto('/en/manual');
	await expect(page).not.toHaveURL('/error');
});

test('admin login page is accessible', async ({ page }) => {
	await page.goto('/admin');
	// Should redirect to login when unauthenticated
	await expect(page.url()).toContain('login');
});
