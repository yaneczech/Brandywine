<script lang="ts">
	import type { PageData } from './$types';
	import BlockRenderer from '$lib/components/manual/BlockRenderer.svelte';
	import ManualHero from '$lib/components/manual/ManualHero.svelte';
	import PageCards from '$lib/components/manual/PageCards.svelte';
	import * as m from '$lib/paraglide/messages';
	import { useManualStrings, toManualLanguage } from '$lib/manual/ui-strings';
	import { pageNumbers, sectionNumbers } from '$lib/manual/numbering';
	import { IconArrowLeft, IconArrowRight, IconChevronDown, IconChevronRight } from '$lib/icons';

	const { data }: { data: PageData } = $props();
	const strings = useManualStrings();
	const t = $derived(strings());

	type TocItem = { anchor: string; label: string; number?: string | null };
	type NavPage = {
		id: string; parentId: string | null;
		title: string; slug: string;
		sortOrder: number; isLanding: boolean;
	};

	const manualLanguage = $derived(toManualLanguage(data.settings?.defaultLanguage));
	// Chapter numbering (brand setting): page number from the tree, sections continue it
	const chapterNumbers = $derived(data.settings?.manualNumbering ? pageNumbers(data.pages ?? [], data.sectionCounts ?? {}) : new Map<string, string>());
	const pageNumber = $derived(chapterNumbers.get(data.page.id));
	const blockNumbers = $derived.by(() => {
		// Same rule as the layout's section count: enabled, titled, not a divider
		const blocks = (data.blocks ?? []) as { id: string; type: string; enabled?: boolean; config: Record<string, unknown> }[];
		// Subpages shown first take the first numbers; sections continue after them
		const offset = subpagesAt === 'start' ? (data.pages ?? []).filter((p: { parentId: string | null }) => p.parentId === data.page.id).length : 0;
		const nums = sectionNumbers(pageNumber, blocks.map((b) => (b.enabled === false || b.type === 'divider' ? null : String(b.config?.heading ?? ''))), offset);
		return new Map(blocks.map((b, i) => [b.id, nums[i]]));
	});
	const toc = $derived(
		(data.blocks ?? [])
			.filter((b: { type: string; anchor: string | null; config: Record<string, unknown> }) =>
				b.type !== 'divider' && (b.anchor || b.config?.heading)
			)
			.map((b: { id: string; anchor: string | null; config: Record<string, unknown> }) => ({
				anchor: b.anchor ?? slugify(String(b.config.heading ?? '')),
				label: String(b.config.heading ?? b.anchor ?? ''),
				number: blockNumbers.get(b.id) ?? null
			}))
			.filter((item: TocItem) => item.label && item.anchor)
	);

	// ── Tree helpers ────────────────────────────────────────────────────────
	const allPages = $derived((data.pages ?? []) as NavPage[]);

	function pageHref(p: NavPage): string {
		const parts: string[] = [];
		let cur: NavPage | undefined = p;
		while (cur && !cur.isLanding) {
			parts.unshift(cur.slug);
			cur = allPages.find(x => x.id === cur!.parentId);
		}
		return `/${parts.join('/')}`;
	}

	function childrenOf(parentId: string | null): NavPage[] {
		return allPages
			.filter(p => p.parentId === parentId && !p.isLanding)
			.sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
	}

	// Reading order = depth-first walk of the whole tree, so prev/next flows
	// from the last page of one section into the first page of the next.
	const readingOrder = $derived.by(() => {
		const out: NavPage[] = [];
		const walk = (parentId: string | null, depth = 0) => {
			if (depth > 12) return;
			for (const p of childrenOf(parentId)) {
				out.push(p);
				walk(p.id, depth + 1);
			}
		};
		walk(null);
		return out;
	});
	const currentIdx = $derived(readingOrder.findIndex(p => p.id === data.page.id));
	const prevPage = $derived(currentIdx > 0 ? readingOrder[currentIdx - 1] : null);
	const nextPage = $derived(currentIdx >= 0 && currentIdx < readingOrder.length - 1 ? readingOrder[currentIdx + 1] : null);

	const breadcrumbs = $derived.by(() => {
		const crumbs: NavPage[] = [];
		let cur = allPages.find(p => p.id === data.page.parentId);
		while (cur && !cur.isLanding) {
			crumbs.unshift(cur);
			cur = allPages.find(p => p.id === cur!.parentId);
		}
		return crumbs;
	});
	const landingTitle = $derived(allPages.find(p => p.isLanding)?.title ?? t.home);
	const currentHref = $derived(pageHref(data.page as NavPage));
	const subpagesAt = $derived(data.page.subpagesPosition === 'start' ? 'start' : 'end');

	// ── Scroll-spy for ToC ──────────────────────────────────────────────────
	let activeAnchor = $state<string | null>(null);
	let mobileTocOpen = $state(false);

	$effect(() => {
		const tocItems = toc;
		if (!tocItems.length || typeof window === 'undefined') return;

		let raf = 0;
		function update() {
			const offset = Math.min(260, window.innerHeight * 0.3);
			let found: string | null = tocItems[0]?.anchor ?? null;
			for (const item of tocItems) {
				const el = document.getElementById(item.anchor);
				if (el && el.getBoundingClientRect().top - offset <= 0) found = item.anchor;
			}
			// At the very bottom, highlight the last section even if it is short
			if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
				found = tocItems[tocItems.length - 1].anchor;
			}
			activeAnchor = found;
		}

		const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onScroll, { passive: true });
		update();

		return () => {
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', onScroll);
			cancelAnimationFrame(raf);
		};
	});

	function slugify(s: string): string {
		return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
	}
</script>

<div class="manual-page">
	<ManualHero
		title={data.page.title}
		number={pageNumber}
		description={data.page.description}
		featureImage={data.page.featureImage}
		heroBgSize={data.page.heroBgSize}
		bgColor={data.page.bgColor}
		textColor={data.page.textColor}
	>
		{#snippet eyebrow()}
			<nav class="breadcrumbs" aria-label="Breadcrumb">
				<ol>
					<li><a href="/">{landingTitle}</a></li>
					{#each breadcrumbs as crumb (crumb.id)}
						<li><IconChevronRight size={12} stroke={2} aria-hidden="true" /><a href={pageHref(crumb)}>{crumb.title}</a></li>
					{/each}
				</ol>
			</nav>
		{/snippet}
	</ManualHero>

	<div class="page-layout" class:has-toc={toc.length > 1}>
		{#if toc.length > 1}
			<details class="toc-mobile" bind:open={mobileTocOpen}>
				<summary>
					<span class="toc-mobile-title">
						<span>{t.onThisPage}</span>
						<small>({toc.length})</small>
					</span>
					<IconChevronDown size={16} stroke={2} class="toc-mobile-chevron" />
				</summary>
				<nav aria-label={t.onThisPage}>
					{#each toc as item (item.anchor)}
						<a href="#{item.anchor}" class:active={activeAnchor === item.anchor} onclick={() => (mobileTocOpen = false)}>
							{#if item.number}<span class="toc-num">{item.number}</span>{/if}
							<span class="toc-mobile-link-title">{item.label}</span>
						</a>
					{/each}
				</nav>
			</details>
		{/if}

		<article class="article">
			{#snippet subpages()}
				{#if data.childPages?.length}
					<section class="subpages" class:at-start={subpagesAt === 'start'} aria-labelledby="subpages-heading">
						<h2 id="subpages-heading" class="subpages-heading">{t.subpages}</h2>
						<PageCards pages={data.childPages} baseHref={currentHref} previews={data.previews} numbers={chapterNumbers} />
					</section>
				{/if}
			{/snippet}

			{#if subpagesAt === 'start'}{@render subpages()}{/if}

			{#if data.blocks.length}
				<div class="blocks">
					{#each data.blocks as block (block.id)}
						<BlockRenderer {block}
							sectionNumber={blockNumbers.get(block.id) ?? null}
							colorRows={data.colorRows ?? []}
							paletteRows={data.paletteRows ?? []}
							fontRows={data.fontRows ?? []}
							styleRows={data.styleRows ?? []}
							fontFileRows={data.fontFileRows ?? []}
							assetRows={data.assetRows ?? []}
							html={data.runtimeHtml?.[block.id]}
						/>
					{/each}
				</div>
			{:else if !data.childPages?.length}
				<section class="empty">
					<p>{m.manual_empty_blocks({}, { locale: manualLanguage })}</p>
				</section>
			{/if}

			{#if subpagesAt === 'end'}{@render subpages()}{/if}

			{#if prevPage || nextPage}
				<nav class="page-nav" aria-label="{t.previous} / {t.next}">
					{#if prevPage}
						<a href={pageHref(prevPage)} class="page-nav-item prev" rel="prev">
							<span class="page-nav-dir"><IconArrowLeft size={14} stroke={2} /> {t.previous}</span>
							<span class="page-nav-title">{#if chapterNumbers.get(prevPage.id)}<span class="toc-num">{chapterNumbers.get(prevPage.id)}</span>{/if}{prevPage.title}</span>
						</a>
					{:else}
						<span></span>
					{/if}
					{#if nextPage}
						<a href={pageHref(nextPage)} class="page-nav-item next" rel="next">
							<span class="page-nav-dir">{t.next} <IconArrowRight size={14} stroke={2} /></span>
							<span class="page-nav-title">{#if chapterNumbers.get(nextPage.id)}<span class="toc-num">{chapterNumbers.get(nextPage.id)}</span>{/if}{nextPage.title}</span>
						</a>
					{/if}
				</nav>
			{/if}
		</article>

		{#if toc.length > 1}
			<aside class="toc">
				<div class="toc-label">{t.onThisPage}</div>
				<nav aria-label={t.onThisPage}>
					{#each toc as item (item.anchor)}
						<a href="#{item.anchor}" class="toc-link" class:active={activeAnchor === item.anchor} aria-current={activeAnchor === item.anchor ? 'location' : undefined}>{#if item.number}<span class="toc-num">{item.number}</span>{/if}{item.label}</a>
					{/each}
				</nav>
			</aside>
		{/if}
	</div>
</div>

<style>
	.manual-page { width: 100%; }

	.breadcrumbs ol {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px 8px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.breadcrumbs li { display: inline-flex; align-items: center; gap: 8px; opacity: .92; }
	.breadcrumbs a { color: inherit; text-decoration: none; }
	.breadcrumbs a:hover { text-decoration: underline; text-underline-offset: 3px; }

	.page-layout {
		width: min(100%, 1180px);
		padding-right: var(--manual-page-pad);
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: clamp(40px, 4vw, 72px);
		align-items: start;
	}
	.page-layout.has-toc { grid-template-columns: minmax(0, 1fr) 200px; }
	.article { min-width: 0; }
	/* Editorial rhythm: a titled block opens a new section (hairline + generous
	   space); an untitled block continues the section above it, so it follows
	   at reading distance instead of chapter distance. */
	.blocks {
		display: flex;
		flex-direction: column;
		container-type: inline-size;
		container-name: manual-blocks;
	}
	.blocks > :global(* + .manual-block) { margin-top: var(--manual-flow-gap); }
	.blocks > :global(* + .manual-block:not(.no-context)) {
		margin-top: var(--manual-section-gap);
		padding-top: var(--manual-section-gap-inner);
		border-top: 1px solid var(--manual-border);
	}

	/* ── ToC ─────────────────────────────────────────────────────────────── */
	.toc {
		position: sticky;
		top: calc(var(--manual-topbar) + 32px);
		max-height: calc(100dvh - var(--manual-topbar) - 64px);
		overflow-y: auto;
		scrollbar-width: none;
	}
	.toc-label {
		margin-bottom: 12px;
		color: var(--manual-ink);
		font-size: var(--text-xs);
		font-weight: 600;
	}
	.toc nav { display: flex; flex-direction: column; border-left: 1px solid var(--manual-border); }
	.toc-link {
		position: relative;
		display: block;
		margin-left: -1px;
		padding: 8px 0 8px 16px;
		border-left: 1px solid transparent;
		color: var(--manual-muted);
		text-decoration: none;
		font-size: var(--text-sm);
		line-height: 1.4;
		transition: color .15s ease, border-color .15s ease;
	}
	.toc-link:hover { color: var(--manual-ink); }
	.toc-num { margin-right: .5em; font-variant-numeric: tabular-nums; opacity: .8; }
	.toc-mobile .toc-num { margin-right: .5em; font-variant-numeric: tabular-nums; }
	.toc-link.active { color: var(--manual-ink); border-left-color: var(--manual-brand); font-weight: 500; }

	.toc-mobile { display: none; }

	.empty {
		padding: 40px;
		border: 1px dashed var(--manual-border-strong);
		border-radius: var(--manual-radius);
		color: var(--manual-muted);
	}
	.empty p { margin: 0; }

	/* ── Sub-pages ───────────────────────────────────────────────────────── */
	.subpages { margin-top: var(--manual-section-gap); }
	.subpages.at-start { margin-top: 0; }
	.subpages.at-start:not(:last-child) { margin-bottom: var(--manual-section-gap); }
	.subpages-heading {
		margin: 0 0 20px;
		font-family: var(--manual-font-heading, var(--manual-font));
		font-size: var(--text-lg);
		font-weight: 600;
		letter-spacing: var(--tracking-snug);
	}

	/* ── Prev / next ─────────────────────────────────────────────────────── */
	.page-nav {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
		margin-top: clamp(4rem, 7vw, 6rem);
		padding-top: 32px;
		border-top: 1px solid var(--manual-border);
	}
	/* Previous / next: typeset links on the closing rule, no boxes */
	.page-nav-item {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
		padding: 4px 0;
		text-decoration: none;
		color: inherit;
	}
	.page-nav-item.next { text-align: right; align-items: flex-end; }
	.page-nav-dir {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-size: var(--text-xs);
		font-weight: 500;
		color: var(--manual-muted);
	}
	.page-nav-title {
		font-size: var(--text-lg);
		font-weight: 500;
		color: var(--manual-ink);
		line-height: 1.3;
	}
	.page-nav-item:hover .page-nav-title { text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 4px; }

	@media (max-width: 1180px) {
		.page-layout,
		.page-layout.has-toc { grid-template-columns: minmax(0, 1fr); }
		.toc { display: none; }
		.toc-mobile {
			display: block;
			position: sticky;
			top: var(--manual-topbar);
			z-index: 20;
			margin-bottom: 24px;
			border-block: 1px solid var(--manual-border-strong);
			background: color-mix(in srgb, var(--manual-ink) 4%, var(--manual-paper));
			-webkit-backdrop-filter: blur(12px);
			backdrop-filter: blur(12px);
		}
		.toc-mobile summary {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 12px;
			min-height: 52px;
			padding: 0;
			font-size: var(--text-sm);
			font-weight: 500;
			list-style: none;
			cursor: pointer;
		}
		.toc-mobile summary::-webkit-details-marker { display: none; }
		.toc-mobile-title { display: inline-flex; align-items: baseline; gap: 8px; color: var(--manual-ink); }
		.toc-mobile-title small {
			color: var(--manual-muted); font-family: var(--manual-mono); font-size: var(--text-2xs);
			font-weight: 400; font-variant-numeric: tabular-nums;
		}
		.toc-mobile :global(.toc-mobile-chevron) { transition: transform .18s ease; color: var(--manual-ink); }
		.toc-mobile[open] :global(.toc-mobile-chevron) { transform: rotate(180deg); }
		.toc-mobile nav {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			column-gap: clamp(24px, 5vw, 48px);
			max-height: 50vh;
			overflow-y: auto;
			padding: 8px 0 16px;
			border-top: 1px solid var(--manual-border);
		}
		.toc-mobile nav a {
			display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 10px;
			padding: 12px 0;
			border-bottom: 1px solid var(--manual-border);
			color: var(--manual-muted);
			font-size: var(--text-sm);
			text-decoration: none;
		}
		.toc-mobile nav a:hover { color: var(--manual-ink); }
		.toc-mobile nav a.active {
			color: var(--manual-ink); font-weight: 600;
		}
		.toc-mobile nav a.active .toc-mobile-link-title {
			text-decoration: underline; text-decoration-color: var(--manual-brand);
			text-decoration-thickness: 2px; text-underline-offset: 5px;
		}
		.toc-mobile nav .toc-num { margin-right: 0; color: var(--manual-muted); font-family: var(--manual-mono); }
		.toc-mobile-link-title { min-width: 0; overflow-wrap: anywhere; }
	}
	@media (max-width: 900px) {
		.page-layout { width: auto; padding: 0 16px; }
		.toc-mobile {
			width: calc(100% + 32px);
			margin-inline: -16px;
			border-top: 0;
		}
		.toc-mobile summary { padding-inline: 16px; }
		.toc-mobile nav { padding: 8px 16px 16px; }
	}
	@media (max-width: 560px) {
		.toc-mobile nav { grid-template-columns: minmax(0, 1fr); }
		.page-nav { grid-template-columns: 1fr; }
		.page-nav > span:empty { display: none; }
		.page-nav-item.next { text-align: left; align-items: flex-start; }
	}
</style>
