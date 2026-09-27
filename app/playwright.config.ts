import { defineConfig } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';

export default defineConfig({
	use: { baseURL },
	webServer: process.env.E2E_BASE_URL ? undefined : {
		command: 'npm run build && node --env-file-if-exists=.env build',
		port: 3000,
		reuseExistingServer: !process.env.CI
	},
	testDir: 'tests/e2e',
	testMatch: '**/*.test.ts'
});
