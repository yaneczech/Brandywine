import { test, expect } from '@playwright/test';

test('manual home responds with visible content', async ({ page }) => {
	const response = await page.goto('/');
	expect(response?.status()).toBe(200);
	await expect(page.locator('h1')).toBeVisible();
});

test('admin requires authentication', async ({ page }) => {
	await page.goto('/admin');
	await expect(page).toHaveURL(/\/admin\/(login|setup)(?:\?|$)/);
	await expect(page.locator('input[type="email"]')).toBeVisible();
});

test('unknown manual page returns a real 404', async ({ request }) => {
	const response = await request.get('/__brandywine_missing_page__');
	expect(response.status()).toBe(404);
});
