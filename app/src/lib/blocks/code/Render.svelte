<script lang="ts">
	import type { BlockRenderProps } from '../types';
	import { configString } from '../_shared/config';
	import { copyToClipboard } from '../_shared/clipboard';
	import { IconCheck, IconCopy } from '$lib/icons';
	import { useManualStrings } from '$lib/manual/ui-strings';

	const { block }: BlockRenderProps = $props();
	const strings = useManualStrings();
	const t = $derived(strings());

	const cfgStr = (key: string, fallback = '') => configString(block.config, key, fallback);

	let copiedKey = $state('');
	function copyValue(key: string, value: string) {
		copiedKey = key;
		setTimeout(() => { if (copiedKey === key) copiedKey = ''; }, 1400);
		void copyToClipboard(value);
	}
</script>

<div class="code-shell">
	<div class="code-head">
		<span class="code-lang">{cfgStr('language') || 'code'}</span>
		<button class="code-copy" onclick={() => copyValue(`code-${block.id}`, String(block.config.code ?? ''))}>
			{#if copiedKey === `code-${block.id}`}<IconCheck size={14} stroke={2.4} />{t.copied}{:else}<IconCopy size={14} stroke={1.9} />{t.copy}{/if}
		</button>
	</div>
	<pre class="code-block"><code>{block.config.code ?? ''}</code></pre>
</div>

<style>
	.code-shell { overflow: hidden; border-radius: var(--manual-radius); background: var(--manual-stage); }
	.code-head {
		display: flex; align-items: center; justify-content: space-between;
		padding: 8px 8px 8px 20px; border-bottom: 1px solid var(--manual-border);
	}
	.code-lang { color: var(--manual-muted); font-size: var(--manual-label-size); font-weight: 500; letter-spacing: var(--manual-label-tracking); text-transform: uppercase; }
	.code-copy {
		display: inline-flex; align-items: center; gap: 4px; height: 28px; padding: 0 8px;
		border: 0; border-radius: var(--manual-control-radius); background: transparent; color: var(--manual-muted);
		font-family: inherit; font-size: var(--text-xs); font-weight: 500; cursor: pointer;
		transition: color .15s ease;
	}
	.code-copy:hover { color: var(--manual-ink); }
	.code-shell .code-block { border-radius: 0; background: transparent; }
</style>
