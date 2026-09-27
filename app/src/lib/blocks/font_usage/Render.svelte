<script lang="ts">
	import type { BlockRenderProps } from '../types';
	import { configList } from '../_shared/config';
	import { IconCheck } from '$lib/icons';
	import { useManualStrings } from '$lib/manual/ui-strings';

	const { block, data }: BlockRenderProps = $props();
	const strings = useManualStrings();
	const t = $derived(strings());

	const list = <T = Record<string, unknown>>(key: string) => configList<T>(block.config, key);

	const usageRows = $derived(list<{ label: string; fontIds?: string[] }>('rows').filter(r => r?.label));
	const usageFonts = $derived((() => { const ids = new Set(usageRows.flatMap(r => r.fontIds ?? [])); return data.fontRows.filter(f => ids.has(f.id)); })());
</script>

{#if usageRows.length && usageFonts.length}
	<div class="table-wrap">
		<table class="block-table usage-table">
			<thead><tr>
				<th>{t.usage}</th>
				{#each usageFonts as f (f.id)}<th class="usage-font" style="font-family:'{f.name.replace(/'/g, '')}', var(--manual-font)">{f.name}</th>{/each}
			</tr></thead>
			<tbody>
				{#each usageRows as row, ri (ri)}
					<tr>
						<td>{row.label}</td>
						{#each usageFonts as f (f.id)}
							<td class="usage-cell">
								{#if row.fontIds?.includes(f.id)}<span class="usage-yes" aria-label="✓"><IconCheck size={15} stroke={2.6} /></span>{:else}<span class="usage-no" aria-label="—">—</span>{/if}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<style>
	.usage-font { font-size: var(--text-md); font-weight: 500; text-align: center !important; text-transform: none !important; letter-spacing: -.01em !important; color: var(--manual-ink) !important; }
	.usage-cell { text-align: center; }
	.usage-yes { display: inline-grid; place-items: center; color: var(--manual-ink); }
	.usage-no { color: var(--manual-muted); opacity: .5; }
</style>
