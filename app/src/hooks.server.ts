import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import { i18n } from '$lib/i18n';
import { isAvailableLanguageTag, setLanguageTag } from '$lib/paraglide/runtime';
import { getSession } from '$server/auth';
import { AsyncLocalStorage } from 'node:async_hooks';
import { db } from '$lib/db';
import { brandSettings } from '$lib/db/schema';
import { eq } from 'drizzle-orm';

type LanguageTag = 'en' | 'cs';

const LANG_COOKIE_NAME = 'paraglide_lang';
const DEFAULT_LANGUAGE: LanguageTag = 'en';
const adminLanguageContext = new AsyncLocalStorage<LanguageTag>();
const paraglideHandle = i18n.handle();

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
	return isAvailableLanguageTag(cookieLang) ? (cookieLang as LanguageTag) : DEFAULT_LANGUAGE;
}

async function manualContentLanguage(): Promise<LanguageTag> {
	const [settings] = await db
		.select({ defaultLanguage: brandSettings.defaultLanguage })
		.from(brandSettings)
		.where(eq(brandSettings.id, 1));

	return settings?.defaultLanguage === 'cs' ? 'cs' : 'en';
}

async function resolveWithLanguage(event: Parameters<Handle>[0]['event'], resolve: Parameters<Handle>[0]['resolve'], lang: LanguageTag) {
	const textDirection = 'ltr';
	event.locals.paraglide = { lang, textDirection };
	setLanguageTag(() => adminLanguageContext.getStore() ?? DEFAULT_LANGUAGE);

	return adminLanguageContext.run(lang, async () => {
		const response = await resolve(event, {
			transformPageChunk({ html, done }) {
				if (!done) return html;
				return html
					.replace('%paraglide.lang%', lang)
					.replace('%paraglide.textDirection%', textDirection);
			}
		});
		response.headers.append('Vary', 'cookie');
		return response;
	});
}

const adminLanguageHandle: Handle = async ({ event, resolve }) => {
	if (!isAdminRoute(event.url.pathname)) {
		if (isPublicManualRoute(event.url.pathname)) {
			return resolveWithLanguage(event, resolve, await manualContentLanguage());
		}
		return paraglideHandle({ event, resolve });
	}

	const lang = languageFromCookie(event);
	return resolveWithLanguage(event, resolve, lang);
};

const authHandle: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get('session');
	if (sessionId) {
		event.locals.user = await getSession(sessionId) ?? undefined;
	}
	return resolve(event);
};

export const handle: Handle = sequence(adminLanguageHandle, authHandle);
