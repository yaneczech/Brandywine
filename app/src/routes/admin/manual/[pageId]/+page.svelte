<script lang="ts">
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';
	import {
		IconArrowLeft, IconPlus, IconTrash, IconGripVertical, IconX,
		IconEye, IconEyeOff, IconChevronUp, IconChevronDown, IconSettings,
		IconCheck, IconPhoto, IconSearch
	} from '@tabler/icons-svelte';
	import { BLOCK_TYPES } from '$lib/manual/blockTypes';
	import BlockConfigPanel from './BlockConfigPanel.svelte';
	import BlockPrimaryEditor from './BlockPrimaryEditor.svelte';

	const { data }: { data: PageData } = $props();

	// ── Types ──────────────────────────────────────────────────────────────────
	type Block = {
		id: string; pageId: string; type: string; config: Record<string, unknown>;
		sortOrder: number; enabled: boolean; anchor: string | null;
	};

	type BrandColor = { id: string; name: string; hex: string };

	// ── State ──────────────────────────────────────────────────────────────────
	// svelte-ignore state_referenced_locally
	let page = $state(data.page);
	// svelte-ignore state_referenced_locally
	let blocks = $state<Block[]>(data.blocks as Block[]);
	// svelte-ignore state_referenced_locally
	let brandColors = $state<BrandColor[]>((data.brandColors ?? []) as BrandColor[]);
	let saving = $state(false);
	let errMsg = $state('');

	// Page settings panel
	let showPageSettings = $state(false);
	// svelte-ignore state_referenced_locally
	let pageTitle = $state<string>(page.title ?? '');
	// svelte-ignore state_referenced_locally
	let pageDescription = $state<string>(page.description ?? '');
	// svelte-ignore state_referenced_locally
	let pageFeatureImage = $state<string>(page.featureImage ?? '');
	// svelte-ignore state_referenced_locally
	let pageBgColor = $state<string>(page.bgColor ?? '');
	// svelte-ignore state_referenced_locally
	let pageTextColor = $state<string>(page.textColor ?? '');

	// WCAG contrast checker
	function hexLuminance(hex: string): number {
		const h = hex.replace('#', '');
		if (h.length !== 6) return 0;
		const lin = (c: number) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
		return 0.2126 * lin(parseInt(h.slice(0,2),16)/255)
		     + 0.7152 * lin(parseInt(h.slice(2,4),16)/255)
		     + 0.0722 * lin(parseInt(h.slice(4,6),16)/255);
	}
	function contrastRatio(a: string, b: string): number {
		const l1 = hexLuminance(a), l2 = hexLuminance(b);
		return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);
	}
	const contrastInfo = $derived.by(() => {
		if (!pageBgColor || !pageTextColor) return null;
		const ratio = contrastRatio(pageBgColor, pageTextColor);
		const r = Math.round(ratio * 10) / 10;
		if (ratio >= 7)   return { label: 'AAA', ok: true,  r };
		if (ratio >= 4.5) return { label: 'AA',  ok: true,  r };
		if (ratio >= 3)   return { label: 'AA Large', ok: true,  r };
		return               { label: 'Fail', ok: false, r };
	});

	// Asset picker for feature image
	type Asset = { id: string; filename: string; mime: string; storagePath: string; thumbnailPath: string | null };
	let showAssetPicker = $state(false);
	let assetPickerItems = $state<Asset[]>([]);
	let assetPickerLoading = $state(false);
	let assetPickerSearch = $state('');

	async function openAssetPicker() {
		showAssetPicker = true;
		assetPickerLoading = true;
		try {
			const r = await fetch('/api/assets?type=image&limit=120');
			const json = await r.json();
			assetPickerItems = json.data ?? [];
		} catch { assetPickerItems = []; }
		finally { assetPickerLoading = false; }
	}

	const filteredAssets = $derived(
		assetPickerSearch.trim()
			? assetPickerItems.filter(a => a.filename.toLowerCase().includes(assetPickerSearch.toLowerCase()))
			: assetPickerItems
	);

	function assetUrl(a: Asset): string {
		const p = a.storagePath;
		if (!p) return '';
		if (/^(https?:)?\/\//.test(p) || p.startsWith('/')) return p;
		return `/uploads/${p.replace(/^\/+/, '')}`;
	}

	function thumbUrl(a: Asset): string {
		if (a.thumbnailPath) {
			const p = a.thumbnailPath;
			if (/^(https?:)?\/\//.test(p) || p.startsWith('/')) return p;
			return `/uploads/${p.replace(/^\/+/, '')}`;
		}
		return assetUrl(a);
	}

	function selectAsset(a: Asset) {
		pageFeatureImage = assetUrl(a);
		showAssetPicker = false;
	}

	function blockConfigText(block: Block, key: string): string {
		const value = block.config?.[key];
		return typeof value === 'string' ? value.trim() : '';
	}

	// Block picker
	let showPicker = $state(false);
	let insertAfterIdx = $state<number | null>(null); // null = append

	// Config panel
	let editingBlockId = $state<string | null>(null);
	let editingBlock = $derived(blocks.find(b => b.id === editingBlockId) ?? null);

	// Shared editing state — both primary editor and context panel write here
	let editingCfg    = $state<Record<string, unknown>>({});
	let editingAnchor = $state('');

	$effect(() => {
		const b = editingBlock;
		if (b) {
			editingCfg    = { ...b.config };
			editingAnchor = b.anchor ?? '';
		}
	});

	async function handleSave() {
		if (!editingBlock) return;
		await saveBlockConfig(editingBlock.id, editingCfg, editingAnchor);
	}

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
			let message = txt || r.statusText;
			try {
				const parsed = JSON.parse(txt);
				if (typeof parsed?.message === 'string') message = parsed.message;
			} catch {
				// Keep plain-text response.
			}
			throw new Error(message);
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

	// Save page-level settings and hero content.
	async function savePageSettings() {
		saving = true; errMsg = '';
		try {
			const updated = await apiFetch(`/api/manual/pages/${page.id}`, {
				method: 'PATCH',
				body: JSON.stringify({
					title: pageTitle.trim() || page.title,
					description: pageDescription.trim() || null,
					featureImage: pageFeatureImage.trim() || null,
					bgColor: pageBgColor || null,
					textColor: pageTextColor || null,
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

	// Save block config + anchor
	async function saveBlockConfig(blockId: string, config: Record<string, unknown>, anchor?: string) {
		saving = true; errMsg = '';
		try {
			const { __anchor, ...cleanConfig } = config;
			const resolvedAnchor = anchor !== undefined ? anchor : (typeof __anchor === 'string' ? __anchor : undefined);
			const updated = await apiFetch(`/api/manual/blocks/${blockId}`, {
				method: 'PATCH',
				body: JSON.stringify({
					config: cleanConfig,
					anchor: resolvedAnchor !== undefined ? (resolvedAnchor.trim() || null) : undefined,
				}),
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
				<IconSettings size={16} /> Hero a stránka
			</button>
		</div>

		<!-- Page settings panel -->
		{#if showPageSettings}
			<div class="page-settings-panel">
				<div class="settings-section">
					<div class="settings-section-meta">
						<h2>Hero sekce</h2>
						<p>Nadpis a perex, které se zobrazují nahoře ve veřejném manuálu.</p>
					</div>
					<div class="settings-fields">
						<label class="field">
							<span class="field-label">Nadpis hero</span>
							<input type="text" bind:value={pageTitle} placeholder="Název stránky" />
						</label>
						<label class="field">
							<span class="field-label">Popisek hero</span>
							<textarea rows="3" bind:value={pageDescription} placeholder="Krátký úvod k této části manuálu…"></textarea>
						</label>
					</div>
				</div>
				<div class="settings-row">
					<!-- Feature image -->
					<div class="field fi-field">
						<span class="field-label">Hero obrázek</span>
						<div class="fi-input-row">
							<input type="text" bind:value={pageFeatureImage} placeholder="/uploads/…" class="fi-url-input" />
							<button class="btn-ghost fi-pick-btn" onclick={openAssetPicker} title="Vybrat z assetů">
								<IconPhoto size={15} /> Vybrat
							</button>
						</div>
						<!-- 3:2 preview -->
						<div class="fi-preview" class:has-image={!!pageFeatureImage}>
							{#if pageFeatureImage}
								<img src={pageFeatureImage} alt="preview"
									onerror={(e) => (e.currentTarget as HTMLImageElement).src = ''} />
							{:else}
								<span class="fi-empty"><IconPhoto size={24} /> 3 : 2</span>
							{/if}
						</div>
					</div>

					<!-- Colors column: bg + text stacked -->
					<div class="colors-col">
						<!-- Background color -->
						<label class="field">
							<span class="field-label">Barva pozadí hero</span>
							<div class="color-picker-row">
								<input type="color" bind:value={pageBgColor} class="color-swatch-input" />
								<input type="text" bind:value={pageBgColor} placeholder="#4A1204" class="color-text-input" />
							</div>
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
						</label>

						<!-- Text color + contrast checker -->
						<label class="field">
							<span class="field-label">Barva textu hero
								{#if contrastInfo}
									<span class="contrast-badge" class:ok={contrastInfo.ok} class:fail={!contrastInfo.ok}>
										{contrastInfo.label} · {contrastInfo.r}:1
									</span>
								{/if}
							</span>
							<div class="color-picker-row">
								<input type="color" bind:value={pageTextColor} class="color-swatch-input" />
								<input type="text" bind:value={pageTextColor} placeholder="#ffffff" class="color-text-input" />
							</div>
							{#if brandColors.length}
								<div class="palette-swatches">
									{#each brandColors as c}
										<button
											class="palette-swatch"
											class:selected={pageTextColor === c.hex}
											style="background:{c.hex}"
											title={c.name}
											onclick={() => pageTextColor = c.hex}
										></button>
									{/each}
									<button class="palette-swatch clear-swatch" title="Bez barvy"
										onclick={() => pageTextColor = ''}>✕</button>
								</div>
							{/if}
							{#if pageBgColor && pageTextColor}
								<div class="contrast-preview" style="background:{pageBgColor}; color:{pageTextColor}">
									Aa — ukázka textu na pozadí
								</div>
							{/if}
						</label>
					</div>
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
						<!-- Row header -->
						<div class="block-row-header">
							<div class="block-drag">
								<IconGripVertical size={16} />
							</div>

							<div class="block-body" role="button" tabindex="0"
								onclick={() => editingBlockId = editingBlockId === block.id ? null : block.id}
								onkeydown={e => e.key === 'Enter' && (editingBlockId = editingBlockId === block.id ? null : block.id)}
								>
									<span class="block-type-badge">{BLOCK_LABELS[block.type] ?? block.type}</span>
									{#if blockConfigText(block, 'heading')}
										<span class="block-title">{blockConfigText(block, 'heading')}</span>
									{/if}
									{#if block.anchor}
										<span class="block-anchor muted">#{block.anchor}</span>
									{/if}
									{#if blockConfigText(block, 'calloutType') === 'attention'}
										<span class="callout-badge">attention</span>
									{:else if blockConfigText(block, 'calloutType') === 'alert'}
										<span class="callout-badge alert">alert</span>
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
								<button class="btn-ghost sm danger" onclick={() => confirmDeleteId = block.id} title="Smazat">
									<IconTrash size={14} />
								</button>
							</div>
						</div>

						<!-- Inline primary editor (shown when block is selected) -->
						{#if editingBlockId === block.id}
							<div class="block-inline-editor">
								<BlockPrimaryEditor
									{block}
									cfg={editingCfg}
									onUpdate={(newCfg) => { editingCfg = newCfg; }}
									onSave={handleSave}
									{saving}
								/>
							</div>
						{/if}
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

	<!-- Context panel (right side) — anchor + kontext sekce only -->
	{#if editingBlock}
		<div class="config-panel">
			<div class="panel-header">
				<div class="panel-header-left">
					<span class="panel-title">{BLOCK_LABELS[editingBlock.type] ?? editingBlock.type}</span>
					<span class="panel-subtitle">Kontext sekce</span>
				</div>
				<button class="btn-ghost" onclick={() => editingBlockId = null}><IconX size={18} /></button>
			</div>
			<div class="panel-body">
				<BlockConfigPanel
					block={editingBlock}
					cfg={editingCfg}
					anchor={editingAnchor}
					onUpdate={(newCfg) => { editingCfg = newCfg; }}
					onAnchorChange={(a) => { editingAnchor = a; }}
				/>
			</div>
		</div>
	{/if}
</div>

<!-- Block picker modal -->
{#if showPicker}
	<div class="modal-backdrop" role="presentation" onclick={() => showPicker = false}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div class="modal picker-modal" role="dialog" tabindex="-1" onclick={e => e.stopPropagation()}>
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

<!-- Asset picker modal -->
{#if showAssetPicker}
	<div class="modal-backdrop" role="presentation" onclick={() => showAssetPicker = false}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div class="modal asset-picker-modal" role="dialog" tabindex="-1" onclick={e => e.stopPropagation()}>
			<div class="modal-header">
				<h2>Vybrat obrázek</h2>
				<button class="btn-ghost" onclick={() => showAssetPicker = false}><IconX size={18} /></button>
			</div>
			<div class="asset-picker-search">
				<IconSearch size={15} />
				<input type="text" bind:value={assetPickerSearch} placeholder="Hledat…" class="asset-search-input" />
			</div>
			<div class="asset-picker-grid">
				{#if assetPickerLoading}
					<div class="picker-loading">Načítám…</div>
				{:else if filteredAssets.length === 0}
					<div class="picker-loading">Žádné obrázky nenalezeny.</div>
				{:else}
					{#each filteredAssets as a (a.id)}
						<button class="asset-thumb-btn" onclick={() => selectAsset(a)} title={a.filename}>
							<div class="asset-thumb-wrap">
								<img src={thumbUrl(a)} alt={a.filename}
									onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display='none')} />
							</div>
							<span class="asset-thumb-name">{a.filename}</span>
						</button>
					{/each}
				{/if}
			</div>
		</div>
	</div>
{/if}

<!-- Delete confirm -->
{#if confirmDeleteId}
	<div class="modal-backdrop" role="presentation" onclick={() => confirmDeleteId = null}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div class="modal modal-sm" role="dialog" tabindex="-1" onclick={e => e.stopPropagation()}>
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
.layout { display: flex; align-items: flex-start; min-height: 100vh; }
.main-col { flex: 1 1 auto; width: min(100%, 920px); max-width: 920px; padding: 2rem; box-sizing: border-box; }
.layout.panel-open .main-col { max-width: 920px; }
.config-panel { width: clamp(300px, 22vw, 360px); flex-shrink: 0; border-left: 1px solid var(--color-border); background: var(--color-surface); display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
.panel-header { display: flex; align-items: center; justify-content: space-between; padding: .85rem 1.1rem; border-bottom: 1px solid var(--color-border); gap: .5rem; }
.panel-header-left { display: flex; flex-direction: column; gap: .1rem; min-width: 0; }
.panel-title { font-weight: 650; font-size: .875rem; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.panel-subtitle { font-size: .72rem; color: var(--color-muted); font-weight: 400; }
.panel-body { padding: 1rem; flex: 1; }

@media (max-width: 980px) {
	.layout { display: block; }
	.main-col,
	.layout.panel-open .main-col {
		width: 100%;
		max-width: none;
		padding: 1.25rem;
	}
	.config-panel {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		z-index: 50;
		width: min(420px, 100vw);
		height: 100vh;
		box-shadow: -20px 0 50px rgba(0,0,0,.16);
	}
}

/* ── Header ─────────────────────────────────────────────────────────────────── */
.page-header { display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 0; flex-wrap: wrap; }
.settings-btn { border: 1px solid var(--color-border); font-size: .8rem; margin-left: auto; }
.settings-btn.active { background: var(--color-surface-raised); color: var(--color-text); border-color: var(--brand); }
.page-settings-panel {
	background: var(--color-surface-raised); border: 1px solid var(--color-border);
	border-radius: 10px; padding: 1.2rem; margin: .75rem 0 1.5rem; display: flex; flex-direction: column; gap: 1rem;
}
.settings-section {
	display: grid;
	grid-template-columns: minmax(180px, 240px) minmax(0, 1fr);
	gap: 1.5rem;
	padding-bottom: 1rem;
	border-bottom: 1px solid var(--color-border);
}
.settings-section-meta h2 { margin: 0 0 .35rem; font-size: .95rem; font-weight: 700; }
.settings-section-meta p { margin: 0; color: var(--color-muted); font-size: .82rem; line-height: 1.5; }
.settings-fields { display: flex; flex-direction: column; gap: .85rem; }
.settings-row { display: flex; gap: 1.5rem; flex-wrap: wrap; }
.settings-row .field { display: flex; flex-direction: column; gap: .5rem; font-size: .875rem; }
.page-settings-panel .field input[type="text"],
.page-settings-panel .field textarea {
	width: 100%;
	padding: .55rem .65rem;
	border: 1px solid var(--color-border);
	border-radius: 6px;
	background: var(--color-surface);
	color: var(--color-text);
	font: inherit;
	font-size: .875rem;
	outline: none;
}
.page-settings-panel .field textarea { resize: vertical; line-height: 1.5; }
.page-settings-panel .field input[type="text"]:focus,
.page-settings-panel .field textarea:focus {
	border-color: var(--brand);
	box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand) 10%, transparent);
}
.colors-col { flex: 1; min-width: 220px; display: flex; flex-direction: column; gap: 1.25rem; }
.field-label { font-size: .82rem; font-weight: 600; color: var(--color-text); }
/* feature image field */
.fi-field { min-width: 280px; }
.fi-input-row { display: flex; gap: .4rem; }
.fi-url-input { flex: 1; padding: .45rem .65rem; border: 1px solid var(--color-border); border-radius: 6px; font-size: .875rem; background: var(--color-surface); color: var(--color-text); outline: none; min-width: 0; }
.fi-url-input:focus { border-color: var(--brand); }
.fi-pick-btn { border: 1px solid var(--color-border); padding: .4rem .65rem; font-size: .8rem; white-space: nowrap; }
.fi-preview {
	aspect-ratio: 3 / 2;
	width: 100%;
	max-width: 320px;
	border: 1px solid var(--color-border);
	border-radius: 6px;
	overflow: hidden;
	background: var(--color-surface-raised);
	display: flex;
	align-items: center;
	justify-content: center;
}
.fi-preview img { width: 100%; height: 100%; object-fit: cover; display: block; }
.fi-empty { display: flex; flex-direction: column; align-items: center; gap: .35rem; color: var(--color-muted); font-size: .72rem; font-weight: 600; letter-spacing: .04em; }
/* color field */
.color-picker-row { display: flex; align-items: center; gap: .5rem; }
.color-swatch-input { width: 36px; height: 36px; border: 1px solid var(--color-border); border-radius: 6px; cursor: pointer; padding: 2px; background: none; flex-shrink: 0; }
.color-text-input { width: 110px; padding: .4rem .6rem; border: 1px solid var(--color-border); border-radius: 6px; font-family: monospace; font-size: .82rem; background: var(--color-surface); color: var(--color-text); outline: none; }
.color-text-input:focus { border-color: var(--brand); }
.palette-swatches { display: flex; gap: .35rem; flex-wrap: wrap; margin-top: .15rem; }
.palette-swatch { width: 22px; height: 22px; border-radius: 4px; border: 2px solid transparent; cursor: pointer; transition: transform .1s, border-color .1s; }
.palette-swatch:hover { transform: scale(1.15); }
.palette-swatch.selected { border-color: var(--color-text); }
.clear-swatch { background: var(--color-surface); border: 1px solid var(--color-border); font-size: .65rem; color: var(--color-muted); display: flex; align-items: center; justify-content: center; }
.contrast-badge { display: inline-flex; align-items: center; margin-left: .4rem; padding: .1rem .4rem; border-radius: 4px; font-size: .72rem; font-weight: 700; letter-spacing: .02em; vertical-align: middle; }
.contrast-badge.ok   { background: #dcfce7; color: #166534; }
.contrast-badge.fail { background: #fee2e2; color: #991b1b; }
.contrast-preview { margin-top: .4rem; padding: .55rem .75rem; border-radius: 6px; font-size: .875rem; font-weight: 500; }
.settings-actions { display: flex; gap: .5rem; justify-content: flex-end; }
/* asset picker modal */
.asset-picker-modal { width: 720px; max-height: 80vh; }
.asset-picker-search { display: flex; align-items: center; gap: .5rem; padding: .65rem 1.4rem; border-bottom: 1px solid var(--color-border); color: var(--color-muted); }
.asset-search-input { flex: 1; border: none; outline: none; background: none; font-size: .875rem; color: var(--color-text); }
.asset-picker-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: .75rem; padding: 1rem 1.4rem; overflow-y: auto; max-height: calc(80vh - 120px); }
.picker-loading { grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--color-muted); font-size: .875rem; }
.asset-thumb-btn { display: flex; flex-direction: column; gap: .4rem; background: none; border: 1px solid var(--color-border); border-radius: 6px; cursor: pointer; overflow: hidden; padding: 0; transition: border-color .15s; text-align: left; }
.asset-thumb-btn:hover { border-color: var(--brand); }
.asset-thumb-wrap { aspect-ratio: 3 / 2; width: 100%; overflow: hidden; background: var(--color-surface-raised); }
.asset-thumb-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; }
.asset-thumb-name { padding: .3rem .5rem .4rem; font-size: .7rem; color: var(--color-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.3; }
.back-btn { display: flex; align-items: center; gap: .4rem; color: var(--color-muted); text-decoration: none; font-size: .875rem; padding: .4rem .1rem; }
.back-btn:hover { color: var(--color-text); }
.page-info { flex: 1; }
.page-info h1 { margin: 0 0 .15rem; font-size: 1.3rem; font-weight: 600; }
.page-slug { font-family: monospace; font-size: .8rem; }
.muted { color: var(--color-muted); }
.error-bar { background: #fef2f2; color: #b91c1c; border: 1px solid #fca5a5; border-radius: 6px; padding: .6rem 1rem; margin-bottom: 1rem; font-size: .875rem; }

/* ── Block list ─────────────────────────────────────────────────────────────── */
.block-list { display: flex; flex-direction: column; gap: 0; }
.block-row {
	display: flex; flex-direction: column;
	background: var(--color-surface); border: 1px solid var(--color-border);
	border-radius: 8px; transition: border-color .15s, box-shadow .15s;
	overflow: hidden;
}
.block-row:hover { border-color: color-mix(in srgb, var(--brand) 60%, var(--color-border)); }
.block-row.active { border-color: var(--brand); box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand) 13%, transparent); }
.block-row.disabled { opacity: .55; }
.block-row-header { display: flex; align-items: center; gap: .5rem; padding: .6rem .75rem; cursor: pointer; }
.block-drag { color: var(--color-muted); cursor: grab; flex-shrink: 0; }
.block-body { flex: 1; display: flex; align-items: center; gap: .6rem; min-width: 0; }
.block-type-badge { font-size: .8rem; font-weight: 500; background: var(--color-surface-raised); border: 1px solid var(--color-border); border-radius: 4px; padding: .15rem .5rem; white-space: nowrap; }
.block-title { min-width: 0; color: var(--color-text); font-size: .86rem; font-weight: 650; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.block-anchor { font-family: monospace; font-size: .75rem; }
.callout-badge { font-size: .68rem; background: color-mix(in srgb, var(--brand) 9%, var(--color-surface-raised)); color: var(--brand); border-radius: 4px; padding: .1rem .4rem; }
.callout-badge.alert { background: #fee2e2; color: #b91c1c; }
.hidden-badge { font-size: .7rem; background: #fef3c7; color: #92400e; border-radius: 4px; padding: .1rem .4rem; }
.block-actions { display: flex; align-items: center; gap: .1rem; flex-shrink: 0; }
/* Inline primary editor area */
.block-inline-editor {
	padding: 1rem 1rem 1rem 2.25rem; /* indent past drag handle area */
	border-top: 1px solid var(--color-border);
	background: var(--color-bg);
}
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
