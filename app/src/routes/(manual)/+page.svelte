<script lang="ts">
	import type { PageData } from './$types';
	import BlockRenderer from '$lib/components/manual/BlockRenderer.svelte';
	import * as m from '$lib/paraglide/messages';
	import { contrastRatio } from '$lib/utils/colors';

	const { data }: { data: PageData } = $props();

	type ManualPage = {
		id: string;
		parentId: string | null;
		title: string;
		slug: string;
		description: string | null;
		sortOrder: number;
		enabled: boolean;
		isLanding: boolean;
		featureImage: string | null;
		bgColor: string | null;
		textColor: string | null;
	};

	function assetSrc(path: string | null | undefined): string | null {
		if (!path) return null;
		if (/^(https?:)?\/\//.test(path) || path.startsWith('/')) return path;
		return `/uploads/${path.replace(/^\/+/, '')}`;
	}

	function cardStyle(p: ManualPage): string {
		const parts: string[] = [];
		if (p.bgColor)   parts.push(`--card-bg:${p.bgColor}`);
		if (p.textColor) parts.push(`--card-text:${p.textColor}`);
		return parts.join(';');
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
	type ManualLanguage = 'en' | 'cs';

	const brand = $derived(data.settings);
	const brandName = $derived(brand?.name ?? 'Brand Manual');
	const manualLanguage = $derived((brand?.defaultLanguage === 'cs' ? 'cs' : 'en') as ManualLanguage);
	const pages = $derived((data.pages ?? []) as ManualPage[]);
	const landingFeatureImg = $derived(assetSrc(data.landing?.featureImage));
	const landingHeroStyle = $derived((() => {
		const bgSize = data.landing?.heroBgSize ?? 'cover';
		const parts: string[] = [];
		if (data.landing?.bgColor) parts.push(`--hero-bg:${data.landing.bgColor}`);
		const txt = readableTextColor(data.landing?.bgColor, data.landing?.textColor);
		if (txt) parts.push(`--hero-text:${txt}`);
		if (data.landing?.bgColor) parts.push(`--hero-accent:${data.landing.bgColor}`);
		if (landingFeatureImg) {
			parts.push(`background-image:url("${landingFeatureImg.replace(/"/g, '%22')}")`);
			parts.push(`background-size:${bgSize === 'tile' ? 'auto' : bgSize}`);
			parts.push(`background-repeat:${bgSize === 'tile' ? 'repeat' : 'no-repeat'}`);
			parts.push('background-position:center');
		}
		return parts.join(';');
	})());
	const topLevelPages = $derived(
		pages
			.filter(p => p.enabled && !p.isLanding && !p.parentId)
			.sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))
	);
</script>

{#if data.landing}
	<div class="landing">
		<section class="hero" class:has-bg={!!data.landing.bgColor} class:has-img={!!landingFeatureImg} style={landingHeroStyle}>
			<div class="hero-copy">
				<h1>{data.landing.title || brandName}</h1>
				{#if data.landing.description}
					<p class="hero-desc">{data.landing.description}</p>
				{:else}
					<p class="hero-desc">{m.manual_hero_desc_fallback({}, { languageTag: manualLanguage })}</p>
				{/if}
				{#if topLevelPages.length > 0}
					<div class="hero-chips">
						{#each topLevelPages.slice(0, 5) as p}
							<a href="/{p.slug}" class="hero-chip">{p.title}</a>
						{/each}
					</div>
				{/if}
			</div>
		</section>

		{#if data.blocks?.length}
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
		{:else if topLevelPages.length}
			<section class="section-index">
				<div class="page-cards">
					{#each topLevelPages as p}
						{@const img = assetSrc(p.featureImage)}
						<a href="/{p.slug}" class="page-card" class:has-color={!!p.bgColor} style={cardStyle(p)}>
							{#if img}
								<div class="card-img-wrap">
									<img src={img} alt={p.title} loading="lazy" decoding="async" />
								</div>
							{:else if p.bgColor}
								<div class="card-color-band"></div>
							{/if}
							<div class="card-body">
								<span class="card-title">{p.title}</span>
								{#if p.description}
									<span class="card-desc">{p.description}</span>
								{/if}
								<span class="card-action" aria-hidden="true">→</span>
							</div>
						</a>
					{/each}
				</div>
			</section>
		{:else}
			<section class="empty">
				<p>{m.manual_empty_sections({}, { languageTag: manualLanguage })}</p>
			</section>
		{/if}

	</div>
{:else}
	<div class="empty">
		<p>{m.manual_not_configured({}, { languageTag: manualLanguage })}</p>
	</div>
{/if}

<style>
	.landing {
		width: 100%;
	}
	.hero {
		--hero-accent: var(--manual-brand);
		--hero-bg: transparent;
		--hero-text: var(--manual-ink);
		position: relative;
		display: flex;
		align-items: center;
		width: calc(100% + var(--manual-gutter));
		min-height: clamp(136px, 14vw, 176px);
		margin: 0 0 34px calc(-1 * var(--manual-gutter));
		padding: clamp(28px, 3.8vw, 46px) var(--manual-page-pad);
		border-bottom: 1px solid var(--manual-border);
		background: var(--manual-paper);
	}
	.hero.has-bg {
		background: var(--hero-bg);
		border-bottom-color: color-mix(in srgb, var(--hero-bg) 60%, rgba(0,0,0,.15));
	}
	.hero.has-img {
		border-bottom-color: transparent;
	}
	/* semi-transparent overlay when image is set (ensures text legibility) */
	.hero.has-img::before {
		content: '';
		position: absolute;
		inset: 0;
		background: rgba(0,0,0,.38);
		z-index: 0;
	}
	/* when bgColor is also set, use the color as overlay instead */
	.hero.has-img.has-bg::before {
		background: color-mix(in srgb, var(--hero-bg) 72%, transparent);
	}
	.hero.has-img .hero-copy {
		position: relative;
		z-index: 1;
	}
	.hero-copy {
		display: block;
		max-width: 720px;
	}
	.hero h1 {
		margin: 0;
		color: var(--hero-text);
		font-size: clamp(1.9rem, 2.8vw, 3.4rem);
		line-height: 1;
		font-weight: 830;
		letter-spacing: -0.02em;
	}
	.hero-desc {
		margin: .8rem 0 0;
		color: color-mix(in srgb, var(--hero-text) 72%, transparent);
		font-size: clamp(.9rem, 1vw, 1rem);
		line-height: 1.58;
		max-width: 520px;
	}
	.hero-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 1.25rem;
	}
	.hero-chip {
		display: inline-flex;
		align-items: center;
		height: 30px;
		padding: 0 13px;
		border-radius: 999px;
		border: 1.5px solid color-mix(in srgb, var(--hero-text) 22%, transparent);
		background: color-mix(in srgb, var(--hero-text) 7%, transparent);
		color: color-mix(in srgb, var(--hero-text) 80%, transparent);
		font-size: .8rem;
		font-weight: 550;
		text-decoration: none;
		letter-spacing: 0.01em;
		transition: background .15s, border-color .15s, color .15s;
		backdrop-filter: blur(4px);
	}
	.hero-chip:hover {
		background: color-mix(in srgb, var(--hero-text) 14%, transparent);
		border-color: color-mix(in srgb, var(--hero-text) 38%, transparent);
		color: var(--hero-text);
	}
	.hero:not(.has-bg):not(.has-img) .hero-chip {
		border-color: color-mix(in srgb, var(--manual-ink) 18%, transparent);
		background: color-mix(in srgb, var(--manual-ink) 5%, transparent);
		color: var(--manual-muted);
	}
	.hero:not(.has-bg):not(.has-img) .hero-chip:hover {
		background: color-mix(in srgb, var(--manual-brand) 10%, transparent);
		border-color: color-mix(in srgb, var(--manual-brand) 35%, transparent);
		color: var(--manual-brand);
	}
	.hero:not(.has-bg):not(.has-img) h1 { color: var(--manual-ink); }
	.hero:not(.has-bg):not(.has-img) .hero-desc { color: var(--manual-muted); }
	.hero.has-img h1 { color: #fff; }
	.hero.has-img .hero-desc { color: rgba(255,255,255,.82); }
	.blocks {
		display: flex;
		flex-direction: column;
		gap: 3.5rem;
	}
	.section-index {
		width: min(100%, 760px);
	}
	.page-cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 360px));
		gap: 16px;
		justify-content: start;
	}
	.page-card {
		--card-bg: var(--manual-surface);
		--card-text: var(--manual-ink);
		position: relative;
		display: flex;
		flex-direction: column;
		border: 1px solid var(--manual-border);
		border-radius: var(--manual-radius);
		background: var(--card-bg);
		color: var(--card-text);
		text-decoration: none;
		overflow: hidden;
		transition: border-color .16s ease, box-shadow .16s ease, transform .14s ease;
	}
	.page-card:hover {
		border-color: color-mix(in srgb, var(--manual-brand) 38%, var(--manual-border));
		box-shadow: 0 14px 38px rgba(0,0,0,.1);
		transform: translateY(-2px);
	}
	/* image header strip (3:2) */
	.card-img-wrap {
		width: 100%;
		aspect-ratio: 16 / 9;
		overflow: hidden;
		flex-shrink: 0;
	}
	.card-img-wrap img {
		width: 100%; height: 100%;
		object-fit: cover; display: block;
		transition: transform .3s ease;
	}
	.page-card:hover .card-img-wrap img { transform: scale(1.03); }
	/* solid color band when no image but bgColor set — same 3:2 as feature image */
	.card-color-band {
		width: 100%;
		aspect-ratio: 16 / 9;
		background: var(--card-bg);
		flex-shrink: 0;
	}
	/* body below image / color band */
	.card-body {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 18px 48px 18px 18px;
		min-height: 96px;
		position: relative;
		/* when card has bgColor, separate the readable content area from the color swatch */
		background: inherit;
	}
	.page-card.has-color .card-body {
		background: var(--manual-surface);
		color: var(--manual-ink);
	}
	/* cards without image/color — no band, body fills whole card */
	.page-card:not(.has-color) .card-body { min-height: 128px; }
	.card-title {
		font-size: 1rem;
		font-weight: 760;
		line-height: 1.25;
		color: inherit;
	}
	.card-desc {
		font-size: .86rem;
		line-height: 1.55;
		color: color-mix(in srgb, currentColor 68%, transparent);
	}
	.card-action {
		position: absolute;
		right: 16px;
		bottom: 15px;
		color: var(--manual-brand);
		font-size: 1.28rem;
		font-weight: 500;
		line-height: 1;
		opacity: .7;
		transition: opacity .14s, transform .14s;
	}
	.page-card:hover .card-action { opacity: 1; transform: translate(2px, -2px); }
	.empty {
		width: min(100%, 920px);
		padding: 42px;
		border: 1px dashed color-mix(in srgb, var(--manual-ink) 16%, transparent);
		border-radius: var(--manual-radius);
		background: color-mix(in srgb, var(--manual-surface) 62%, transparent);
		color: var(--manual-muted);
	}
	.empty p { margin: 0; }

	@media (max-width: 900px) {
		.hero {
			width: 100%;
			min-height: 160px;
			margin: 0 0 28px;
			padding: 28px 20px;
		}
		.hero-copy {
			grid-template-columns: 1fr;
			gap: 12px;
		}
		.section-index,
		.blocks,
		.empty {
			margin-left: 16px;
			margin-right: 16px;
			width: auto;
		}
		.page-cards {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 520px) {
		.hero { padding: 26px 16px; }
		.hero-desc { max-width: 100%; }
	}
</style>
