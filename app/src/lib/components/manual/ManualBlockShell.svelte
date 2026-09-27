<script lang="ts">
	import type { Snippet } from 'svelte';
	import { IconCancel, IconExclamationCircle, IconLink, IconCheck } from '@tabler/icons-svelte';
	import { sanitizeRichHtml } from '$lib/utils/sanitize-rich-html';
	import { useManualStrings } from '$lib/manual/ui-strings';

	const strings = useManualStrings();
	let linkCopied = $state(false);

	async function copyAnchorLink() {
		if (!id) return;
		const url = `${location.origin}${location.pathname}#${id}`;
		history.replaceState(history.state, '', `#${id}`);
		try { await navigator.clipboard.writeText(url); } catch { /* clipboard blocked — URL is still updated */ }
		linkCopied = true;
		setTimeout(() => (linkCopied = false), 1400);
	}

	type CalloutType = 'none' | 'attention' | 'alert';

	const {
		id,
		type,
		config,
		children
	}: {
		id?: string;
		type: string;
		config: Record<string, unknown>;
		children?: Snippet;
	} = $props();

	type RichItem = { type: 'text' | 'attention' | 'alert'; html: string };

	function textValue(key: string): string {
		const value = config[key];
		return typeof value === 'string' ? value.trim() : '';
	}

	// intro — supports legacy string or rich content array
	function toRichItems(value: unknown): RichItem[] {
		if (Array.isArray(value) && value.length) {
			return (value as RichItem[])
				.map((item) => ({ ...item, html: sanitizeRichHtml(item.html) }))
				.filter((item) => item.type !== 'text' || item.html?.replace(/<[^>]*>/g, '').trim());
		}
		if (typeof value === 'string' && value.trim()) {
			return [{ type: 'text', html: sanitizeRichHtml(value.trim()) }];
		}
		return [];
	}

	const heading     = $derived(textValue('heading'));
	const introItems  = $derived(toRichItems(config['intro']));
	const hasIntro    = $derived(introItems.length > 0);
	const calloutText = $derived(textValue('calloutText'));
	const calloutType = $derived((textValue('calloutType') || 'none') as CalloutType);
	const hasCallout  = $derived(calloutType !== 'none' && calloutText.length > 0);
	const hasContext  = $derived(Boolean(heading || hasIntro || hasCallout));
	// 'side' keeps the classic two-column layout on wide screens; 'top' always stacks
	const contextLayout = $derived(textValue('contextLayout') === 'top' ? 'top' : 'side');
</script>

<section class="manual-block" class:no-context={!hasContext} class:layout-top={contextLayout === 'top'} {id} data-block-type={type}>
	{#if hasContext}
		<aside class="block-context">
			{#if heading}
				<h2>
					{heading}
					{#if id}
						<button class="anchor-btn" onclick={copyAnchorLink} aria-label={strings().copyLink} title={strings().copyLink}>
							{#if linkCopied}<IconCheck size={15} stroke={2.2} />{:else}<IconLink size={15} stroke={2} />{/if}
						</button>
					{/if}
				</h2>
			{/if}
			{#if hasIntro}
				<div class="block-intro">
				{#each introItems as item (item)}
					{#if item.type === 'text'}
						<!-- eslint-disable-next-line svelte/no-at-html-tags -- toRichItems() sanitizes this HTML. -->
						<div class="intro-text">{@html item.html}</div>
						{:else}
							<div class="intro-callout" class:alert={item.type === 'alert'}>
								<div class="callout-icon" aria-hidden="true">
									{#if item.type === 'alert'}
										<IconCancel size={15} stroke={1.9} />
									{:else}
										<IconExclamationCircle size={15} stroke={1.9} />
									{/if}
								</div>
						<!-- eslint-disable-next-line svelte/no-at-html-tags -- toRichItems() sanitizes this HTML. -->
						<div>{@html item.html}</div>
							</div>
						{/if}
					{/each}
				</div>
			{/if}
			{#if hasCallout}
				<div class="block-callout" class:alert={calloutType === 'alert'}>
					<div class="callout-icon" aria-hidden="true">
						{#if calloutType === 'alert'}
							<IconCancel size={18} stroke={1.9} />
						{:else}
							<IconExclamationCircle size={18} stroke={1.9} />
						{/if}
					</div>
					<div>{calloutText}</div>
				</div>
			{/if}
		</aside>
	{/if}
	<div class="block-content">
		{@render children?.()}
	</div>
</section>

<style>
	.manual-block {
		scroll-margin-top: calc(var(--manual-topbar, 60px) + 28px);
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 1.5rem;
		align-items: start;
	}
	/* Wide containers: context in a sticky side column, content beside it */
	@container manual-blocks (min-width: 1000px) {
		.manual-block:not(.no-context):not(.layout-top) {
			grid-template-columns: minmax(220px, 300px) minmax(0, 1fr);
			gap: clamp(2rem, 4cqi, 4rem);
		}
		.manual-block:not(.no-context):not(.layout-top) .block-context {
			position: sticky;
			top: calc(var(--manual-topbar, 60px) + 32px);
		}
	}
	.block-context {
		display: flex;
		flex-direction: column;
		gap: .85rem;
		min-width: 0;
		max-width: 68ch;
	}
	.block-context h2 {
		position: relative;
		display: flex;
		align-items: center;
		gap: .4rem;
		margin: 0;
		color: var(--manual-ink);
		font-size: clamp(1.4rem, 2vw, 1.75rem);
		font-weight: 600;
		letter-spacing: var(--tracking-tight);
		line-height: 1.15;
		text-wrap: balance;
	}
	.anchor-btn {
		display: inline-grid;
		place-items: center;
		flex: 0 0 auto;
		width: 28px;
		height: 28px;
		border: 0;
		border-radius: var(--radius);
		background: transparent;
		color: var(--manual-muted);
		cursor: pointer;
		opacity: 0;
		transition: opacity .15s ease, background .15s ease, color .15s ease;
	}
	.block-context h2:hover .anchor-btn,
	.anchor-btn:focus-visible { opacity: 1; }
	.anchor-btn:hover { background: var(--manual-hover); color: var(--manual-brand); }
	@media (hover: none) { .anchor-btn { display: none; } }
	.block-intro {
		display: flex;
		flex-direction: column;
		gap: .7rem;
	}
	.intro-text {
		color: var(--manual-muted);
		font-size: var(--text-lg);
		line-height: 1.7;
		text-wrap: pretty;
	}
	.intro-text :global(p)         { margin: 0 0 .6em; }
	.intro-text :global(p:last-child) { margin-bottom: 0; }
	.intro-text :global(ul),
	.intro-text :global(ol)        { margin: .3em 0 .3em 1.1em; padding: 0; }
	.intro-text :global(strong)    { font-weight: 600; color: var(--manual-ink); }
	.intro-text :global(a)         { color: var(--manual-brand); text-underline-offset: 3px; }
	.intro-callout,
	.block-callout {
		display: grid;
		grid-template-columns: 20px minmax(0, 1fr);
		gap: .6rem;
		padding: .75rem .85rem;
		border: 1px solid color-mix(in srgb, var(--manual-warning, #d97706) 26%, var(--manual-border));
		border-radius: var(--manual-radius);
		background: color-mix(in srgb, var(--manual-warning, #d97706) 7%, var(--manual-surface));
		color: var(--manual-ink);
		font-size: var(--text-base);
		line-height: 1.55;
	}
	.block-callout { white-space: pre-wrap; }
	.intro-callout.alert,
	.block-callout.alert {
		border-color: color-mix(in srgb, var(--manual-danger, #dc2626) 28%, var(--manual-border));
		background: color-mix(in srgb, var(--manual-danger, #dc2626) 7%, var(--manual-surface));
	}
	.callout-icon {
		width: 20px;
		height: 20px;
		display: grid;
		place-items: center;
		color: var(--manual-warning, #d97706);
	}
	.intro-callout.alert .callout-icon,
	.block-callout.alert .callout-icon { color: var(--manual-danger, #dc2626); }
	.intro-callout :global(p) { margin: 0; }
	.block-content {
		min-width: 0;
	}
</style>
