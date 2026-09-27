import js from '@eslint/js';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';

export default [
	js.configs.recommended,
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node
			}
		}
	},
	{
		files: ['**/*.ts'],
		plugins: { '@typescript-eslint': ts },
		languageOptions: {
			parser: tsParser,
			globals: { ...globals.node }
		},
		rules: {
			...ts.configs.recommended.rules,
			'no-undef': 'off' // TypeScript handles this
		}
	},
	...svelte.configs['flat/recommended'],
	{
		// Svelte 5 rune modules (*.svelte.ts) need the Svelte parser with TS inside
		files: ['**/*.svelte.ts'],
		languageOptions: {
			parser: svelte.configs['flat/recommended'].find((c) => c.languageOptions?.parser)?.languageOptions.parser,
			parserOptions: { parser: tsParser }
		}
	},
	{
		files: ['**/*.svelte'],
		plugins: { '@typescript-eslint': ts },
		languageOptions: {
			parserOptions: { parser: tsParser }
		},
		rules: {
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': ['error', {
				argsIgnorePattern: '^_',
				varsIgnorePattern: '^_',
				caughtErrorsIgnorePattern: '^_'
			}],
			// Paraglide i18n link rule — disable until Paraglide is fully wired up
			'svelte/no-navigation-without-resolve': 'off'
		}
	},
	{
		ignores: ['.svelte-kit/', 'build/', 'node_modules/', 'src/lib/paraglide/']
	}
];
