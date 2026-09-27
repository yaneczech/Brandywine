<script lang="ts">
	import type { Snippet } from 'svelte';
	import { IconCancel, IconExclamationCircle, IconLink, IconCheck } from '$lib/icons';
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
		number = null,
		children
	}: {
		id?: string;
		type: string;
		config: Record<string, unknown>;
		number?: string | null;
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
					{#if number}<span class="section-num">{number}</span>{/if}
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
							<div class="intro-callout" class:is-alert={item.type === 'alert'}>
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
				<div class="block-callout" class:is-alert={calloutType === 'alert'}>
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
		gap: 24px;
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
		gap: 12px;
		min-width: 0;
		max-width: 68ch;
	}
	.block-context h2 {
		position: relative;
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0;
		color: var(--manual-ink);
		font-size: clamp(1.5rem, 1.1rem + 1.2vw, 2rem);
		font-weight: var(--manual-display-weight, 500);
		letter-spacing: var(--manual-heading-tracking, -.028em);
		line-height: 1.1;
		text-wrap: balance;
	}
	/* Chapter number: set in the heading's size but light and muted, with a
	   fixed gap so numbered headings align down the page */
	/* Chapter number: a small superior figure on the cap line — present for
	   orientation, quiet next to the heading itself */
	.section-num {
		align-self: flex-start;
		margin: .3em .2em 0 0;
		color: var(--manual-muted);
		font-size: var(--text-sm);
		font-weight: 400;
		letter-spacing: 0;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}
	.anchor-btn {
		display: inline-grid;
		place-items: center;
		flex: 0 0 auto;
		width: 28px;
		height: 28px;
		border: 0;
		border-radius: var(--manual-control-radius);
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
		gap: 12px;
	}
	.intro-text {
		max-width: 60ch;
		color: var(--manual-muted);
		font-size: var(--text-lg);
		line-height: var(--manual-body-leading, 1.6);
		text-wrap: pretty;
	}
	.intro-text :global(p)         { margin: 0 0 .6em; }
	.intro-text :global(p:last-child) { margin-bottom: 0; }
	.intro-text :global(ul),
	.intro-text :global(ol)        { margin: .3em 0 .3em 1.1em; padding: 0; }
	.intro-text :global(strong)    { font-weight: 500; color: var(--manual-ink); }
	.intro-text :global(a)         { color: var(--manual-ink); text-decoration-color: var(--manual-border-strong); text-underline-offset: 3px; }
	.intro-text :global(a:hover)   { text-decoration-color: currentColor; }
	/* Notes: a hairline in the state colour, no tinted box — the state is
	   signalled, not shouted. */
	.intro-callout,
	.block-callout {
		--note: var(--manual-warning);
		display: grid;
		grid-template-columns: 16px minmax(0, 1fr);
		gap: 12px;
		padding: 12px 14px;
		border-radius: var(--manual-control-radius);
		background: color-mix(in srgb, var(--note) 7%, var(--manual-paper));
		color: var(--manual-ink);
		font-size: var(--text-md);
		line-height: 1.55;
	}
	.block-callout { white-space: pre-wrap; }
	.intro-callout.is-alert,
	.block-callout.is-alert { --note: var(--manual-danger); }
	.callout-icon {
		width: 16px;
		height: 1.55em;
		display: grid;
		place-items: center;
		color: var(--note);
	}
	.callout-icon :global(svg) { width: 15px; height: 15px; }
	.intro-callout :global(p) { margin: 0; }
	.block-content {
		min-width: 0;
	}
</style>
