/**
 * In-memory cache for the manual default language.
 * The setting changes rarely; fetching it on every public request
 * would add a DB round-trip to each page load.
 * Cache TTL: 60 s. Invalidated when settings are saved.
 */
type LanguageTag = 'en' | 'cs';

let _cache: { lang: LanguageTag; expiresAt: number } | null = null;

export function getLangCache(): LanguageTag | null {
	if (_cache && _cache.expiresAt > Date.now()) return _cache.lang;
	return null;
}

export function setLangCache(lang: LanguageTag, ttlMs = 60_000) {
	_cache = { lang, expiresAt: Date.now() + ttlMs };
}

export function invalidateLangCache() {
	_cache = null;
}
