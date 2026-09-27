<script lang="ts">
	import type { PageData } from './$types';
	import BlockRenderer from '$lib/components/manual/BlockRenderer.svelte';
	import ManualHero from '$lib/components/manual/ManualHero.svelte';
	import PageCards from '$lib/components/manual/PageCards.svelte';
	import * as m from '$lib/paraglide/messages';
	import { useManualStrings, type ManualLanguage } from '$lib/manual/ui-strings';
	import { IconArrowLeft, IconArrowRight, IconChevronDown, IconChevronRight } from '@tabler/icons-svelte';

	const { data }: { data: PageData } = $props();
	const strings = useManualStrings();
	const t = $derived(strings());

	type TocItem = { anchor: string; label: string };
	type NavPage = {
		id: string; parentId: string | null;
		title: string; slug: string;
		sortOrder: number; isLanding: boolean;
	};

	const manualLanguage = $derived((data.settings?.defaultLanguage === 'cs' ? 'cs' : 'en') as ManualLanguage);
	const toc = $derived(
		(data.blocks ?? [])
			.filter((b: { type: string; anchor: string | null; config: Record<string, unknown> }) =>
				b.type !== 'divider' && (b.anchor || b.config?.heading)
			)
			.map((b: { anchor: string | null; config: Record<string, unknown> }) => ({
				anchor: b.anchor ?? slugify(String(b.config.heading ?? '')),
				label: String(b.config.heading ?? b.anchor ?? '')
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
					<span>{t.onThisPage}</span>
					<IconChevronDown size={16} stroke={2} class="toc-mobile-chevron" />
				</summary>
				<nav aria-label={t.onThisPage}>
					{#each toc as item (item.anchor)}
						<a href="#{item.anchor}" class:active={activeAnchor === item.anchor} onclick={() => (mobileTocOpen = false)}>{item.label}</a>
					{/each}
				</nav>
			</details>
		{/if}

		<article class="article">
			{#if data.blocks.length}
				<div class="blocks">
					{#each data.blocks as block (block.id)}
						<BlockRenderer {block}
							colorRows={data.colorRows ?? []}
							paletteRows={data.paletteRows ?? []}
							fontRows={data.fontRows ?? []}
							styleRows={data.styleRows ?? []}
							fontFileRows={data.fontFileRows ?? []}
							assetRows={data.assetRows ?? []}
						/>
					{/each}
				</div>
			{:else if !data.childPages?.length}
				<section class="empty">
					<p>{m.manual_empty_blocks({}, { locale: manualLanguage })}</p>
				</section>
			{/if}

			{#if data.childPages?.length}
				<section class="subpages" aria-labelledby="subpages-heading">
					<h2 id="subpages-heading" class="subpages-heading">{t.subpages}</h2>
					<PageCards pages={data.childPages} baseHref={currentHref} previews={data.previews} />
				</section>
			{/if}

			{#if prevPage || nextPage}
				<nav class="page-nav" aria-label="{t.previous} / {t.next}">
					{#if prevPage}
						<a href={pageHref(prevPage)} class="page-nav-item prev" rel="prev">
							<span class="page-nav-dir"><IconArrowLeft size={14} stroke={2} /> {t.previous}</span>
							<span class="page-nav-title">{prevPage.title}</span>
						</a>
					{:else}
						<span></span>
					{/if}
					{#if nextPage}
						<a href={pageHref(nextPage)} class="page-nav-item next" rel="next">
							<span class="page-nav-dir">{t.next} <IconArrowRight size={14} stroke={2} /></span>
							<span class="page-nav-title">{nextPage.title}</span>
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
						<a href="#{item.anchor}" class="toc-link" class:active={activeAnchor === item.anchor} aria-current={activeAnchor === item.anchor ? 'location' : undefined}>{item.label}</a>
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
		gap: 4px 6px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.breadcrumbs li { display: inline-flex; align-items: center; gap: 6px; opacity: .92; }
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
	.blocks {
		display: flex;
		flex-direction: column;
		gap: clamp(3.5rem, 6vw, 5.5rem);
		container-type: inline-size;
		container-name: manual-blocks;
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
		padding: 6px 0 6px 14px;
		border-left: 1px solid transparent;
		color: var(--manual-muted);
		text-decoration: none;
		font-size: var(--text-sm);
		line-height: 1.4;
		transition: color .15s ease, border-color .15s ease;
	}
	.toc-link:hover { color: var(--manual-ink); }
	.toc-link.active { color: var(--manual-brand); border-left-color: var(--manual-brand); font-weight: 600; }

	.toc-mobile { display: none; }

	.empty {
		padding: 40px;
		border: 1px dashed var(--manual-border-strong);
		border-radius: var(--manual-radius);
		color: var(--manual-muted);
	}
	.empty p { margin: 0; }

	/* ── Sub-pages ───────────────────────────────────────────────────────── */
	.subpages { margin-top: clamp(3.5rem, 6vw, 5.5rem); }
	.subpages-heading {
		margin: 0 0 20px;
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
		padding-top: 2rem;
		border-top: 1px solid var(--manual-border);
	}
	.page-nav-item {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
		padding: 18px 20px;
		border: 1px solid var(--manual-border);
		border-radius: calc(var(--manual-radius) + 4px);
		text-decoration: none;
		color: inherit;
		transition: border-color .15s ease, background .15s ease, transform .15s ease;
	}
	.page-nav-item:hover {
		border-color: color-mix(in srgb, var(--manual-brand) 40%, var(--manual-border));
		background: color-mix(in srgb, var(--manual-brand) 3%, var(--manual-surface));
	}
	.page-nav-item.next { text-align: right; align-items: flex-end; }
	.page-nav-dir {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: var(--text-xs);
		font-weight: 500;
		color: var(--manual-muted);
	}
	.page-nav-title {
		font-size: var(--text-lg);
		font-weight: 600;
		color: var(--manual-ink);
		line-height: 1.3;
	}
	.page-nav-item:hover .page-nav-title { color: var(--manual-brand); }

	@media (max-width: 1180px) {
		.page-layout,
		.page-layout.has-toc { grid-template-columns: minmax(0, 1fr); }
		.toc { display: none; }
		.toc-mobile {
			display: block;
			position: sticky;
			top: calc(var(--manual-topbar) + 8px);
			z-index: 20;
			margin-bottom: -8px;
			border: 1px solid var(--manual-border);
			border-radius: calc(var(--manual-radius) + 4px);
			background: color-mix(in srgb, var(--manual-surface) 92%, transparent);
			-webkit-backdrop-filter: blur(12px);
			backdrop-filter: blur(12px);
			box-shadow: var(--manual-shadow-sm);
		}
		.toc-mobile summary {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 12px;
			min-height: 44px;
			padding: 0 14px;
			font-size: var(--text-base);
			font-weight: 600;
			list-style: none;
			cursor: pointer;
		}
		.toc-mobile summary::-webkit-details-marker { display: none; }
		.toc-mobile :global(.toc-mobile-chevron) { transition: transform .18s ease; color: var(--manual-muted); }
		.toc-mobile[open] :global(.toc-mobile-chevron) { transform: rotate(180deg); }
		.toc-mobile nav {
			display: flex;
			flex-direction: column;
			max-height: 50vh;
			overflow-y: auto;
			padding: 4px 6px 8px;
			border-top: 1px solid var(--manual-border);
		}
		.toc-mobile nav a {
			padding: 10px 10px;
			border-radius: var(--radius);
			color: var(--manual-muted);
			font-size: var(--text-base);
			text-decoration: none;
		}
		.toc-mobile nav a.active { color: var(--manual-brand); font-weight: 600; background: color-mix(in srgb, var(--manual-brand) 7%, transparent); }
	}
	@media (max-width: 900px) {
		.page-layout { width: auto; padding: 0 16px; }
	}
	@media (max-width: 560px) {
		.page-nav { grid-template-columns: 1fr; }
		.page-nav > span:empty { display: none; }
		.page-nav-item.next { text-align: left; align-items: flex-start; }
	}
</style>
