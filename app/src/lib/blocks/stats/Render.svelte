<script lang="ts">
	import type { BlockRenderProps } from '../types';
	import { configList } from '../_shared/config';

	const { block }: BlockRenderProps = $props();

	const list = <T = Record<string, unknown>>(key: string) => configList<T>(block.config, key);

	const stats = $derived(list<{ value: string; label: string; description?: string }>('items').filter((item) => item?.value || item?.label));
</script>

{#if stats.length}
	<div class="stats-grid" style="--stat-cols:{Math.min(4, stats.length)}">
		{#each stats as stat, si (si)}
			<div class="stat">
				<span class="stat-value">{stat.value}</span>
				<span class="stat-label">{stat.label}</span>
				{#if stat.description}<span class="stat-desc">{stat.description}</span>{/if}
			</div>
		{/each}
	</div>
{/if}

<style>
	.stats-grid {
		display: flex;
		flex-wrap: wrap;
		margin: 0;
		border-top: 1px solid var(--manual-border-strong);
	}
	.stat { flex: 1 1 max(160px, calc(100% / var(--stat-cols))); display: flex; flex-direction: column; gap: 4px; padding: 20px 24px 0 0; }
	.stat + .stat { padding-left: 20px; border-left: 1px solid var(--manual-border); }
	.stat-value {
		color: var(--manual-ink);
		font-size: clamp(2.25rem, 4.2vw, 3.25rem); font-weight: 300; line-height: 1;
		letter-spacing: -.04em; font-variant-numeric: tabular-nums;
	}
	.stat-label { margin-top: 8px; color: var(--manual-ink); font-size: var(--text-sm); font-weight: 500; }
	.stat-desc { color: var(--manual-muted); font-size: var(--text-sm); line-height: 1.5; }
</style>
