/** URL paths of manual pages. Client-safe. */

type PathPage = { id: string; parentId: string | null; slug: string; isLanding?: boolean | null };

/**
 * Public path of a page: its ancestors' slugs joined, e.g. `/logo/symbol`.
 * The landing page is the manual root (`/`), and its children sit at the top level.
 */
export function manualPagePath(page: PathPage, pages: PathPage[]): string {
	const parts: string[] = [];
	let cur: PathPage | undefined = page;
	for (let depth = 0; cur && !cur.isLanding && depth < 32; depth++) {
		parts.unshift(cur.slug);
		cur = pages.find((p) => p.id === cur!.parentId);
	}
	return `/${parts.join('/')}`;
}
