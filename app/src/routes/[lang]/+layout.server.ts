import type { LayoutServerLoad } from './$types';
import { error } from '@sveltejs/kit';

const SUPPORTED_LANGS = ['en', 'cs'];

export const load: LayoutServerLoad = async ({ params, locals }) => {
	if (!SUPPORTED_LANGS.includes(params.lang)) {
		error(404, 'Language not supported');
	}
	return { lang: params.lang, user: locals.user };
};
