<script lang="ts">
	import type { BlockRenderProps } from '../types';
	import { configString } from '../_shared/config';

	const { block, anchorId }: BlockRenderProps = $props();

	const cfgStr = (key: string, fallback = '') => configString(block.config, key, fallback);

	const dividerStyle = $derived(cfgStr('style') || 'line');
</script>

<div class="divider divider-{dividerStyle}" id={anchorId} role="separator" style="--divider-space:{Math.min(20, Math.max(0, Number(block.config.spacing ?? 4)))}rem"></div>

<style>
	.divider { position: relative; margin: calc(var(--divider-space) / 4) 0; height: 1px; }
	.divider-line { background: var(--manual-border); }
	.divider-dots { height: 6px; background: radial-gradient(circle, var(--manual-border-strong) 1.5px, transparent 2px) center / 16px 6px repeat-x; max-width: 120px; margin-inline: auto; }
</style>
