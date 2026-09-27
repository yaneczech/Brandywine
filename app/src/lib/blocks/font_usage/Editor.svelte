<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { BlockEditorProps } from '../types';
	import { configArray, moveItem } from '../_shared/editor';

	const { cfg, onUpdate, brandFonts }: BlockEditorProps = $props();

	type UsageRow = { label: string; fontIds: string[] };

	// svelte-ignore state_referenced_locally
	let usageRows = $state<UsageRow[]>(configArray<UsageRow>(cfg, 'rows').map((r) => ({ ...r, fontIds: Array.isArray(r.fontIds) ? r.fontIds : [] })));
	function updateUsage(rows: UsageRow[]) {
		usageRows = rows;
		onUpdate({ ...cfg, rows: rows });
	}
</script>

<div class="list-editor">
	{#if !brandFonts.length}
		<p class="muted" style="font-size:.85rem">{m.be_need_fonts()}</p>
	{/if}
	{#each usageRows as row, i (i)}
		<div class="variant-card">
			<div class="variant-head">
				<input type="text" value={row.label} placeholder={m.be_usage_context()}
					oninput={e => updateUsage(usageRows.map((r, j) => j === i ? { ...r, label: (e.target as HTMLInputElement).value } : r))} />
				<button class="btn-ghost sm" onclick={() => updateUsage(moveItem(usageRows, i, i - 1))} disabled={i === 0} aria-label={m.editor_move_up()}>↑</button>
				<button class="btn-ghost sm danger" onclick={() => updateUsage(usageRows.filter((_, j) => j !== i))} aria-label={m.common_remove()}>✕</button>
			</div>
			<div class="chip-checks">
				{#each brandFonts as f (f.id)}
					<label class="chip-check">
						<input type="checkbox" checked={row.fontIds.includes(f.id)}
							onchange={e => updateUsage(usageRows.map((r, j) => j === i ? { ...r, fontIds: (e.target as HTMLInputElement).checked ? [...r.fontIds, f.id] : r.fontIds.filter(x => x !== f.id) } : r))} />
						<span>{f.name}</span>
					</label>
				{/each}
			</div>
		</div>
	{/each}
	<button class="btn-add" onclick={() => updateUsage([...usageRows, { label: '', fontIds: brandFonts.map(f => f.id) }])}>{m.be_add_usage()}</button>
</div>
