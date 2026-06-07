import { sveltekit } from '@sveltejs/kit/vite';
import { paraglide } from '@inlang/paraglide-sveltekit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		paraglide({ project: './project.inlang', outdir: './src/lib/paraglide' }),
		sveltekit()
	],
	// Prevent Vite SSR module runner from losing exports on HMR reload
	// when paraglide/runtime.js hot-updates and invalidates the cache
	ssr: {
		noExternal: ['@inlang/paraglide-sveltekit']
	},
	optimizeDeps: {
		exclude: ['@inlang/paraglide-sveltekit']
	},
	test: {
		include: ['src/**/*.test.ts', 'tests/unit/**/*.test.ts'],
		environment: 'node'
	}
});
