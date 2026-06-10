<script lang="ts">
	/**
	 * AssetThumb — shared thumbnail renderer for asset grid cards and picker modal.
	 * Fills its parent container 100% × 100%; the parent controls size / aspect-ratio.
	 */
	import { IconFileText, IconVideo, IconFile } from '@tabler/icons-svelte';

	const {
		mime,
		thumbnailPath = null,
		assetId,
		filename = '',
	}: {
		mime: string;
		thumbnailPath?: string | null;
		assetId: string;
		filename?: string;
	} = $props();

	function thumbSrc(mime: string, thumbnailPath: string | null, assetId: string): string | null {
		if (thumbnailPath) return `/uploads/${thumbnailPath.replace(/\\/g, '/')}`;
		if (mime.startsWith('image/')) return `/api/assets/${assetId}/download`;
		return null;
	}

	const isSvg      = $derived(mime === 'image/svg+xml');
	const isFont     = $derived(mime.startsWith('font/'));
	const isVideo    = $derived(mime.startsWith('video/'));
	const isDocument = $derived(mime.includes('pdf') || mime === 'application/postscript' || mime.startsWith('application/'));
	const src        = $derived(thumbSrc(mime, thumbnailPath, assetId));
	const useContain = $derived(isSvg || isFont);
	const fontFamily = $derived(isFont ? `'card-font-${assetId}',serif` : null);
</script>

<div class="at" class:svg-bg={isSvg}>
	{#if src}
		<img {src} alt={filename} loading="lazy" class:contain={useContain} />
	{:else if isFont && fontFamily}
		<span class="font-preview" style="font-family:{fontFamily}">Aa</span>
	{:else if isVideo}
		<IconVideo size={28} stroke={1.3} />
	{:else if isDocument}
		<IconFileText size={28} stroke={1.3} />
	{:else}
		<IconFile size={28} stroke={1.3} />
	{/if}
</div>

<style>
	.at {
		position: absolute; inset: 0;
		display: flex; align-items: center; justify-content: center;
		color: var(--color-muted);
		overflow: hidden;
	}
	.at.svg-bg { background: #8a8a8a; }
	.at img {
		width: 100%; height: 100%;
		object-fit: cover; display: block;
	}
	.at img.contain {
		object-fit: contain;
		padding: .5rem;
		box-sizing: border-box;
	}
	.font-preview {
		font-size: 2rem; font-weight: 700;
		color: var(--color-muted); letter-spacing: -0.04em; line-height: 1;
	}
</style>
