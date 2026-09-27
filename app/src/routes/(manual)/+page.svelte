<script lang="ts">
	import type { PageData } from './$types';
	import BlockRenderer from '$lib/components/manual/BlockRenderer.svelte';
	import ManualHero from '$lib/components/manual/ManualHero.svelte';
	import PageCards from '$lib/components/manual/PageCards.svelte';
	import * as m from '$lib/paraglide/messages';
	import type { ManualLanguage } from '$lib/manual/ui-strings';
	import { pageNumbers } from '$lib/manual/numbering';

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

	const brand = $derived(data.settings);
	const chapterNumbers = $derived(brand?.manualNumbering ? pageNumbers(data.pages ?? [], data.sectionCounts ?? {}) : new Map<string, string>());
	const brandName = $derived(brand?.name ?? 'Brand Manual');
	const manualLanguage = $derived((brand?.defaultLanguage === 'cs' ? 'cs' : 'en') as ManualLanguage);
	const pages = $derived((data.pages ?? []) as ManualPage[]);
	const topLevelPages = $derived(
		pages
			.filter(p => p.enabled && !p.isLanding && !p.parentId)
			.sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))
	);
</script>

{#if data.landing}
	<div class="landing">
		<ManualHero
			size="landing"
			title={data.landing.title || brandName}
			description={data.landing.description || m.manual_hero_desc_fallback({}, { locale: manualLanguage })}
			featureImage={data.landing.featureImage}
			heroBgSize={data.landing.heroBgSize}
			bgColor={data.landing.bgColor}
			textColor={data.landing.textColor}
		>
			{#if topLevelPages.length > 0 && data.blocks?.length}
				<div class="hero-chips">
					{#each topLevelPages.slice(0, 6) as p (p.id)}
						<a href="/{p.slug}" class="hero-chip">{p.title}</a>
					{/each}
				</div>
			{/if}
		</ManualHero>

		<div class="landing-body">
			{#if data.blocks?.length}
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
			{:else if topLevelPages.length}
				<PageCards pages={topLevelPages} previews={data.previews} numbers={chapterNumbers} variant="landing" layout={brand?.manualLandingLayout ?? 'grid'} />
			{:else}
				<section class="empty">
					<p>{m.manual_empty_sections({}, { locale: manualLanguage })}</p>
				</section>
			{/if}
		</div>
	</div>
{:else}
	<div class="landing-body">
		<div class="empty">
			<p>{m.manual_not_configured({}, { locale: manualLanguage })}</p>
		</div>
	</div>
{/if}

<style>
	.landing { width: 100%; }
	.landing-body {
		width: min(100%, 1180px);
		padding-right: var(--manual-page-pad);
	}
	.hero-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.hero-chip {
		display: inline-flex;
		align-items: center;
		min-height: 34px;
		padding: 0 16px;
		border-radius: var(--manual-control-radius);
		border: 1px solid color-mix(in srgb, var(--hero-text) 20%, transparent);
		background: color-mix(in srgb, var(--hero-text) 6%, transparent);
		color: var(--hero-text);
		font-size: var(--text-sm);
		font-weight: 500;
		text-decoration: none;
		-webkit-backdrop-filter: blur(6px);
		backdrop-filter: blur(6px);
		transition: background .15s ease, border-color .15s ease;
	}
	.hero-chip:hover {
		background: color-mix(in srgb, var(--hero-text) 12%, transparent);
		border-color: color-mix(in srgb, var(--hero-text) 36%, transparent);
	}
	.blocks {
		display: flex;
		flex-direction: column;
		gap: clamp(3.5rem, 6vw, 5.5rem);
		container-type: inline-size;
		container-name: manual-blocks;
	}
	.empty {
		padding: 40px;
		border: 1px dashed var(--manual-border-strong);
		border-radius: var(--manual-radius);
		color: var(--manual-muted);
	}
	.empty p { margin: 0; }

	@media (max-width: 900px) {
		.landing-body { width: auto; padding: 0 16px; }
		.hero-chip { min-height: 38px; }
	}
</style>
