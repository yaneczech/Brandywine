<script lang="ts">
	import type { Snippet } from 'svelte';
	import { IconCancel, IconExclamationCircle } from '@tabler/icons-svelte';

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
			return (value as RichItem[]).filter(
				item => item.type !== 'text' || item.html?.replace(/<[^>]*>/g, '').trim()
			);
		}
		if (typeof value === 'string' && value.trim()) {
			return [{ type: 'text', html: value.trim() }];
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
</script>

<section class="manual-block" class:no-context={!hasContext} {id} data-block-type={type}>
	{#if hasContext}
		<aside class="block-context">
			{#if heading}
				<h2>{heading}</h2>
			{/if}
			{#if hasIntro}
				<div class="block-intro">
					{#each introItems as item (item)}
						{#if item.type === 'text'}
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
		scroll-margin-top: 92px;
		display: grid;
		grid-template-columns: minmax(180px, 280px) minmax(0, 1fr);
		gap: clamp(1.25rem, 4vw, 3rem);
		align-items: start;
	}
	.manual-block.no-context {
		grid-template-columns: 1fr;
	}
	.block-context {
		display: flex;
		flex-direction: column;
		gap: .9rem;
		min-width: 0;
	}
	.block-context h2 {
		margin: 0;
		color: var(--manual-ink);
		font-size: clamp(1.05rem, 1.45vw, 1.38rem);
		font-weight: 820;
		letter-spacing: 0;
		line-height: 1.18;
	}
	.block-intro {
		display: flex;
		flex-direction: column;
		gap: .6rem;
	}
	.intro-text {
		color: var(--manual-muted);
		font-size: .92rem;
		line-height: 1.72;
	}
	.intro-text :global(p)         { margin: 0 0 .5em; }
	.intro-text :global(p:last-child) { margin-bottom: 0; }
	.intro-text :global(ul),
	.intro-text :global(ol)        { margin: .3em 0 .3em 1.1em; padding: 0; }
	.intro-text :global(strong)    { font-weight: 680; color: var(--manual-ink); }
	/* inline callouts inside intro */
	.intro-callout {
		display: grid;
		grid-template-columns: 18px minmax(0, 1fr);
		gap: .5rem;
		padding: .6rem .7rem;
		border: 1px solid color-mix(in srgb, var(--manual-brand) 26%, var(--manual-border));
		border-radius: var(--manual-radius);
		background: color-mix(in srgb, var(--manual-brand) 8%, var(--manual-surface));
		color: var(--manual-ink);
		font-size: .84rem;
		line-height: 1.52;
	}
	.intro-callout.alert {
		border-color: color-mix(in srgb, #ef4444 32%, var(--manual-border));
		background: color-mix(in srgb, #ef4444 9%, var(--manual-surface));
	}
	.intro-callout .callout-icon {
		width: 18px; height: 18px;
		display: grid; place-items: center;
		color: var(--manual-brand);
		padding-top: .1rem;
	}
	.intro-callout.alert .callout-icon { color: #dc2626; }
	.intro-callout :global(p) { margin: 0; }
	.block-callout {
		display: grid;
		grid-template-columns: 22px minmax(0, 1fr);
		gap: .65rem;
		padding: .75rem .8rem;
		border: 1px solid color-mix(in srgb, var(--manual-brand) 26%, var(--manual-border));
		border-radius: var(--manual-radius);
		background: color-mix(in srgb, var(--manual-brand) 8%, var(--manual-surface));
		color: var(--manual-ink);
		font-size: .84rem;
		line-height: 1.55;
		white-space: pre-wrap;
	}
	.block-callout.alert {
		border-color: color-mix(in srgb, #ef4444 32%, var(--manual-border));
		background: color-mix(in srgb, #ef4444 9%, var(--manual-surface));
	}
	.callout-icon {
		width: 22px;
		height: 22px;
		display: grid;
		place-items: center;
		color: var(--manual-brand);
	}
	.block-callout.alert .callout-icon {
		color: #dc2626;
	}
	.block-content {
		min-width: 0;
	}

	@media (max-width: 760px) {
		.manual-block {
			grid-template-columns: 1fr;
			gap: 1rem;
		}
		.block-context {
			max-width: 680px;
		}
	}
</style>
