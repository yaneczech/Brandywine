<script lang="ts">
	/**
	 * AssetThumb — shared thumbnail renderer for asset grid cards and picker modal.
	 * Fills its parent container 100% × 100%; the parent controls size / aspect-ratio.
	 */
	import { IconFileText, IconVideo, IconFile } from '$lib/icons';

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
	// Graphics (vector / possibly transparent) are shown whole on a transparency grid
	const isGraphic  = $derived(isSvg || /^image\/(png|gif|webp)$/i.test(mime));
	const isFont     = $derived(mime.startsWith('font/'));
	const isVideo    = $derived(mime.startsWith('video/'));
	const isDocument = $derived(mime.includes('pdf') || mime === 'application/postscript' || mime.startsWith('application/'));
	const src        = $derived(thumbSrc(mime, thumbnailPath, assetId));
	const useContain = $derived(isGraphic || isFont);
	const fontFamily = $derived(isFont ? `'card-font-${assetId}',serif` : null);
</script>

<div class="at" class:graphic={isGraphic}>
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
	.at.graphic {
		--chk: rgba(20, 20, 20, 0.05);
		background-color: var(--color-surface);
		background-image:
			linear-gradient(45deg, var(--chk) 25%, transparent 25%, transparent 75%, var(--chk) 75%),
			linear-gradient(45deg, var(--chk) 25%, transparent 25%, transparent 75%, var(--chk) 75%);
		background-size: 14px 14px;
		background-position: 0 0, 7px 7px;
	}
	.at img {
		width: 100%; height: 100%;
		object-fit: cover; display: block;
	}
	.at img.contain {
		object-fit: contain;
		padding: 12%;
		box-sizing: border-box;
	}
	.font-preview {
		font-size: 2rem; font-weight: 600;
		color: var(--color-muted); letter-spacing: var(--tracking-display); line-height: 1;
	}
</style>
