<!--
  BlockPrimaryEditor — the block's own content editor, shown inside the block
  row. The form comes from the block's Editor.svelte (src/lib/blocks/<type>);
  blocks without one get a raw JSON editor. Heading, intro and anchor are
  edited separately in BlockConfigPanel.
-->
<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { IconCheck } from '$lib/icons';
	import { getBlockDefinition, type BlockEditorBrand } from '$lib/blocks';
	import '$lib/blocks/_shared/editor-styles.css';

	type Block = { id: string; type: string; config: Record<string, unknown>; anchor: string | null };

	const { block, cfg, onUpdate, onSave, saving = false, brandColors = [], brandFonts = [], brandPalettes = [] }: Partial<BlockEditorBrand> & {
		block: Block;
		cfg: Record<string, unknown>;
		onUpdate: (newCfg: Record<string, unknown>) => void;
		onSave: () => void;
		saving?: boolean;
	} = $props();

	const definition = $derived(getBlockDefinition(block.type));
</script>

<div class="primary-editor">
	{#if definition?.Editor}
		<!-- Remount per block so list editors start from that block's config -->
		{#key block.id}
			<definition.Editor {block} {cfg} {onUpdate} {brandColors} {brandFonts} {brandPalettes} />
		{/key}
	{:else}
		<div class="fields">
			<p class="muted" style="font-size:.85rem">{m.be_type()} <strong>{block.type}</strong> {m.be_no_editor()}</p>
			<label class="field">
				<span>{m.be_raw_json()}</span>
				<textarea class="code-area" rows={8}
					value={JSON.stringify(cfg, null, 2)}
					oninput={e => {
						try {
							onUpdate(JSON.parse((e.target as HTMLTextAreaElement).value));
						} catch {
							// Keep the last valid configuration while the user is typing incomplete JSON.
						}
					}}
				></textarea>
			</label>
		</div>
	{/if}

	<div class="save-bar">
		<button class="btn-save" onclick={onSave} disabled={saving}>
			<IconCheck size={14} /> {saving ? m.common_saving() : m.common_save()}
		</button>
	</div>
</div>

<style>
	.save-bar {
		padding-top: 12px;
		border-top: 1px solid var(--color-border);
		margin-top: 4px;
	}
	.btn-save {
		display: inline-flex; align-items: center; gap: 8px;
		padding: 8px 24px;
		background: var(--color-accent); color: var(--color-accent-contrast);
		border: none; border-radius: var(--radius);
		font-size: var(--text-base); cursor: pointer; font-weight: 500;
	}
	.btn-save:hover:not(:disabled) { filter: brightness(1.1); }
	.btn-save:disabled { opacity: .6; cursor: default; }
</style>
