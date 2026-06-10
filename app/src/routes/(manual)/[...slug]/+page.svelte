<script lang="ts">
	import type { PageData } from './$types';
	import BlockRenderer from '$lib/components/manual/BlockRenderer.svelte';
	import * as m from '$lib/paraglide/messages';
	import { contrastRatio } from '$lib/utils/colors';

	const { data }: { data: PageData } = $props();

	type TocItem = { anchor: string; label: string };
	type ManualLanguage = 'en' | 'cs';

	const manualLanguage = $derived((data.settings?.defaultLanguage === 'cs' ? 'cs' : 'en') as ManualLanguage);
	const toc = $derived(
		(data.blocks ?? [])
			.filter((b: { anchor: string | null; config: Record<string, unknown> }) =>
				b.anchor || b.config?.heading
			)
			.map((b: { anchor: string | null; config: Record<string, unknown> }) => ({
				anchor: b.anchor ?? slugify(String(b.config.heading ?? '')),
				label: String(b.config.heading ?? b.anchor ?? '')
			}))
			.filter((t: TocItem) => t.label)
	);

	const featureImage = $derived(assetSrc(data.page.featureImage));
	const hasBgColor = $derived(!!data.page.bgColor);
	const heroStyle = $derived((() => {
		const bgSize = data.page.heroBgSize ?? 'cover';
		const parts: string[] = [];
		if (data.page.bgColor) parts.push(`--page-bg:${data.page.bgColor}`);
		const txt = readableTextColor(data.page.bgColor, data.page.textColor);
		if (txt) parts.push(`--page-text:${txt}`);
		if (data.page.bgColor) parts.push(`--page-accent:${data.page.bgColor}`);
		if (featureImage) {
			parts.push(`background-image:url("${featureImage.replace(/"/g, '%22')}")`);
			parts.push(`background-size:${bgSize === 'tile' ? 'auto' : bgSize}`);
			parts.push(`background-repeat:${bgSize === 'tile' ? 'repeat' : 'no-repeat'}`);
			parts.push('background-position:center');
		}
		return parts.join(';');
	})());

	function slugify(s: string): string {
		return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
	}

	function assetSrc(path: string | null | undefined): string | null {
		if (!path) return null;
		if (/^(https?:)?\/\//.test(path) || path.startsWith('/')) return path;
		return `/uploads/${path.replace(/^\/+/, '')}`;
	}

	function readableTextColor(bg: string | null | undefined, preferred?: string | null): string | null {
		if (preferred) return preferred;
		if (!bg) return null;
		try {
			return contrastRatio('#FFFFFF', bg) >= contrastRatio('#171717', bg) ? '#FFFFFF' : '#171717';
		} catch {
			return null;
		}
	}
</script>

<div class="manual-page" style={heroStyle}>
	<section class="page-hero" class:has-img={!!featureImage} class:has-bg={hasBgColor}>
		<div class="page-hero-copy">
			<p class="kicker">{m.manual_kicker({}, { languageTag: manualLanguage })}</p>
			<h1>{data.page.title}</h1>
			{#if data.page.description}
				<p class="page-desc">{data.page.description}</p>
			{/if}
		</div>
	</section>

	<div class="page-layout" class:has-toc={toc.length > 0}>
		<article class="article">
			{#if data.blocks.length}
				<div class="blocks">
					{#each data.blocks as block (block.id)}
						<BlockRenderer {block} language={manualLanguage}
							colorRows={data.colorRows ?? []}
							paletteRows={data.paletteRows ?? []}
							fontRows={data.fontRows ?? []}
							styleRows={data.styleRows ?? []}
							fontFileRows={data.fontFileRows ?? []}
						/>
					{/each}
				</div>
			{:else}
				<section class="empty">
					<p>{m.manual_empty_blocks({}, { languageTag: manualLanguage })}</p>
				</section>
			{/if}
		</article>

		{#if toc.length > 0}
			<aside class="toc">
				<div class="toc-inner">
					<div class="toc-label">{m.manual_toc_label({}, { languageTag: manualLanguage })}</div>
					<nav>
						{#each toc as item (item.anchor)}
							<a href="#{item.anchor}" class="toc-link">{item.label}</a>
						{/each}
					</nav>
				</div>
			</aside>
		{/if}
	</div>
</div>

<style>
	.manual-page {
		--page-accent: var(--manual-brand);
		--page-bg: transparent;
		--page-text: var(--manual-ink);
		width: 100%;
	}
	.page-hero {
		position: relative;
		display: grid;
		gap: clamp(22px, 3vw, 44px);
		width: calc(100% + var(--manual-gutter));
		min-height: clamp(160px, 15vw, 230px);
		margin: 0 0 36px calc(-1 * var(--manual-gutter));
		padding: clamp(30px, 4vw, 52px) var(--manual-page-pad);
		overflow: hidden;
		border-bottom: 1px solid var(--manual-border);
		background: var(--manual-paper);
	}
	/* when bgColor is set — solid color background */
	.page-hero.has-bg {
		background: var(--page-bg);
		border-bottom-color: color-mix(in srgb, var(--page-bg) 60%, rgba(0,0,0,.15));
	}
	/* when featureImage is set — background image */
	.page-hero.has-img {
		border-bottom-color: transparent;
	}
	.page-hero.has-img::before {
		content: '';
		position: absolute;
		inset: 0;
		background: rgba(0,0,0,.38);
		z-index: 0;
	}
	.page-hero.has-img.has-bg::before {
		background: color-mix(in srgb, var(--page-bg) 72%, transparent);
	}
	.page-hero-copy {
		position: relative;
		z-index: 1;
		align-self: center;
		max-width: 880px;
	}
	.kicker {
		margin: 0 0 10px;
		color: var(--manual-brand);
		font-size: .68rem;
		font-weight: 820;
		letter-spacing: .11em;
		text-transform: uppercase;
	}
	.page-hero.has-bg .kicker,
	.page-hero.has-img .kicker {
		color: color-mix(in srgb, var(--page-text) 75%, transparent);
	}
	.page-hero.has-img .kicker {
		color: rgba(255,255,255,.7);
	}
	.page-hero h1 {
		max-width: 760px;
		margin: 0;
		color: var(--page-text);
		font-size: clamp(1.9rem, 3.4vw, 3.7rem);
		line-height: 1;
		font-weight: 830;
		letter-spacing: -0.02em;
	}
	.page-desc {
		max-width: 600px;
		margin: 12px 0 0;
		color: color-mix(in srgb, var(--page-text) 72%, transparent);
		font-size: clamp(.92rem, 1vw, 1.02rem);
		line-height: 1.58;
	}
	/* default (no bgColor, no img) — keep original dark colors */
	.page-hero:not(.has-bg):not(.has-img) h1        { color: var(--manual-ink); }
	.page-hero:not(.has-bg):not(.has-img) .page-desc { color: var(--manual-muted); }
	/* image overlay — white text */
	.page-hero.has-img h1        { color: #fff; }
	.page-hero.has-img .page-desc { color: rgba(255,255,255,.82); }
	.page-layout {
		width: min(100%, 1120px);
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 44px;
		align-items: start;
	}
	.page-layout.has-toc {
		grid-template-columns: minmax(0, 1fr) 220px;
	}
	.article {
		min-width: 0;
	}
	.blocks {
		display: flex;
		flex-direction: column;
		gap: 3.25rem;
	}
	.toc {
		position: sticky;
		top: calc(64px + 34px);
	}
	.toc-inner {
		padding: 4px 0 4px 16px;
		border-left: 2px solid color-mix(in srgb, var(--manual-brand) 22%, var(--manual-border));
	}
	.toc-label {
		margin-bottom: 10px;
		color: var(--manual-muted);
		font-size: .68rem;
		font-weight: 820;
		letter-spacing: .08em;
		text-transform: uppercase;
	}
	.toc-link {
		display: block;
		padding: 6px 0;
		color: var(--manual-muted);
		text-decoration: none;
		font-size: .84rem;
		line-height: 1.35;
		transition: color .14s ease;
	}
	.toc-link:hover {
		color: var(--manual-brand);
	}
	.empty {
		padding: 42px 44px;
		border: 1px dashed color-mix(in srgb, var(--manual-ink) 16%, transparent);
		border-radius: var(--manual-radius);
		background: color-mix(in srgb, var(--manual-surface) 62%, transparent);
		color: var(--manual-muted);
	}
	.empty p { margin: 0; }

	@media (max-width: 980px) {
		.page-layout,
		.page-layout.has-toc {
			grid-template-columns: 1fr;
		}
		.toc { display: none; }
	}
	@media (max-width: 900px) {
		.page-hero,
		.page-hero.has-image {
			grid-template-columns: 1fr;
			width: 100%;
			min-height: 176px;
			margin: 0 0 28px;
			padding: 32px 20px;
		}
		.page-layout {
			width: auto;
			margin-left: 16px;
			margin-right: 16px;
		}
	}
	@media (max-width: 560px) {
		.feature-figure {
			min-height: 200px;
		}
	}
</style>
