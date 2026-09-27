import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	compilerOptions: {
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		adapter: adapter({ out: 'build' }),
		alias: {
			$db: 'src/lib/db',
			$server: 'src/lib/server',
			// Installed plugins live next to app/, in the installation's plugins/ folder
			$plugins: '../plugins'
		},
		typescript: {
			// Type-check plugins together with the app
			config: (config) => {
				config.include.push('../../plugins/**/*.ts', '../../plugins/**/*.svelte');
			}
		}
	}
};

export default config;
