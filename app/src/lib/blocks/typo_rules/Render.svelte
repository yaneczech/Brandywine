<script lang="ts">
	import type { BlockRenderProps } from '../types';
	import { useManualStrings } from '$lib/manual/ui-strings';

	const { block }: BlockRenderProps = $props();
	const strings = useManualStrings();
	const t = $derived(strings());

	let typoRulesTab = $state(0);
</script>

{#if Array.isArray(block.config.languages) && block.config.languages.length}
	{@const langs = block.config.languages as Array<{ lang: string; label: string; rules: Array<{ category: string; rule: string; correct?: string; wrong?: string }> }>}
	<!-- language tabs -->
	{#if langs.length > 1}
		<div class="tr-tabs" role="tablist">
			{#each langs as tl, i (tl.lang)}
				<button
					type="button"
					class="tr-tab"
					class:active={typoRulesTab === i}
					onclick={() => (typoRulesTab = i)}
					role="tab"
					aria-selected={typoRulesTab === i}
				>{tl.label || tl.lang}</button>
			{/each}
		</div>
	{/if}
	{@const activeLang = langs[typoRulesTab] ?? langs[0]}
	{#if activeLang?.rules?.length}
		<div class="tr-table-wrap">
			<table class="tr-table">
				<thead><tr>
					<th style="width:140px">{t.category}</th>
					<th>{t.rule}</th>
					<th style="width:160px">✓ {t.correct}</th>
					<th style="width:160px">✗ {t.wrong}</th>
				</tr></thead>
				<tbody>
					{#each activeLang.rules as rule, i (`${rule.category}-${i}`)}
						<tr>
							<td class="tr-cat">{rule.category}</td>
							<td>{rule.rule}</td>
							<td class="tr-correct">{rule.correct ?? ''}</td>
							<td class="tr-wrong">{rule.wrong ?? ''}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else}
		<div class="muted-block"><span class="placeholder-copy">{t.noRules}</span></div>
	{/if}
{:else}
	<div class="muted-block"><span class="placeholder-copy">{t.addRules}</span></div>
{/if}

<style>
	.tr-tabs {
		display: flex; gap: 24px; border-bottom: 1px solid var(--manual-border); margin-bottom: 20px;
	}
	.tr-tab {
		padding: 0 0 8px; font-size: var(--text-sm); font-weight: 500;
		border: none; background: transparent; color: var(--manual-muted); cursor: pointer;
		border-bottom: 1px solid transparent; margin-bottom: -1px;
		transition: color .14s, border-color .14s;
	}
	.tr-tab:hover { color: var(--manual-ink); }
	.tr-tab.active { color: var(--manual-ink); border-bottom-color: var(--manual-ink); }
	.tr-table-wrap { overflow-x: auto; }
	.tr-table { width: 100%; border-collapse: collapse; font-size: var(--text-sm); }
	.tr-table th {
		text-align: left; padding: 0 16px 8px 0;
		font-size: var(--manual-label-size); font-weight: 500; color: var(--manual-muted);
		text-transform: uppercase; letter-spacing: var(--manual-label-tracking);
		border-bottom: 1px solid var(--manual-border-strong); white-space: nowrap;
	}
	.tr-table td {
		padding: 12px 16px 12px 0; border-bottom: 1px solid var(--manual-border);
		color: var(--manual-ink); vertical-align: top; line-height: 1.55;
	}
	.tr-cat { font-weight: 500; color: var(--manual-ink); white-space: nowrap; }
	.tr-correct {
		font-family: var(--manual-mono); font-size: var(--text-sm);
		color: var(--manual-ink); white-space: nowrap;
	}
	.tr-wrong {
		font-family: var(--manual-mono); font-size: var(--text-sm);
		color: var(--manual-danger); white-space: nowrap;
		text-decoration: line-through; text-decoration-thickness: 1px; text-decoration-color: color-mix(in srgb, var(--manual-danger) 50%, transparent);
	}
</style>
