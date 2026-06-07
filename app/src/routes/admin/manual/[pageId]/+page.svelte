<script lang="ts">
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';
	import {
		IconArrowLeft, IconPlus, IconTrash, IconGripVertical, IconX,
		IconEye, IconEyeOff, IconChevronUp, IconChevronDown, IconSettings,
		IconCheck
	} from '@tabler/icons-svelte';
	import { BLOCK_TYPES } from '$lib/manual/blockTypes';
	import BlockConfigPanel from './BlockConfigPanel.svelte';

	const { data }: { data: PageData } = $props();

	// ── Types ──────────────────────────────────────────────────────────────────
	type Block = {
		id: string; pageId: string; type: string; config: Record<string, unknown>;
		sortOrder: number; enabled: boolean; anchor: string | null;
	};

	type BrandColor = { id: string; name: string; hex: string };

	// ── State ──────────────────────────────────────────────────────────────────
	let page = $state(data.page);
	let blocks = $state<Block[]>(data.blocks as Block[]);
	let brandColors = $state<BrandColor[]>((data.brandColors ?? []) as BrandColor[]);
	let saving = $state(false);
	let errMsg = $state('');

	// Page settings panel
	let showPageSettings = $state(false);
	let pageFeatureImage = $state<string>(page.featureImage ?? '');
	let pageBgColor = $state<string>(page.bgColor ?? '');

	// Block picker
	let showPicker = $state(false);
	let insertAfterIdx = $state<number | null>(null); // null = append

	// Config panel
	let editingBlockId = $state<string | null>(null);
	let editingBlock = $derived(blocks.find(b => b.id === editingBlockId) ?? null);

	// Delete confirm
	let confirmDeleteId = $state<string | null>(null);

	// ── Block type labels ──────────────────────────────────────────────────────
	const BLOCK_LABELS: Record<string, string> = {
		rich_text:    'Formátovaný text',
		image:        'Obrázek',
		image_gallery:'Galerie obrázků',
		carousel:     'Karusel',
		before_after: 'Before / After',
		colors:       'Barvy',
		typography:   'Typografie',
		text_styles:  'Kombinace stylů',
		grid:         'Grid & zarovnání',
		logo_spec:    'Specifikace loga',
		do_dont:      'Do / Don\'t',
		naming:       'Psaní názvů',
		icons:        'Ikony',
		process:      'Proces tvorby',
		chart:        'Graf (radar)',
		table:        'Tabulka',
		asset_gallery:'Galerie assets',
		download:     'Ke stažení',
		accordion:    'Accordion (FAQ)',
		cards:        'Kartičky',
		html:         'HTML blok',
		code:         'Kódový blok',
		divider:      'Oddělovač',
	};

	// Group block types for the picker
	const PICKER_GROUPS = [
		{ label: 'Obsah',     types: ['rich_text', 'image', 'image_gallery', 'carousel', 'before_after'] },
		{ label: 'Brand',     types: ['colors', 'typography', 'text_styles', 'grid', 'logo_spec', 'do_dont', 'naming', 'icons', 'process', 'chart'] },
		{ label: 'Data',      types: ['table', 'asset_gallery', 'download', 'accordion', 'cards'] },
		{ label: 'Pokročilé', types: ['html', 'code', 'divider'] },
	];

	// ── API helpers ───────────────────────────────────────────────────────────
	async function apiFetch(url: string, opts: RequestInit) {
		const r = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
		if (!r.ok) {
			const txt = await r.text().catch(() => r.statusText);
			throw new Error(txt);
		}
		return r.status === 204 ? null : r.json();
	}

	async function addBlock(type: string) {
		saving = true; errMsg = '';
		try {
			const afterId = insertAfterIdx !== null ? blocks[insertAfterIdx]?.id : undefined;
			const block = await apiFetch(`/api/manual/pages/${page.id}/blocks`, {
				method: 'POST',
				body: JSON.stringify({ type, afterId }),
			}) as Block;
			// Insert in right position
			if (insertAfterIdx !== null) {
				const idx = blocks.findIndex(b => b.id === afterId);
				blocks = [...blocks.slice(0, idx + 1), block, ...blocks.slice(idx + 1)];
			} else {
				blocks = [...blocks, block];
			}
			showPicker = false;
			editingBlockId = block.id; // immediately open config
		} catch (e: unknown) {
			errMsg = e instanceof Error ? e.message : String(e);
		} finally {
			saving = false;
		}
	}

	async function moveBlock(id: string, dir: 'up' | 'down') {
		const idx = blocks.findIndex(b => b.id === id);
		if (dir === 'up' && idx === 0) return;
		if (dir === 'down' && idx === blocks.length - 1) return;

		const other = dir === 'up' ? blocks[idx - 1] : blocks[idx + 1];
		saving = true; errMsg = '';
		try {
			await apiFetch(`/api/manual/blocks/${id}`, {
				method: 'PATCH',
				body: JSON.stringify(dir === 'up' ? { beforeId: other.id } : { afterId: other.id }),
			});
			// Reorder locally
			const newBlocks = [...blocks];
			if (dir === 'up') {
				[newBlocks[idx - 1], newBlocks[idx]] = [newBlocks[idx], newBlocks[idx - 1]];
			} else {
				[newBlocks[idx], newBlocks[idx + 1]] = [newBlocks[idx + 1], newBlocks[idx]];
			}
			blocks = newBlocks;
		} catch (e: unknown) {
			errMsg = e instanceof Error ? e.message : String(e);
		} finally {
			saving = false;
		}
	}

	async function toggleBlockEnabled(block: Block) {
		saving = true; errMsg = '';
		try {
			const updated = await apiFetch(`/api/manual/blocks/${block.id}`, {
				method: 'PATCH',
				body: JSON.stringify({ enabled: !block.enabled }),
			}) as Block;
			blocks = blocks.map(b => b.id === block.id ? updated : b);
		} catch (e: unknown) {
			errMsg = e instanceof Error ? e.message : String(e);
		} finally {
			saving = false;
		}
	}

	async function deleteBlock(id: string) {
		saving = true; errMsg = '';
		try {
			await apiFetch(`/api/manual/blocks/${id}`, { method: 'DELETE' });
			blocks = blocks.filter(b => b.id !== id);
			confirmDeleteId = null;
			if (editingBlockId === id) editingBlockId = null;
		} catch (e: unknown) {
			errMsg = e instanceof Error ? e.message : String(e);
		} finally {
			saving = false;
		}
	}

	// Save page-level settings (featureImage, bgColor)
	async function savePageSettings() {
		saving = true; errMsg = '';
		try {
			const updated = await apiFetch(`/api/manual/pages/${page.id}`, {
				method: 'PATCH',
				body: JSON.stringify({
					featureImage: pageFeatureImage.trim() || null,
					bgColor: pageBgColor || null,
				}),
			});
			page = updated;
			showPageSettings = false;
		} catch (e: unknown) {
			errMsg = e instanceof Error ? e.message : String(e);
		} finally {
			saving = false;
		}
	}

	// Called by BlockConfigPanel when config is saved
	async function saveBlockConfig(blockId: string, config: Record<string, unknown>) {
		saving = true; errMsg = '';
		try {
			const updated = await apiFetch(`/api/manual/blocks/${blockId}`, {
				method: 'PATCH',
				body: JSON.stringify({ config }),
			}) as Block;
			blocks = blocks.map(b => b.id === blockId ? updated : b);
		} catch (e: unknown) {
			errMsg = e instanceof Error ? e.message : String(e);
		} finally {
			saving = false;
		}
	}
</script>

<div class="layout" class:panel-open={!!editingBlockId}>
	<!-- Main column -->
	<div class="main-col">
		<!-- Header -->
		<div class="page-header">
			<a href="/admin/manual" class="back-btn"><IconArrowLeft size={18} /> Stránky</a>
			<div class="page-info">
				<h1>{page.title}</h1>
				<span class="page-slug muted">/manual/{page.slug}</span>
			</div>
			<button class="btn-ghost settings-btn" class:active={showPageSettings}
				onclick={() => showPageSettings = !showPageSettings} title="Nastavení stránky">
				<IconSettings size={16} /> Nastavení stránky
			</button>
		</div>

		<!-- Page settings panel -->
		{#if showPageSettings}
			<div class="page-settings-panel">
				<div class="settings-row">
					<label class="field">
						<span>Feature image <span class="muted">(URL nebo cesta /uploads/…)</span></span>
						<input type="text" bind:value={pageFeatureImage} placeholder="/uploads/…" />
					</label>
					<label class="field">
						<span>Barva pozadí</span>
						<div class="color-picker-row">
							<input type="color" bind:value={pageBgColor} class="color-swatch-input" />
							<span class="color-hex">{pageBgColor || '—'}</span>
							{#if brandColors.length}
								<div class="palette-swatches">
									{#each brandColors as c}
										<button
											class="palette-swatch"
											class:selected={pageBgColor === c.hex}
											style="background:{c.hex}"
											title={c.name}
											onclick={() => pageBgColor = c.hex}
										></button>
									{/each}
									<button class="palette-swatch clear-swatch" title="Bez barvy"
										onclick={() => pageBgColor = ''}>✕</button>
								</div>
							{/if}
						</div>
					</label>
				</div>
				<div class="settings-actions">
					<button class="btn-secondary" onclick={() => showPageSettings = false}>Zrušit</button>
					<button class="btn-primary" onclick={savePageSettings} disabled={saving}>
						<IconCheck size={14} /> {saving ? 'Ukládám…' : 'Uložit'}
					</button>
				</div>
			</div>
		{/if}

		{#if errMsg}
			<div class="error-bar">{errMsg}</div>
		{/if}

		<!-- Block list -->
		<div class="block-list" style="margin-top: {showPageSettings ? 0 : '1.5rem'}">
			{#if blocks.length === 0}
				<div class="empty-state">
					<p>Tato stránka nemá žádné bloky.</p>
					<button class="btn-primary" onclick={() => { insertAfterIdx = null; showPicker = true; }}>
						<IconPlus size={16} /> Přidat první blok
					</button>
				</div>
			{:else}
				{#each blocks as block, i (block.id)}
					<div class="block-row" class:disabled={!block.enabled} class:active={editingBlockId === block.id}>
						<div class="block-drag">
							<IconGripVertical size={16} />
						</div>

						<div class="block-body" role="button" tabindex="0"
							onclick={() => editingBlockId = editingBlockId === block.id ? null : block.id}
							onkeydown={e => e.key === 'Enter' && (editingBlockId = block.id)}
						>
							<span class="block-type-badge">{BLOCK_LABELS[block.type] ?? block.type}</span>
							{#if block.anchor}
								<span class="block-anchor muted">#{block.anchor}</span>
							{/if}
							{#if !block.enabled}
								<span class="hidden-badge">skryto</span>
							{/if}
						</div>

						<div class="block-actions">
							<button class="btn-ghost sm" onclick={() => moveBlock(block.id, 'up')} disabled={i === 0} title="Výš">
								<IconChevronUp size={14} />
							</button>
							<button class="btn-ghost sm" onclick={() => moveBlock(block.id, 'down')} disabled={i === blocks.length - 1} title="Níž">
								<IconChevronDown size={14} />
							</button>
							<button class="btn-ghost sm" onclick={() => toggleBlockEnabled(block)} title={block.enabled ? 'Skrýt' : 'Zobrazit'}>
								{#if block.enabled}<IconEye size={14} />{:else}<IconEyeOff size={14} />{/if}
							</button>
							<button class="btn-ghost sm" onclick={() => { editingBlockId = editingBlockId === block.id ? null : block.id; }} title="Nastavení">
								<IconSettings size={14} />
							</button>
							<button class="btn-ghost sm danger" onclick={() => confirmDeleteId = block.id} title="Smazat">
								<IconTrash size={14} />
							</button>
						</div>
					</div>

					<!-- Insert button between blocks -->
					<button class="insert-btn" onclick={() => { insertAfterIdx = i; showPicker = true; }} title="Vložit blok">
						<IconPlus size={12} />
					</button>
				{/each}
			{/if}

			{#if blocks.length > 0}
				<div class="add-block-row">
					<button class="btn-secondary" onclick={() => { insertAfterIdx = null; showPicker = true; }}>
						<IconPlus size={16} /> Přidat blok
					</button>
				</div>
			{/if}
		</div>
	</div>

	<!-- Config panel (right side) -->
	{#if editingBlock}
		<div class="config-panel">
			<div class="panel-header">
				<span class="panel-title">{BLOCK_LABELS[editingBlock.type] ?? editingBlock.type}</span>
				<button class="btn-ghost" onclick={() => editingBlockId = null}><IconX size={18} /></button>
			</div>
			<div class="panel-body">
				<BlockConfigPanel
					block={editingBlock}
					onSave={(config: Record<string, unknown>) => saveBlockConfig(editingBlock!.id, config)}
				/>
			</div>
		</div>
	{/if}
</div>

<!-- Block picker modal -->
{#if showPicker}
	<div class="modal-backdrop" role="presentation" onclick={() => showPicker = false}>
		<div class="modal picker-modal" role="dialog" onclick={e => e.stopPropagation()}>
			<div class="modal-header">
				<h2>Vybrat typ bloku</h2>
				<button class="btn-ghost" onclick={() => showPicker = false}><IconX size={18} /></button>
			</div>
			<div class="picker-body">
				{#each PICKER_GROUPS as group}
					<div class="picker-group">
						<div class="picker-group-label">{group.label}</div>
						<div class="picker-grid">
							{#each group.types as type}
								<button class="picker-tile" onclick={() => addBlock(type)} disabled={saving}>
									<span class="tile-label">{BLOCK_LABELS[type] ?? type}</span>
								</button>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/if}

<!-- Delete confirm -->
{#if confirmDeleteId}
	<div class="modal-backdrop" role="presentation" onclick={() => confirmDeleteId = null}>
		<div class="modal modal-sm" role="dialog" onclick={e => e.stopPropagation()}>
			<div class="modal-header">
				<h2>Smazat blok?</h2>
				<button class="btn-ghost" onclick={() => confirmDeleteId = null}><IconX size={18} /></button>
			</div>
			<div class="modal-body">
				<p>Opravdu smazat tento blok? Tuto akci nelze vrátit.</p>
			</div>
			<div class="modal-footer">
				<button class="btn-secondary" onclick={() => confirmDeleteId = null}>Zrušit</button>
				<button class="btn-danger" onclick={() => deleteBlock(confirmDeleteId!)} disabled={saving}>
					{saving ? 'Mažu…' : 'Smazat'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
/* ── Layout ─────────────────────────────────────────────────────────────────── */
.layout { display: flex; min-height: 100vh; }
.main-col { flex: 1; padding: 2rem; max-width: 720px; }
.layout.panel-open .main-col { max-width: none; }
.config-panel { width: 360px; flex-shrink: 0; border-left: 1px solid var(--color-border); background: var(--color-surface); display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
.panel-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.2rem; border-bottom: 1px solid var(--color-border); }
.panel-title { font-weight: 600; font-size: .9rem; }
.panel-body { padding: 1.2rem; flex: 1; }

/* ── Header ─────────────────────────────────────────────────────────────────── */
.page-header { display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 0; flex-wrap: wrap; }
.settings-btn { border: 1px solid var(--color-border); font-size: .8rem; margin-left: auto; }
.settings-btn.active { background: var(--color-surface-raised); color: var(--color-text); border-color: var(--brand); }
.page-settings-panel {
	background: var(--color-surface-raised); border: 1px solid var(--color-border);
	border-radius: 10px; padding: 1.2rem; margin: .75rem 0 1.5rem; display: flex; flex-direction: column; gap: 1rem;
}
.settings-row { display: flex; gap: 1.5rem; flex-wrap: wrap; }
.settings-row .field { flex: 1; min-width: 220px; display: flex; flex-direction: column; gap: .4rem; font-size: .875rem; }
.settings-row .field span { font-weight: 500; }
.settings-row input[type="text"] { padding: .45rem .65rem; border: 1px solid var(--color-border); border-radius: 6px; font-size: .875rem; background: var(--color-surface); color: var(--color-text); outline: none; }
.settings-row input[type="text"]:focus { border-color: var(--brand); }
.color-picker-row { display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; }
.color-swatch-input { width: 36px; height: 36px; border: 1px solid var(--color-border); border-radius: 6px; cursor: pointer; padding: 2px; background: none; }
.color-hex { font-family: monospace; font-size: .8rem; color: var(--color-muted); min-width: 60px; }
.palette-swatches { display: flex; gap: .35rem; flex-wrap: wrap; }
.palette-swatch { width: 22px; height: 22px; border-radius: 4px; border: 2px solid transparent; cursor: pointer; transition: transform .1s, border-color .1s; }
.palette-swatch:hover { transform: scale(1.15); }
.palette-swatch.selected { border-color: var(--color-text); }
.clear-swatch { background: var(--color-surface); border: 1px solid var(--color-border); font-size: .65rem; color: var(--color-muted); display: flex; align-items: center; justify-content: center; }
.settings-actions { display: flex; gap: .5rem; justify-content: flex-end; }
.back-btn { display: flex; align-items: center; gap: .4rem; color: var(--color-muted); text-decoration: none; font-size: .875rem; padding: .4rem .1rem; }
.back-btn:hover { color: var(--color-text); }
.page-info { flex: 1; }
.page-info h1 { margin: 0 0 .15rem; font-size: 1.3rem; font-weight: 600; }
.page-slug { font-family: monospace; font-size: .8rem; }
.muted { color: var(--color-muted); }
.error-bar { background: #fef2f2; color: #b91c1c; border: 1px solid #fca5a5; border-radius: 6px; padding: .6rem 1rem; margin-bottom: 1rem; font-size: .875rem; }

/* ── Block list ─────────────────────────────────────────────────────────────── */
.block-list { display: flex; flex-direction: column; gap: 0; }
.block-row { display: flex; align-items: center; gap: .5rem; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 8px; padding: .6rem .75rem; cursor: pointer; transition: border-color .15s, box-shadow .15s; }
.block-row:hover { border-color: var(--brand); }
.block-row.active { border-color: var(--brand); box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand) 15%, transparent); }
.block-row.disabled { opacity: .55; }
.block-drag { color: var(--color-muted); cursor: grab; }
.block-body { flex: 1; display: flex; align-items: center; gap: .6rem; min-width: 0; }
.block-type-badge { font-size: .8rem; font-weight: 500; background: var(--color-surface-raised); border: 1px solid var(--color-border); border-radius: 4px; padding: .15rem .5rem; white-space: nowrap; }
.block-anchor { font-family: monospace; font-size: .75rem; }
.hidden-badge { font-size: .7rem; background: #fef3c7; color: #92400e; border-radius: 4px; padding: .1rem .4rem; }
.block-actions { display: flex; align-items: center; gap: .1rem; flex-shrink: 0; }
.insert-btn { display: flex; align-items: center; justify-content: center; width: 100%; height: 16px; background: none; border: none; cursor: pointer; color: var(--color-border); transition: color .15s; position: relative; }
.insert-btn::before { content: ''; position: absolute; left: 2rem; right: 2rem; top: 50%; height: 1px; background: currentColor; }
.insert-btn:hover { color: var(--brand); }
.empty-state { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 3rem; text-align: center; color: var(--color-muted); background: var(--color-surface); border: 2px dashed var(--color-border); border-radius: 10px; }
.add-block-row { display: flex; justify-content: center; padding-top: .75rem; }

/* ── Buttons ─────────────────────────────────────────────────────────────────── */
.btn-primary { display: flex; align-items: center; gap: .4rem; padding: .5rem 1rem; background: var(--brand); color: #fff; border: none; border-radius: 6px; font-size: .875rem; cursor: pointer; }
.btn-primary:hover:not(:disabled) { filter: brightness(1.1); }
.btn-secondary { display: flex; align-items: center; gap: .4rem; padding: .5rem 1rem; background: var(--color-surface-raised); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 6px; font-size: .875rem; cursor: pointer; }
.btn-secondary:hover:not(:disabled) { background: var(--color-border); }
.btn-danger { display: flex; align-items: center; gap: .4rem; padding: .5rem 1rem; background: #ef4444; color: #fff; border: none; border-radius: 6px; font-size: .875rem; cursor: pointer; }
.btn-danger:hover:not(:disabled) { background: #dc2626; }
.btn-danger:disabled { opacity: .5; }
.btn-ghost { display: flex; align-items: center; gap: .3rem; padding: .3rem .5rem; background: none; border: none; border-radius: 5px; font-size: .8rem; cursor: pointer; color: var(--color-muted); }
.btn-ghost:hover:not(:disabled) { background: var(--color-surface-raised); color: var(--color-text); }
.btn-ghost.sm { padding: .2rem .35rem; }
.btn-ghost.danger:hover { color: #ef4444; }
.btn-ghost:disabled { opacity: .4; cursor: not-allowed; }

/* ── Modal ──────────────────────────────────────────────────────────────────── */
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: var(--color-surface); border-radius: 12px; width: 520px; max-width: 95vw; box-shadow: 0 20px 60px rgba(0,0,0,.25); max-height: 85vh; display: flex; flex-direction: column; }
.modal-sm { width: 360px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 1.2rem 1.4rem .8rem; border-bottom: 1px solid var(--color-border); flex-shrink: 0; }
.modal-header h2 { margin: 0; font-size: 1rem; font-weight: 600; }
.modal-body { padding: 1.2rem 1.4rem; }
.modal-footer { padding: .8rem 1.4rem 1.2rem; display: flex; justify-content: flex-end; gap: .5rem; border-top: 1px solid var(--color-border); }

/* ── Picker ─────────────────────────────────────────────────────────────────── */
.picker-modal { width: 620px; }
.picker-body { padding: 1.2rem 1.4rem; overflow-y: auto; display: flex; flex-direction: column; gap: 1.2rem; }
.picker-group-label { font-size: .75rem; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--color-muted); margin-bottom: .5rem; }
.picker-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: .5rem; }
.picker-tile { padding: .7rem 1rem; background: var(--color-surface-raised); border: 1px solid var(--color-border); border-radius: 8px; cursor: pointer; text-align: left; transition: border-color .15s, background .15s; }
.picker-tile:hover:not(:disabled) { border-color: var(--brand); background: color-mix(in srgb, var(--brand) 6%, var(--color-surface)); }
.picker-tile:disabled { opacity: .5; cursor: not-allowed; }
.tile-label { font-size: .8rem; font-weight: 500; }
</style>
