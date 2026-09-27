/** Link helpers for blocks that point outside the manual. */

export function isExternal(href: string): boolean {
	return /^https?:\/\//i.test(href);
}

export function hostOf(href: string): string {
	try { return new URL(href).hostname.replace(/^www\./, ''); } catch { return ''; }
}

/** Bare domains get https://; site paths, anchors, mailto: and tel: stay as they are */
export function linkHref(href: string): string {
	if (isExternal(href) || /^(\/|#|mailto:|tel:)/.test(href)) return href;
	return `https://${href}`;
}
