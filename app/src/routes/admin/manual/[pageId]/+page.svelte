<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { BLOCK_TYPES } from '$lib/manual/blockTypes';
	import { blockLabel, blockDesc } from '$lib/manual/blockLabels';
	import type { PageData } from './$types';
	import {
		IconArrowLeft, IconPlus, IconTrash, IconGripVertical, IconX,
		IconEye, IconEyeOff, IconChevronUp, IconChevronDown, IconSettings,
		IconCheck, IconPhoto, IconExternalLink, IconSearch,
		IconAlignLeft, IconLayoutColumns, IconQuote, IconInfoCircle, IconLayoutList,
		IconLayoutGrid, IconSlideshow, IconArrowsHorizontal, IconPlayerPlay,
		IconPalette, IconTypography, IconLetterCase, IconBadge, IconGridDots, IconThumbUp,
		IconAbc, IconTextSpellcheck, IconIcons, IconStairs, IconChartRadar,
		IconCards, IconNumbers, IconTable, IconLink, IconSeparator,
		IconFolders, IconDownload, IconCode, IconBrackets, IconChartPie, IconContrast, IconPointer, IconFileDownload, IconTableOptions
	} from '$lib/icons';
	import Modal from '$lib/components/ui/Modal.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { toast } from '$lib/ui/toast.svelte';
	import { onMount, tick } from 'svelte';
	import BlockConfigPanel from './BlockConfigPanel.svelte';
	import BlockPrimaryEditor from './BlockPrimaryEditor.svelte';
	import AssetPickerModal from '$lib/components/admin/AssetPickerModal.svelte';

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

	// Page settings panel
	let showPageSettings = $state(false);
	// svelte-ignore state_referenced_locally
	let pageTitle = $state<string>(page.title ?? '');
	// svelte-ignore state_referenced_locally
	let pageDescription = $state<string>(page.description ?? '');
	// svelte-ignore state_referenced_locally
	let pageFeatureImage = $state<string>(page.featureImage ?? '');
	// svelte-ignore state_referenced_locally
	let pageHeroBgSize = $state<string>(page.heroBgSize ?? 'cover');
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
	let showAssetPicker = $state(false);

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

	// .pre: the config must be in place before the block editors render, since
	// they seed their local list state from it once per block.
	$effect.pre(() => {
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

	// Deep links from the manual audit: ?block=<id> opens that block, ?settings=1 the hero panel
	onMount(async () => {
		const params = new URLSearchParams(location.search);
		const blockId = params.get('block');
		if (params.get('settings')) showPageSettings = true;
		if (blockId && blocks.some(b => b.id === blockId)) {
			editingBlockId = blockId;
			await tick();
			document.querySelector('.block-row.active')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
		}
	});

	// Delete confirm
	let confirmDeleteId = $state<string | null>(null);

	// ── Block type labels ──────────────────────────────────────────────────────
	const BLOCK_LABELS: Record<string, string> = Object.fromEntries(BLOCK_TYPES.map((t) => [t, blockLabel(t)]));

	// Icon + one-line description for the block picker
	const BLOCK_META: Record<string, { icon: typeof IconAlignLeft; desc: string }> = {
		rich_text:     { icon: IconAlignLeft,        desc: blockDesc('rich_text') },
		text_image:    { icon: IconLayoutColumns,    desc: blockDesc('text_image') },
		quote:         { icon: IconQuote,            desc: blockDesc('quote') },
		callout:       { icon: IconInfoCircle,       desc: blockDesc('callout') },
		accordion:     { icon: IconLayoutList,       desc: blockDesc('accordion') },
		image:         { icon: IconPhoto,            desc: blockDesc('image') },
		image_gallery: { icon: IconLayoutGrid,       desc: blockDesc('image_gallery') },
		carousel:      { icon: IconSlideshow,        desc: blockDesc('carousel') },
		before_after:  { icon: IconArrowsHorizontal, desc: blockDesc('before_after') },
		embed:         { icon: IconPlayerPlay,       desc: blockDesc('embed') },
		colors:        { icon: IconPalette,          desc: blockDesc('colors') },
		typography:    { icon: IconTypography,       desc: blockDesc('typography') },
		text_styles:   { icon: IconLetterCase,       desc: blockDesc('text_styles') },
		logo_spec:     { icon: IconBadge,            desc: blockDesc('logo_spec') },
		grid:          { icon: IconGridDots,         desc: blockDesc('grid') },
		do_dont:       { icon: IconThumbUp,          desc: blockDesc('do_dont') },
		naming:        { icon: IconAbc,              desc: blockDesc('naming') },
		typo_rules:    { icon: IconTextSpellcheck,   desc: blockDesc('typo_rules') },
		icons:         { icon: IconIcons,            desc: blockDesc('icons') },
		process:       { icon: IconStairs,           desc: blockDesc('process') },
		chart:         { icon: IconChartRadar,       desc: blockDesc('chart') },
		cards:         { icon: IconCards,            desc: blockDesc('cards') },
		stats:         { icon: IconNumbers,          desc: blockDesc('stats') },
		table:         { icon: IconTable,            desc: blockDesc('table') },
		links:         { icon: IconLink,             desc: blockDesc('links') },
		divider:       { icon: IconSeparator,        desc: blockDesc('divider') },
		asset_gallery: { icon: IconFolders,          desc: blockDesc('asset_gallery') },
		download:      { icon: IconDownload,         desc: blockDesc('download') },
		html:          { icon: IconBrackets,         desc: blockDesc('html') },
		code:          { icon: IconCode,             desc: blockDesc('code') },
		color_ratio:   { icon: IconChartPie,         desc: blockDesc('color_ratio') },
		contrast_checker: { icon: IconContrast,      desc: blockDesc('contrast_checker') },
		hotspots:      { icon: IconPointer,          desc: blockDesc('hotspots') },
		logo_download: { icon: IconFileDownload,     desc: blockDesc('logo_download') },
		font_usage:    { icon: IconTableOptions,     desc: blockDesc('font_usage') },
	};

	let pickerQuery = $state('');
	function normalizeQuery(value: string) {
		return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
	}
	const pickerGroups = $derived.by(() => {
		const q = normalizeQuery(pickerQuery.trim());
		if (!q) return PICKER_GROUPS;
		return PICKER_GROUPS
			.map((group) => ({
				...group,
				types: group.types.filter((type) =>
					normalizeQuery(`${BLOCK_LABELS[type] ?? type} ${BLOCK_META[type]?.desc ?? ''} ${type}`).includes(q)
				),
			}))
			.filter((group) => group.types.length);
	});
	function openBlockPicker(afterIdx: number | null) {
		insertAfterIdx = afterIdx;
		pickerQuery = '';
		showPicker = true;
	}

	// Group block types for the picker
	const PICKER_GROUPS = [
		{ label: m.picker_group_text(),      types: ['rich_text', 'text_image', 'quote', 'callout', 'accordion'] },
		{ label: m.picker_group_media(),     types: ['image', 'hotspots', 'image_gallery', 'carousel', 'before_after', 'embed'] },
		{ label: m.picker_group_brand(),     types: ['logo_download', 'colors', 'color_ratio', 'contrast_checker', 'typography', 'font_usage', 'text_styles', 'logo_spec', 'grid', 'do_dont', 'naming', 'typo_rules', 'icons', 'process', 'chart'] },
		{ label: m.picker_group_structure(), types: ['cards', 'stats', 'table', 'links', 'divider'] },
		{ label: m.picker_group_files(),   types: ['asset_gallery', 'download'] },
		{ label: m.picker_group_advanced(), types: ['html', 'code'] },
	];

	// ── API helpers ───────────────────────────────────────────────────────────
	async function apiFetch(url: string, opts: Parameters<typeof fetch>[1]) {
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
		saving = true;
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
			toast.error(e instanceof Error ? e.message : String(e));
		} finally {
			saving = false;
		}
	}

	async function moveBlock(id: string, dir: 'up' | 'down') {
		const idx = blocks.findIndex(b => b.id === id);
		if (dir === 'up' && idx === 0) return;
		if (dir === 'down' && idx === blocks.length - 1) return;

		const other = dir === 'up' ? blocks[idx - 1] : blocks[idx + 1];
		saving = true;
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
			toast.error(e instanceof Error ? e.message : String(e));
		} finally {
			saving = false;
		}
	}

	async function toggleBlockEnabled(block: Block) {
		saving = true;
		try {
			const updated = await apiFetch(`/api/manual/blocks/${block.id}`, {
				method: 'PATCH',
				body: JSON.stringify({ enabled: !block.enabled }),
			}) as Block;
			blocks = blocks.map(b => b.id === block.id ? updated : b);
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : String(e));
		} finally {
			saving = false;
		}
	}

	async function deleteBlock(id: string) {
		saving = true;
		try {
			await apiFetch(`/api/manual/blocks/${id}`, { method: 'DELETE' });
			blocks = blocks.filter(b => b.id !== id);
			confirmDeleteId = null;
			if (editingBlockId === id) editingBlockId = null;
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : String(e));
		} finally {
			saving = false;
		}
	}

	// Save page-level settings and hero content.
	async function savePageSettings() {
		saving = true;
		try {
			const updated = await apiFetch(`/api/manual/pages/${page.id}`, {
				method: 'PATCH',
				body: JSON.stringify({
					title: pageTitle.trim() || page.title,
					description: pageDescription.trim() || null,
					featureImage: pageFeatureImage.trim() || null,
					heroBgSize: pageFeatureImage.trim() ? (pageHeroBgSize || 'cover') : null,
					bgColor: pageBgColor || null,
					textColor: pageTextColor || null,
				}),
			});
			page = updated;
			showPageSettings = false;
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : String(e));
		} finally {
			saving = false;
		}
	}

	// Save block config + anchor
	async function saveBlockConfig(blockId: string, config: Record<string, unknown>, anchor?: string) {
		saving = true;
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
			toast.error(e instanceof Error ? e.message : String(e));
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
			<a href="/admin/manual" class="back-btn"><IconArrowLeft size={16} stroke={1.5} /> {m.audit_back()}</a>
			<div class="page-info">
				<h1>{page.title}</h1>
				<span class="page-slug muted">/manual/{page.slug}</span>
			</div>
			<a href="/manual/{page.slug}" target="_blank" rel="noopener" class="btn-ghost preview-btn" title={m.editor_view_in_manual()}>
				<IconExternalLink size={15} stroke={1.5} /> {m.common_view()}
			</a>
			<button class="btn-ghost settings-btn" class:active={showPageSettings}
				onclick={() => showPageSettings = !showPageSettings} title={m.editor_page_settings()}>
				<IconSettings size={16} /> {m.editor_hero_and_page()}
			</button>
		</div>

		<!-- Page settings panel -->
		{#if showPageSettings}
			<div class="page-settings-panel">
				<div class="settings-section">
					<div class="settings-section-meta">
						<h2>{m.editor_hero_title()}</h2>
						<p>{m.editor_hero_sub()}</p>
					</div>
					<div class="settings-fields">
						<label class="field">
							<span class="field-label">{m.editor_hero_heading()}</span>
							<input type="text" bind:value={pageTitle} placeholder={m.editor_hero_heading_placeholder()} />
						</label>
						<label class="field">
							<span class="field-label">{m.editor_hero_lead()}</span>
							<textarea rows="3" bind:value={pageDescription} placeholder={m.editor_hero_lead_placeholder()}></textarea>
						</label>
					</div>
				</div>
				<div class="settings-row">
					<!-- Feature image -->
					<div class="field fi-field">
						<span class="field-label">{m.editor_hero_image()}</span>
						<div class="fi-input-row">
							<input type="text" bind:value={pageFeatureImage} placeholder="/uploads/…" class="fi-url-input" />
							<button class="btn-ghost fi-pick-btn" onclick={() => showAssetPicker = true} title={m.editor_pick_asset()}>
								<IconPhoto size={15} stroke={1.5} /> {m.be_choose()}
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
						{#if pageFeatureImage}
							<div class="bg-size-row">
				{#each [['cover','Cover'], ['contain','Contain'], ['tile','Tile']] as [val, label] (val)}
									<label class="bg-size-opt" class:active={pageHeroBgSize === val}>
										<input type="radio" name="heroBgSize" value={val} bind:group={pageHeroBgSize} />
										{label}
									</label>
								{/each}
							</div>
						{/if}
					</div>

					<!-- Colors column: bg + text stacked -->
					<div class="colors-col">
						<!-- Background color -->
						<label class="field">
							<span class="field-label">{m.editor_hero_bg()}</span>
							<div class="color-picker-row">
								<input type="color" bind:value={pageBgColor} class="color-swatch-input" />
								<input type="text" bind:value={pageBgColor} placeholder="#4A1204" class="color-text-input" />
							</div>
							{#if brandColors.length}
								<div class="palette-swatches">
				{#each brandColors as c (c.id)}
										<button
											class="palette-swatch"
											class:selected={pageBgColor === c.hex}
											style="background:{c.hex}"
											title={c.name}
											onclick={() => pageBgColor = c.hex}
										></button>
									{/each}
									<button class="palette-swatch clear-swatch" title={m.editor_no_color()} aria-label={m.editor_no_color()}
										onclick={() => pageBgColor = ''}>✕</button>
								</div>
							{/if}
						</label>

						<!-- Text color + contrast checker -->
						<label class="field">
							<span class="field-label">{m.editor_hero_text()}
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
				{#each brandColors as c (c.id)}
										<button
											class="palette-swatch"
											class:selected={pageTextColor === c.hex}
											style="background:{c.hex}"
											title={c.name}
											onclick={() => pageTextColor = c.hex}
										></button>
									{/each}
									<button class="palette-swatch clear-swatch" title={m.editor_no_color()} aria-label={m.editor_no_color()}
										onclick={() => pageTextColor = ''}>✕</button>
								</div>
							{/if}
							{#if pageBgColor && pageTextColor}
								<div class="contrast-preview" style="background:{pageBgColor}; color:{pageTextColor}">
									{m.editor_contrast_sample()}
								</div>
							{/if}
						</label>
					</div>
				</div>
				<div class="settings-actions">
					<button class="btn btn-secondary" onclick={() => showPageSettings = false}>{m.common_cancel()}</button>
					<button class="btn btn-primary" onclick={savePageSettings} disabled={saving}>
						<IconCheck size={14} /> {saving ? m.common_saving() : m.common_save()}
					</button>
				</div>
			</div>
		{/if}


		<!-- Block list -->
		<div class="block-list" style="margin-top: {showPageSettings ? 0 : '1.5rem'}">
			{#if blocks.length === 0}
				<div class="empty-state">
					<p>{m.editor_no_blocks()}</p>
					<button class="btn btn-primary" onclick={() => openBlockPicker(null)}>
						<IconPlus size={16} /> {m.editor_add_first_block()}
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
								<button class="btn-ghost sm" onclick={() => moveBlock(block.id, 'up')} disabled={i === 0} title={m.editor_move_up()} aria-label={m.editor_move_up()}>
									<IconChevronUp size={14} />
								</button>
								<button class="btn-ghost sm" onclick={() => moveBlock(block.id, 'down')} disabled={i === blocks.length - 1} title={m.editor_move_down()} aria-label={m.editor_move_down()}>
									<IconChevronDown size={14} />
								</button>
								<button class="btn-ghost sm" onclick={() => toggleBlockEnabled(block)} title={block.enabled ? m.common_hide() : m.common_show()} aria-label={block.enabled ? m.common_hide() : m.common_show()}>
									{#if block.enabled}<IconEye size={14} />{:else}<IconEyeOff size={14} />{/if}
								</button>
								<button class="btn-ghost sm danger" onclick={() => confirmDeleteId = block.id} title={m.common_delete()} aria-label={m.common_delete()}>
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
									{brandColors}
									brandFonts={data.brandFonts ?? []}
									brandPalettes={data.brandPalettes ?? []}
								/>
							</div>
						{/if}
					</div>

					<!-- Insert button between blocks -->
					<button class="insert-btn" onclick={() => openBlockPicker(i)} title={m.editor_insert_block()} aria-label={m.editor_insert_block()}>
						<span class="insert-icon"><IconPlus size={10} /></span>
					</button>
				{/each}
			{/if}

			{#if blocks.length > 0}
				<div class="add-block-row">
					<button class="btn btn-secondary" onclick={() => openBlockPicker(null)}>
						<IconPlus size={16} /> {m.editor_add_block()}
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
					<span class="panel-subtitle">{m.block_ctx_title()}</span>
				</div>
				<button class="btn-ghost" onclick={() => editingBlockId = null} aria-label={m.common_close()}><IconX size={18} /></button>
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

<!-- Block picker -->
<Modal open={showPicker} title={m.editor_add_block()} size="xl" onClose={() => (showPicker = false)} initialFocus=".picker-search input">
	<div class="picker-search">
		<IconSearch size={16} stroke={1.5} />
		<input type="search" bind:value={pickerQuery} placeholder={m.editor_picker_search()}
			onkeydown={(e) => {
				if (e.key === 'Enter' && pickerGroups[0]?.types[0]) { e.preventDefault(); addBlock(pickerGroups[0].types[0]); }
			}} />
		<kbd>↵</kbd>
	</div>
	<div class="picker-body">
		{#each pickerGroups as group (group.label)}
			<section class="picker-group">
				<h3 class="picker-group-label">{group.label}</h3>
				<div class="picker-grid">
					{#each group.types as type (type)}
						{@const meta = BLOCK_META[type]}
						<button class="picker-tile" onclick={() => addBlock(type)} disabled={saving}>
							{#if meta}<span class="tile-icon"><meta.icon size={18} stroke={1.5} /></span>{/if}
							<span class="tile-text">
								<span class="tile-label">{BLOCK_LABELS[type] ?? type}</span>
								{#if meta}<span class="tile-desc">{meta.desc}</span>{/if}
							</span>
						</button>
					{/each}
				</div>
			</section>
		{:else}
			<EmptyState compact icon={IconSearch} title={m.editor_picker_empty({ query: pickerQuery })} />
		{/each}
	</div>
</Modal>

<!-- Asset picker modal (hero image) -->
<AssetPickerModal
	open={showAssetPicker}
	mimeFilter="image"
	onPick={(url) => { pageFeatureImage = url; showAssetPicker = false; }}
	onClose={() => (showAssetPicker = false)}
/>

<!-- Delete confirm -->
<ConfirmDialog
	open={!!confirmDeleteId}
	title={m.editor_delete_block_title()}
	description={m.editor_delete_block_body()}
	busy={saving}
	onCancel={() => (confirmDeleteId = null)}
	onConfirm={() => deleteBlock(confirmDeleteId!)}
/>

<style>
/* ── Layout ─────────────────────────────────────────────────────────────────── */
.layout { display: flex; align-items: flex-start; min-height: 100vh; }
.main-col { flex: 1 1 auto; width: min(100%, 920px); max-width: 920px; padding: 32px; box-sizing: border-box; }
.layout.panel-open .main-col { max-width: 920px; }
.config-panel { width: clamp(300px, 22vw, 360px); flex-shrink: 0; border-left: 1px solid var(--color-border); background: var(--color-surface); display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
.panel-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--color-border); gap: 8px; }
.panel-header-left { display: flex; flex-direction: column; gap: .1rem; min-width: 0; }
.panel-title { font-weight: 600; font-size: var(--text-base); color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.panel-subtitle { font-size: var(--text-xs); color: var(--color-muted); font-weight: 400; }
.panel-body { padding: 16px; flex: 1; }

@media (max-width: 980px) {
	.layout { display: block; }
	.main-col,
	.layout.panel-open .main-col {
		width: 100%;
		max-width: none;
		padding: 20px;
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
.page-header { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 0; flex-wrap: wrap; }
.preview-btn { border: 1px solid var(--color-border); font-size: var(--text-sm); margin-left: auto; text-decoration: none; }
.preview-btn:hover { color: var(--color-text); border-color: var(--color-border-strong); }
.settings-btn { border: 1px solid var(--color-border); font-size: var(--text-sm); }
.settings-btn.active { background: var(--color-surface-raised); color: var(--color-text); border-color: var(--color-accent); }
.page-settings-panel {
	background: var(--color-surface-raised); border: 1px solid var(--color-border);
	border-radius: var(--radius-lg); padding: 20px; margin: 12px 0 24px; display: flex; flex-direction: column; gap: 16px;
}
.settings-section {
	display: grid;
	grid-template-columns: minmax(180px, 240px) minmax(0, 1fr);
	gap: 24px;
	padding-bottom: 16px;
	border-bottom: 1px solid var(--color-border);
}
.settings-section-meta h2 { margin: 0 0 4px; font-size: var(--text-md); font-weight: 600; }
.settings-section-meta p { margin: 0; color: var(--color-muted); font-size: var(--text-sm); line-height: 1.5; }
.settings-fields { display: flex; flex-direction: column; gap: 12px; }
.settings-row { display: flex; gap: 24px; flex-wrap: wrap; }
.settings-row .field { display: flex; flex-direction: column; gap: 8px; font-size: var(--text-base); }
.page-settings-panel .field input[type="text"],
.page-settings-panel .field textarea {
	width: 100%;
	padding: 8px 12px;
	border: 1px solid var(--color-border);
	border-radius: var(--radius);
	background: var(--color-surface);
	color: var(--color-text);
	font: inherit;
	font-size: var(--text-base);
	outline: none;
}
.page-settings-panel .field textarea { resize: vertical; line-height: 1.5; }
.page-settings-panel .field input[type="text"]:focus,
.page-settings-panel .field textarea:focus {
	border-color: var(--color-border-focus);
	box-shadow: var(--focus-ring);
}
.colors-col { flex: 1; min-width: 220px; display: flex; flex-direction: column; gap: 20px; }
.field-label { font-size: var(--text-sm); font-weight: 600; color: var(--color-text); }
/* feature image field */
.fi-field { min-width: 280px; }
.fi-input-row { display: flex; gap: 8px; }
.fi-url-input { flex: 1; padding: 8px 12px; border: 1px solid var(--color-border); border-radius: var(--radius); font-size: var(--text-base); background: var(--color-surface); color: var(--color-text); outline: none; min-width: 0; }
.fi-url-input:focus { border-color: var(--color-border-focus); box-shadow: var(--focus-ring); }
.fi-pick-btn { border: 1px solid var(--color-border); padding: 8px 12px; font-size: var(--text-sm); white-space: nowrap; }
.fi-preview {
	aspect-ratio: 3 / 2;
	width: 100%;
	max-width: 320px;
	border: 1px solid var(--color-border);
	border-radius: var(--radius);
	overflow: hidden;
	background: var(--color-surface-raised);
	display: flex;
	align-items: center;
	justify-content: center;
}
.fi-preview img { width: 100%; height: 100%; object-fit: cover; display: block; }
.fi-empty { display: flex; flex-direction: column; align-items: center; gap: 4px; color: var(--color-muted); font-size: var(--text-xs); font-weight: 600; letter-spacing: var(--tracking-eyebrow); }
.bg-size-row { display: flex; gap: 4px; margin-top: 8px; }
.bg-size-opt {
	display: flex; align-items: center; gap: 4px;
	padding: 4px 12px;
	border: 1px solid var(--color-border);
	border-radius: var(--radius);
	font-size: var(--text-xs);
	color: var(--color-muted);
	cursor: pointer;
	user-select: none;
	transition: background .1s, border-color .1s, color .1s;
}
.bg-size-opt input { display: none; }
.bg-size-opt:hover { background: var(--color-hover); color: var(--color-text); }
.bg-size-opt.active {
	background: color-mix(in srgb, var(--color-accent) 10%, transparent);
	border-color: color-mix(in srgb, var(--color-accent) 35%, transparent);
	color: var(--color-accent);
	font-weight: 500;
}
/* color field */
.color-picker-row { display: flex; align-items: center; gap: 8px; }
.color-swatch-input { width: 36px; height: 36px; border: 1px solid var(--color-border); border-radius: var(--radius); cursor: pointer; padding: 2px; background: none; flex-shrink: 0; }
.color-text-input { width: 110px; padding: 8px 8px; border: 1px solid var(--color-border); border-radius: var(--radius); font-family: monospace; font-size: var(--text-sm); background: var(--color-surface); color: var(--color-text); outline: none; }
.color-text-input:focus { border-color: var(--color-border-focus); box-shadow: var(--focus-ring); }
.palette-swatches { display: flex; gap: 4px; flex-wrap: wrap; margin-top: .15rem; }
.palette-swatch { width: 22px; height: 22px; border-radius: var(--radius-sm); border: 2px solid transparent; cursor: pointer; transition: transform .1s, border-color .1s; }
.palette-swatch:hover { transform: scale(1.15); }
.palette-swatch.selected { border-color: var(--color-text); }
.clear-swatch { background: var(--color-surface); border: 1px solid var(--color-border); font-size: var(--text-2xs); color: var(--color-muted); display: flex; align-items: center; justify-content: center; }
.contrast-badge { display: inline-flex; align-items: center; margin-left: 8px; padding: .1rem 8px; border-radius: var(--radius-sm); font-size: var(--text-xs); font-weight: 600; letter-spacing: .02em; vertical-align: middle; }
.contrast-badge.ok   { background: var(--color-success-border); color: var(--color-success); }
.contrast-badge.fail { background: var(--color-danger-border); color: var(--color-danger); }
.contrast-preview { margin-top: 8px; padding: 8px 12px; border-radius: var(--radius); font-size: var(--text-base); font-weight: 500; }
.settings-actions { display: flex; gap: 8px; justify-content: flex-end; }

.back-btn { display: flex; align-items: center; gap: 8px; color: var(--color-muted); text-decoration: none; font-size: var(--text-base); padding: 8px .1rem; }
.back-btn:hover { color: var(--color-text); }
.page-info { flex: 1; }
.page-info h1 { margin: 0 0 .15rem; font-size: 1.3rem; font-weight: 600; }
.page-slug { font-family: monospace; font-size: var(--text-sm); }
.muted { color: var(--color-muted); }

/* ── Block list ─────────────────────────────────────────────────────────────── */
.block-list { display: flex; flex-direction: column; gap: 0; }
.block-row {
	display: flex; flex-direction: column;
	background: var(--color-surface); border: 1px solid var(--color-border);
	border-radius: var(--radius); transition: border-color .15s, box-shadow .15s;
	overflow: hidden;
}
.block-row:hover { border-color: color-mix(in srgb, var(--color-accent) 60%, var(--color-border)); }
.block-row.active { border-color: var(--color-accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 13%, transparent); }
.block-row.disabled { opacity: .55; }
.block-row-header { display: flex; align-items: center; gap: 8px; padding: 8px 12px; cursor: pointer; }
.block-drag { color: var(--color-muted); cursor: grab; flex-shrink: 0; }
.block-body { flex: 1; display: flex; align-items: center; gap: 8px; min-width: 0; }
.block-type-badge { font-size: var(--text-sm); font-weight: 500; background: var(--color-surface-raised); border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: .15rem 8px; white-space: nowrap; }
.block-title { min-width: 0; color: var(--color-text); font-size: var(--text-base); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.block-anchor { font-family: monospace; font-size: var(--text-xs); }
.callout-badge { font-size: var(--text-2xs); background: color-mix(in srgb, var(--color-accent) 9%, var(--color-surface-raised)); color: var(--color-accent); border-radius: var(--radius-sm); padding: .1rem 8px; }
.callout-badge.alert { background: var(--color-danger-border); color: var(--color-danger); }
.hidden-badge { font-size: var(--text-2xs); background: var(--color-warning-border); color: var(--color-warning); border-radius: var(--radius-sm); padding: .1rem 8px; }
.block-actions { display: flex; align-items: center; gap: .1rem; flex-shrink: 0; }
/* Inline primary editor area */
.block-inline-editor {
	padding: 16px 16px 16px 36px; /* indent past drag handle area */
	border-top: 1px solid var(--color-border);
	background: var(--color-bg);
}
.insert-btn { display: flex; align-items: center; justify-content: center; width: 100%; height: 24px; background: none; border: none; cursor: pointer; color: var(--color-border); transition: color .15s; position: relative; }
.insert-btn::before { content: ''; position: absolute; left: 2rem; right: 2rem; top: 50%; height: 1px; background: currentColor; }
.insert-icon { position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; width: 16px; height: 16px; border-radius: 50%; border: 1px solid currentColor; background: var(--color-bg); }
.insert-btn:hover { color: var(--color-text); }
.empty-state { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 48px; text-align: center; color: var(--color-muted); background: var(--color-surface); border: 2px dashed var(--color-border); border-radius: var(--radius-lg); }
.add-block-row { display: flex; justify-content: center; padding-top: 12px; }

/* ── Buttons ─────────────────────────────────────────────────────────────────── */







.btn-ghost { display: flex; align-items: center; gap: 4px; padding: 4px 8px; background: none; border: none; border-radius: var(--radius-sm); font-size: var(--text-sm); cursor: pointer; color: var(--color-muted); }
.btn-ghost:hover:not(:disabled) { background: var(--color-hover); color: var(--color-text); }
.btn-ghost.sm { min-width: 24px; min-height: 24px; padding: 4px; }
.btn-ghost.danger:hover { color: var(--color-danger); }
.btn-ghost:disabled { opacity: .4; cursor: not-allowed; }

/* ── Modal ──────────────────────────────────────────────────────────────────── */

/* ── Picker ─────────────────────────────────────────────────────────────────── */
.picker-search {
	position: sticky; top: calc(-1 * var(--space-5)); z-index: 1;
	display: flex; align-items: center; gap: 8px; height: 40px; padding: 0 8px 0 12px; margin-bottom: var(--space-5);
	border: 1px solid var(--color-border); border-radius: var(--radius); background: var(--color-surface);
	box-shadow: var(--shadow-xs), 0 -12px 0 var(--color-surface); color: var(--color-muted);
	transition: border-color var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease);
}
.picker-search:focus-within { border-color: var(--color-border-focus); box-shadow: var(--focus-ring), 0 -12px 0 var(--color-surface); }
.picker-search input { flex: 1; min-width: 0; border: 0; outline: none; background: transparent; color: var(--color-text); font-size: var(--text-base); }
.picker-search input::-webkit-search-cancel-button { display: none; }
.picker-body { display: flex; flex-direction: column; gap: var(--space-6); }
.picker-group-label { margin-bottom: var(--space-2); font-size: var(--text-2xs); font-weight: 500; text-transform: uppercase; letter-spacing: var(--tracking-eyebrow); color: var(--color-muted); }
.picker-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--space-2); }
.picker-tile {
	display: flex; align-items: flex-start; gap: 12px; padding: 12px; text-align: left;
	border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface);
	transition: border-color var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease);
}
.picker-tile:hover:not(:disabled), .picker-tile:focus-visible { border-color: var(--color-border-strong); box-shadow: var(--shadow); }
.picker-tile:hover:not(:disabled) .tile-icon { color: var(--color-accent); }
.picker-tile:disabled { opacity: .5; cursor: not-allowed; }
.tile-icon { display: grid; place-items: center; flex: 0 0 auto; width: 32px; height: 32px; border-radius: var(--radius); background: var(--color-surface-raised); color: var(--color-text-secondary); transition: color var(--dur-fast) var(--ease); }
.tile-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; padding-top: 1px; }
.tile-label { font-size: var(--text-sm); font-weight: 500; color: var(--color-text); letter-spacing: var(--tracking-snug); }
.tile-desc { font-size: var(--text-xs); line-height: var(--leading-snug); color: var(--color-muted); }
</style>
