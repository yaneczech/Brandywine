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
	import * as m from '$lib/paraglide/messages';
	import RichContentEditor from '$lib/components/admin/RichContentEditor.svelte';

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
			<span class="field-label">{m.block_anchor()} <span class="muted">{m.block_anchor_hint()}</span></span>
			<input type="text" value={anchor} placeholder={m.block_anchor_placeholder()}
				oninput={e => onAnchorChange((e.target as HTMLInputElement).value)} />
		</label>
	</div>

	<!-- Kontext sekce — shown for all types except divider -->
	{#if block.type !== 'divider'}
		<div class="ctx-section ctx-section-context">
			<div class="ctx-heading">
				<h3>{m.block_ctx_title()}</h3>
				<p>{m.block_ctx_sub()}</p>
			</div>

			<label class="field">
				<span class="field-label">{m.block_ctx_layout()}</span>
				<select value={str('contextLayout') || 'side'}
					onchange={e => onUpdate({ ...cfg, contextLayout: (e.target as HTMLSelectElement).value })}>
					<option value="side">{m.block_ctx_side()}</option>
					<option value="top">{m.block_ctx_top()}</option>
				</select>
			</label>

			<label class="field">
				<span class="field-label">{m.block_ctx_heading()}</span>
				<input type="text"
					value={str('heading')}
					placeholder={m.block_ctx_heading_placeholder()}
					oninput={e => onUpdate({ ...cfg, heading: (e.target as HTMLInputElement).value })} />
			</label>

			<div class="field">
				<span class="field-label">{m.block_ctx_intro()}</span>
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
	gap: var(--space-6);
}
.ctx-section {
	display: flex;
	flex-direction: column;
	gap: var(--space-4);
}
.ctx-section-context {
	padding-top: var(--space-5);
	border-top: 1px solid var(--color-border);
}
.ctx-heading h3 {
	margin: 0 0 4px;
	font-size: var(--text-2xs);
	font-weight: 500;
	text-transform: uppercase;
	letter-spacing: var(--tracking-eyebrow);
	color: var(--color-text);
}
.ctx-heading p {
	margin: 0;
	color: var(--color-muted);
	font-size: var(--text-xs);
	line-height: var(--leading-snug);
}
.field {
	display: flex;
	flex-direction: column;
	gap: 8px;
	font-size: var(--text-sm);
}
.field-label {
	font-weight: 500;
	color: var(--color-text);
	font-size: var(--text-sm);
}
.muted { color: var(--color-muted); font-weight: 400; }
.field :where(input[type="text"], select) {
	width: 100%;
	height: var(--control-h);
	padding: 0 12px;
	border: 1px solid var(--color-border);
	border-radius: var(--radius);
	background: var(--color-surface);
	color: var(--color-text);
	font: inherit;
	font-size: var(--text-sm);
	box-shadow: var(--shadow-xs);
	outline: none;
	transition: border-color var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease);
}
.field select {
	appearance: none;
	padding-right: 32px;
	background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237a7a75' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
	background-repeat: no-repeat;
	background-position: right 10px center;
}
.field :where(input, select):hover:not(:focus) { border-color: var(--color-border-strong); }
.field :where(input, select):focus { border-color: var(--color-border-focus); box-shadow: var(--focus-ring); }
</style>
