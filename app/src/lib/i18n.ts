import { createI18n } from '@inlang/paraglide-sveltekit';
import * as runtime from '$lib/paraglide/runtime';

export const i18n = createI18n(runtime, {
	defaultLanguageTag: 'en',
	// Admin routes don't use URL-based lang prefix — language comes from cookie
	exclude: [/^\/admin(\/.*)?$/, /^\/api(\/.*)?$/]
});
