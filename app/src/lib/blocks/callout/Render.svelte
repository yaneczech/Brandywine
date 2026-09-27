<script lang="ts">
	import type { BlockRenderProps } from '../types';
	import { configString } from '../_shared/config';
	import { IconAlertTriangle, IconCancel, IconCircleCheck, IconInfoCircle } from '$lib/icons';

	const { block }: BlockRenderProps = $props();

	const cfgStr = (key: string, fallback = '') => configString(block.config, key, fallback);

	const tone = $derived(['info', 'success', 'warning', 'danger'].includes(cfgStr('tone')) ? cfgStr('tone') : 'info');
</script>

{#if cfgStr('title') || cfgStr('text')}
	<div class="callout-block tone-{tone}" role="note">
		<span class="callout-block-icon" aria-hidden="true">
			{#if tone === 'success'}<IconCircleCheck size={20} stroke={1.9} />
			{:else if tone === 'warning'}<IconAlertTriangle size={20} stroke={1.9} />
			{:else if tone === 'danger'}<IconCancel size={20} stroke={1.9} />
			{:else}<IconInfoCircle size={20} stroke={1.9} />{/if}
		</span>
		<div class="callout-block-body">
			{#if cfgStr('title')}<strong>{cfgStr('title')}</strong>{/if}
			{#if cfgStr('text')}<p>{cfgStr('text')}</p>{/if}
		</div>
	</div>
{/if}

<style>
	.callout-block {
		--tone: var(--manual-info, #2563eb);
		display: grid; grid-template-columns: 16px minmax(0, 1fr); gap: 12px;
		max-width: 72ch;
		padding: 12px 14px;
		border-radius: var(--manual-control-radius);
		background: color-mix(in srgb, var(--tone) 7%, var(--manual-paper));
	}
	.callout-block.tone-success { --tone: var(--manual-success, #16a34a); }
	.callout-block.tone-warning { --tone: var(--manual-warning, #d97706); }
	.callout-block.tone-danger { --tone: var(--manual-danger, #dc2626); }
	.callout-block-icon { display: grid; place-items: center; height: 1.4em; color: var(--tone); font-size: var(--text-md); }
	.callout-block-icon :global(svg) { width: 16px; height: 16px; }
	.callout-block-body { display: flex; flex-direction: column; gap: .2rem; min-width: 0; }
	.callout-block-body strong { color: var(--manual-ink); font-size: var(--text-md); font-weight: 500; line-height: 1.4; }
	.callout-block-body p { margin: 0; color: var(--manual-muted); font-size: var(--text-md); line-height: 1.6; white-space: pre-line; }
	.callout-block-body strong + p { margin-top: .05rem; }
</style>
