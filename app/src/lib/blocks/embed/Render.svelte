<script lang="ts">
	import type { BlockRenderProps } from '../types';
	import { assetSrc } from '../_shared/assets';
	import { hostOf, linkHref } from '../_shared/links';
	import { configString } from '../_shared/config';
	import { resolveEmbed } from '$lib/manual/embed';
	import { IconArrowUpRight, IconPlayerPlay } from '$lib/icons';
	import { useManualStrings } from '$lib/manual/ui-strings';

	const { block }: BlockRenderProps = $props();
	const strings = useManualStrings();
	const t = $derived(strings());

	const cfgStr = (key: string, fallback = '') => configString(block.config, key, fallback);

	const embed = $derived(resolveEmbed(block.config.url));
	const ratio = $derived(['16/9', '4/3', '1/1', '9/16', '21/9'].includes(cfgStr('ratio')) ? cfgStr('ratio') : '16/9');
</script>

{#if embed.kind === 'iframe'}
	<figure class="embed-figure">
		<div class="embed-frame" style="aspect-ratio:{ratio}">
			<iframe
				src={embed.src}
				title={cfgStr('title') || embed.provider}
				loading="lazy"
				allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
				allowfullscreen
				referrerpolicy="strict-origin-when-cross-origin"
			></iframe>
		</div>
		{#if cfgStr('caption')}<figcaption class="img-caption">{cfgStr('caption')}</figcaption>{/if}
	</figure>
{:else if embed.kind === 'audio'}
	<figure class="embed-figure">
		<audio src={embed.src} controls preload="metadata" class="embed-audio"></audio>
		{#if cfgStr('caption')}<figcaption class="img-caption">{cfgStr('caption')}</figcaption>{/if}
	</figure>
{:else if embed.kind === 'video'}
	<figure class="embed-figure">
		<div class="embed-frame" style="aspect-ratio:{ratio}">
			<video
				src={embed.src}
				controls={block.config.controls !== false}
				autoplay={block.config.autoplay === true}
				muted={block.config.autoplay === true}
				loop={block.config.loop === true}
				playsinline
				preload="metadata"
				poster={block.config.poster ? assetSrc(block.config.poster) : undefined}
			></video>
		</div>
		{#if cfgStr('caption')}<figcaption class="img-caption">{cfgStr('caption')}</figcaption>{/if}
	</figure>
{:else if cfgStr('url')}
	<a class="link-card" href={linkHref(cfgStr('url'))} target="_blank" rel="noopener noreferrer">
		<span class="link-card-icon"><IconPlayerPlay size={18} stroke={1.8} /></span>
		<span class="link-card-body"><strong>{cfgStr('title') || t.videoFallback}</strong><small>{hostOf(linkHref(cfgStr('url'))) || cfgStr('url')}</small></span>
		<span class="link-card-arrow"><IconArrowUpRight size={16} stroke={1.8} /></span>
	</a>
{/if}

<style>
	.embed-figure { margin: 0; }
	.embed-frame {
		position: relative; width: 100%; overflow: hidden;
		border-radius: var(--manual-radius);
		background: #000;
	}
	.embed-audio { display: block; width: 100%; }
	.embed-frame iframe, .embed-frame video { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; object-fit: contain; }
	.link-card-icon {
		display: grid; place-items: center; flex: 0 0 auto; width: 32px; height: 32px;
		border-radius: var(--manual-radius); background: var(--manual-stage); color: var(--manual-ink);
	}
</style>
