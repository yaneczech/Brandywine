<script lang="ts">
	import type { BlockRenderProps } from '../types';
	import { assetSrc } from '../_shared/assets';

	const { block }: BlockRenderProps = $props();
</script>

{#if Array.isArray(block.config.cards) && block.config.cards.length}
	<div class="cards-grid">
		{#each block.config.cards as card, i (i)}
			<div class="info-card">
				{#if card.imageUrl}
					<div class="card-img-wrap">
						<img src={assetSrc(card.imageUrl)} alt={card.title} loading="lazy" decoding="async" />
					</div>
				{/if}
				<div class="card-body">
					{#if card.title}<strong class="card-title">{card.title}</strong>{/if}
					{#if card.description}<p class="card-desc">{card.description}</p>{/if}
				</div>
			</div>
		{/each}
	</div>
{/if}

<style>
	.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 32px 20px; }
	.info-card { display: flex; flex-direction: column; gap: 16px; }
	.info-card:not(:has(.card-img-wrap)) { padding-top: 16px; border-top: 1px solid var(--manual-border); }
	.card-img-wrap { aspect-ratio: 4/3; overflow: hidden; border-radius: var(--manual-radius); background: var(--manual-stage); }
	.card-img-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; }
	.card-body { display: flex; flex-direction: column; gap: 8px; }
	.card-title { font-size: var(--text-md); font-weight: 500; letter-spacing: -.01em; color: var(--manual-ink); display: block; }
	.card-desc { margin: 0; font-size: var(--text-sm); color: var(--manual-muted); line-height: 1.55; }
</style>
