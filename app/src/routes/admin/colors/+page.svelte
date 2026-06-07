<script lang="ts">
	import type { PageData } from './$types';
	import {
		hexToAllFormats, colorContrast, gradientToCss,
		generateShades,
		hexToRgb, rgbToHex, rgbToCmyk, cmykToRgb,
		type GradientStop
	} from '$lib/utils/colors';
	import { invalidateAll } from '$app/navigation';
	import * as m from '$lib/paraglide/messages';
	import {
		IconPlus, IconDownload, IconChevronDown, IconPencil, IconTrash,
		IconArrowUp, IconArrowDown, IconX, IconCheck,
		IconGripVertical
	} from '@tabler/icons-svelte';

	const { data }: { data: PageData } = $props();

	// ── State ──────────────────────────────────────────────────────────────────
	let palettes   = $state(data.palettes);
	let colorRows  = $state(data.colors);
	let gradients  = $state(data.gradients);

	let activeTab         = $state<'colors' | 'gradients'>('colors');
	let activePaletteId   = $state<string | null>(null);
	let showColorModal    = $state(false);
	let showPaletteModal  = $state(false);
	let editingPaletteId  = $state<string | null>(null); // null = create, string = edit
	let showGradientModal = $state(false);
	let editingColor      = $state<(typeof colorRows)[0]['color'] | null>(null);
	let editingGradient   = $state<(typeof gradients)[0] | null>(null);
	let copied            = $state<string | null>(null);
	let saving            = $state(false);
	let error             = $state('');

	// Color form
	let colorForm = $state({ name: '', hex: '#4A1204', paletteId: '', pantoneRef: '', ralRef: '' });

	// Color input mode (HEX / RGB / CMYK)
	type ColorInputMode = 'hex' | 'rgb' | 'cmyk';
	let colorInputMode = $state<ColorInputMode>('hex');

	// Editable intermediate RGB/CMYK values (strings so user can type freely)
	let rgbEdit  = $state({ r: '74', g: '18', b: '4' });
	let cmykEdit = $state({ c: '0', m: '76', y: '95', k: '71' });

	function syncEditFromHex(hex: string) {
		const rgb  = hexToRgb(hex);
		const cmyk = rgbToCmyk(rgb);
		rgbEdit  = { r: String(rgb.r),  g: String(rgb.g),  b: String(rgb.b) };
		cmykEdit = { c: String(cmyk.c), m: String(cmyk.m), y: String(cmyk.y), k: String(cmyk.k) };
	}

	function applyRgbEdit() {
		const r = Math.max(0, Math.min(255, parseInt(rgbEdit.r)  || 0));
		const g = Math.max(0, Math.min(255, parseInt(rgbEdit.g)  || 0));
		const b = Math.max(0, Math.min(255, parseInt(rgbEdit.b)  || 0));
		colorForm.hex = rgbToHex({ r, g, b });
		syncEditFromHex(colorForm.hex);
	}

	function applyCmykEdit() {
		const clamp = (v: string, max = 100) => Math.max(0, Math.min(max, parseInt(v) || 0));
		const cmyk = { c: clamp(cmykEdit.c), m: clamp(cmykEdit.m), y: clamp(cmykEdit.y), k: clamp(cmykEdit.k) };
		colorForm.hex = rgbToHex(cmykToRgb(cmyk));
		syncEditFromHex(colorForm.hex);
	}

	// Shades modal
	let shadesModal = $state<{ id: string; name: string; hex: string } | null>(null);
	function openShades(id: string, name: string, hex: string) { shadesModal = { id, name, hex }; }
	function closeShades() { shadesModal = null; }

	// Gradient stop: pick from palette colors
	let stopPickerIndex = $state<number | null>(null); // which stop index is showing picker

	// Export dropdown
	let exportOpen = $state(false);

	// Palette form
	let paletteName = $state('');

	// Gradient form
	let gradientForm = $state({
		name: '',
		type: 'linear' as 'linear' | 'radial' | 'conic',
		angle: 135,
		paletteId: '',
		stops: [
			{ color: '#4A1204', position: 0 },
			{ color: '#e74c3c', position: 100 }
		] as GradientStop[]
	});

	// ── Drag & drop state ──────────────────────────────────────────────────────
	let dragId    = $state<string | null>(null);   // id of card being dragged
	let dragOver  = $state<string | null>(null);   // id of card being hovered

	function onDragStart(id: string) {
		dragId = id;
	}
	function onDragOver(e: DragEvent, id: string) {
		e.preventDefault();
		dragOver = id;
	}
	function onDragLeave() {
		dragOver = null;
	}
	async function onDrop(targetId: string, paletteId: string | null) {
		if (!dragId || dragId === targetId) { dragId = null; dragOver = null; return; }

		// Reorder within the same palette group
		const groupRows = colorRows.filter(r => (r.color.paletteId ?? null) === paletteId);
		const fromIdx = groupRows.findIndex(r => r.color.id === dragId);
		const toIdx   = groupRows.findIndex(r => r.color.id === targetId);
		if (fromIdx === -1 || toIdx === -1) { dragId = null; dragOver = null; return; }

		// Splice
		const reordered = [...groupRows];
		const [moved] = reordered.splice(fromIdx, 1);
		reordered.splice(toIdx, 0, moved);

		// Optimistic update — replace only the affected group rows in colorRows
		const newColorRows = colorRows.filter(r => (r.color.paletteId ?? null) !== paletteId);
		const withOrder = reordered.map((r, i) => ({ ...r, color: { ...r.color, order: i } }));
		colorRows = [
			...newColorRows,
			...withOrder
		].sort((a, b) => (a.color.paletteId ?? '').localeCompare(b.color.paletteId ?? '') || a.color.order - b.color.order);

		dragId = null; dragOver = null;

		// Persist
		await Promise.all(
			withOrder.map((r, i) =>
				fetch(`/api/colors/${r.color.id}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ order: i })
				})
			)
		);
	}

	// ── Derived ────────────────────────────────────────────────────────────────
	const visibleColors = $derived(
		activePaletteId
			? colorRows.filter(r => r.color.paletteId === activePaletteId)
			: colorRows
	);
	const visibleGradients = $derived(
		activePaletteId
			? gradients.filter(g => g.paletteId === activePaletteId)
			: gradients
	);

	// Grouped view for "All" tab — colours sectioned by palette
	type ColorRow = (typeof colorRows)[0];
	const groupedColors = $derived((() => {
		if (activePaletteId !== null) return null; // flat view when a palette is selected

		const map = new Map<string | null, ColorRow[]>();
		for (const row of colorRows) {
			const key = row.color.paletteId ?? null;
			if (!map.has(key)) map.set(key, []);
			map.get(key)!.push(row);
		}
		const result: { paletteId: string | null; paletteName: string | null; colors: ColorRow[] }[] = [];
		for (const p of palettes) {
			if (map.has(p.id)) result.push({ paletteId: p.id, paletteName: p.name, colors: map.get(p.id)! });
		}
		if (map.has(null) && map.get(null)!.length > 0) {
			result.push({ paletteId: null, paletteName: null, colors: map.get(null)! });
		}
		return result;
	})());

	const previewFormats = $derived(hexToAllFormats(colorForm.hex));
	const previewContrast = $derived(colorContrast(colorForm.hex));

	const gradientPreviewCss = $derived(
		gradientToCss(gradientForm.type, gradientForm.angle, gradientForm.stops)
	);

	// Sync RGB/CMYK edit fields when hex changes via native picker
	$effect(() => {
		if (colorInputMode === 'hex') syncEditFromHex(colorForm.hex);
	});

	// ── API ────────────────────────────────────────────────────────────────────
	async function api(method: string, path: string, body?: unknown) {
		const res = await fetch(path, {
			method,
			headers: { 'Content-Type': 'application/json' },
			body: body ? JSON.stringify(body) : undefined
		});
		if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? res.statusText);
		if (res.status === 204) return null;
		return res.json();
	}

	async function refresh() {
		await invalidateAll();
		palettes  = data.palettes;
		colorRows = data.colors;
		gradients = data.gradients;
	}

	// ── Colors ─────────────────────────────────────────────────────────────────
	function openAddColor() {
		editingColor = null;
		colorForm = { name: '', hex: '#4A1204', paletteId: activePaletteId ?? '', pantoneRef: '', ralRef: '' };
		colorInputMode = 'hex';
		syncEditFromHex(colorForm.hex);
		error = '';
		showColorModal = true;
	}
	function openEditColor(row: (typeof colorRows)[0]) {
		editingColor = row.color;
		colorForm = {
			name: row.color.name,
			hex: row.color.hex,
			paletteId: row.color.paletteId ?? '',
			pantoneRef: row.color.pantoneRef ?? '',
			ralRef: row.color.ralRef ?? ''
		};
		colorInputMode = 'hex';
		syncEditFromHex(colorForm.hex);
		error = '';
		showColorModal = true;
	}
	async function saveColor() {
		saving = true; error = '';
		try {
			const body = { name: colorForm.name, hex: colorForm.hex, paletteId: colorForm.paletteId || null, pantoneRef: colorForm.pantoneRef || null, ralRef: colorForm.ralRef || null };
			editingColor
				? await api('PATCH', `/api/colors/${editingColor.id}`, body)
				: await api('POST', '/api/colors', body);
			showColorModal = false;
			await refresh();
		} catch (e) { error = e instanceof Error ? e.message : 'Error'; }
		finally { saving = false; }
	}
	async function deleteColor(id: string) {
		if (!confirm('Delete this color?')) return;
		await api('DELETE', `/api/colors/${id}`);
		await refresh();
	}

	// ── Palettes ───────────────────────────────────────────────────────────────
	function openNewPalette() {
		editingPaletteId = null;
		paletteName = '';
		error = '';
		showPaletteModal = true;
	}
	function openEditPalette(id: string, name: string) {
		editingPaletteId = id;
		paletteName = name;
		error = '';
		showPaletteModal = true;
	}
	async function savePalette() {
		saving = true; error = '';
		try {
			if (editingPaletteId) {
				await api('PATCH', `/api/colors/palettes/${editingPaletteId}`, { name: paletteName });
			} else {
				await api('POST', '/api/colors/palettes', { name: paletteName });
			}
			showPaletteModal = false; paletteName = ''; editingPaletteId = null;
			await refresh();
		} catch (e) { error = e instanceof Error ? e.message : 'Error'; }
		finally { saving = false; }
	}
	async function deletePalette(id: string, name: string) {
		if (!confirm(`Delete palette "${name}"? Colors will be unlinked.`)) return;
		await api('DELETE', `/api/colors/palettes/${id}`);
		if (activePaletteId === id) activePaletteId = null;
		await refresh();
	}

	// ── Gradients ──────────────────────────────────────────────────────────────
	function openAddGradient() {
		editingGradient = null;
		gradientForm = { name: '', type: 'linear', angle: 135, paletteId: activePaletteId ?? '', stops: [{ color: '#4A1204', position: 0 }, { color: '#e74c3c', position: 100 }] };
		error = '';
		showGradientModal = true;
	}
	function openEditGradient(g: (typeof gradients)[0]) {
		editingGradient = g;
		gradientForm = { name: g.name, type: g.type as 'linear' | 'radial' | 'conic', angle: g.angle, paletteId: g.paletteId ?? '', stops: JSON.parse(JSON.stringify(g.stops)) };
		error = '';
		showGradientModal = true;
	}
	async function saveGradient() {
		saving = true; error = '';
		try {
			const body = { name: gradientForm.name, type: gradientForm.type, angle: gradientForm.angle, stops: gradientForm.stops, paletteId: gradientForm.paletteId || null };
			editingGradient
				? await api('PATCH', `/api/colors/gradients/${editingGradient.id}`, body)
				: await api('POST', '/api/colors/gradients', body);
			showGradientModal = false;
			await refresh();
		} catch (e) { error = e instanceof Error ? e.message : 'Error'; }
		finally { saving = false; }
	}
	async function deleteGradient(id: string) {
		if (!confirm('Delete this gradient?')) return;
		await api('DELETE', `/api/colors/gradients/${id}`);
		await refresh();
	}
	function addStop() {
		gradientForm.stops = [...gradientForm.stops, { color: '#ffffff', position: 50 }];
	}
	function removeStop(i: number) {
		if (gradientForm.stops.length <= 2) return;
		gradientForm.stops = gradientForm.stops.filter((_, idx) => idx !== i);
	}

	// ── Palette reorder ────────────────────────────────────────────────────────
	async function movePalette(paletteId: string, direction: -1 | 1) {
		const idx = palettes.findIndex(p => p.id === paletteId);
		const swapIdx = idx + direction;
		if (swapIdx < 0 || swapIdx >= palettes.length) return;

		// Optimistic swap
		const next = [...palettes];
		[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
		palettes = next.map((p, i) => ({ ...p, order: i }));

		// Persist both
		await Promise.all([
			api('PATCH', `/api/colors/palettes/${next[idx].id}`, { order: idx }),
			api('PATCH', `/api/colors/palettes/${next[swapIdx].id}`, { order: swapIdx })
		]);
	}

	// ── PMS / Pantone label preference ────────────────────────────────────────
	let pantoneLabel = $state<'PMS' | 'Pantone'>(
		typeof localStorage !== 'undefined'
			? (localStorage.getItem('bw_pantoneLabel') as 'PMS' | 'Pantone' ?? 'PMS')
			: 'PMS'
	);

	// ── Clipboard ──────────────────────────────────────────────────────────────
	async function copy(text: string, key: string) {
		await navigator.clipboard.writeText(text);
		copied = key;
		setTimeout(() => (copied = null), 1500);
	}

	// ── Export ─────────────────────────────────────────────────────────────────
	function exportColors(format: string) {
		if (format === 'shades-css' || format === 'shades-json') {
			exportShades(format);
			return;
		}
		window.open(`/api/export/colors/${format}`, '_blank');
	}

	function exportShades(format: 'shades-css' | 'shades-json') {

		if (format === 'shades-css') {
			const lines = [':root {'];
			for (const { color: c, palette } of colorRows) {
				const group = palette?.name ?? 'global';
				lines.push(`\n  /* ${c.name} (${group}) */`);
				for (const s of generateShades(c.hex)) {
					const slug = c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
					const rgb = hexToRgb(s.hex);
					lines.push(`  --color-${slug}-${s.step}: ${s.hex};`);
					lines.push(`  --color-${slug}-${s.step}-rgb: ${rgb.r}, ${rgb.g}, ${rgb.b};`);
				}
			}
			lines.push('}');
			downloadBlob(lines.join('\n'), 'shades.css', 'text/css');
		} else {
			const tokens: Record<string, Record<string, unknown>> = {};
			for (const { color: c } of colorRows) {
				const slug = c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
				tokens[slug] = {};
				for (const s of generateShades(c.hex)) {
					tokens[slug][String(s.step)] = { $value: s.hex, $type: 'color' };
				}
			}
			downloadBlob(JSON.stringify(tokens, null, 2), 'shades.tokens.json', 'application/json');
		}
	}

	function downloadBlob(content: string, filename: string, mime: string) {
		const a = document.createElement('a');
		a.href = URL.createObjectURL(new Blob([content], { type: mime }));
		a.download = filename;
		a.click();
		URL.revokeObjectURL(a.href);
	}
</script>

<svelte:window
	onclick={(e) => {
		if (exportOpen && !(e.target as Element).closest('.export-menu')) exportOpen = false;
	}}
	onkeydown={(e) => {
		if (e.key !== 'Escape') return;
		if (showColorModal) { showColorModal = false; return; }
		if (showPaletteModal) { showPaletteModal = false; paletteName = ''; editingPaletteId = null; return; }
		if (showGradientModal) { showGradientModal = false; return; }
		if (shadesModal) { shadesModal = null; return; }
		if (exportOpen) { exportOpen = false; return; }
	}}
/>

<svelte:head><title>{m.colors_title()} · Brandywine</title></svelte:head>

<div class="page">
	<!-- ── Topbar ──────────────────────────────────────────────────────────── -->
	<div class="topbar">
		<div class="topbar-left">
			<h1 class="page-title">{m.colors_title()}</h1>
			<p class="page-sub">{colorRows.length} colors · {gradients.length} gradients · {palettes.length} palettes</p>
		</div>
		<div class="topbar-actions">
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="export-menu" onkeydown={(e) => e.key === 'Escape' && (exportOpen = false)}>
				<button
					class="action-btn"
					class:active={exportOpen}
					onclick={() => (exportOpen = !exportOpen)}
					aria-expanded={exportOpen}
					aria-haspopup="listbox"
				>
					<IconDownload size={14} stroke={1.75} />
					<span class="btn-label">{m.colors_export()}</span>
					<span style="display:flex;transition:transform 0.15s;transform:{exportOpen ? 'rotate(180deg)' : 'none'}"><IconChevronDown size={11} stroke={2} /></span>
				</button>
				{#if exportOpen}
					<div class="export-dropdown" role="listbox">
						{#each [['css','CSS Variables'],['scss','SCSS Variables'],['json','Design Tokens'],['ase','Adobe Swatch'],['gpl','GIMP Palette']] as [fmt, label] (fmt)}
							<button onclick={() => { exportColors(fmt); exportOpen = false; }}>
								<span class="fmt-tag">.{fmt}</span>{label}
							</button>
						{/each}
						<div class="export-separator"></div>
						<button onclick={() => { exportColors('shades-css'); exportOpen = false; }}>
							<span class="fmt-tag">.css</span>Shades (CSS)
						</button>
						<button onclick={() => { exportColors('shades-json'); exportOpen = false; }}>
							<span class="fmt-tag">.json</span>Shades (Tokens)
						</button>
					</div>
				{/if}
			</div>
			<button class="action-btn" onclick={openNewPalette}>
				<IconPlus size={13} stroke={2} />
				<span class="btn-label">{m.colors_add_group()}</span>
			</button>
			{#if activeTab === 'gradients'}
				<button class="action-btn action-btn-primary" onclick={openAddGradient}>
					<IconPlus size={13} stroke={2} />
					{m.colors_add_gradient()}
				</button>
			{:else}
				<button class="action-btn action-btn-primary" onclick={openAddColor}>
					<IconPlus size={13} stroke={2} />
					{m.colors_add()}
				</button>
			{/if}
		</div>
	</div>

	<!-- ── Palette / Group bar ─────────────────────────────────────────────── -->
	<div class="palette-bar">
		<div class="palette-tabs">
			<!-- View tabs -->
			<button class="ptab view-tab" class:active={activeTab === 'colors'} onclick={() => (activeTab = 'colors')}>{m.colors_tab_colors()}</button>
			<button class="ptab view-tab" class:active={activeTab === 'gradients'} onclick={() => (activeTab = 'gradients')}>{m.colors_tab_gradients()}</button>
			<div class="tab-separator"></div>

			<!-- Palette filters -->
			<button class="ptab" class:active={activePaletteId === null} onclick={() => (activePaletteId = null)}>
				{m.colors_tab_all()}
				<span class="ptab-count">{activeTab === 'colors' ? colorRows.length : gradients.length}</span>
			</button>
			{#each palettes as p (p.id)}
				<div class="ptab-group">
					<button class="ptab" class:active={activePaletteId === p.id} onclick={() => (activePaletteId = p.id)}>
						{p.name}
						<span class="ptab-count">{
							activeTab === 'colors'
								? colorRows.filter(r => r.color.paletteId === p.id).length
								: gradients.filter(g => g.paletteId === p.id).length
						}</span>
					</button>
					<button class="ptab-action" onclick={() => openEditPalette(p.id, p.name)} title="Rename group">
						<IconPencil size={9} stroke={2} />
					</button>
					<button class="ptab-action ptab-del" onclick={() => deletePalette(p.id, p.name)} title="Delete group">
						<IconX size={9} stroke={2} />
					</button>
				</div>
			{/each}
		</div>
	</div>

	<!-- ── Content ─────────────────────────────────────────────────────────── -->
	<div class="grid-area">
		{#if activeTab === 'colors'}
			{#if colorRows.length === 0}
				<div class="empty-state">
					<div class="empty-icon">
						<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="16" stroke="var(--color-border)" stroke-width="2"/><path d="M20 12v8M20 24v.5" stroke="var(--color-muted)" stroke-width="2" stroke-linecap="round"/></svg>
					</div>
					<p class="empty-title">{m.colors_empty_title()}</p>
					<p class="empty-sub">{m.colors_empty_sub()}</p>
					<button class="action-btn action-btn-primary" onclick={openAddColor}>{m.colors_add()}</button>
				</div>
			{:else if groupedColors}
				<!-- ── Grouped "All" view ── -->
				{#each groupedColors as group, gi (group.paletteId)}
					<div class="palette-group-section">
						<div class="palette-group-header">
							<span class="palette-group-name">{group.paletteName ?? 'Ungrouped'}</span>
							<span class="palette-group-count">{group.colors.length}</span>
							{#if group.paletteId !== null}
								<div class="palette-order-btns">
									<button
										class="palette-order-btn"
										disabled={gi === 0}
										onclick={() => movePalette(group.paletteId!, -1)}
										title="Move up"
									>
										<IconArrowUp size={11} stroke={2} />
									</button>
									<button
										class="palette-order-btn"
										disabled={gi === groupedColors.length - 1 || groupedColors[gi + 1].paletteId === null}
										onclick={() => movePalette(group.paletteId!, 1)}
										title="Move down"
									>
										<IconArrowDown size={11} stroke={2} />
									</button>
									<button
										class="palette-order-btn"
										onclick={() => openEditPalette(group.paletteId!, group.paletteName!)}
										title="Rename group"
									>
										<IconPencil size={11} stroke={2} />
									</button>
								</div>
							{/if}
						</div>
						<div class="color-grid">
							{#each group.colors as row (row.color.id)}
								{@const c = row.color}
								{@const fmt = hexToAllFormats(c.hex)}
								{@const contrast = colorContrast(c.hex)}
								{@const shades = generateShades(c.hex)}
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<div
									class="color-card"
									class:drag-over={dragOver === c.id}
									draggable="true"
									ondragstart={() => onDragStart(c.id)}
									ondragover={(e) => onDragOver(e, c.id)}
									ondragleave={onDragLeave}
									ondrop={() => onDrop(c.id, group.paletteId)}
									ondragend={() => { dragId = null; dragOver = null; }}
								>
									<div class="drag-handle" title="Drag to reorder">
										<IconGripVertical size={12} stroke={1.5} />
									</div>
									<div class="swatch" style="background:{c.hex}">
										<div class="swatch-overlay">
											<button class="swatch-btn" onclick={() => openEditColor(row)} title="Edit">
												<IconPencil size={13} stroke={1.75} />
											</button>
											<button class="swatch-btn swatch-btn-del" onclick={() => deleteColor(c.id)} title="Delete">
												<IconX size={13} stroke={2} />
											</button>
										</div>
										<button class="hex-chip" class:flash={copied === `${c.id}-hex`} onclick={() => copy(c.hex.toUpperCase(), `${c.id}-hex`)}>{c.hex.toUpperCase()}</button>
									</div>
									<div class="color-body">
										<div class="color-header-row">
											<div class="color-name">{c.name}</div>
										</div>
										<div class="color-values">
											<button class="vrow" class:flash={copied === `${c.id}-rgb`} onclick={() => copy(`rgb(${fmt.rgb.r}, ${fmt.rgb.g}, ${fmt.rgb.b})`, `${c.id}-rgb`)}>
												<span class="vlabel">RGB</span><span class="vval">{fmt.rgb.r} {fmt.rgb.g} {fmt.rgb.b}</span>
												{#if copied === `${c.id}-rgb`}<IconCheck class="vrow-check" size={11} stroke={2} />{/if}
											</button>
											<button class="vrow" class:flash={copied === `${c.id}-hsl`} onclick={() => copy(`hsl(${fmt.hsl.h}, ${fmt.hsl.s}%, ${fmt.hsl.l}%)`, `${c.id}-hsl`)}>
												<span class="vlabel">HSL</span><span class="vval">{fmt.hsl.h}° {fmt.hsl.s}% {fmt.hsl.l}%</span>
												{#if copied === `${c.id}-hsl`}<IconCheck class="vrow-check" size={11} stroke={2} />{/if}
											</button>
											<button class="vrow" class:flash={copied === `${c.id}-cmyk`} onclick={() => copy(`cmyk(${fmt.cmyk.c}%, ${fmt.cmyk.m}%, ${fmt.cmyk.y}%, ${fmt.cmyk.k}%)`, `${c.id}-cmyk`)}>
												<span class="vlabel">CMYK</span><span class="vval">{fmt.cmyk.c} {fmt.cmyk.m} {fmt.cmyk.y} {fmt.cmyk.k}</span>
												{#if copied === `${c.id}-cmyk`}<IconCheck class="vrow-check" size={11} stroke={2} />{/if}
											</button>
											{#if c.pantoneRef}<div class="vrow static"><span class="vlabel">{pantoneLabel}</span><span class="vval">{c.pantoneRef}</span></div>{/if}
											{#if c.ralRef}<div class="vrow static"><span class="vlabel">RAL</span><span class="vval">{c.ralRef}</span></div>{/if}
										</div>
										<div class="contrast-section">
											<div class="contrast-label">Contrast</div>
											<div class="contrast-rows">
												<div class="contrast-row">
													<div class="contrast-preview"><span class="contrast-dot" style="background:#fff; border:1px solid #e3e2df"></span><span class="contrast-bg-label">on White</span></div>
													<span class="contrast-ratio">{contrast.onWhite.ratioDisplay}</span>
													<span class="contrast-badge badge-{contrast.onWhite.level.replace(' ', '-').toLowerCase()}">{contrast.onWhite.level}</span>
												</div>
												<div class="contrast-row">
													<div class="contrast-preview"><span class="contrast-dot" style="background:#111"></span><span class="contrast-bg-label">on Black</span></div>
													<span class="contrast-ratio">{contrast.onBlack.ratioDisplay}</span>
													<span class="contrast-badge badge-{contrast.onBlack.level.replace(' ', '-').toLowerCase()}">{contrast.onBlack.level}</span>
												</div>
											</div>
										</div>

										<!-- Shades trigger -->
										<button class="shades-trigger" onclick={() => openShades(c.id, c.name, c.hex)}>
											<span class="shades-mini-strip">
												{#each shades as s (s.step)}<span class="shades-mini-dot" style="background:{s.hex}"></span>{/each}
											</span>
											<span class="shades-trigger-label">Shades</span>
										</button>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			{:else}
				<!-- ── Filtered single-palette view ── -->
				{#if visibleColors.length === 0}
					<div class="empty-state">
						<p class="empty-title">No colors in this palette</p>
						<p class="empty-sub">Add a color and assign it to this group.</p>
						<button class="action-btn action-btn-primary" onclick={openAddColor}>Add color</button>
					</div>
				{:else}
					<div class="color-grid">
						{#each visibleColors as row (row.color.id)}
							{@const c = row.color}
							{@const fmt = hexToAllFormats(c.hex)}
							{@const contrast = colorContrast(c.hex)}
							{@const shades = generateShades(c.hex)}
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div
								class="color-card"
								class:drag-over={dragOver === c.id}
								draggable="true"
								ondragstart={() => onDragStart(c.id)}
								ondragover={(e) => onDragOver(e, c.id)}
								ondragleave={onDragLeave}
								ondrop={() => onDrop(c.id, c.paletteId ?? null)}
								ondragend={() => { dragId = null; dragOver = null; }}
							>
								<div class="drag-handle" title="Drag to reorder">
									<IconGripVertical size={12} stroke={1.5} />
								</div>
								<!-- Swatch -->
								<div class="swatch" style="background:{c.hex}">
									<div class="swatch-overlay">
										<button class="swatch-btn" onclick={() => openEditColor(row)} title="Edit">
											<IconPencil size={13} stroke={1.75} />
										</button>
										<button class="swatch-btn swatch-btn-del" onclick={() => deleteColor(c.id)} title="Delete">
											<IconX size={13} stroke={2} />
										</button>
									</div>
									<button
										class="hex-chip"
										class:flash={copied === `${c.id}-hex`}
										onclick={() => copy(c.hex.toUpperCase(), `${c.id}-hex`)}
									>{c.hex.toUpperCase()}</button>
								</div>

								<!-- Info -->
								<div class="color-body">
									<div class="color-header-row">
										<div class="color-name">{c.name}</div>
									</div>

									<!-- Color values -->
									<div class="color-values">
										<button class="vrow" class:flash={copied === `${c.id}-rgb`}
											onclick={() => copy(`rgb(${fmt.rgb.r}, ${fmt.rgb.g}, ${fmt.rgb.b})`, `${c.id}-rgb`)}>
											<span class="vlabel">RGB</span>
											<span class="vval">{fmt.rgb.r} {fmt.rgb.g} {fmt.rgb.b}</span>
											{#if copied === `${c.id}-rgb`}<IconCheck class="vrow-check" size={11} stroke={2} />{/if}
										</button>
										<button class="vrow" class:flash={copied === `${c.id}-hsl`}
											onclick={() => copy(`hsl(${fmt.hsl.h}, ${fmt.hsl.s}%, ${fmt.hsl.l}%)`, `${c.id}-hsl`)}>
											<span class="vlabel">HSL</span>
											<span class="vval">{fmt.hsl.h}° {fmt.hsl.s}% {fmt.hsl.l}%</span>
											{#if copied === `${c.id}-hsl`}<IconCheck class="vrow-check" size={11} stroke={2} />{/if}
										</button>
										<button class="vrow" class:flash={copied === `${c.id}-cmyk`}
											onclick={() => copy(`cmyk(${fmt.cmyk.c}%, ${fmt.cmyk.m}%, ${fmt.cmyk.y}%, ${fmt.cmyk.k}%)`, `${c.id}-cmyk`)}>
											<span class="vlabel">CMYK</span>
											<span class="vval">{fmt.cmyk.c} {fmt.cmyk.m} {fmt.cmyk.y} {fmt.cmyk.k}</span>
											{#if copied === `${c.id}-cmyk`}<IconCheck class="vrow-check" size={11} stroke={2} />{/if}
										</button>
										{#if c.pantoneRef}
											<div class="vrow static">
												<span class="vlabel">{pantoneLabel}</span>
												<span class="vval">{c.pantoneRef}</span>
											</div>
										{/if}
										{#if c.ralRef}
											<div class="vrow static">
												<span class="vlabel">RAL</span>
												<span class="vval">{c.ralRef}</span>
											</div>
										{/if}
									</div>

									<!-- Contrast checker -->
									<div class="contrast-section">
										<div class="contrast-label">Contrast</div>
										<div class="contrast-rows">
											<div class="contrast-row">
												<div class="contrast-preview">
													<span class="contrast-dot" style="background:#fff; border:1px solid #e3e2df"></span>
													<span class="contrast-bg-label">on White</span>
												</div>
												<span class="contrast-ratio">{contrast.onWhite.ratioDisplay}</span>
												<span class="contrast-badge badge-{contrast.onWhite.level.replace(' ', '-').toLowerCase()}">{contrast.onWhite.level}</span>
											</div>
											<div class="contrast-row">
												<div class="contrast-preview">
													<span class="contrast-dot" style="background:#111"></span>
													<span class="contrast-bg-label">on Black</span>
												</div>
												<span class="contrast-ratio">{contrast.onBlack.ratioDisplay}</span>
												<span class="contrast-badge badge-{contrast.onBlack.level.replace(' ', '-').toLowerCase()}">{contrast.onBlack.level}</span>
											</div>
										</div>
									</div>

									<!-- Shades trigger -->
									<button class="shades-trigger" onclick={() => openShades(c.id, c.name, c.hex)}>
										<span class="shades-mini-strip">
											{#each shades as s (s.step)}<span class="shades-mini-dot" style="background:{s.hex}"></span>{/each}
										</span>
										<span class="shades-trigger-label">Shades</span>
									</button>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			{/if}

		{:else}
			<!-- ── Gradients tab ────────────────────────────────────────────── -->
			{#if visibleGradients.length === 0}
				<div class="empty-state">
					<div class="empty-icon">
						<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><rect x="8" y="8" width="24" height="24" rx="6" stroke="var(--color-border)" stroke-width="2"/><path d="M8 20h24" stroke="var(--color-muted)" stroke-width="2"/></svg>
					</div>
					<p class="empty-title">No gradients yet</p>
					<p class="empty-sub">Create linear, radial, or conic gradients from your palette colors.</p>
					<button class="action-btn action-btn-primary" onclick={openAddGradient}>Add first gradient</button>
				</div>
			{:else}
				<div class="gradient-grid">
					{#each visibleGradients as g (g.id)}
						{@const css = gradientToCss(g.type as 'linear'|'radial'|'conic', g.angle, g.stops as GradientStop[])}
						<div class="gradient-card">
							<div class="gradient-swatch" style="background:{css}">
								<div class="swatch-overlay">
									<button class="swatch-btn" onclick={() => openEditGradient(g)} title="Edit">
										<IconPencil size={13} stroke={1.75} />
									</button>
									<button class="swatch-btn swatch-btn-del" onclick={() => deleteGradient(g.id)} title="Delete">
										<IconX size={13} stroke={2} />
									</button>
								</div>
								<button class="hex-chip" onclick={() => copy(`background: ${css};`, `${g.id}-css`)}>CSS</button>
							</div>
							<div class="color-body">
								<div class="color-header-row">
									<div class="color-name">{g.name}</div>
									<div class="palette-chip">{g.type}{g.type === 'linear' ? ` ${g.angle}°` : ''}</div>
								</div>
								<div class="gradient-stops">
									{#each (g.stops as GradientStop[]) as stop (stop.position)}
										<div class="stop-chip">
											<span class="stop-dot" style="background:{stop.color}"></span>
											<span class="stop-val">{stop.color}</span>
											<span class="stop-pos">{stop.position}%</span>
										</div>
									{/each}
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		{/if}
	</div>
</div>

<!-- ── Color modal ────────────────────────────────────────────────────────── -->
{#if showColorModal}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={() => (showColorModal = false)}>
		<div class="modal" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h2>{editingColor ? 'Edit color' : 'Add color'}</h2>
				<button class="modal-close" aria-label="Close" onclick={() => (showColorModal = false)}>
					<IconX size={16} stroke={1.75} />
				</button>
			</div>

			<div class="modal-body">
				<!-- Color picker -->
				<div class="field">
					<div class="color-label-row">
						<label for="color-hex">Color</label>
						<div class="mode-tabs">
							<button class="mode-tab" class:active={colorInputMode==='hex'} onclick={() => { colorInputMode='hex'; syncEditFromHex(colorForm.hex); }}>HEX</button>
							<button class="mode-tab" class:active={colorInputMode==='rgb'} onclick={() => { colorInputMode='rgb'; syncEditFromHex(colorForm.hex); }}>RGB</button>
							<button class="mode-tab" class:active={colorInputMode==='cmyk'} onclick={() => { colorInputMode='cmyk'; syncEditFromHex(colorForm.hex); }}>CMYK</button>
						</div>
					</div>

					{#if colorInputMode === 'hex'}
						<div class="color-input-row">
							<input id="color-hex" type="color" bind:value={colorForm.hex} />
							<input type="text" bind:value={colorForm.hex} pattern="^#[0-9a-fA-F]{6}$" placeholder="#000000" />
						</div>
					{:else if colorInputMode === 'rgb'}
						<div class="channel-row">
							<input id="color-hex" type="color" bind:value={colorForm.hex} onchange={() => syncEditFromHex(colorForm.hex)} />
							<div class="channel-inputs">
								<label class="channel-label">R<input type="number" min="0" max="255" bind:value={rgbEdit.r} oninput={applyRgbEdit} /></label>
								<label class="channel-label">G<input type="number" min="0" max="255" bind:value={rgbEdit.g} oninput={applyRgbEdit} /></label>
								<label class="channel-label">B<input type="number" min="0" max="255" bind:value={rgbEdit.b} oninput={applyRgbEdit} /></label>
							</div>
						</div>
					{:else}
						<div class="channel-row">
							<input id="color-hex" type="color" bind:value={colorForm.hex} onchange={() => syncEditFromHex(colorForm.hex)} />
							<div class="channel-inputs">
								<label class="channel-label">C<input type="number" min="0" max="100" bind:value={cmykEdit.c} oninput={applyCmykEdit} /></label>
								<label class="channel-label">M<input type="number" min="0" max="100" bind:value={cmykEdit.m} oninput={applyCmykEdit} /></label>
								<label class="channel-label">Y<input type="number" min="0" max="100" bind:value={cmykEdit.y} oninput={applyCmykEdit} /></label>
								<label class="channel-label">K<input type="number" min="0" max="100" bind:value={cmykEdit.k} oninput={applyCmykEdit} /></label>
							</div>
						</div>
					{/if}

					<!-- Live preview -->
					<div class="live-preview">
						<div class="preview-swatch" style="background:{colorForm.hex}"></div>
						<div class="preview-vals">
							<span>RGB {previewFormats.rgb.r} {previewFormats.rgb.g} {previewFormats.rgb.b}</span>
							<span>HSL {previewFormats.hsl.h}° {previewFormats.hsl.s}% {previewFormats.hsl.l}%</span>
							<span>CMYK {previewFormats.cmyk.c} {previewFormats.cmyk.m} {previewFormats.cmyk.y} {previewFormats.cmyk.k}</span>
						</div>
						<div class="preview-contrast">
							<div class="mini-contrast">
								<span style="color:#fff; background:{colorForm.hex}; padding:2px 6px; border-radius:3px; font-size:0.7rem; font-weight:600">Aa</span>
								<span class="mini-badge badge-{previewContrast.onWhite.level.replace(' ','-').toLowerCase()}">{previewContrast.onWhite.ratioDisplay}</span>
							</div>
							<div class="mini-contrast">
								<span style="color:#111; background:{colorForm.hex}; padding:2px 6px; border-radius:3px; font-size:0.7rem; font-weight:600">Aa</span>
								<span class="mini-badge badge-{previewContrast.onBlack.level.replace(' ','-').toLowerCase()}">{previewContrast.onBlack.ratioDisplay}</span>
							</div>
						</div>
					</div>
				</div>

				<div class="field">
					<label for="color-name">Name</label>
					<input id="color-name" type="text" bind:value={colorForm.name} placeholder="Brand Red" required />
				</div>

				<div class="field">
					<label for="color-palette">Group / Palette</label>
					<select id="color-palette" bind:value={colorForm.paletteId}>
						<option value="">— None —</option>
						{#each palettes as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
					</select>
				</div>

				<div class="field-row">
					<div class="field">
						<label for="color-pantone">Pantone ref</label>
						<input id="color-pantone" type="text" bind:value={colorForm.pantoneRef} placeholder="PMS 486 C" />
					</div>
					<div class="field">
						<label for="color-ral">RAL ref</label>
						<input id="color-ral" type="text" bind:value={colorForm.ralRef} placeholder="RAL 3011" />
					</div>
				</div>

				{#if error}<div class="error">{error}</div>{/if}
			</div>

			<div class="modal-footer">
				<button class="action-btn" onclick={() => (showColorModal = false)}>Cancel</button>
				<button class="action-btn action-btn-primary" onclick={saveColor} disabled={saving}>
					{saving ? 'Saving…' : editingColor ? 'Save changes' : 'Add color'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- ── Palette/Group modal ────────────────────────────────────────────────── -->
{#if showPaletteModal}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={() => (showPaletteModal = false)}>
		<div class="modal modal-sm" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h2>{editingPaletteId ? 'Rename group' : 'New group'}</h2>
				<button class="modal-close" aria-label="Close" onclick={() => (showPaletteModal = false)}>
					<IconX size={16} stroke={1.75} />
				</button>
			</div>
			<div class="modal-body">
				<div class="field">
					<label for="palette-name">Group name</label>
					<!-- svelte-ignore a11y_autofocus -->
					<input id="palette-name" type="text" bind:value={paletteName} placeholder="Primary, Secondary…" autofocus />
				</div>
				{#if error}<div class="error">{error}</div>{/if}
			</div>
			<div class="modal-footer">
				<button class="action-btn" onclick={() => (showPaletteModal = false)}>Cancel</button>
				<button class="action-btn action-btn-primary" onclick={savePalette} disabled={saving || !paletteName.trim()}>
					{saving ? '…' : editingPaletteId ? 'Save' : 'Create group'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- ── Gradient modal ────────────────────────────────────────────────────── -->
{#if showGradientModal}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={() => (showGradientModal = false)}>
		<div class="modal modal-lg" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h2>{editingGradient ? 'Edit gradient' : 'New gradient'}</h2>
				<button class="modal-close" aria-label="Close" onclick={() => (showGradientModal = false)}>
					<IconX size={16} stroke={1.75} />
				</button>
			</div>
			<div class="modal-body">
				<!-- Preview -->
				<div class="gradient-preview-bar" style="background:{gradientPreviewCss}"></div>

				<div class="field-row">
					<div class="field">
						<label for="grad-name">Name</label>
						<input id="grad-name" type="text" bind:value={gradientForm.name} placeholder="Brand Gradient" />
					</div>
					<div class="field">
						<label for="grad-type">Type</label>
						<select id="grad-type" bind:value={gradientForm.type}>
							<option value="linear">Linear</option>
							<option value="radial">Radial</option>
							<option value="conic">Conic</option>
						</select>
					</div>
				</div>

				{#if gradientForm.type === 'linear' || gradientForm.type === 'conic'}
					<div class="field">
						<label for="grad-angle">Angle: {gradientForm.angle}°</label>
						<input id="grad-angle" type="range" min="0" max="360" bind:value={gradientForm.angle} />
					</div>
				{/if}

				<div class="field">
					<label>Color stops</label>
					<div class="stops-list">
						{#each gradientForm.stops as stop, i (i)}
							<div class="stop-row">
								<!-- Color swatch + native picker -->
								<div class="stop-color-wrap">
									<div
										class="stop-swatch"
										style="background:{stop.color}"
										role="button"
										tabindex="0"
										onclick={() => stopPickerIndex = stopPickerIndex === i ? null : i}
										onkeydown={(e) => e.key === 'Enter' && (stopPickerIndex = i)}
									></div>
									{#if stopPickerIndex === i}
										<div class="stop-palette-popup">
											<div class="stop-palette-header">
												<span>Pick from palette</span>
												<button class="stop-palette-close" onclick={() => stopPickerIndex = null}>
													<IconX size={11} stroke={2} />
												</button>
											</div>
											<div class="stop-palette-swatches">
												{#each colorRows as row (row.color.id)}
													<button
														class="stop-palette-swatch"
														class:selected={stop.color === row.color.hex}
														style="background:{row.color.hex}"
														title={row.color.name}
														onclick={() => { gradientForm.stops[i].color = row.color.hex; stopPickerIndex = null; }}
													></button>
												{/each}
											</div>
											<div class="stop-custom-hex">
												<input type="color" bind:value={stop.color} />
												<input type="text" bind:value={stop.color} placeholder="#000000" />
											</div>
										</div>
									{/if}
								</div>

								<!-- Hex text -->
								<input class="stop-hex-input" type="text" bind:value={stop.color} placeholder="#000000" />

								<!-- Position -->
								<div class="stop-pos-wrap">
									<input class="stop-pos-input" type="number" bind:value={stop.position} min="0" max="100" />
									<span class="stop-pct">%</span>
								</div>

								<button class="stop-del" onclick={() => removeStop(i)} disabled={gradientForm.stops.length <= 2} title="Remove stop">
									<IconX size={12} stroke={2} />
								</button>
							</div>
						{/each}
						<button class="action-btn" onclick={addStop} style="align-self:flex-start; margin-top:4px">
							<IconPlus size={12} stroke={2} />
							Add stop
						</button>
					</div>
				</div>

				<div class="field">
					<label for="grad-palette">Group / Palette</label>
					<select id="grad-palette" bind:value={gradientForm.paletteId}>
						<option value="">— None —</option>
						{#each palettes as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
					</select>
				</div>

				{#if error}<div class="error">{error}</div>{/if}
			</div>
			<div class="modal-footer">
				<button class="action-btn" onclick={() => (showGradientModal = false)}>Cancel</button>
				<button class="action-btn action-btn-primary" onclick={saveGradient} disabled={saving}>
					{saving ? 'Saving…' : editingGradient ? 'Save changes' : 'Create gradient'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- ── Shades modal ───────────────────────────────────────────────────────── -->
{#if shadesModal}
	{@const modalShades = generateShades(shadesModal.hex)}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={closeShades}>
		<div class="modal shades-modal" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<div class="shades-modal-title">
					<div class="shades-modal-swatch" style="background:{shadesModal.hex}"></div>
					<div>
						<h2>{shadesModal.name} — Shades</h2>
						<p class="shades-modal-base">{shadesModal.hex.toUpperCase()}</p>
					</div>
				</div>
				<button class="modal-close" aria-label="Close" onclick={closeShades}>
					<IconX size={16} stroke={1.75} />
				</button>
			</div>
			<div class="shades-modal-body">
				<!-- Full-width gradient preview bar -->
				<div class="shades-gradient-bar" style="background: linear-gradient(to right, {modalShades[0].hex}, {shadesModal.hex}, {modalShades[modalShades.length-1].hex})"></div>

				<!-- Shades grid -->
				<div class="shades-grid">
					{#each modalShades as s (s.step)}
						{@const c500contrast = colorContrast(s.hex)}
						<button
							class="shade-card"
							class:flash={copied === `shade-modal-${s.step}`}
							onclick={() => copy(s.hex, `shade-modal-${s.step}`)}
							title="Copy {s.hex}"
						>
							<div class="shade-card-swatch" style="background:{s.hex}">
								{#if copied === `shade-modal-${s.step}`}
									<IconCheck class="shade-copied-icon" size={14} stroke={2} color="white" />
								{/if}
							</div>
							<div class="shade-card-info">
								<span class="shade-card-step">{s.step}</span>
								<span class="shade-card-hex">{s.hex.toUpperCase()}</span>
								<div class="shade-card-contrast">
									<span class="shade-contrast-dot" style="background:#fff; border:1px solid #e3e2df"></span>
									<span class="shade-contrast-badge badge-{c500contrast.onWhite.level.replace(' ','-').toLowerCase()}">{c500contrast.onWhite.ratioDisplay}</span>
								</div>
							</div>
						</button>
					{/each}
				</div>

				<p class="shades-hint">Kliknutím na odstín zkopíruješ HEX do schránky</p>
			</div>
		</div>
	</div>
{/if}

<style>
/* ── Layout ─────────────────────────────────────────────────────────────── */
.page { display:flex; flex-direction:column; min-height:100vh; }

/* ── Topbar ─────────────────────────────────────────────────────────────── */
.topbar {
	display:flex;
	align-items:flex-end;
	justify-content:space-between;
	padding:2rem 2rem 0;
	margin-bottom:1.25rem;
	gap:1rem;
}
.page-title { font-size:1.5rem; font-weight:650; letter-spacing:-0.025em; line-height:1.2; }
.page-sub { margin-top:3px; font-size:0.875rem; color:var(--color-muted); }
.topbar-actions { display:flex; align-items:center; gap:6px; flex-shrink:0; }

/* Action buttons */
.action-btn {
	display:inline-flex; align-items:center; gap:6px;
	height:34px; padding:0 12px;
	border-radius:8px; font-size:0.8125rem; font-weight:500;
	border:1px solid var(--color-border);
	background:var(--color-surface); color:var(--color-text);
	cursor:pointer;
	transition:background 0.1s, border-color 0.1s, box-shadow 0.1s;
}
.action-btn:hover { background:var(--color-surface-raised); box-shadow:var(--shadow-sm); }
.action-btn:disabled { opacity:0.5; pointer-events:none; }
.action-btn-primary { background:var(--brand); color:#fff; border-color:var(--brand); }
.action-btn-primary:hover { background:var(--brand-light); border-color:var(--brand-light); }

/* Export dropdown */
.export-menu { position:relative; }
.export-dropdown {
	display:flex; flex-direction:column;
	position:absolute; top:calc(100% + 6px); right:0;
	background:var(--color-surface); border:1px solid var(--color-border);
	border-radius:10px; padding:4px; z-index:50; min-width:190px;
	box-shadow:var(--shadow-lg);
}
.export-dropdown button {
	display:flex; align-items:center; gap:8px;
	padding:7px 10px; background:none; border:none; cursor:pointer;
	font-size:0.8125rem; border-radius:6px; color:var(--color-text); width:100%;
}
.export-dropdown button:hover { background:var(--color-surface-raised); }
.fmt-tag { font-family:var(--font-mono); font-size:0.7rem; background:var(--color-surface-raised); border:1px solid var(--color-border); border-radius:4px; padding:1px 5px; color:var(--color-muted); }
.export-separator { height:1px; background:var(--color-border); margin:3px 0; }

/* PMS / Pantone toggle */
.pms-toggle { font-family:var(--font-mono); font-size:0.75rem; letter-spacing:0.04em; min-width:62px; justify-content:center; }
.pms-toggle-label { font-weight:700; color:var(--brand); }

/* Copy check in vrow */
.vrow-check { color:var(--brand); flex-shrink:0; margin-left:4px; }

/* ── Palette bar ────────────────────────────────────────────────────────── */
.palette-bar { padding:0 2rem; border-bottom:1px solid var(--color-border); margin-bottom:1.5rem; }
.palette-tabs { display:flex; align-items:center; gap:2px; overflow-x:auto; }
.tab-separator { width:1px; height:18px; background:var(--color-border); margin:0 6px; flex-shrink:0; }

.ptab {
	display:flex; align-items:center; gap:6px;
	padding:8px 12px; border:none; background:none;
	color:var(--color-muted); cursor:pointer; font-size:0.8125rem; font-weight:500;
	border-bottom:2px solid transparent; margin-bottom:-1px; white-space:nowrap;
	transition:color 0.1s, border-color 0.1s;
}
.ptab:hover { color:var(--color-text); }
.ptab.active { color:var(--brand); border-bottom-color:var(--brand); }
.view-tab { font-weight:600; }
.ptab-count {
	font-size:0.6875rem; background:var(--color-surface-raised); border:1px solid var(--color-border);
	border-radius:20px; padding:0 5px; line-height:17px; color:var(--color-muted); font-weight:500;
}
.ptab.active .ptab-count { background:rgba(74,18,4,.08); border-color:rgba(74,18,4,.15); color:var(--brand); }
.ptab-group { display:flex; align-items:center; }
.ptab-action {
	display:flex; align-items:center; justify-content:center;
	width:18px; height:18px; border:none; background:none; cursor:pointer;
	color:var(--color-muted); border-radius:4px; opacity:0;
	transition:opacity 0.1s, color 0.1s, background 0.1s;
}
.ptab-group:hover .ptab-action { opacity:1; }
.ptab-action:hover { color:var(--color-text); background:var(--color-surface-raised); }
.ptab-del:hover { color:var(--color-danger) !important; }

/* ── Grid area ──────────────────────────────────────────────────────────── */
.grid-area { flex:1; padding:0 2rem 2.5rem; }

/* Empty state */
.empty-state { display:flex; flex-direction:column; align-items:center; text-align:center; gap:8px; padding:5rem 2rem; }
.empty-icon { margin-bottom:8px; }
.empty-title { font-size:0.9375rem; font-weight:600; color:var(--color-text); }
.empty-sub { font-size:0.875rem; color:var(--color-muted); max-width:280px; line-height:1.5; margin-bottom:12px; }

/* ── Color grid ─────────────────────────────────────────────────────────── */
/* ── Palette group sections (All view) ──────────────────────────────────── */
.palette-group-section { margin-bottom:2.5rem; }
.palette-group-header {
	display:flex; align-items:center; gap:10px;
	margin-bottom:1rem;
	padding-bottom:0.625rem;
	border-bottom:2px solid var(--color-border);
}
.palette-group-name {
	font-size:0.8125rem; font-weight:700; letter-spacing:0.06em;
	text-transform:uppercase; color:var(--color-text);
}
.palette-group-count {
	font-size:0.6875rem; font-weight:600; color:var(--brand);
	background:rgba(74,18,4,.07); border:1px solid rgba(74,18,4,.15);
	border-radius:20px; padding:0 8px; line-height:19px;
}
.palette-order-btns { display:flex; gap:2px; margin-left:auto; }
.palette-order-btn {
	display:flex; align-items:center; justify-content:center;
	width:24px; height:24px; border:1.5px solid var(--color-border);
	border-radius:6px; background:var(--color-surface); cursor:pointer;
	color:var(--color-muted); transition:background 0.1s, border-color 0.1s, color 0.1s;
}
.palette-order-btn:hover:not(:disabled) { background:var(--color-surface-raised); border-color:var(--color-muted); color:var(--color-text); }
.palette-order-btn:disabled { opacity:0.3; cursor:default; }

	/* ── Color grid ─────────────────────────────────────────────────────────── */
	.color-grid {
		display:grid;
		grid-template-columns:repeat(auto-fill, minmax(220px, 1fr));
		gap:1rem;
		min-width:0;
	}
	.color-card {
		border:1px solid var(--color-border); border-radius:12px; overflow:hidden;
		background:var(--color-surface);
		transition:box-shadow 0.15s, transform 0.15s, border-color 0.15s;
		position:relative;
		min-width:0;
	}
.color-card:hover { box-shadow:var(--shadow); transform:translateY(-1px); }
.color-card.drag-over {
	border-color:var(--brand);
	box-shadow:0 0 0 3px rgba(74,18,4,.12);
	transform:scale(1.01);
}

/* Drag handle — visible on hover */
.drag-handle {
	position:absolute; top:8px; left:8px;
	z-index:5;
	color:rgba(255,255,255,0.7);
	cursor:grab;
	opacity:0;
	transition:opacity 0.15s;
	line-height:0;
	filter:drop-shadow(0 1px 2px rgba(0,0,0,.4));
}
.color-card:hover .drag-handle { opacity:1; }

/* Swatch */
.swatch { height:140px; position:relative; display:flex; flex-direction:column; justify-content:space-between; padding:10px; }
.swatch-overlay { display:flex; gap:4px; justify-content:flex-end; opacity:0; transition:opacity 0.15s; }
.swatch:hover .swatch-overlay,
.gradient-swatch:hover .swatch-overlay { opacity:1; }
.swatch-btn {
	display:flex; align-items:center; justify-content:center;
	width:28px; height:28px; border-radius:7px; border:none;
	background:rgba(255,255,255,0.9); backdrop-filter:blur(4px);
	color:#111; cursor:pointer; transition:background 0.1s;
}
.swatch-btn:hover { background:#fff; }
.swatch-btn-del:hover { background:#fff; color:var(--color-danger); }
.hex-chip {
	align-self:flex-start;
	font-family:var(--font-mono); font-size:0.6875rem; font-weight:600;
	letter-spacing:0.04em; text-transform:uppercase;
	background:rgba(255,255,255,0.88); backdrop-filter:blur(4px);
	color:#111; border:none; border-radius:5px; padding:3px 8px; cursor:pointer;
	transition:background 0.1s, box-shadow 0.15s;
}
.hex-chip:hover { background:rgba(255,255,255,1); }
.hex-chip.flash { background:#fff; box-shadow:0 0 0 2px var(--brand); }

/* Color body */
	.color-body { padding:12px; min-width:0; }
.color-header-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
.color-name { font-weight:600; font-size:0.875rem; color:var(--color-text); }
.palette-chip { font-size:0.6875rem; color:var(--color-muted); background:var(--color-surface-raised); border:1px solid var(--color-border); padding:1px 6px; border-radius:20px; white-space:nowrap; }

/* Values */
.color-values { display:flex; flex-direction:column; gap:1px; margin-bottom:8px; }
	.vrow {
		display:grid; grid-template-columns:minmax(58px, max-content) minmax(0, 1fr); align-items:center; gap:8px;
		font-size:0.75rem; padding:4px 6px; border-radius:5px;
		background:none; border:none; width:100%; cursor:pointer; text-align:left;
		transition:background 0.1s; color:var(--color-text);
		min-width:0;
	}
.vrow:not(.static):hover { background:var(--color-surface-raised); }
.vrow.static { cursor:default; }
.vrow.flash { background:rgba(74,18,4,.06); }
	.vlabel { color:var(--color-muted); font-weight:600; font-size:0.6875rem; text-transform:uppercase; letter-spacing:0.05em; flex-shrink:0; min-width:58px; white-space:nowrap; }
	.vval { font-family:var(--font-mono); font-size:0.75rem; text-align:right; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

/* ── Contrast checker ───────────────────────────────────────────────────── */
.contrast-section {
	padding-top:8px;
	border-top:1px solid var(--color-border);
	margin-top:4px;
}
.contrast-label { font-size:0.6875rem; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; color:var(--color-muted); margin-bottom:5px; }
.contrast-rows { display:flex; flex-direction:column; gap:4px; }
	.contrast-row { display:grid; grid-template-columns:minmax(0, 1fr) auto auto; align-items:center; gap:6px; font-size:0.75rem; min-width:0; }
	.contrast-preview { display:flex; align-items:center; gap:5px; min-width:0; }
	.contrast-dot { width:14px; height:14px; border-radius:50%; display:inline-block; flex-shrink:0; }
	.contrast-bg-label { color:var(--color-muted); font-size:0.75rem; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.contrast-ratio { font-family:var(--font-mono); font-size:0.75rem; font-weight:600; color:var(--color-text); flex-shrink:0; }
.contrast-badge {
	font-size:0.625rem; font-weight:700; letter-spacing:0.04em;
	padding:1px 6px; border-radius:4px; text-transform:uppercase; flex-shrink:0;
}
.badge-aaa { background:#d1fae5; color:#065f46; }
.badge-aa { background:#dbeafe; color:#1e40af; }
.badge-aa-large { background:#fef9c3; color:#854d0e; }
.badge-fail { background:#fee2e2; color:#991b1b; }

/* ── Gradient grid ──────────────────────────────────────────────────────── */
.gradient-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:1rem; }
.gradient-card { border:1px solid var(--color-border); border-radius:12px; overflow:hidden; background:var(--color-surface); transition:box-shadow 0.15s, transform 0.15s; }
.gradient-card:hover { box-shadow:var(--shadow); transform:translateY(-1px); }
.gradient-swatch { height:120px; position:relative; display:flex; flex-direction:column; justify-content:space-between; padding:10px; }
.gradient-stops { display:flex; flex-wrap:wrap; gap:5px; margin-top:8px; }
.stop-chip { display:flex; align-items:center; gap:4px; background:var(--color-surface-raised); border:1px solid var(--color-border); border-radius:6px; padding:3px 7px; font-size:0.6875rem; }
.stop-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; border:1px solid rgba(0,0,0,.1); }
.stop-val { font-family:var(--font-mono); }
.stop-pos { color:var(--color-muted); }

/* ── Modal ──────────────────────────────────────────────────────────────── */
.modal-backdrop {
	position:fixed; inset:0; background:rgba(0,0,0,0.35); backdrop-filter:blur(2px);
	display:flex; align-items:center; justify-content:center; z-index:100; padding:1rem;
}
.modal {
	background:var(--color-surface); border-radius:14px;
	width:min(480px,100%); max-height:90vh; overflow-y:auto;
	box-shadow:0 24px 64px rgba(0,0,0,.18), 0 4px 16px rgba(0,0,0,.08);
	border:1px solid var(--color-border);
}
.modal-sm { width:min(340px,100%); }
.modal-lg { width:min(560px,100%); }
.modal-header { display:flex; align-items:center; justify-content:space-between; padding:1.125rem 1.5rem 0; }
.modal-header h2 { font-size:1rem; font-weight:600; letter-spacing:-0.01em; margin:0; }
.modal-close { display:flex; align-items:center; justify-content:center; width:28px; height:28px; border:none; background:none; cursor:pointer; color:var(--color-muted); border-radius:6px; transition:background 0.1s, color 0.1s; }
.modal-close:hover { background:var(--color-surface-raised); color:var(--color-text); }
.modal-body { padding:1rem 1.5rem; display:flex; flex-direction:column; gap:1rem; }
.modal-footer { padding:0.875rem 1.5rem; border-top:1px solid var(--color-border); display:flex; justify-content:flex-end; gap:6px; }
.modal-footer .action-btn { height:36px; font-size:0.875rem; }

/* Form elements */
.field { display:flex; flex-direction:column; gap:6px; }
.field-row { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.field label { font-size:0.8125rem; font-weight:500; color:var(--color-text); }
input[type="text"], input[type="number"], select {
	height:38px; padding:0 12px;
	border:1.5px solid var(--color-border); border-radius:8px;
	font-size:0.875rem; background:var(--color-surface); color:var(--color-text);
	width:100%; outline:none;
	transition:border-color 0.15s, box-shadow 0.15s;
}
input:focus, select:focus { border-color:var(--brand); box-shadow:0 0 0 3px rgba(74,18,4,.10); }
input[type="range"] { height:auto; padding:0; border:none; background:none; accent-color:var(--brand); }
input[type="range"]:focus { box-shadow:none; }

.color-input-row { display:flex; gap:8px; align-items:center; }
input[type="color"] { width:44px; height:38px; border:1.5px solid var(--color-border); border-radius:8px; padding:3px; cursor:pointer; flex-shrink:0; }
.color-input-row input[type="text"] { flex:1; font-family:var(--font-mono); }

.live-preview {
	display:flex; gap:10px; align-items:flex-start; padding:10px 12px;
	background:var(--color-surface-raised); border-radius:8px; border:1px solid var(--color-border);
}
.preview-swatch { width:40px; height:40px; border-radius:8px; flex-shrink:0; box-shadow:inset 0 0 0 1px rgba(0,0,0,.08); }
.preview-vals { display:flex; flex-direction:column; gap:2px; font-size:0.6875rem; color:var(--color-muted); font-family:var(--font-mono); flex:1; }
.preview-contrast { display:flex; flex-direction:column; gap:4px; }
.mini-contrast { display:flex; align-items:center; gap:5px; }
.mini-badge { font-size:0.6rem; font-weight:700; padding:1px 5px; border-radius:3px; text-transform:uppercase; }

/* ── Color input mode tabs ───────────────────────────────────────────────── */
.color-label-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:2px; }
.color-label-row label { margin:0; }
.mode-tabs { display:flex; gap:1px; background:var(--color-surface-raised); border:1px solid var(--color-border); border-radius:7px; padding:2px; }
.mode-tab {
	font-size:0.6875rem; font-weight:600; letter-spacing:0.04em; padding:2px 8px;
	border:none; border-radius:5px; cursor:pointer; background:none; color:var(--color-muted);
	transition:background 0.1s, color 0.1s;
}
.mode-tab.active { background:var(--color-surface); color:var(--brand); box-shadow:0 1px 3px rgba(0,0,0,.08); }

/* Channel inputs (RGB / CMYK) */
.channel-row { display:flex; gap:8px; align-items:center; }
.channel-inputs { display:flex; gap:6px; flex:1; }
.channel-label {
	display:flex; flex-direction:column; align-items:center; gap:2px;
	font-size:0.6875rem; font-weight:600; color:var(--color-muted); letter-spacing:0.04em;
	flex:1;
}
.channel-label input[type="number"] {
	text-align:center; padding:0 4px; font-family:var(--font-mono);
	font-size:0.8125rem; height:36px;
}
/* Hide spinners */
.channel-label input[type="number"]::-webkit-outer-spin-button,
.channel-label input[type="number"]::-webkit-inner-spin-button { -webkit-appearance:none; }
.channel-label input[type="number"] { -moz-appearance:textfield; }

/* ── Shades trigger (card footer) ────────────────────────────────────────── */
.shades-trigger {
	display:flex; align-items:center; gap:7px;
	width:100%; border:none; background:none; cursor:pointer;
	padding:7px 8px 6px; border-top:1px solid var(--color-border); margin-top:4px;
	transition:background 0.12s;
	border-radius:0 0 10px 10px;
}
.shades-trigger:hover { background:rgba(74,18,4,.04); }
.shades-trigger:hover .shades-trigger-label { color:var(--brand); }
	.shades-mini-strip { display:flex; gap:2px; flex:1; min-width:0; }
.shades-mini-dot { height:8px; border-radius:2px; flex:1; transition:height 0.12s; }
.shades-trigger:hover .shades-mini-dot { height:10px; }
.shades-trigger-label { font-size:0.625rem; font-weight:700; color:var(--color-muted); letter-spacing:0.06em; text-transform:uppercase; white-space:nowrap; transition:color 0.12s; }

/* ── Shades modal ────────────────────────────────────────────────────────── */
.shades-modal { width:min(640px, 100%); }
.shades-modal-title { display:flex; align-items:center; gap:12px; flex:1; min-width:0; }
.shades-modal-swatch { width:36px; height:36px; border-radius:8px; flex-shrink:0; box-shadow:inset 0 0 0 1px rgba(0,0,0,.1); }
.shades-modal-title h2 { margin:0; font-size:1rem; }
.shades-modal-base { font-family:var(--font-mono); font-size:0.75rem; color:var(--color-muted); margin:2px 0 0; }
.shades-modal-body { padding:1.25rem 1.5rem 1.5rem; display:flex; flex-direction:column; gap:1.25rem; }
.shades-gradient-bar {
	height:48px; border-radius:10px;
	border:1px solid rgba(0,0,0,.06);
}
.shades-grid {
	display:grid; grid-template-columns:repeat(5, 1fr); gap:8px;
}
.shade-card {
	border:none; background:none; cursor:pointer; padding:0; border-radius:10px;
	overflow:hidden; border:1.5px solid var(--color-border);
	transition:transform 0.12s, box-shadow 0.12s, border-color 0.12s;
	text-align:left;
}
.shade-card:hover { transform:translateY(-2px); box-shadow:var(--shadow); border-color:var(--color-muted); }
.shade-card.flash { border-color:var(--brand); box-shadow:0 0 0 3px rgba(74,18,4,.12); }
.shade-card-swatch {
	height:64px; display:flex; align-items:center; justify-content:center;
	position:relative;
}
.shade-copied-icon { filter:drop-shadow(0 1px 2px rgba(0,0,0,.4)); }
.shade-card-info {
	padding:7px 8px; background:var(--color-surface);
	display:flex; flex-direction:column; gap:3px;
}
.shade-card-step { font-size:0.625rem; font-weight:700; letter-spacing:0.04em; color:var(--color-muted); text-transform:uppercase; }
.shade-card-hex { font-family:var(--font-mono); font-size:0.6875rem; color:var(--color-text); font-weight:500; }
.shade-card-contrast { display:flex; align-items:center; gap:4px; margin-top:2px; }
.shade-contrast-dot { width:10px; height:10px; border-radius:50%; display:inline-block; flex-shrink:0; }
.shade-contrast-badge { font-size:0.5625rem; font-weight:700; letter-spacing:0.04em; padding:1px 4px; border-radius:3px; text-transform:uppercase; }
.shades-hint { font-size:0.75rem; color:var(--color-muted); text-align:center; margin:0; }

/* ── Gradient stops editor ───────────────────────────────────────────────── */
.gradient-preview-bar { height:56px; border-radius:8px; margin-bottom:4px; border:1px solid var(--color-border); }
.stops-list { display:flex; flex-direction:column; gap:8px; }
.stop-row { display:flex; align-items:center; gap:8px; }

/* Stop color swatch + popup */
.stop-color-wrap { position:relative; flex-shrink:0; }
.stop-swatch {
	width:36px; height:36px; border-radius:8px; cursor:pointer;
	border:2px solid var(--color-border); flex-shrink:0;
	transition:border-color 0.1s, transform 0.1s;
}
.stop-swatch:hover { border-color:var(--brand); transform:scale(1.05); }

.stop-palette-popup {
	position:absolute; top:calc(100% + 6px); left:0; z-index:60;
	background:var(--color-surface); border:1px solid var(--color-border);
	border-radius:10px; padding:8px; box-shadow:var(--shadow-lg);
	min-width:220px;
}
.stop-palette-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; font-size:0.75rem; font-weight:600; color:var(--color-muted); }
.stop-palette-close { border:none; background:none; cursor:pointer; color:var(--color-muted); display:flex; align-items:center; padding:2px; border-radius:4px; }
.stop-palette-close:hover { color:var(--color-text); }
.stop-palette-swatches { display:flex; flex-wrap:wrap; gap:5px; margin-bottom:8px; }
.stop-palette-swatch {
	width:26px; height:26px; border-radius:6px; border:2px solid transparent; cursor:pointer;
	transition:transform 0.1s, border-color 0.1s; box-shadow:inset 0 0 0 1px rgba(0,0,0,.08);
}
.stop-palette-swatch:hover { transform:scale(1.1); }
.stop-palette-swatch.selected { border-color:var(--brand); }
.stop-custom-hex { display:flex; gap:6px; align-items:center; border-top:1px solid var(--color-border); padding-top:8px; }
.stop-custom-hex input[type="color"] { width:36px; height:32px; flex-shrink:0; }
.stop-custom-hex input[type="text"] { flex:1; height:32px; font-size:0.8125rem; font-family:var(--font-mono); }

/* Stop fields */
.stop-hex-input { font-family:var(--font-mono); flex:1; min-width:0; }
.stop-pos-wrap { display:flex; align-items:center; gap:3px; flex-shrink:0; }
.stop-pos-input { width:60px; text-align:right; font-family:var(--font-mono); }
.stop-pct { font-size:0.8125rem; color:var(--color-muted); flex-shrink:0; }
.stop-del { display:flex; align-items:center; justify-content:center; width:28px; height:28px; border:none; background:none; cursor:pointer; color:var(--color-muted); border-radius:6px; flex-shrink:0; transition:background 0.1s, color 0.1s; }
.stop-del:hover:not(:disabled) { background:var(--color-surface-raised); color:var(--color-danger); }
.stop-del:disabled { opacity:0.3; }

.error { color:var(--color-danger); font-size:0.8125rem; padding:8px 12px; background:#fff5f5; border-radius:7px; border:1px solid #fecaca; }

/* ── Responsive ─────────────────────────────────────────────────────────── */

/* Tablet — 768px */
@media (max-width: 768px) {
	.topbar {
		padding:1.25rem 1rem 0;
		flex-wrap:wrap;
		gap:0.75rem;
	}
	.topbar-left { min-width:0; }
	.page-title { font-size:1.25rem; }

	.topbar-actions { flex-wrap:wrap; gap:4px; }
	.btn-label { display:none; }
	.action-btn { padding:0 10px; }

	.palette-bar { padding:0 1rem; }
	/* Make palette tabs scrollable without showing scrollbar */
	.palette-tabs {
		-webkit-overflow-scrolling:touch;
		scrollbar-width:none;
		padding-bottom:2px;
	}
	.palette-tabs::-webkit-scrollbar { display:none; }

	.grid-area { padding:0 1rem 2rem; }

	.color-grid { grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:0.75rem; }
	.gradient-grid { grid-template-columns:1fr 1fr; gap:0.75rem; }
	.field-row { grid-template-columns:1fr; }
}

	/* Phone — 600px and below: single column */
	@media (max-width: 600px) {
	.topbar { padding:1rem 0.875rem 0; }
	/* Keep export visible; hide low-priority actions */
	.topbar-actions .action-btn:not(.action-btn-primary):not(.export-menu .action-btn) { display:none; }
	.export-menu { display:flex; }

	.palette-bar { padding:0 0.875rem; }
	.grid-area { padding:0 0.875rem 2rem; }

		/* Single-column cards */
		.color-grid { grid-template-columns:minmax(0, 1fr); gap:0.625rem; }
		.gradient-grid { grid-template-columns:1fr; }

		.color-card { border-radius:10px; }
		.swatch { height:112px; padding:9px; }
		.color-body { padding:11px 12px 10px; }
		.color-header-row { margin-bottom:7px; }
		.color-name { font-size:0.9375rem; }
		.vrow {
			grid-template-columns:50px minmax(0, 1fr);
			min-height:30px;
			padding:4px 0;
		}
		.vlabel { min-width:0; width:auto; }
		.vval {
			overflow:visible;
			text-overflow:clip;
			white-space:normal;
			word-break:break-word;
		}
		.contrast-section { padding-top:9px; margin-top:6px; }
		.contrast-row {
			grid-template-columns:minmax(78px, 1fr) auto;
			row-gap:3px;
			align-items:center;
		}
		.contrast-badge {
			grid-column:2;
			justify-self:end;
			max-width:100%;
		}
		.shades-trigger { padding:8px 0 2px; }
		.shades-mini-dot { min-width:0; }

	/* Value rows — label left (fixed), value fills rest, copy icon at end */
	.vrow { display:grid; grid-template-columns:64px 1fr auto; align-items:center; gap:0 4px; }
	.vlabel { min-width:0; width:auto; }
	.vval { text-align:left; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

	/* Contrast rows — [dot+label flex:1] [ratio] [badge] all on one line */
	.contrast-rows { gap:5px; }
	.contrast-row { flex-wrap:nowrap; gap:6px; }
	.contrast-preview { flex:1; min-width:0; }
	.contrast-bg-label { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
	.contrast-ratio { white-space:nowrap; }
	.contrast-badge { white-space:nowrap; flex-shrink:0; }

	/* Palette group headers */
	.palette-group-section { margin-bottom:1.5rem; }

	/* Drag handle — always slightly visible on touch */
	.drag-handle { opacity:0.5; }
}
</style>
