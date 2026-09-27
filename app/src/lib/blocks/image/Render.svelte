<script lang="ts">
	import type { BlockRenderProps } from '../types';
	import { assetSrc } from '../_shared/assets';
	import Lightbox, { type LightboxImage } from '$lib/components/manual/Lightbox.svelte';
	import { useManualStrings } from '$lib/manual/ui-strings';

	const { block }: BlockRenderProps = $props();
	const strings = useManualStrings();
	const t = $derived(strings());

	let lightboxIndex = $state<number | null>(null);
	let lightboxImages = $state<LightboxImage[]>([]);
	function openLightbox(images: LightboxImage[], index: number) {
		lightboxImages = images;
		lightboxIndex = index;
	}
</script>

{#if block.config.url}
	<figure class="img-figure" class:full-width={block.config.fullWidth}
			class:framed={block.config.frame}
			style={block.config.frame
				? [
					`background:${block.config.frameBg || '#ffffff'}`,
					block.config.frameBorderColor
						? `border:1px solid ${block.config.frameBorderColor}`
						: 'border:none'
					].join(';')
				: ''}>
		{#if block.config.zoom !== false}
			<button class="zoom-btn" aria-label={t.openImage} onclick={() => openLightbox([{ src: assetSrc(block.config.url), alt: String(block.config.alt ?? ''), caption: block.config.caption ? String(block.config.caption) : undefined, download: assetSrc(block.config.url) }], 0)}>
				<img src={assetSrc(block.config.url)} alt={String(block.config.alt ?? '')} class="block-img" loading="lazy" decoding="async" />
			</button>
		{:else}
			<img src={assetSrc(block.config.url)} alt={String(block.config.alt ?? '')} class="block-img" loading="lazy" decoding="async" />
		{/if}
		{#if block.config.caption}
			<figcaption class="img-caption">{block.config.caption}</figcaption>
		{/if}
	</figure>
{/if}

<Lightbox images={lightboxImages} bind:index={lightboxIndex} />

<style>
	.zoom-btn {
		display: block; width: 100%; padding: 0; border: 0; background: none;
		cursor: zoom-in; border-radius: var(--manual-radius); overflow: hidden;
	}
	.img-figure { margin: 0; }
	.img-figure.full-width { width: 100%; }
	.img-figure.full-width .block-img { margin: 0 auto; }
	.img-figure.full-width .img-caption { text-align: center; }
	.block-img {
		display: block; max-width: 100%; height: auto;
		/* a portrait key visual must not run for two screens */
		max-height: min(85vh, 960px); width: auto;
	}
	.zoom-btn { width: auto; max-width: 100%; }
	.img-figure.full-width .zoom-btn { margin: 0 auto; }
	.img-figure.framed {
		/* defaults overridden by inline style from block config */
		background: #ffffff;
		border-radius: var(--manual-radius);
		padding: 16px;
	}
</style>
