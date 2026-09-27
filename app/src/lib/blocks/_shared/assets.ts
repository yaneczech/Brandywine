/** Uploaded files: URLs, previews and the folder/tag selection used by asset blocks. */
import type { AssetRow } from '../types';

export function assetSrc(path: unknown): string {
	const value = String(path ?? '');
	if (!value) return '';
	if (/^(https?:)?\/\//.test(value) || value.startsWith('/')) return value;
	return `/uploads/${value.replace(/^\/+/, '')}`;
}

/** Assets matching a block's `folderId` and comma-separated `tags` */
export function assetsMatching(assetRows: AssetRow[], config: Record<string, unknown>, imagesOnly = false, requireFolder = false): AssetRow[] {
	const folderId = typeof config.folderId === 'string' && config.folderId ? config.folderId : null;
	if (requireFolder && !folderId) return [];
	const tags = typeof config.tags === 'string'
		? config.tags.split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean)
		: [];
	return assetRows.filter((asset) => {
		if (imagesOnly && !asset.mime.startsWith('image/')) return false;
		if (folderId && asset.folderId !== folderId) return false;
		if (tags.length && !tags.every((tag) => (asset.tags ?? []).includes(tag))) return false;
		return true;
	});
}

export function assetPreview(asset: AssetRow): string | null {
	if (asset.thumbnailPath) return assetSrc(asset.thumbnailPath);
	if (asset.mime.startsWith('image/')) return assetSrc(asset.storagePath);
	return null;
}

/**
 * Photographs fill their frame; graphics (logos, icons, illustrations —
 * usually vector or transparent) are shown whole, never cropped.
 */
export function isPhoto(asset: AssetRow): boolean {
	return /^image\/(jpe?g|heic|heif|avif)$/i.test(asset.mime);
}

export function assetExt(asset: AssetRow): string {
	return (asset.filename.split('.').pop() ?? '').toUpperCase();
}

export function assetDownload(asset: AssetRow): string {
	return assetSrc(asset.storagePath);
}

export function formatBytes(value: number): string {
	if (value < 1024) return `${value} B`;
	if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
	return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
