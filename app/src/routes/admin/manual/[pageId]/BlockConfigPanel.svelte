<!--
  BlockConfigPanel — context/metadata panel shown in the right sidebar.
  Contains only: anchor, section heading, intro text, callout.
  Props:
    block         — the block being edited
    cfg           — current config (shared editingCfg from parent)
    anchor        — current anchor value
    onUpdate      — called with updated cfg when context fields change
    onAnchorChange — called when anchor changes
-->
<script lang="ts">
	import RichContentEditor from './RichContentEditor.svelte';

	const { block, cfg, anchor, onUpdate, onAnchorChange }: {
		block: { id: string; type: string };
		cfg: Record<string, unknown>;
		anchor: string;
		onUpdate: (newCfg: Record<string, unknown>) => void;
		onAnchorChange: (newAnchor: string) => void;
	} = $props();

	function str(key: string): string {
		return typeof cfg[key] === 'string' ? (cfg[key] as string) : '';
	}

	// intro can be a legacy string or a rich content array
	const introValue   = $derived(Array.isArray(cfg['intro']) ? cfg['intro'] : undefined);
	const introLegacy  = $derived(typeof cfg['intro'] === 'string' ? (cfg['intro'] as string) : '');

	function updateIntro(items: unknown[]) {
		onUpdate({ ...cfg, intro: items });
	}
</script>

<div class="context-panel">

	<!-- Anchor -->
	<div class="ctx-section">
		<label class="field">
			<span class="field-label">Kotva <span class="muted">— pro TOC</span></span>
			<input type="text" value={anchor} placeholder="napr. nase-barvy"
				oninput={e => onAnchorChange((e.target as HTMLInputElement).value)} />
		</label>
	</div>

	<!-- Kontext sekce — shown for all types except divider -->
	{#if block.type !== 'divider'}
		<div class="ctx-section ctx-section-context">
			<div class="ctx-heading">
				<h3>Kontext sekce</h3>
				<p>Levý sloupec bloku ve veřejném manuálu — orientuje čtenáře v obsahu.</p>
			</div>

			<label class="field">
				<span class="field-label">Nadpis</span>
				<input type="text"
					value={str('heading')}
					placeholder="Např. Použití loga"
					oninput={e => onUpdate({ ...cfg, heading: (e.target as HTMLInputElement).value })} />
			</label>

			<div class="field">
				<span class="field-label">Vysvětlující text</span>
				{#key block.id}
					<RichContentEditor
						value={introValue}
						legacyMarkdown={introLegacy}
						onChange={updateIntro}
					/>
				{/key}
			</div>

		</div>
	{/if}

</div>

<style>
.context-panel {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}
.ctx-section {
	display: flex;
	flex-direction: column;
	gap: .75rem;
}
.ctx-section-context {
	padding: .9rem;
	border: 1px solid var(--color-border);
	border-radius: 8px;
	background: color-mix(in srgb, var(--color-surface-raised) 72%, transparent);
}
.ctx-heading h3 {
	margin: 0 0 .2rem;
	font-size: .875rem;
	font-weight: 650;
	color: var(--color-text);
}
.ctx-heading p {
	margin: 0 0 .75rem;
	color: var(--color-muted);
	font-size: .78rem;
	line-height: 1.45;
}
.field {
	display: flex;
	flex-direction: column;
	gap: .3rem;
	font-size: .875rem;
}
.field-label {
	font-weight: 500;
	color: var(--color-text);
	font-size: .82rem;
}
.muted { color: var(--color-muted); font-weight: 400; }
.field input[type="text"],
.field select,
.field textarea {
	padding: .42rem .6rem;
	border: 1px solid var(--color-border);
	border-radius: 6px;
	font-size: .85rem;
	background: var(--color-surface-raised);
	color: var(--color-text);
	outline: none;
	width: 100%;
	box-sizing: border-box;
	font-family: inherit;
}
.field input:focus, .field select:focus, .field textarea:focus { border-color: var(--brand); }
.field textarea { resize: vertical; }
</style>
