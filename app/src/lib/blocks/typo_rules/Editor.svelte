<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { BlockEditorProps } from '../types';
	import { configArray } from '../_shared/editor';
	import { ask, askText } from '$lib/ui/dialog.svelte';
	import { IconPlus } from '$lib/icons';

	const { cfg, onUpdate }: BlockEditorProps = $props();

	type TypoRule = { category: string; rule: string; correct?: string; wrong?: string };
	type TypoLang = { lang: string; label: string; rules: TypoRule[] };

	// svelte-ignore state_referenced_locally
	let typoLangs = $state<TypoLang[]>(configArray<TypoLang>(cfg, 'languages'));
	let typoLangTab = $state(0);
	function updateTypoLangs(langs: TypoLang[]) { typoLangs = langs; onUpdate({ ...cfg, languages: langs }); }
	function updateTypoRules(langIdx: number, rules: TypoRule[]) {
		updateTypoLangs(typoLangs.map((l, i) => i === langIdx ? { ...l, rules } : l));
	}
</script>

<div class="fields">
	<!-- Language management -->
	<div class="typo-lang-bar">
	{#each typoLangs as tl, i (tl.lang)}
			<button type="button"
				class="typo-lang-tab"
				class:active={typoLangTab === i}
				onclick={() => (typoLangTab = i)}
			>{tl.label || tl.lang}</button>
		{/each}
		<button type="button" class="typo-lang-add"
			onclick={async () => {
				const lang = await askText({ title: m.be_add_language(), label: m.be_language_code(), placeholder: 'cs, en, de…', confirmLabel: m.common_add() });
				if (!lang) return;
				const label = lang === 'cs' ? 'Čeština' : lang === 'en' ? 'English' : lang === 'de' ? 'Deutsch' : lang;
				updateTypoLangs([...typoLangs, { lang, label, rules: [] }]);
				typoLangTab = typoLangs.length - 1;
			}}
		><IconPlus size={13} /> {m.be_language()}</button>
		{#if typoLangs.length > 0}
			<button type="button" class="typo-lang-remove"
				aria-label={m.be_remove_language()}
				title={m.be_remove_language()}
				onclick={async () => {
					if (!(await ask({ title: m.be_remove_language_confirm({ name: typoLangs[typoLangTab]?.label ?? '' }) }))) return;
					const newLangs = typoLangs.filter((_, i) => i !== typoLangTab);
					updateTypoLangs(newLangs);
					typoLangTab = Math.max(0, typoLangTab - 1);
				}}
			>✕</button>
		{/if}
	</div>

	{#if typoLangs[typoLangTab]}
		{@const tl = typoLangs[typoLangTab]}
		{@const ti = typoLangTab}

		<!-- Lang label -->
		<label class="field">
			<span>{m.be_language_name()}</span>
			<input type="text" value={tl.label} placeholder="Čeština"
				oninput={e => updateTypoLangs(typoLangs.map((l, i) => i === ti ? { ...l, label: (e.target as HTMLInputElement).value } : l))} />
		</label>

		<!-- Rules list -->
		<div class="typo-rules-list">
		{#each tl.rules as rule, ri (ri)}
				<div class="typo-rule-row">
					<div class="typo-rule-fields">
						<input type="text" value={rule.category} placeholder={m.be_rule_category()}
							oninput={e => updateTypoRules(ti, tl.rules.map((r, j) => j === ri ? { ...r, category: (e.target as HTMLInputElement).value } : r))}
							class="rule-cat" />
						<input type="text" value={rule.rule} placeholder={m.be_rule_desc()}
							oninput={e => updateTypoRules(ti, tl.rules.map((r, j) => j === ri ? { ...r, rule: (e.target as HTMLInputElement).value } : r))}
							class="rule-desc" />
						<div class="rule-examples">
							<input type="text" value={rule.correct ?? ''} placeholder={m.be_rule_right()}
								oninput={e => updateTypoRules(ti, tl.rules.map((r, j) => j === ri ? { ...r, correct: (e.target as HTMLInputElement).value } : r))} />
							<input type="text" value={rule.wrong ?? ''} placeholder={m.be_rule_wrong()}
								oninput={e => updateTypoRules(ti, tl.rules.map((r, j) => j === ri ? { ...r, wrong: (e.target as HTMLInputElement).value } : r))} />
						</div>
					</div>
					<button type="button" class="btn-ghost sm danger"
						onclick={() => updateTypoRules(ti, tl.rules.filter((_, j) => j !== ri))}
					>✕</button>
				</div>
			{/each}
			<button type="button" class="btn-add"
				onclick={() => updateTypoRules(ti, [...tl.rules, { category: '', rule: '', correct: '', wrong: '' }])}
			>{m.be_add_rule()}</button>
		</div>
	{:else}
		<p class="muted" style="font-size:.85rem">{m.be_add_language_hint()}</p>
	{/if}
</div>

<style>
	.typo-lang-bar {
		display: flex; align-items: center; gap: 4px; flex-wrap: wrap;
		border-bottom: 1px solid var(--color-border); padding-bottom: 2px; margin-bottom: 8px;
	}
	.typo-lang-tab {
		padding: 4px 12px; font-size: var(--text-sm); font-weight: 500; border: none;
		background: transparent; color: var(--color-muted); cursor: pointer;
		border-bottom: 2px solid transparent; margin-bottom: -3px; border-radius: 0;
		transition: color .14s, border-color .14s;
	}
	.typo-lang-tab:hover { color: var(--color-text); }
	.typo-lang-tab.active { color: var(--color-text); border-bottom-color: var(--color-accent); }
	.typo-lang-add {
		display: inline-flex; align-items: center; gap: 4px;
		padding: 4px 8px; border: 1px dashed var(--color-border); border-radius: var(--radius);
		background: transparent; color: var(--color-muted); font-size: var(--text-xs); cursor: pointer;
		margin-left: auto; transition: border-color .14s, color .14s;
	}
	.typo-lang-add:hover { border-color: var(--color-border-strong); color: var(--color-text); }
	.typo-lang-remove {
		padding: 4px 8px; border: none; background: transparent; color: var(--color-muted);
		cursor: pointer; font-size: var(--text-sm); border-radius: var(--radius-sm);
		transition: color .14s, background .14s;
	}
	.typo-lang-remove:hover { color: var(--color-danger); background: color-mix(in srgb, var(--color-danger) 10%, transparent); }
	.typo-rules-list { display: flex; flex-direction: column; gap: 8px; }
	.typo-rule-row {
		display: flex; gap: 8px; align-items: flex-start;
		padding: 8px; border: 1px solid var(--color-border); border-radius: var(--radius);
		background: var(--color-surface);
	}
	.typo-rule-fields { flex: 1; display: flex; flex-direction: column; gap: 4px; }
	.typo-rule-fields input { width: 100%; }
	.rule-cat { font-weight: 600 !important; }
	.rule-examples { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
</style>
