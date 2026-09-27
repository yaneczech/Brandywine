import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { getTextDirection, locales } from '$lib/paraglide/runtime';
import { getSession } from '$server/auth';
import { db } from '$lib/db';
import { brandSettings } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { getLangCache, setLangCache } from '$lib/server/lang-cache';

type LanguageTag = 'en' | 'cs';

const LANG_COOKIE_NAME = 'paraglide_lang';
const DEFAULT_LANGUAGE: LanguageTag = 'en';

function isAdminRoute(pathname: string) {
	return pathname === '/admin' || pathname.startsWith('/admin/');
}

function isPublicManualRoute(pathname: string) {
	return !isAdminRoute(pathname) &&
		pathname !== '/api' && !pathname.startsWith('/api/') &&
		pathname !== '/uploads' && !pathname.startsWith('/uploads/');
}

function languageFromCookie(event: Parameters<Handle>[0]['event']): LanguageTag {
	const cookieLang = event.cookies.get(LANG_COOKIE_NAME);
	return cookieLang && (locales as readonly string[]).includes(cookieLang) ? (cookieLang as LanguageTag) : DEFAULT_LANGUAGE;
}

async function manualContentLanguage(): Promise<LanguageTag> {
	const cached = getLangCache();
	if (cached) return cached as LanguageTag;

	const [settings] = await db
		.select({ defaultLanguage: brandSettings.defaultLanguage })
		.from(brandSettings)
		.where(eq(brandSettings.id, 1));

	const lang: LanguageTag = settings?.defaultLanguage === 'cs' ? 'cs' : 'en';
	setLangCache(lang);
	return lang;
}

const languageHandle: Handle = async ({ event, resolve }) => {
	return paraglideMiddleware(event.request, async ({ request, locale }) => {
		event.request = request;
		const lang = isPublicManualRoute(event.url.pathname)
			? await manualContentLanguage()
			: (locales.includes(locale) ? locale : languageFromCookie(event)) as LanguageTag;
		const textDirection = getTextDirection(lang);
		event.locals.paraglide = { lang, textDirection };

		const response = await resolve(event, {
			transformPageChunk: ({ html }) => html
				.replace('%lang%', lang)
				.replace('%dir%', textDirection)
		});
		response.headers.append('Vary', 'Cookie');
		return response;
	});
};

const authHandle: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get('session');
	if (sessionId) {
		event.locals.user = await getSession(sessionId) ?? undefined;
	}
	return resolve(event);
};

export const handle: Handle = sequence(languageHandle, authHandle);
