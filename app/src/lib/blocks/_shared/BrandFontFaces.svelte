<!--
  Declares the brand fonts from the Typography module (@font-face for uploaded
  files, <link> for hosted ones) so type specimens render in the real face.
-->
<script lang="ts">
	import type { FontFileRow, FontRow } from '../types';

	const { fontRows, fontFileRows }: { fontRows: FontRow[]; fontFileRows: FontFileRow[] } = $props();

	function cssQuoted(value: string): string {
		// Also escape "<" (\x3c): the rules are inlined in a style element
		return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\x3c/g, '\\3c ').replace(/[\r\n\f]/g, ' ');
	}

	function uploadFontUrl(storagePath: string): string {
		return `/uploads/${storagePath.replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/')}`;
	}

	function externalStylesheetUrl(value: string | null): string | null {
		if (!value) return null;
		try {
			const url = new URL(value);
			return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
		} catch {
			return null;
		}
	}

	const fontFaces = $derived(
		fontRows.map((font) => {
			const files = fontFileRows.filter((f) => f.fontId === font.id);
			if (!files.length) return '';
			if (font.sourceUrl) return ''; // external URL — injected via <link>
			const srcs = files.map((f) =>
				`url('${cssQuoted(uploadFontUrl(f.storagePath))}') format('${cssQuoted(f.format)}')`
			).join(', ');
			const weights = (font.weights ?? [400]).filter((weight) => Number.isInteger(weight) && weight >= 1 && weight <= 1000);
			return weights.map((w) => `@font-face { font-family: '${cssQuoted(font.name)}'; src: ${srcs}; font-weight: ${w}; font-display: swap; }`).join('\n');
		}).join('\n')
	);
	const externalStylesheets = $derived(
		fontRows
			.map((font) => externalStylesheetUrl(font.sourceUrl))
			.filter((href, index, all): href is string => Boolean(href) && all.indexOf(href) === index)
	);
</script>

<svelte:head>
	{#if fontFaces}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- CSS is generated from escaped, validated font metadata. -->
		{@html `<style>${fontFaces}</style>`}
	{/if}
	{#each externalStylesheets as href (href)}
		<link rel="stylesheet" {href} />
	{/each}
</svelte:head>
