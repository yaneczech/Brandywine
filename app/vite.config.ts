import { sveltekit } from '@sveltejs/kit/vite';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		sveltekit(),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			strategy: ['cookie', 'baseLocale'],
			cookieName: 'paraglide_lang'
		})
	],
	test: {
		include: ['src/**/*.test.ts', 'tests/unit/**/*.test.ts'],
		environment: 'node'
	}
});
