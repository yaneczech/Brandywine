<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { BlockEditorProps } from '../types';
	import { configArray, moveItem } from '../_shared/editor';

	const { cfg, onUpdate }: BlockEditorProps = $props();

	type StatItem = { value: string; label: string; description?: string };

	// svelte-ignore state_referenced_locally
	let statItems = $state<StatItem[]>(configArray<StatItem>(cfg, 'items'));
	function updateStats(items: StatItem[]) {
		statItems = items;
		onUpdate({ ...cfg, items: items });
	}
</script>

<div class="list-editor">
	{#each statItems as item, i (i)}
		<div class="process-row">
			<div class="step-num">{i + 1}</div>
			<div class="step-fields">
				<div class="inline-pair">
					<input type="text" class="stat-value-input" value={item.value} placeholder="120+"
						oninput={e => updateStats(statItems.map((x, j) => j === i ? { ...x, value: (e.target as HTMLInputElement).value } : x))} />
					<input type="text" value={item.label} placeholder={m.be_stat_label()}
						oninput={e => updateStats(statItems.map((x, j) => j === i ? { ...x, label: (e.target as HTMLInputElement).value } : x))} />
				</div>
				<input type="text" value={item.description ?? ''} placeholder={m.be_stat_note()}
					oninput={e => updateStats(statItems.map((x, j) => j === i ? { ...x, description: (e.target as HTMLInputElement).value } : x))} />
			</div>
			<div class="row-actions">
				<button class="btn-ghost sm" onclick={() => updateStats(moveItem(statItems, i, i - 1))} disabled={i === 0} aria-label={m.editor_move_up()}>↑</button>
				<button class="btn-ghost sm" onclick={() => updateStats(moveItem(statItems, i, i + 1))} disabled={i === statItems.length - 1} aria-label={m.editor_move_down()}>↓</button>
				<button class="btn-ghost sm danger" onclick={() => updateStats(statItems.filter((_, j) => j !== i))} aria-label={m.common_remove()}>✕</button>
			</div>
		</div>
	{/each}
	<button class="btn-add" onclick={() => updateStats([...statItems, { value: '', label: '' }])}>{m.be_add_stat()}</button>
</div>

<style>
	.inline-pair .stat-value-input { font-weight: 600; }
</style>
