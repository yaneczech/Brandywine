<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { BlockEditorProps } from '../types';
	import { configArray } from '../_shared/editor';

	const { cfg, onUpdate }: BlockEditorProps = $props();

	// svelte-ignore state_referenced_locally
	let tableHeaders = $state<string[]>(configArray<string>(cfg, 'headers'));
	// svelte-ignore state_referenced_locally
	let tableRows = $state<string[][]>(configArray<string[]>(cfg, 'rows'));
	function updateTable(headers: string[], rows: string[][]) {
		tableHeaders = headers;
		tableRows = rows;
		onUpdate({ ...cfg, headers, rows });
	}
</script>

<div class="fields">
	<label class="field">
		<span>{m.be_table_headers()} <span class="muted">{m.be_comma_hint()}</span></span>
		<input type="text"
			value={tableHeaders.join(', ')}
			oninput={e => updateTable((e.target as HTMLInputElement).value.split(',').map(s => s.trim()), tableRows)}
			placeholder={m.be_table_headers_placeholder()} />
	</label>
	<label class="field">
		<span>{m.be_rows()} <span class="muted">{m.be_table_rows_hint()}</span></span>
		<textarea rows={6}
			value={tableRows.map(r => r.join(', ')).join('\n')}
			oninput={e => updateTable(tableHeaders, (e.target as HTMLTextAreaElement).value.split('\n').filter(Boolean).map(r => r.split(',').map(s => s.trim())))}
			placeholder="Hodnota A, 100, Popis A&#10;Hodnota B, 200, Popis B"></textarea>
	</label>
</div>
