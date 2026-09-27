/**
 * Hierarchical chapter numbers for the public manual: top-level pages are
 * 1, 2, 3…, their subpages 1.1, 1.2…, and so on down the tree; titled
 * sections inside a page continue the page's number (1.2.1, 1.2.2…).
 * Order follows the navigation (sortOrder, then title); the landing page is
 * not a chapter and gets no number. A page's own titled sections come first,
 * so its subpages continue after them: with two sections on page 1, its first
 * subpage is 1.3 — every number on the page stays unique. A page that shows
 * its subpages first (subpagesPosition 'start') flips this: subpages take
 * 1.1, 1.2… and the sections continue after them.
 */
export type NumberablePage = {
	id: string;
	parentId: string | null;
	isLanding?: boolean | null;
	sortOrder?: number | null;
	title?: string | null;
	subpagesPosition?: string | null;
};

export function pageNumbers(pages: NumberablePage[], sectionCounts: Record<string, number> = {}): Map<string, string> {
	const byParent = new Map<string | null, NumberablePage[]>();
	for (const p of pages) {
		if (p.isLanding) continue;
		const key = p.parentId ?? null;
		(byParent.get(key) ?? byParent.set(key, []).get(key)!).push(p);
	}
	const cmp = (a: NumberablePage, b: NumberablePage) =>
		(a.sortOrder ?? 0) - (b.sortOrder ?? 0) || String(a.title ?? '').localeCompare(String(b.title ?? ''));
	const byId = new Map(pages.map((p) => [p.id, p]));
	const out = new Map<string, string>();
	const walk = (parentId: string | null, prefix: string) => {
		const kids = [...(byParent.get(parentId) ?? [])].sort(cmp);
		const offset = parentId && byId.get(parentId)?.subpagesPosition !== 'start' ? (sectionCounts[parentId] ?? 0) : 0;
		kids.forEach((p, i) => {
			const n = prefix ? `${prefix}.${offset + i + 1}` : String(i + 1);
			out.set(p.id, n);
			walk(p.id, n);
		});
	};
	// Pages whose parent is the landing page belong to the top level
	const landing = pages.find((p) => p.isLanding);
	if (landing) {
		for (const p of byParent.get(landing.id) ?? []) (byParent.get(null) ?? byParent.set(null, []).get(null)!).push(p);
		byParent.delete(landing.id);
	}
	walk(null, '');
	return out;
}

/**
 * Numbers for the titled sections of a page, in reading order. `offset` skips
 * numbers already taken by subpages shown before the sections.
 */
export function sectionNumbers(pageNumber: string | undefined, headings: (string | null | undefined)[], offset = 0): (string | null)[] {
	let i = offset;
	return headings.map((h) => (pageNumber && h && h.trim() ? `${pageNumber}.${++i}` : null));
}
