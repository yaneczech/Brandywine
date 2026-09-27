<script lang="ts">
	import type { BlockRenderProps } from '../types';
	import { configString } from '../_shared/config';
	import { IconQuote } from '$lib/icons';

	const { block }: BlockRenderProps = $props();

	const cfgStr = (key: string, fallback = '') => configString(block.config, key, fallback);
</script>

{#if cfgStr('quote').trim()}
	<figure class="quote-block" class:large={cfgStr('size') !== 'normal'}>
		<span class="quote-mark" aria-hidden="true"><IconQuote size={30} stroke={1.5} /></span>
		<blockquote>{cfgStr('quote')}</blockquote>
		{#if cfgStr('author') || cfgStr('role')}
			<figcaption>
				{#if cfgStr('author')}<strong>{cfgStr('author')}</strong>{/if}
				{#if cfgStr('role')}<span>{cfgStr('role')}</span>{/if}
			</figcaption>
		{/if}
	</figure>
{/if}

<style>
	.quote-block { position: relative; margin: 0; padding: clamp(1.5rem, 3vw, 2.25rem) 0; border-top: 1px solid var(--manual-border-strong); border-bottom: 1px solid var(--manual-border); }
	.quote-mark { display: block; margin-bottom: 16px; color: var(--manual-muted); }
	.quote-block blockquote {
		margin: 0; color: var(--manual-ink);
		font-size: clamp(1.15rem, 2vw, 1.4rem); font-weight: 400; line-height: 1.45;
		letter-spacing: -.012em; text-wrap: pretty;
	}
	.quote-block.large blockquote { max-width: 26ch; font-size: clamp(1.6rem, 3.4vw, 2.6rem); font-weight: 400; line-height: 1.14; letter-spacing: var(--tracking-tight); text-wrap: balance; }
	.quote-block figcaption { display: flex; flex-wrap: wrap; gap: 4px 8px; margin-top: 24px; font-size: var(--text-sm); }
	.quote-block figcaption strong { color: var(--manual-ink); font-weight: 500; }
	.quote-block figcaption span { color: var(--manual-muted); }
</style>
