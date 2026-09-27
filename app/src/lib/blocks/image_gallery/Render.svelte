<script lang="ts">
	import type { BlockRenderProps } from '../types';
	import { assetSrc, assetPreview, isPhoto, assetExt, assetDownload, assetsMatching } from '../_shared/assets';
	import { IconChevronLeft, IconChevronRight } from '$lib/icons';
	import Lightbox, { type LightboxImage } from '$lib/components/manual/Lightbox.svelte';
	import { useManualStrings } from '$lib/manual/ui-strings';

	const { block, data }: BlockRenderProps = $props();
	const strings = useManualStrings();
	const t = $derived(strings());

	const assetsForBlock = (config: Record<string, unknown>, imagesOnly = false, requireFolder = false) =>
		assetsMatching(data.assetRows, config, imagesOnly, requireFolder);

	let lightboxIndex = $state<number | null>(null);
	let lightboxImages = $state<LightboxImage[]>([]);
	function openLightbox(images: LightboxImage[], index: number) {
		lightboxImages = images;
		lightboxIndex = index;
	}

	let carouselEl = $state<HTMLElement | null>(null);
	let carouselAtStart = $state(true);
	let carouselAtEnd = $state(false);
	function updateCarouselEdges() {
		if (!carouselEl) return;
		carouselAtStart = carouselEl.scrollLeft <= 4;
		carouselAtEnd = carouselEl.scrollLeft + carouselEl.clientWidth >= carouselEl.scrollWidth - 4;
	}
	function scrollCarousel(dir: 1 | -1) {
		if (!carouselEl) return;
		carouselEl.scrollBy({ left: dir * carouselEl.clientWidth * 0.8, behavior: 'smooth' });
	}
	$effect(() => {
		if (!carouselEl) return;
		updateCarouselEdges();
		const ro = new ResizeObserver(updateCarouselEdges);
		ro.observe(carouselEl);
		return () => ro.disconnect();
	});

	const galleryAssets = $derived(assetsForBlock(block.config, true, true));
</script>

{#if galleryAssets.length}
	{@const lbImages = galleryAssets.map((asset) => ({ src: assetSrc(asset.storagePath), alt: asset.filename.replace(/\.[^.]+$/, ''), caption: block.config.showCaptions === false ? undefined : asset.filename, download: assetDownload(asset) }))}
	<div class="gallery-shell" class:is-carousel={block.type === 'carousel'}>
		{#if block.type === 'carousel'}
			<div class="carousel-controls">
				<button class="carousel-btn" onclick={() => scrollCarousel(-1)} disabled={carouselAtStart} aria-label={t.previous}><IconChevronLeft size={18} stroke={1.9} /></button>
				<button class="carousel-btn" onclick={() => scrollCarousel(1)} disabled={carouselAtEnd} aria-label={t.next}><IconChevronRight size={18} stroke={1.9} /></button>
			</div>
		{/if}
		<ul
			class:carousel={block.type === 'carousel'}
			class="image-gallery"
			style="--gallery-cols:{Math.min(6, Math.max(1, Number(block.config.columns ?? 3)))}"
			bind:this={carouselEl}
			onscroll={block.type === 'carousel' ? updateCarouselEdges : undefined}
		>
			{#each galleryAssets as asset, ai (asset.id)}
				<li class="gallery-card">
					<button class="gallery-btn" class:graphic={!isPhoto(asset)} onclick={() => openLightbox(lbImages, ai)} aria-label="{t.openImage}: {asset.filename}">
						<img src={assetPreview(asset)} alt={asset.filename.replace(/\.[^.]+$/, '')} loading="lazy" decoding="async" />
					</button>
					{#if block.config.showCaptions !== false}
						<span class="gallery-caption">
							<span class="gallery-caption-name">{asset.filename.replace(/\.[^.]+$/, '')}</span>
							<span class="gallery-caption-ext">{assetExt(asset)}</span>
						</span>
					{/if}
				</li>
			{/each}
		</ul>
	</div>
{:else}
	<div class="muted-block"><span class="placeholder-copy">{t.noImages}</span></div>
{/if}

<Lightbox images={lightboxImages} bind:index={lightboxIndex} />

<style>
	.gallery-shell { position: relative; display: flex; flex-direction: column; gap: 12px; }
	.image-gallery {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, max(160px, calc((100% - (var(--gallery-cols) - 1) * 1rem) / var(--gallery-cols)))), 1fr));
		gap: 16px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.image-gallery.carousel {
		--scroll-hint: linear-gradient(to right, #000 calc(100% - 36px), transparent);
		display: flex;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		scroll-padding: 0;
		scrollbar-width: none;
		overscroll-behavior-x: contain;
		-webkit-mask-image: var(--scroll-hint);
		mask-image: var(--scroll-hint);
	}
	.image-gallery.carousel::-webkit-scrollbar { display: none; }
	.image-gallery.carousel .gallery-card { flex: 0 0 min(72%, 440px); scroll-snap-align: start; }
	.image-gallery.carousel .gallery-btn img { aspect-ratio: 3/2; }
	.carousel-controls { display: flex; gap: 8px; justify-content: flex-end; order: 2; }
	.carousel-btn {
		display: grid; place-items: center; width: 36px; height: 36px;
		border: 1px solid var(--manual-border); border-radius: var(--manual-control-radius);
		background: transparent; color: var(--manual-ink); cursor: pointer;
		transition: background .15s ease, opacity .15s ease, border-color .15s ease;
	}
	.carousel-btn:hover:not(:disabled) { border-color: var(--manual-border-strong); background: var(--manual-hover); }
	.carousel-btn:disabled { opacity: .35; cursor: default; }
	.gallery-card { display: flex; flex-direction: column; gap: 8px; min-width: 0; margin: 0; }
	.gallery-btn {
		display: block; width: 100%; padding: 0; border: 0; background: none;
		cursor: zoom-in; border-radius: var(--manual-radius); overflow: hidden;
	}
	.gallery-btn {
		position: relative;
		background: var(--manual-stage);
	}
	.gallery-btn img {
		display: block; width: 100%; aspect-ratio: 4/3; object-fit: cover;
		transition: transform .6s var(--manual-ease, ease);
	}
	.gallery-btn:not(.graphic):hover img { transform: scale(1.025); }
	.gallery-btn.graphic {
		--chk: color-mix(in srgb, var(--manual-ink) 3.5%, transparent);
		background-color: var(--manual-stage);
		background-image:
		linear-gradient(45deg, var(--chk) 25%, transparent 25%, transparent 75%, var(--chk) 75%),
		linear-gradient(45deg, var(--chk) 25%, transparent 25%, transparent 75%, var(--chk) 75%);
		background-size: 16px 16px;
		background-position: 0 0, 8px 8px;
	}
	.gallery-btn.graphic img { object-fit: contain; padding: 14%; }
	.gallery-caption { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; min-width: 0; color: var(--manual-muted); font-size: var(--text-xs); }
	.gallery-caption-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--manual-ink); }
	.gallery-caption-ext { flex: 0 0 auto; font-family: var(--manual-mono); font-size: var(--text-2xs); letter-spacing: .04em; }
	@media (max-width: 680px) {
		.image-gallery.carousel { padding-right: 28px; }
	}
</style>
