<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/state';
	import BlockRenderer from '$lib/components/manual/BlockRenderer.svelte';
	import * as m from '$lib/paraglide/messages';

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
	};

	const brand = $derived(data.settings);
	const brandName = $derived(brand?.name ?? 'Brand Manual');
	const lang = $derived(page.params.lang ?? brand?.defaultLanguage ?? 'cs');
	const pages = $derived((data.pages ?? []) as ManualPage[]);
	const topLevelPages = $derived(
		pages
			.filter(p => p.enabled && !p.isLanding && !p.parentId)
			.sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))
	);
</script>

{#if data.landing}
	<div class="landing">
		<section class="hero">
			<div class="hero-copy">
				<h1>{data.landing.title || brandName}</h1>
				{#if data.landing.description}
					<p class="hero-desc">{data.landing.description}</p>
				{:else}
					<p class="hero-desc">{m.manual_hero_desc_fallback()}</p>
				{/if}
			</div>
		</section>

		{#if data.blocks?.length}
			<div class="blocks">
				{#each data.blocks as block (block.id)}
					<BlockRenderer {block} />
				{/each}
			</div>
		{:else if topLevelPages.length}
			<section class="section-index" aria-labelledby="section-index-heading">
				<div class="section-heading">
					<h2 id="section-index-heading">{m.manual_sections_heading()}</h2>
				</div>
				<div class="page-cards">
					{#each topLevelPages as p}
						<a href="/{lang}/{p.slug}" class="page-card">
							<span class="card-title">{p.title}</span>
							{#if p.description}
								<span class="card-desc">{p.description}</span>
							{/if}
							<span class="card-action" aria-hidden="true">→</span>
						</a>
					{/each}
				</div>
			</section>
		{:else}
			<section class="empty">
				<p>{m.manual_empty_sections()}</p>
			</section>
		{/if}
	</div>
{:else}
	<div class="empty">
		<p>{m.manual_not_configured()}</p>
	</div>
{/if}

<style>
	.landing {
		width: 100%;
	}
	.hero {
		display: flex;
		align-items: flex-end;
		min-height: clamp(300px, 36vw, 480px);
		margin: -44px 0 52px;
		padding: clamp(48px, 7vw, 96px) clamp(20px, 7vw, 96px);
		border-bottom: 1px solid rgba(23,23,23,.08);
		background:
			linear-gradient(135deg, color-mix(in srgb, var(--manual-brand) 10%, transparent), transparent 44%),
			linear-gradient(180deg, rgba(255,255,255,.9), rgba(255,255,255,.35));
	}
	.hero h1 {
		max-width: 860px;
		margin: 0;
		color: #171717;
		font-size: clamp(3rem, 7vw, 6.8rem);
		line-height: .98;
		font-weight: 860;
		letter-spacing: 0;
	}
	.hero-desc {
		max-width: 720px;
		margin: 22px 0 0;
		color: #595959;
		font-size: clamp(1rem, 1.45vw, 1.24rem);
		line-height: 1.65;
	}
	.blocks {
		display: flex;
		flex-direction: column;
		gap: 3.5rem;
	}
	.section-index {
		max-width: 960px;
	}
	.section-heading {
		margin-bottom: 16px;
	}
	.section-heading h2 {
		margin: 0;
		color: #171717;
		font-size: 1.25rem;
		line-height: 1.2;
		font-weight: 800;
	}
	.page-cards {
		display: grid;
		grid-template-columns: 1fr;
		gap: 10px;
	}
	.page-card {
		position: relative;
		display: flex;
		min-height: 128px;
		flex-direction: column;
		gap: 12px;
		padding: 22px 64px 22px 24px;
		border: 1px solid rgba(23,23,23,.09);
		border-radius: 8px;
		background: rgba(255,255,255,.76);
		color: inherit;
		text-decoration: none;
		transition: border-color .16s ease, background .16s ease;
	}
	.page-card:hover {
		border-color: color-mix(in srgb, var(--manual-brand) 36%, rgba(23,23,23,.09));
		background: #fff;
	}
	.card-title {
		color: #171717;
		font-size: 1.08rem;
		font-weight: 790;
		line-height: 1.25;
	}
	.card-desc {
		color: #686868;
		font-size: .9rem;
		line-height: 1.55;
	}
	.card-action {
		position: absolute;
		right: 22px;
		bottom: 18px;
		color: var(--manual-brand);
		font-size: 1.5rem;
		font-weight: 500;
		line-height: 1;
	}
	.empty {
		width: min(100%, 760px);
		padding: 42px;
		border: 1px dashed rgba(23,23,23,.16);
		border-radius: 12px;
		background: rgba(255,255,255,.62);
		color: #737373;
	}
	.empty p { margin: 0; }

	@media (max-width: 820px) {
		.hero {
			min-height: 320px;
			padding: 48px 20px;
		}
	}
	@media (max-width: 520px) {
		.hero {
			margin-bottom: 36px;
			min-height: 280px;
			padding: 40px 16px;
		}
	}
</style>
