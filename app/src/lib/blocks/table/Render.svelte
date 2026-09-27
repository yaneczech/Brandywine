<script lang="ts">
	import type { BlockRenderProps } from '../types';

	const { block }: BlockRenderProps = $props();
</script>

{#if Array.isArray(block.config.headers)}
	<div class="table-wrap">
		<table class="block-table">
			<thead><tr>{#each block.config.headers as h, i (i)}<th>{h}</th>{/each}</tr></thead>
			<tbody>
				{#if Array.isArray(block.config.rows)}
					{#each block.config.rows as row, rowIndex (rowIndex)}
						<tr>{#each row as cell, cellIndex (cellIndex)}<td>{cell}</td>{/each}</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>
{/if}
