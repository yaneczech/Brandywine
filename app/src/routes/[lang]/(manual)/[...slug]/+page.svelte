<script lang="ts">
	import type { PageData } from './$types';
	import BlockRenderer from '$lib/components/manual/BlockRenderer.svelte';
	import * as m from '$lib/paraglide/messages';

	const { data }: { data: PageData } = $props();

	type TocItem = { anchor: string; label: string };

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
	const heroStyle = $derived(data.page.bgColor ? `--page-accent:${data.page.bgColor}` : '');

	function slugify(s: string): string {
		return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
	}

	function assetSrc(path: string | null | undefined): string | null {
		if (!path) return null;
		if (/^(https?:)?\/\//.test(path) || path.startsWith('/')) return path;
		return `/uploads/${path.replace(/^\/+/, '')}`;
	}
</script>

<div class="manual-page" style={heroStyle}>
	<section class="page-hero" class:has-image={!!featureImage}>
		<div class="page-hero-copy">
			<p class="kicker">{m.manual_kicker()}</p>
			<h1>{data.page.title}</h1>
			{#if data.page.description}
				<p class="page-desc">{data.page.description}</p>
			{/if}
		</div>

		{#if featureImage}
			<figure class="feature-figure">
				<img src={featureImage} alt={data.page.title} />
			</figure>
		{/if}
	</section>

	<div class="page-layout" class:has-toc={toc.length > 0}>
		<article class="article">
			{#if data.blocks.length}
				<div class="blocks">
					{#each data.blocks as block (block.id)}
						<BlockRenderer {block} />
					{/each}
				</div>
			{:else}
				<section class="empty">
					<p>{m.manual_empty_blocks()}</p>
				</section>
			{/if}
		</article>

		{#if toc.length > 0}
			<aside class="toc">
				<div class="toc-inner">
					<div class="toc-label">{m.manual_toc_label()}</div>
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
		width: min(100%, 1120px);
	}
	.page-hero {
		position: relative;
		display: grid;
		gap: 28px;
		margin-bottom: 42px;
		padding: clamp(30px, 5vw, 58px);
		overflow: hidden;
		border: 1px solid rgba(23,23,23,.08);
		border-radius: 12px;
		background:
			linear-gradient(135deg, color-mix(in srgb, var(--page-accent) 16%, transparent), transparent 48%),
			#fff;
		box-shadow: 0 18px 54px rgba(23,23,23,.055);
	}
	.page-hero.has-image {
		grid-template-columns: minmax(0, 1fr) minmax(260px, 38%);
		align-items: stretch;
	}
	.page-hero-copy {
		position: relative;
		z-index: 1;
		align-self: end;
	}
	.kicker {
		margin: 0 0 12px;
		color: var(--manual-brand);
		font-size: .72rem;
		font-weight: 820;
		letter-spacing: .08em;
		text-transform: uppercase;
	}
	.page-hero h1 {
		max-width: 760px;
		margin: 0;
		color: #171717;
		font-size: clamp(2.1rem, 4.8vw, 4.4rem);
		line-height: 1;
		font-weight: 850;
		letter-spacing: 0;
	}
	.page-desc {
		max-width: 680px;
		margin: 20px 0 0;
		color: #5f5f5f;
		font-size: 1.04rem;
		line-height: 1.65;
	}
	.feature-figure {
		margin: 0;
		min-height: 260px;
		overflow: hidden;
		border-radius: 10px;
		background: #f2f1ee;
	}
	.feature-figure img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.page-layout {
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
		border-left: 2px solid color-mix(in srgb, var(--manual-brand) 22%, rgba(23,23,23,.12));
	}
	.toc-label {
		margin-bottom: 10px;
		color: #8a8a8a;
		font-size: .68rem;
		font-weight: 820;
		letter-spacing: .08em;
		text-transform: uppercase;
	}
	.toc-link {
		display: block;
		padding: 6px 0;
		color: #686868;
		text-decoration: none;
		font-size: .84rem;
		line-height: 1.35;
		transition: color .14s ease;
	}
	.toc-link:hover {
		color: var(--manual-brand);
	}
	.empty {
		padding: 32px;
		border: 1px dashed rgba(23,23,23,.16);
		border-radius: 12px;
		background: rgba(255,255,255,.62);
		color: #737373;
	}
	.empty p { margin: 0; }

	@media (max-width: 980px) {
		.page-layout,
		.page-layout.has-toc {
			grid-template-columns: 1fr;
		}
		.toc { display: none; }
	}
	@media (max-width: 760px) {
		.page-hero,
		.page-hero.has-image {
			grid-template-columns: 1fr;
			padding: 24px 20px;
		}
		.feature-figure {
			min-height: 210px;
		}
	}
</style>
