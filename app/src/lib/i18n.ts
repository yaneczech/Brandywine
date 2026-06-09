import { createI18n } from '@inlang/paraglide-sveltekit';
import * as runtime from '$lib/paraglide/runtime';

export const i18n = createI18n(runtime, {
	defaultLanguageTag: 'en',
	// Admin language comes from cookie; public manual content language comes from Brand Settings.
	exclude: [/^\/admin(\/.*)?$/, /^\/api(\/.*)?$/, /^\/uploads(\/.*)?$/, /^\/(?!(admin|api|uploads)(\/|$)).*/]
});
