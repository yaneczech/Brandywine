<script lang="ts">
	import type { BlockRenderProps } from '../types';
	import { assetSrc } from '../_shared/assets';
	import { richContent } from '../_shared/content';
	import { isExternal, linkHref } from '../_shared/links';
	import { configString } from '../_shared/config';
	import { IconArrowUpRight } from '$lib/icons';

	const { block }: BlockRenderProps = $props();

	const cfgStr = (key: string, fallback = '') => configString(block.config, key, fallback);

	const img = $derived(cfgStr('imageUrl'));
	const body = $derived(richContent(block.config));
</script>

<div class="text-image" class:image-left={cfgStr('imagePosition') === 'left'} class:no-image={!img}>
	<div class="text-image-copy">
		{#if cfgStr('title')}<h3>{cfgStr('title')}</h3>{/if}
		{#each body as item, itemIndex (itemIndex)}
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- richContent() sanitizes this HTML. -->
			<div class="prose">{@html item.html}</div>
		{/each}
		{#if cfgStr('ctaLabel') && cfgStr('ctaUrl')}
			{@const href = linkHref(cfgStr('ctaUrl'))}
			<a class="text-image-cta" {href} target={isExternal(href) ? '_blank' : undefined} rel={isExternal(href) ? 'noopener noreferrer' : undefined}>
				{cfgStr('ctaLabel')} <IconArrowUpRight size={15} stroke={2} />
			</a>
		{/if}
	</div>
	{#if img}
		<figure class="text-image-media" style={cfgStr('imageBg') ? `background:${cfgStr('imageBg')}` : ''}>
			<img src={assetSrc(img)} alt={cfgStr('alt')} loading="lazy" decoding="async" class:contain={cfgStr('fit') === 'contain'} />
		</figure>
	{/if}
</div>

<style>
	.text-image { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: clamp(1.5rem, 4vw, 3.5rem); align-items: center; }
	.text-image.no-image { grid-template-columns: minmax(0, 1fr); }
	.text-image.image-left .text-image-media { order: -1; }
	.text-image-copy { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
	.text-image-copy h3 { margin: 0; color: var(--manual-ink); font-size: var(--text-2xl); font-weight: 500; letter-spacing: -.022em; line-height: 1.2; text-wrap: balance; }
	.text-image-cta {
		display: inline-flex; align-items: center; gap: 8px; align-self: flex-start;
		height: 38px; padding: 0 16px; margin-top: 4px; border-radius: var(--manual-control-radius);
		background: var(--manual-ink); color: var(--manual-paper);
		font-size: var(--text-sm); font-weight: 500; text-decoration: none;
		transition: opacity .15s ease;
	}
	.text-image-cta:hover { opacity: .82; }
	.text-image-media {
		margin: 0; overflow: hidden; border-radius: var(--manual-radius);
		background: var(--manual-stage);
		aspect-ratio: 4/3;
	}
	.text-image-media img { display: block; width: 100%; height: 100%; object-fit: cover; }
	.text-image-media img.contain { object-fit: contain; padding: clamp(1rem, 4%, 2.5rem); }
	@container manual-blocks (max-width: 640px) {
		.text-image { grid-template-columns: minmax(0, 1fr); }
		.text-image.image-left .text-image-media { order: 0; }
	}
</style>
