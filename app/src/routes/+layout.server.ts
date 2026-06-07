import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, depends }) => {
	// Re-run this load whenever the language changes (invalidate key used by ParaglideJS)
	depends('paraglide:lang');

	// Pass the language resolved by i18n.handle() (reads paraglide_lang cookie) to the client
	// so ParaglideJS can initialise correctly even for excluded routes (e.g. /admin/*)
	const lang = (locals.paraglide as { lang?: string } | undefined)?.lang ?? 'en';
	return { user: locals.user, lang };
};
