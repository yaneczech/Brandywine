<script lang="ts">
	import { toast } from '$lib/ui/toast.svelte';
	import { ask } from '$lib/ui/dialog.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';
	import { checkContrast } from '$lib/utils/colors';
	import * as m from '$lib/paraglide/messages';
	import { focusTrap } from '$lib/actions/focus-trap';
	import { SvelteSet } from 'svelte/reactivity';
	import {
		IconPlus, IconPencil, IconTrash, IconX, IconDownload, IconUpload,
		IconTypography, IconChevronDown, IconGripVertical,
		IconSunFilled, IconMoonFilled
	} from '$lib/icons';

	const { data }: { data: PageData } = $props();

	type StyleTheme = 'universal' | 'light' | 'dark';
	type PreviewTheme = 'light' | 'dark';
	type StyleTab = PreviewTheme | 'all';
	type StyleColorToken = 'black' | 'white' | `color:${string}`;
	type ColorOption = { token: StyleColorToken; name: string; hex: string; source: 'base' | 'brand' };
	type BrandColor = { id: string; name: string; hex: string; order: number };
	type Style = { id: string; name: string; tag: string | null; size: number | null; lineHeight: number | null; tracking: number | null; weight: number | null; order: number; theme: StyleTheme; allowedColors: StyleColorToken[] | null };
	type VariableAxis = { tag: string; label: string; min: number; max: number; default: number };
	type FontFile = { id: string; originalName: string; format: string; fileSize: number; isVariable: boolean; axes: VariableAxis[] };
	type Font  = { id: string; name: string; foundry: string | null; license: string | null; sourceUrl: string | null; role: string; weights: number[]; isVariable: boolean; variableAxes: VariableAxis[]; order: number; styles: Style[]; files: FontFile[] };

	let fonts = $derived(data.fonts as Font[]);
	let brandColors = $derived((data.colors ?? []) as BrandColor[]);
	let saving = $state(false);
	let error  = $state('');

	// Expanded cards — collapsed by default
	const expandedFonts = new SvelteSet<string>();
	function toggleFont(id: string) {
		expandedFonts.has(id) ? expandedFonts.delete(id) : expandedFonts.add(id);
	}

	// ── Type tester per-font state ─────────────────────────────────────────────
	let testerWeights = $state<Record<string, number>>({});
	let testerItalic  = $state<Record<string, boolean>>({});
	function testerWeight(f: Font) {
		return testerWeights[f.id] ?? (f.isVariable ? 400 : (f.weights.includes(400) ? 400 : f.weights[0]));
	}

	// ── Glyph sets ─────────────────────────────────────────────────────────────
	function rangeChars(start: number, end: number): string {
		return Array.from({ length: end - start + 1 }, (_, i) => String.fromCodePoint(start + i)).join('');
	}
	const GLYPH_SETS = [
		{ label: 'Basic Latin',          chars: rangeChars(0x0020, 0x007E) },
		{ label: 'Latin-1 Supplement',   chars: rangeChars(0x00A0, 0x00FF) },
		{ label: 'Latin Extended-A',     chars: rangeChars(0x0100, 0x017F) },
		{ label: 'Latin Extended-B',     chars: rangeChars(0x0180, 0x024F) },
		{ label: 'Spacing Modifiers',    chars: rangeChars(0x02B0, 0x02FF) },
		{ label: 'Greek & Coptic',       chars: rangeChars(0x0370, 0x03FF) },
		{ label: 'General Punctuation',  chars: rangeChars(0x2000, 0x206F) },
		{ label: 'Currency Symbols',     chars: rangeChars(0x20A0, 0x20CF) },
		{ label: 'Letterlike Symbols',   chars: rangeChars(0x2100, 0x214F) },
		{ label: 'Math Operators',       chars: rangeChars(0x2200, 0x22FF) },
		{ label: 'Geometric Shapes',     chars: rangeChars(0x25A0, 0x25FF) },
		{ label: 'Uppercase',            chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
		{ label: 'Lowercase',            chars: 'abcdefghijklmnopqrstuvwxyz' },
		{ label: 'Digits',               chars: '0123456789' },
	];
	const COVERAGE_GROUPS = [
		{ label: 'Basic English',       sets: ['Basic Latin'] },
		{ label: 'Western Europe',      sets: ['Latin-1 Supplement'] },
		{ label: 'Central Europe',      sets: ['Latin Extended-A'] },
		{ label: 'Extended Latin',      sets: ['Latin Extended-B'] },
		{ label: 'Greek',               sets: ['Greek & Coptic'] },
		{ label: 'Punctuation',         sets: ['General Punctuation'] },
		{ label: 'Currency',            sets: ['Currency Symbols'] },
		{ label: 'Math & symbols',      sets: ['Math Operators', 'Letterlike Symbols', 'Geometric Shapes'] },
		{ label: 'Case & numbers',      sets: ['Uppercase', 'Lowercase', 'Digits'] }
	];
	let glyphSetIndex = $state<Record<string, number>>({});
	let glyphWeights = $state<Record<string, number>>({});
	let glyphItalic  = $state<Record<string, boolean>>({});
	function getGlyphSet(fontId: string) {
		return GLYPH_SETS[glyphSetIndex[fontId] ?? 0];
	}
	function glyphWeight(f: Font) {
		return glyphWeights[f.id] ?? (f.isVariable ? 400 : (f.weights.includes(400) ? 400 : f.weights[0]));
	}

	// ── Glyph modal ────────────────────────────────────────────────────────────
	let glyphModal = $state<{ char: string; fontName: string; fontFamily: string; weight: number; italic: boolean } | null>(null);
	function openGlyphModal(char: string, f: Font) {
		glyphModal = {
			char,
			fontName: f.name,
			fontFamily: `'${f.name}', sans-serif`,
			weight: glyphWeight(f),
			italic: glyphItalic[f.id] ?? false
		};
	}
	function charCodeStr(char: string) {
		return 'U+' + char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0');
	}

	// ── Confirm ───────────────────────────────────────────────────────────────
	async function showConfirm(title: string, message: string, onConfirm: () => void) {
		if (await ask({ title, description: message, confirmLabel: m.users_btn_delete() })) onConfirm();
	}

	// ── Modals ─────────────────────────────────────────────────────────────────
	let showFontModal   = $state(false);
	let editingFont     = $state<Font | null>(null);
	let fontForm        = $state({ name: '', foundry: '', license: '', sourceUrl: '', role: 'body', weights: [400] as number[], isVariable: false, variableAxes: [] as VariableAxis[] });

	// ── Variable axes modal ────────────────────────────────────────────────────
	let showAxesModal   = $state(false);
	let axesFontId      = $state('');
	let editingAxes     = $state<VariableAxis[]>([]);

	// ── File upload ────────────────────────────────────────────────────────────
	let uploadingFontId = $state<string | null>(null);

	let showStyleModal  = $state(false);
	let editingStyle    = $state<Style | null>(null);
	let styleFontId     = $state('');
	let styleForm       = $state({ name: '', tag: '', size: 16, lineHeight: 1.5, tracking: 0, weight: 400, theme: 'universal' as StyleTheme, allowedColors: ['black', 'white'] as StyleColorToken[] });

	// ── Style theme tabs ───────────────────────────────────────────────────────
	let styleTab = $state<Record<string, StyleTab>>({});
	let stylePreviewMode = $state<Record<string, PreviewTheme>>({});
	function getStyleTab(fontId: string): StyleTab { return styleTab[fontId] ?? 'all'; }
	function setStyleTab(fontId: string, tab: StyleTab) {
		styleTab[fontId] = tab;
		if (tab === 'light' || tab === 'dark') stylePreviewMode[fontId] = tab;
	}
	function getStylePreviewMode(fontId: string): PreviewTheme {
		return stylePreviewMode[fontId] ?? (getStyleTab(fontId) === 'dark' ? 'dark' : 'light');
	}
	function setStylePreviewMode(fontId: string, mode: PreviewTheme) { stylePreviewMode[fontId] = mode; }
	function stylesForScope(styles: Style[], scope: PreviewTheme): Style[] {
		return styles.filter(s => s.theme === 'universal' || s.theme === scope);
	}
	function stylesForTab(styles: Style[], tab: StyleTab): Style[] {
		return tab === 'all' ? styles : stylesForScope(styles, tab);
	}
	function visibleStylesList(fontId: string, styles: Style[]): Style[] {
		const list = stylesForTab(styles, getStyleTab(fontId));
		return [...list].sort((a, b) => a.order - b.order);
	}
	function previewStylesList(fontId: string, styles: Style[]): Style[] {
		const list = stylesForScope(styles, getStylePreviewMode(fontId));
		return [...list].sort((a, b) => a.order - b.order);
	}
	function styleCountForTab(styles: Style[], tab: StyleTab): number { return stylesForTab(styles, tab).length; }
	function styleThemeLabel(theme: StyleTheme): string {
		if (theme === 'universal') return m.typo_theme_both();
		return theme === 'light' ? m.typo_theme_light() : m.typo_theme_dark();
	}
	function colorOptions(): ColorOption[] {
		return [
			{ token: 'black', name: 'Black', hex: '#000000', source: 'base' },
			{ token: 'white', name: 'White', hex: '#FFFFFF', source: 'base' },
			...brandColors.map(c => ({ token: `color:${c.id}` as StyleColorToken, name: c.name, hex: c.hex, source: 'brand' as const }))
		];
	}
	function colorOption(token: StyleColorToken): ColorOption | null {
		return colorOptions().find(c => c.token === token) ?? null;
	}
	function colorHex(token: StyleColorToken | null | undefined, fallback = 'currentColor') {
		return token ? (colorOption(token)?.hex ?? fallback) : fallback;
	}
	function allowedColorsForStyle(s: Style): StyleColorToken[] {
		return Array.isArray(s.allowedColors) ? s.allowedColors : [];
	}
	function stylePreviewColor(s: Style) {
		return colorHex(allowedColorsForStyle(s)[0], 'inherit');
	}
	function toggleAllowedColor(token: StyleColorToken) {
		const set = new SvelteSet(styleForm.allowedColors);
		set.has(token) ? set.delete(token) : set.add(token);
		styleForm.allowedColors = [...set];
	}

	// ── Type tester ────────────────────────────────────────────────────────────
	let testerText      = $state('The quick brown fox jumps over the lazy dog');
	let testerSize      = $state(32);
	let testerDark      = $state<Record<string, boolean>>({});
	let testerFeatures  = $state<Record<string, SvelteSet<string>>>({});

	const OT_FEATURES = [
		{ tag: 'liga',  label: 'Ligatures' },
		{ tag: 'dlig',  label: 'Discretionary Lig.' },
		{ tag: 'calt',  label: 'Contextual Alt.' },
		{ tag: 'kern',  label: 'Kerning' },
		{ tag: 'onum',  label: 'Old-style Nums' },
		{ tag: 'tnum',  label: 'Tabular Nums' },
		{ tag: 'smcp',  label: 'Small Caps' },
		{ tag: 'frac',  label: 'Fractions' },
		{ tag: 'ss01',  label: 'Stylistic Set 1' },
		{ tag: 'ss02',  label: 'Stylistic Set 2' },
		{ tag: 'zero',  label: 'Slashed Zero' },
	];
	function previewGlyphCount(): number {
		return new SvelteSet(GLYPH_SETS.flatMap(set => set.chars.split(''))).size;
	}
	function coverageTooltip(group: (typeof COVERAGE_GROUPS)[number]): string {
		const count = group.sets.reduce((sum, label) => sum + (GLYPH_SETS.find(set => set.label === label)?.chars.length ?? 0), 0);
		return `${group.sets.join(', ')} · ${count} preview glyphs`;
	}
	function toggleOTFeature(fontId: string, tag: string) {
		const current = new SvelteSet(testerFeatures[fontId] ?? []);
		current.has(tag) ? current.delete(tag) : current.add(tag);
		testerFeatures[fontId] = current;
	}
	function fontFeatureSettings(fontId: string) {
		const active = testerFeatures[fontId];
		if (!active?.size) return 'normal';
		return [...active].map(tag => `"${tag}" 1`).join(', ');
	}

	// ── Helpers ────────────────────────────────────────────────────────────────
	async function api(method: string, path: string, body?: unknown) {
		const res = await fetch(path, {
			method,
			headers: body ? { 'Content-Type': 'application/json' } : {},
			body: body ? JSON.stringify(body) : undefined
		});
		if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? `${method} ${path} failed`);
		return res.json();
	}

	async function refresh() {
		await invalidateAll();
		fonts = data.fonts as Font[];
		brandColors = (data.colors ?? []) as BrandColor[];
	}

	// ── Font CRUD ──────────────────────────────────────────────────────────────
	function openAddFont() {
		editingFont = null;
		fontForm = { name: '', foundry: '', license: '', sourceUrl: '', role: 'body', weights: [400], isVariable: false, variableAxes: [] };
		error = '';
		showFontModal = true;
	}
	function openEditFont(f: Font) {
		editingFont = f;
		fontForm = { name: f.name, foundry: f.foundry ?? '', license: f.license ?? '', sourceUrl: f.sourceUrl ?? '', role: f.role, weights: [...f.weights], isVariable: f.isVariable, variableAxes: [...(f.variableAxes ?? [])] };
		error = '';
		showFontModal = true;
	}
	async function saveFont() {
		saving = true; error = '';
		try {
			const body = { ...fontForm, foundry: fontForm.foundry || null, license: fontForm.license || null, sourceUrl: fontForm.sourceUrl || null, variableAxes: fontForm.isVariable ? fontForm.variableAxes : [] };
			if (editingFont) {
				await api('PATCH', `/api/typography/fonts/${editingFont.id}`, body);
			} else {
				await api('POST', '/api/typography/fonts', body);
			}
			showFontModal = false;
			await refresh();
		} catch (e) { error = e instanceof Error ? e.message : 'Error'; }
		finally { saving = false; }
	}
	async function deleteFont(f: Font) {
		showConfirm(
			m.typo_delete_font_title(),
			m.typo_delete_font_msg({ name: f.name }),
			async () => { await api('DELETE', `/api/typography/fonts/${f.id}`); await refresh(); }
		);
	}

	// ── Style CRUD ─────────────────────────────────────────────────────────────
	const DEFAULT_STYLES = [
		{ name: 'Display', tag: 'h1', size: 56, lineHeight: 1.1, tracking: -0.02, weight: 700 },
		{ name: 'H1',      tag: 'h1', size: 40, lineHeight: 1.2, tracking: -0.02, weight: 700 },
		{ name: 'H2',      tag: 'h2', size: 32, lineHeight: 1.25, tracking: -0.01, weight: 600 },
		{ name: 'H3',      tag: 'h3', size: 24, lineHeight: 1.3,  tracking: -0.01, weight: 600 },
		{ name: 'H4',      tag: 'h4', size: 20, lineHeight: 1.35, tracking: 0,     weight: 600 },
		{ name: 'H5',      tag: 'h5', size: 16, lineHeight: 1.4,  tracking: 0,     weight: 600 },
		{ name: 'Body',    tag: 'p',  size: 16, lineHeight: 1.6,  tracking: 0,     weight: 400 },
		{ name: 'Small',   tag: 'p',  size: 14, lineHeight: 1.5,  tracking: 0.01,  weight: 400 },
		{ name: 'Caption', tag: 'span', size: 12, lineHeight: 1.4, tracking: 0.02, weight: 400 },
	];
	async function addDefaultStyles(fontId: string) {
		saving = true;
		try {
			for (const s of DEFAULT_STYLES) {
				await api('POST', `/api/typography/fonts/${fontId}/styles`, s);
			}
			await refresh();
		} finally { saving = false; }
	}
	function openAddStyle(fontId: string, theme?: StyleTheme) {
		styleFontId = fontId;
		editingStyle = null;
		styleForm = { name: '', tag: '', size: 16, lineHeight: 1.5, tracking: 0, weight: 400, theme: theme ?? 'universal', allowedColors: ['black', 'white'] };
		error = '';
		showStyleModal = true;
	}
	function openEditStyle(fontId: string, s: Style) {
		styleFontId = fontId;
		editingStyle = s;
		styleForm = { name: s.name, tag: s.tag ?? '', size: s.size ?? 16, lineHeight: s.lineHeight ?? 1.5, tracking: s.tracking ?? 0, weight: s.weight ?? 400, theme: s.theme ?? 'universal', allowedColors: allowedColorsForStyle(s) };
		error = '';
		showStyleModal = true;
	}
	async function saveStyle() {
		saving = true; error = '';
		try {
			const body = { ...styleForm, tag: styleForm.tag || null };
			if (editingStyle) {
				await api('PATCH', `/api/typography/fonts/${styleFontId}/styles/${editingStyle.id}`, body);
			} else {
				await api('POST', `/api/typography/fonts/${styleFontId}/styles`, body);
			}
			showStyleModal = false;
			await refresh();
		} catch (e) { error = e instanceof Error ? e.message : 'Error'; }
		finally { saving = false; }
	}
	async function deleteStyle(fontId: string, s: Style) {
		showConfirm(
			m.typo_delete_style_title(),
			m.users_confirm_delete_msg({ name: s.name }),
			async () => { await api('DELETE', `/api/typography/fonts/${fontId}/styles/${s.id}`); await refresh(); }
		);
	}

	// ── Style drag-and-drop reorder ────────────────────────────────────────────
	let dragStyleId   = $state<string | null>(null);
	let dragOverStyleId = $state<string | null>(null);

	function onStyleDragStart(e: DragEvent, styleId: string) {
		dragStyleId = styleId;
		if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', styleId); }
	}
	function onStyleDragOver(e: DragEvent, styleId: string) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		dragOverStyleId = styleId;
	}
	function onStyleDragLeave() { dragOverStyleId = null; }
	async function onStyleDrop(e: DragEvent, fontId: string, styles: Style[], toId: string) {
		e.preventDefault();
		const fromId = dragStyleId;
		dragStyleId = null; dragOverStyleId = null;
		if (!fromId || fromId === toId) return;
		const sorted = [...styles].sort((a, b) => a.order - b.order);
		const fromIdx = sorted.findIndex(s => s.id === fromId);
		const toIdx   = sorted.findIndex(s => s.id === toId);
		if (fromIdx === -1 || toIdx === -1) return;
		const reordered = [...sorted];
		const [moved] = reordered.splice(fromIdx, 1);
		reordered.splice(toIdx, 0, moved);
		// Optimistic update — show new order immediately
		fonts = fonts.map(font => font.id !== fontId ? font : {
			...font,
			styles: reordered.map((s, i) => ({ ...s, order: i }))
		});
		// Persist to server, then refresh to confirm
		await Promise.all(reordered.map((s, i) =>
			api('PATCH', `/api/typography/fonts/${fontId}/styles/${s.id}`, { order: i })
		)).catch(() => {});
		await refresh();
	}

	// ── Role grouping ────────────────────────────────────────────────────────────
	const ROLES = ['display', 'body', 'mono', 'accent'] as const;
	let activeRole = $state<string | null>(null);
	const groupedFonts = $derived(
		ROLES
			.map(role => ({ role, label: ROLE_LABELS[role] ?? role, fonts: fonts.filter(f => f.role === role) }))
			.filter(g => g.fonts.length > 0)
	);
	const visibleGroups = $derived(
		activeRole ? groupedFonts.filter(g => g.role === activeRole) : groupedFonts
	);

	// ── Font file upload / delete ──────────────────────────────────────────────
	async function uploadFontFile(fontId: string, fileInput: HTMLInputElement) {
		const file = fileInput.files?.[0];
		if (!file) return;
		uploadingFontId = fontId;
		try {
			const fd = new FormData();
			fd.append('file', file);
			const res = await fetch(`/api/typography/fonts/${fontId}/files`, { method: 'POST', body: fd });
			if (!res.ok) {
				const msg = (await res.json().catch(() => ({}))).message ?? m.typo_upload_failed();
				toast.error(msg);
			} else {
				await refresh();
			}
		} finally {
			uploadingFontId = null;
			fileInput.value = '';
		}
	}
	async function deleteFontFile(fontId: string, fileId: string, name: string) {
		showConfirm(
			'Delete file',
			`Delete font file "${name}"?`,
			async () => { await api('DELETE', `/api/typography/fonts/${fontId}/files/${fileId}`); await refresh(); }
		);
	}
	function downloadUrl(fontId: string, fileId: string) {
		return `/api/typography/fonts/${fontId}/files/${fileId}?dl=1`;
	}

	// ── Variable axes modal ────────────────────────────────────────────────────
	const COMMON_AXES: VariableAxis[] = [
		{ tag: 'wght', label: 'Weight',       min: 100, max: 900, default: 400 },
		{ tag: 'wdth', label: 'Width',         min: 75,  max: 125, default: 100 },
		{ tag: 'ital', label: 'Italic',        min: 0,   max: 1,   default: 0 },
		{ tag: 'slnt', label: 'Slant',         min: -15, max: 0,   default: 0 },
		{ tag: 'opsz', label: 'Optical Size',  min: 6,   max: 144, default: 14 },
	];
	function openAxesModal(f: Font) {
		axesFontId = f.id;
		editingAxes = f.variableAxes?.length ? [...f.variableAxes.map(a => ({...a}))] : [{ tag: 'wght', label: 'Weight', min: 100, max: 900, default: 400 }];
		showAxesModal = true;
	}
	function addAxis() {
		editingAxes = [...editingAxes, { tag: '', label: '', min: 0, max: 100, default: 50 }];
	}
	function removeAxis(i: number) {
		editingAxes = editingAxes.filter((_, idx) => idx !== i);
	}
	function applyCommonAxis(i: number, tag: string) {
		const preset = COMMON_AXES.find(a => a.tag === tag);
		if (preset) {
			editingAxes[i] = { ...preset };
			editingAxes = [...editingAxes];
		}
	}
	async function saveAxes() {
		saving = true;
		try {
			await api('PATCH', `/api/typography/fonts/${axesFontId}`, { isVariable: true, variableAxes: editingAxes });
			showAxesModal = false;
			await refresh();
		} finally { saving = false; }
	}
	function formatBytes(n: number) {
		if (n < 1024) return `${n} B`;
		if (n < 1024 * 1024) return `${(n/1024).toFixed(0)} KB`;
		return `${(n/1024/1024).toFixed(1)} MB`;
	}

	// ── Weight toggle ──────────────────────────────────────────────────────────
	const ALL_WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];
	function toggleWeight(w: number) {
		const current = fontForm.weights;
		fontForm.weights = current.includes(w) ? current.filter(x => x !== w) : [...current, w].sort((a,b) => a-b);
	}

	// ── Role label ─────────────────────────────────────────────────────────────
	const ROLE_LABELS: Record<string, string> = { display: 'Display', body: 'Body', mono: 'Mono', accent: 'Accent' };
	const ROLE_COLORS: Record<string, string> = { display: '#141414', body: '#4f6470', mono: '#8a6f55', accent: '#9a5b4b' };

	// ── Google Fonts helper ────────────────────────────────────────────────────
	function googleFontsUrl(name: string, weights: number[]) {
		const family = name.replace(/ /g, '+');
		const wgts = weights.join(';');
		return `https://fonts.googleapis.com/css2?family=${family}:wght@${wgts}&display=swap`;
	}

	// Inject font <link> tags dynamically (svelte:head can only appear once)
	$effect(() => {
		const urls = fonts.map(f => f.sourceUrl).filter(Boolean) as string[];
		for (const url of urls) {
			if (!document.querySelector(`link[href="${url}"]`)) {
				const link = document.createElement('link');
				link.rel = 'stylesheet';
				link.href = url;
				document.head.appendChild(link);
			}
		}
	});
</script>



<svelte:head><title>Typography · Brandywine</title></svelte:head>

<div class="page">
	<!-- ── Topbar ──────────────────────────────────────────────────────────── -->
	<div class="topbar">
		<div class="topbar-left">
			<h1 class="page-title">{m.admin_typography()}</h1>
			<p class="page-sub">{fonts.length} {fonts.length === 1 ? m.typo_stat_one() : m.typo_stat_many()}</p>
		</div>
		<div class="topbar-actions">
			<button class="action-btn action-btn-primary" onclick={openAddFont}>
				<IconPlus size={13} stroke={2} />
				{m.typo_add_font()}
			</button>
		</div>
	</div>

	{#if fonts.length === 0}
		<!-- ── Empty state ─────────────────────────────────────────────────── -->
		<div class="empty-state">
			<div class="empty-icon">
				<IconTypography size={48} stroke={1} color="var(--color-border)" />
			</div>
			<p class="empty-title">{m.typo_no_fonts()}</p>
			<p class="empty-sub">{m.typo_no_fonts_sub()}</p>
			<button class="action-btn action-btn-primary" onclick={openAddFont}>{m.typo_add_first_font()}</button>
		</div>
	{:else}
		<!-- ── Role filter tabs ────────────────────────────────────────────── -->
		<div class="role-tab-bar">
			<button class="ptab" class:active={activeRole === null} onclick={() => activeRole = null}>
				{m.users_filter_all()} <span class="ptab-count">{fonts.length}</span>
			</button>
		{#each groupedFonts as g (g.role)}
				<button class="ptab" class:active={activeRole === g.role} onclick={() => activeRole = g.role}>
					{g.label} <span class="ptab-count">{g.fonts.length}</span>
				</button>
			{/each}
		</div>

		<!-- ── Font cards (grouped by role) ────────────────────────────────── -->
		<div class="fonts-list">
			{#each visibleGroups as group (group.role)}
			<div class="font-role-section">
				<div class="palette-group-header">
					<span class="palette-group-name">{group.label}</span>
					<span class="palette-group-count">{group.fonts.length}</span>
				</div>
			{#each group.fonts as f (f.id)}
				{@const expanded = expandedFonts.has(f.id)}
				<div class="font-card" class:collapsed={!expanded}>

					<!-- ── Card header (always visible) ─────────────────────── -->
					<div class="font-card-header" class:header-expanded={expanded}>
						<!-- Top row: static (name + actions only) -->
						<div class="font-card-toprow">
							<div class="font-header-left">
								<div class="font-header-names">
									<h2 class="font-name" style="font-family:'{f.name}',sans-serif">{f.name}</h2>
									{#if f.foundry || f.license}
										<span class="font-meta">{[f.foundry, f.license].filter(Boolean).join(' · ')}</span>
									{/if}
								</div>
							</div>
							<div class="font-header-actions">
								{#if f.isVariable}
									<span class="variable-badge">{m.typo_variable()}</span>
								{/if}
								{#if f.styles.length}
									<span class="styles-count">{f.styles.length} {m.typo_sec_styles().toLowerCase()}</span>
								{/if}
								{#if f.files?.length}
									<span class="files-count">{f.files.length} {m.typo_sec_files().toLowerCase()}</span>
								{/if}
								<button class="icon-btn" onclick={() => openEditFont(f)} title={m.typo_edit_tooltip()}>
									<IconPencil size={14} stroke={1.75} />
								</button>
								<button class="icon-btn icon-btn-danger" onclick={() => deleteFont(f)} title={m.typo_delete_tooltip()}>
									<IconTrash size={14} stroke={1.75} />
								</button>
							</div>
						</div>

						<!-- Specimen: always visible -->
						<div class="font-specimen" style="font-family:'{f.name}', sans-serif">
							<div class="specimen-left">
								<div class="specimen-aa" style="font-weight:{f.isVariable ? 700 : (f.weights.includes(700) ? 700 : f.weights[f.weights.length - 1])}">Aa</div>
								{#if f.isVariable}
									<button class="specimen-variable-badge" onclick={(e) => { e.stopPropagation(); openAxesModal(f); }} title="Edit variable axes">
										Variable
									</button>
								{/if}
							</div>
							<div class="specimen-right">
								<div class="specimen-abc" style="font-weight:{f.isVariable ? 400 : (f.weights.includes(400) ? 400 : f.weights[0])}">
									AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz
								</div>
								<div class="weight-strips">
									{#if f.isVariable}
										{@const wAxis = f.variableAxes?.find(a => a.tag === 'wght')}
										{@const pts = wAxis ? [wAxis.min, Math.round((wAxis.min + wAxis.max) / 2), wAxis.max].filter((v, i, a) => a.indexOf(v) === i) : [400]}
										{#each pts as w (w)}
											<div class="weight-strip">
												<span class="weight-strip-num">{w}</span>
												<span class="weight-strip-text" style="font-weight:{w}">The quick brown fox jumps over the lazy dog</span>
											</div>
										{/each}
									{:else}
										{#each f.weights as w (w)}
											<div class="weight-strip">
												<span class="weight-strip-num">{w}</span>
												<span class="weight-strip-text" style="font-weight:{w}">The quick brown fox jumps over the lazy dog</span>
											</div>
										{/each}
									{/if}
								</div>
							</div>
						</div>

						<!-- Expand bar — "roleta" -->
						<div class="font-expand-bar" role="button" tabindex="0"
							onclick={() => toggleFont(f.id)}
							onkeydown={(e) => e.key === 'Enter' && toggleFont(f.id)}
							title={expanded ? m.typo_collapse() : m.typo_expand()}
						>
							<span class="expand-chevron" class:open={expanded}>
								<IconChevronDown size={13} stroke={2} />
							</span>
						</div>
					</div>

					{#if expanded}
						<!-- ── Font info ─────────────────────────────────────── -->
						<details class="card-section">
							<summary class="section-summary">
								<span class="section-title">{m.typo_sec_info()}</span>
								<span class="section-chevron"><IconChevronDown size={11} stroke={2} /></span>
							</summary>
							<div class="section-body">
								<div class="font-info-grid">
									<div class="fi-row">
										<span class="fi-label">{m.typo_fi_family()}</span>
										<span class="fi-value">{f.name}</span>
									</div>
									{#if f.foundry}
										<div class="fi-row">
											<span class="fi-label">{m.typo_fi_producer()}</span>
											<span class="fi-value">{f.foundry}</span>
										</div>
									{/if}
									{#if f.license}
										<div class="fi-row">
											<span class="fi-label">{m.typo_fi_license()}</span>
											<span class="fi-value">{f.license}</span>
										</div>
									{/if}
									{#if f.role}
										<div class="fi-row">
											<span class="fi-label">{m.typo_fi_role()}</span>
											<span class="fi-value" style="color:{ROLE_COLORS[f.role] ?? '#888'}">{ROLE_LABELS[f.role] ?? f.role}</span>
										</div>
									{/if}
									{#if f.isVariable}
										<div class="fi-row">
											<span class="fi-label">{m.typo_fi_variable_type()}</span>
											<span class="fi-value">{m.typo_variable()}</span>
										</div>
										{#if f.variableAxes?.length}
											<div class="fi-row fi-row-tags">
												<span class="fi-label">{m.typo_fi_axes()}</span>
												<div class="fi-tags">
						{#each f.variableAxes as ax (ax.tag)}
														<span class="fi-tag" title="{ax.label} {ax.min}–{ax.max}">{ax.tag}</span>
													{/each}
												</div>
											</div>
										{/if}
									{:else if f.weights?.length}
										<div class="fi-row fi-row-tags">
											<span class="fi-label">{m.typo_fi_weights()}</span>
											<div class="fi-tags">
					{#each f.weights as w (w)}
													<span class="fi-tag" style="font-weight:{w}">{w}</span>
												{/each}
											</div>
										</div>
									{/if}
									{#if f.sourceUrl}
										<div class="fi-row">
											<span class="fi-label">{m.typo_fi_source()}</span>
											<a class="fi-link" href={f.sourceUrl} target="_blank" rel="noopener">{f.sourceUrl}</a>
										</div>
									{/if}
									<div class="fi-row fi-row-tags">
										<span class="fi-label">{m.typo_fi_ot()}</span>
										<div class="fi-tags">
				{#each OT_FEATURES as feat (feat.tag)}
												<span class="fi-tag" title={feat.label}>{feat.tag}</span>
											{/each}
										</div>
									</div>
									<div class="fi-row">
										<span class="fi-label">{m.typo_fi_glyphs()}</span>
										<span class="fi-value">{previewGlyphCount()} preview characters across {COVERAGE_GROUPS.length} coverage groups</span>
									</div>
									<div class="fi-row fi-row-tags">
										<span class="fi-label">{m.typo_fi_coverage()}</span>
										<div class="fi-tags">
				{#each COVERAGE_GROUPS as group (group.label)}
												<span class="fi-tag" title={coverageTooltip(group)}>{group.label}</span>
											{/each}
										</div>
									</div>
									{#if f.files?.length}
										<div class="fi-row">
											<span class="fi-label">{m.typo_fi_files_label()}</span>
											<span class="fi-value">{f.files.length} uploaded ({f.files.map(ff => ff.format.toUpperCase()).join(', ')})</span>
										</div>
									{/if}
								</div>
							</div>
						</details>

						<!-- ── Font files ─────────────────────────────────────── -->
						<details class="card-section">
							<summary class="section-summary">
								<span class="section-title">{m.typo_sec_files()}</span>
								<span class="section-count">{f.files?.length ?? 0}</span>
								<span class="section-chevron"><IconChevronDown size={11} stroke={2} /></span>
								<button type="button" class="action-btn files-upload-btn" class:uploading={uploadingFontId === f.id}
									onclick={(e) => { e.stopPropagation(); (e.currentTarget.nextElementSibling as HTMLInputElement)?.click(); }}
									disabled={uploadingFontId !== null}>
									{#if uploadingFontId === f.id}
										{m.typo_uploading()}
									{:else}
										<IconUpload size={12} stroke={2} />
										{m.typo_upload()}
									{/if}
								</button>
								<input type="file" accept=".woff2,.woff,.ttf,.otf,.eot" style="display:none"
									onchange={(e) => uploadFontFile(f.id, e.currentTarget as HTMLInputElement)}
									disabled={uploadingFontId !== null} />
							</summary>
							<div class="section-body">
								{#if f.files?.length}
									<div class="files-list">
										{#each f.files as ff (ff.id)}
											<div class="file-row">
												<span class="file-format">{ff.format.toUpperCase()}</span>
												<span class="file-name">{ff.originalName}</span>
												<span class="file-size">{formatBytes(ff.fileSize)}</span>
												{#if ff.isVariable}<span class="variable-badge variable-badge-sm">Variable</span>{/if}
												<div class="file-actions">
													<a class="icon-btn" href={downloadUrl(f.id, ff.id)} download={ff.originalName} title="Download">
														<IconDownload size={13} stroke={1.75} />
													</a>
													<button class="icon-btn icon-btn-danger" onclick={() => deleteFontFile(f.id, ff.id, ff.originalName)}>
														<IconX size={13} stroke={2} />
													</button>
												</div>
											</div>
										{/each}
									</div>
								{:else}
									<p class="files-empty">{m.typo_no_files()}</p>
								{/if}
							</div>
						</details>

						<!-- ── Type styles ────────────────────────────────────── -->
						<details class="card-section">
							<summary class="section-summary">
								<span class="section-title">{m.typo_sec_styles()}</span>
								<span class="section-count">{f.styles.length}</span>
								<span class="section-chevron"><IconChevronDown size={11} stroke={2} /></span>
								<div class="section-actions">
									{#if f.styles.length === 0}
										<button type="button" class="text-btn" onclick={(e) => { e.stopPropagation(); addDefaultStyles(f.id); }} disabled={saving}>{m.typo_add_defaults_btn()}</button>
									{/if}
									<button type="button" class="text-btn" onclick={(e) => {
										e.stopPropagation();
										const tab = getStyleTab(f.id);
										openAddStyle(f.id, tab === 'all' ? 'universal' : tab);
									}}>{m.typo_add_btn()}</button>
								</div>
							</summary>
							<div class="section-body section-body-no-pt">
								<!-- Theme tabs -->
									<div class="theme-tabs">
										<button class="theme-tab" class:active={getStyleTab(f.id) === 'all'} onclick={() => setStyleTab(f.id, 'all')}>
											{m.users_filter_all()} <span class="theme-tab-count">{f.styles.length}</span>
										</button>
										<button class="theme-tab theme-tab-light" class:active={getStyleTab(f.id) === 'light'} onclick={() => setStyleTab(f.id, 'light')}>
											<IconSunFilled size={14} />&nbsp;{m.typo_theme_light()} <span class="theme-tab-count">{styleCountForTab(f.styles, 'light')}</span>
										</button>
										<button class="theme-tab theme-tab-dark" class:active={getStyleTab(f.id) === 'dark'} onclick={() => setStyleTab(f.id, 'dark')}>
											<IconMoonFilled size={14} />&nbsp;{m.typo_theme_dark()} <span class="theme-tab-count">{styleCountForTab(f.styles, 'dark')}</span>
										</button>
									</div>

								{#if visibleStylesList(f.id, f.styles).length > 0}
									<div class="scale-table">
										<div class="scale-row scale-row-header">
											<span></span><span>{m.typo_col_name()}</span><span>{m.typo_col_size()}</span><span>{m.typo_col_weight()}</span><span>{m.typo_col_lh()}</span><span>{m.typo_col_tracking()}</span><span>{m.typo_col_colors()}</span><span></span>
										</div>
										{#each visibleStylesList(f.id, f.styles) as s (s.id)}
											<!-- svelte-ignore a11y_no_static_element_interactions -->
											<div class="scale-row"
												class:drag-over={dragOverStyleId === s.id}
												class:dragging={dragStyleId === s.id}
												draggable="true"
												data-meta="{s.size ?? '–'}px · {s.weight ?? '–'} · lh {s.lineHeight ?? '–'} · ls {s.tracking != null ? s.tracking + 'em' : '–'}"
												ondragstart={(e) => onStyleDragStart(e, s.id)}
												ondragover={(e) => onStyleDragOver(e, s.id)}
												ondragleave={onStyleDragLeave}
												ondrop={(e) => onStyleDrop(e, f.id, visibleStylesList(f.id, f.styles), s.id)}
												ondragend={() => { dragStyleId = null; dragOverStyleId = null; }}
											>
												<span class="drag-handle" title={m.typo_drag_reorder()}>
													<IconGripVertical size={13} stroke={1.5} />
												</span>
													<span class="scale-preview" style="font-family:'{f.name}',sans-serif; font-size:{Math.min(s.size ?? 16, 28)}px; font-weight:{s.weight ?? 400}; line-height:{s.lineHeight ?? 1.5}; letter-spacing:{s.tracking ?? 0}em">
														{s.name}
														{#if s.tag}<span class="scale-tag">{s.tag}</span>{/if}
														<span class="theme-badge theme-badge-{s.theme}">{styleThemeLabel(s.theme)}</span>
													</span>
												<span class="scale-val">{s.size ?? '–'}px</span>
												<span class="scale-val">{s.weight ?? '–'}</span>
												<span class="scale-val">{s.lineHeight ?? '–'}</span>
												<span class="scale-val">{s.tracking != null ? `${s.tracking}em` : '–'}</span>
												<span class="style-color-dots">
													{#if allowedColorsForStyle(s).length > 0}
					{#each allowedColorsForStyle(s).slice(0, 4) as token (token)}
															{@const option = colorOption(token)}
															{#if option}
																<span class="style-color-dot" title={option.name} style="background:{option.hex}"></span>
															{/if}
														{/each}
														{#if allowedColorsForStyle(s).length > 4}
															<span class="style-color-more">+{allowedColorsForStyle(s).length - 4}</span>
														{/if}
													{:else}
														<span class="scale-muted">{m.typo_color_any()}</span>
													{/if}
												</span>
												<span class="scale-btns">
													<button class="icon-btn-xs" onclick={() => openEditStyle(f.id, s)} title={m.typo_edit_tooltip()}><IconPencil size={11} stroke={1.75} /></button>
													<button class="icon-btn-xs icon-btn-xs-danger" onclick={() => deleteStyle(f.id, s)} title={m.typo_delete_tooltip()}><IconX size={11} stroke={2} /></button>
												</span>
											</div>
										{/each}
									</div>
										{@const previewTheme = getStylePreviewMode(f.id)}
										<div class="style-preview-toolbar">
											<span class="style-preview-title">{m.typo_preview()}</span>
											<div class="preview-theme-toggle" aria-label={m.typo_preview()}>
												<button
													type="button"
													class="preview-theme-btn"
													class:active={previewTheme === 'light'}
													onclick={() => setStylePreviewMode(f.id, 'light')}
													title={m.typo_preview_light()}
												>
													<IconSunFilled size={13} />
													<span>{m.typo_theme_light()}</span>
												</button>
												<button
													type="button"
													class="preview-theme-btn preview-theme-btn-dark"
													class:active={previewTheme === 'dark'}
													onclick={() => setStylePreviewMode(f.id, 'dark')}
													title={m.typo_preview_dark()}
												>
													<IconMoonFilled size={13} />
													<span>{m.typo_theme_dark()}</span>
												</button>
											</div>
										</div>
										<div class="scale-preview-live"
											class:preview-dark={previewTheme === 'dark'}
											style="font-family:'{f.name}',sans-serif;">
											{#each previewStylesList(f.id, f.styles) as s (s.id)}
												<div class="preview-row"
													style="font-size:{Math.min(s.size ?? 16, 48)}px; font-weight:{s.weight ?? 400}; line-height:{s.lineHeight ?? 1.5}; letter-spacing:{s.tracking ?? 0}em;">
													<span class="preview-label">{s.name}</span>
													<span class="preview-text" style={previewTheme === 'dark' ? '' : `color:${stylePreviewColor(s)}`}>The quick brown fox jumps over the lazy dog</span>
												</div>
											{/each}
										</div>
								{:else if f.styles.length === 0}
									<p class="scale-empty">{m.typo_no_styles()} <button class="inline-btn" onclick={() => addDefaultStyles(f.id)}>{m.typo_no_styles_defaults()}</button> {m.typo_no_styles_or()} <button class="inline-btn" onclick={() => openAddStyle(f.id)}>{m.typo_no_styles_manual()}</button>.</p>
									{:else}
										{@const currentTab = getStyleTab(f.id)}
										<p class="scale-empty">{m.typo_no_tab_styles()} <button class="inline-btn" onclick={() => openAddStyle(f.id, currentTab === 'all' ? 'universal' : currentTab)}>{m.typo_add_btn()}</button></p>
									{/if}
							</div>
						</details>

						<!-- ── Type tester ────────────────────────────────────── -->
						<details class="card-section" class:tester-dark={testerDark[f.id]} style="{testerDark[f.id] ? 'background:#111;border-top-color:rgba(255,255,255,0.14)' : ''}">
							<summary class="section-summary">
								<span class="section-title" style="{testerDark[f.id] ? 'color:rgba(255,255,255,0.9)' : ''}">{m.typo_sec_tester()}</span>
								<span class="section-count">{testerSize}px</span>
								<span class="section-chevron"><IconChevronDown size={11} stroke={2} /></span>
								<div class="section-actions">
									<input type="range" min="8" max="120" bind:value={testerSize} class="tester-slider" onclick={(e) => e.stopPropagation()} />
								</div>
							</summary>
							<div class="section-body tester-section-body">
								<div class="tester-controls-row" style="{testerDark[f.id] ? 'border-color:rgba(255,255,255,0.16)' : ''}">
									<!-- Weight -->
									{#if f.isVariable && (f.variableAxes ?? []).some(a => a.tag === 'wght')}
										{@const wAxis = f.variableAxes.find(a => a.tag === 'wght')!}
										<div class="tester-control">
											<span class="tester-ctrl-label" style="{testerDark[f.id] ? 'color:rgba(255,255,255,0.68)' : ''}">{m.typo_tester_weight()}</span>
											<input type="range" min={wAxis.min} max={wAxis.max} step="1"
												value={testerWeight(f)}
												oninput={(e) => testerWeights[f.id] = Number((e.target as HTMLInputElement).value)}
												class="tester-slider tester-slider-wide" />
											<span class="tester-ctrl-val" style="{testerDark[f.id] ? 'color:rgba(255,255,255,0.78)' : ''}">{testerWeight(f)}</span>
										</div>
									{:else if f.weights.length > 1}
										<div class="tester-control">
											<span class="tester-ctrl-label" style="{testerDark[f.id] ? 'color:rgba(255,255,255,0.68)' : ''}">{m.typo_tester_weight()}</span>
											<div class="tester-weight-chips">
												{#each f.weights as w (w)}
													<button class="weight-chip-sm" class:selected={testerWeight(f) === w}
														onclick={() => testerWeights[f.id] = w}
													style="font-weight:{w}; {testerDark[f.id] ? 'background:rgba(255,255,255,0.03);border-color:rgba(255,255,255,0.24);color:rgba(255,255,255,0.82)' : ''}">{w}</button>
												{/each}
											</div>
										</div>
									{/if}
									<!-- Italic -->
									{#if f.isVariable && (f.variableAxes ?? []).some(a => a.tag === 'ital')}
										<label class="tester-control tester-toggle-ctrl">
											<span class="tester-ctrl-label" style="{testerDark[f.id] ? 'color:rgba(255,255,255,0.68)' : ''}">{m.typo_tester_italic()}</span>
											<input type="checkbox" class="toggle-check"
												checked={testerItalic[f.id] ?? false}
												onchange={(e) => testerItalic[f.id] = (e.target as HTMLInputElement).checked} />
											<span class="toggle-track"><span class="toggle-thumb"></span></span>
										</label>
									{/if}
									<!-- Dark mode toggle -->
									<label class="tester-control tester-toggle-ctrl tester-dark-ctrl" style="margin-left:auto; gap:6px">
										<span style="display:flex;align-items:center;color:{testerDark[f.id] ? 'rgba(255,255,255,0.62)' : 'var(--color-muted)'}">
											<IconSunFilled size={13} />
										</span>
										<input type="checkbox" class="toggle-check"
											checked={testerDark[f.id] ?? false}
											onchange={(e) => testerDark[f.id] = (e.target as HTMLInputElement).checked} />
										<span class="toggle-track toggle-track-dark"><span class="toggle-thumb"></span></span>
										<span style="display:flex;align-items:center;color:{testerDark[f.id] ? '#c4b5fd' : 'var(--color-muted)'}">
											<IconMoonFilled size={13} />
										</span>
									</label>
								</div>
								<!-- OT features row -->
								<div class="ot-features-row" style="{testerDark[f.id] ? 'border-color:rgba(255,255,255,0.16)' : ''}">
									<span class="tester-ctrl-label" style="{testerDark[f.id] ? 'color:rgba(255,255,255,0.68)' : ''}">OT</span>
			{#each OT_FEATURES as feat (feat.tag)}
										<button class="ot-chip"
										class:ot-active={(testerFeatures[f.id] ?? new SvelteSet()).has(feat.tag)}
											onclick={() => toggleOTFeature(f.id, feat.tag)}
											style="{testerDark[f.id] ? 'background:rgba(255,255,255,0.03);border-color:rgba(255,255,255,0.22);color:rgba(255,255,255,0.72)' : ''}"
											title={feat.label}>
											{feat.tag}
										</button>
									{/each}
								</div>
								<div class="tester-text"
									style="font-family:'{f.name}',sans-serif; font-size:{testerSize}px; font-weight:{testerWeight(f)}; font-style:{testerItalic[f.id] ? 'italic' : 'normal'}; font-feature-settings:{fontFeatureSettings(f.id)}; {testerDark[f.id] ? 'color:#fff' : ''}"
									contenteditable="true" bind:textContent={testerText}
									role="textbox" aria-multiline="true">{testerText}</div>
							</div>
						</details>

						<!-- ── Glyphs ──────────────────────────────────────────── -->
						<details class="card-section">
							<summary class="section-summary">
								<span class="section-title">{m.typo_sec_glyphs()}</span>
								<span class="section-count">{getGlyphSet(f.id).chars.length}</span>
								<span class="section-chevron"><IconChevronDown size={11} stroke={2} /></span>
								<div class="section-actions">
									<select class="glyph-set-select"
										value={glyphSetIndex[f.id] ?? 0}
										onclick={(e) => e.stopPropagation()}
										onchange={(e) => glyphSetIndex[f.id] = Number((e.target as HTMLSelectElement).value)}>
										{#each GLYPH_SETS as gs, i (i)}
											<option value={i}>{gs.label} ({gs.chars.length})</option>
										{/each}
									</select>
								</div>
							</summary>
							<div class="section-body">
								<div class="glyph-controls-row">
									{#if f.isVariable && (f.variableAxes ?? []).some(a => a.tag === 'wght')}
										{@const glyphWAxis = f.variableAxes.find(a => a.tag === 'wght')!}
										<div class="tester-control">
											<span class="tester-ctrl-label">{m.typo_tester_weight()}</span>
											<input
												type="range"
												min={glyphWAxis.min}
												max={glyphWAxis.max}
												step="1"
												value={glyphWeight(f)}
												oninput={(e) => glyphWeights[f.id] = Number((e.target as HTMLInputElement).value)}
												class="tester-slider tester-slider-wide"
											/>
											<span class="tester-ctrl-val">{glyphWeight(f)}</span>
										</div>
									{:else if f.weights.length > 1}
										<div class="tester-control">
											<span class="tester-ctrl-label">{m.typo_tester_weight()}</span>
											<div class="tester-weight-chips">
												{#each f.weights as w (w)}
													<button
														class="weight-chip-sm"
														class:selected={glyphWeight(f) === w}
														onclick={() => glyphWeights[f.id] = w}
														style="font-weight:{w}"
													>{w}</button>
												{/each}
											</div>
										</div>
									{/if}
									{#if f.isVariable && (f.variableAxes ?? []).some(a => a.tag === 'ital')}
										<label class="tester-control tester-toggle-ctrl">
											<span class="tester-ctrl-label">{m.typo_tester_italic()}</span>
											<input
												type="checkbox"
												class="toggle-check"
												checked={glyphItalic[f.id] ?? false}
												onchange={(e) => glyphItalic[f.id] = (e.target as HTMLInputElement).checked}
											/>
											<span class="toggle-track"><span class="toggle-thumb"></span></span>
										</label>
									{/if}
								</div>
								<div class="glyphs-grid" style="font-family:'{f.name}',sans-serif; font-weight:{glyphWeight(f)}; font-style:{glyphItalic[f.id] ? 'italic' : 'normal'}">
									{#each getGlyphSet(f.id).chars.split('') as g (g)}
										<button class="glyph" onclick={() => openGlyphModal(g, f)} title={charCodeStr(g)}>
											{g}
										</button>
									{/each}
								</div>
							</div>
						</details>
					{/if}
				</div>
			{/each}
			</div>
			{/each}
		</div>
	{/if}
</div>

<!-- ── Font modal ─────────────────────────────────────────────────────────── -->
<Modal open={showFontModal} title={editingFont ? m.typo_font_modal_edit() : m.typo_font_modal_add()} size="md" onClose={() => (showFontModal = false)}>
		<div class="modal-fields">
			<div class="field">
				<label for="f-name">{m.typo_font_name_label()} <span class="req">*</span></label>
				<input id="f-name" type="text" bind:value={fontForm.name} placeholder="Inter, Geist, Lexend…" />
			</div>
			<div class="field-row">
				<div class="field">
					<label for="f-foundry">{m.typo_font_foundry_label()}</label>
					<input id="f-foundry" type="text" bind:value={fontForm.foundry} placeholder="Google, Fontshare…" />
				</div>
				<div class="field">
					<label for="f-license">{m.typo_font_license_label()}</label>
					<input id="f-license" type="text" bind:value={fontForm.license} placeholder="OFL, Commercial…" />
				</div>
			</div>
			<div class="field">
				<label for="f-role">{m.typo_font_role_label()}</label>
				<select id="f-role" bind:value={fontForm.role}>
					<option value="display">{m.typo_font_role_display()}</option>
					<option value="body">{m.typo_font_role_body()}</option>
					<option value="mono">{m.typo_font_role_mono()}</option>
					<option value="accent">{m.typo_font_role_accent()}</option>
				</select>
			</div>
			<div class="field">
				<label for="f-url">{m.typo_font_url_label()}</label>
				<p class="field-hint">{m.typo_font_url_hint()}</p>
				<input id="f-url" type="text" bind:value={fontForm.sourceUrl} placeholder="https://fonts.googleapis.com/css2?family=Inter…" />
				{#if fontForm.name && fontForm.weights.length}
					<button class="text-btn mt-4" onclick={() => { fontForm.sourceUrl = googleFontsUrl(fontForm.name, fontForm.weights); }}>
						{m.typo_font_autofill()}
					</button>
				{/if}
			</div>
			<div class="field">
				<label class="toggle-label">
					<span>{m.typo_font_variable_label()}</span>
					<input type="checkbox" class="toggle-check" bind:checked={fontForm.isVariable} />
					<span class="toggle-track"><span class="toggle-thumb"></span></span>
				</label>
				<p class="field-hint">{m.typo_font_variable_hint()}</p>
			</div>
			{#if !fontForm.isVariable}
			<div class="field">
			<span class="field-label-text" id="font-weights-label">{m.typo_font_weights_label()}</span>
				<div class="weights-grid" aria-labelledby="font-weights-label">
					{#each ALL_WEIGHTS as w (w)}
						<button
							class="weight-chip"
							class:selected={fontForm.weights.includes(w)}
							onclick={() => toggleWeight(w)}
							style="font-weight:{w}"
						>{w}</button>
					{/each}
				</div>
			</div>
			{/if}
		</div>
		{#if error}<div class="modal-error">{error}</div>{/if}
	{#snippet footer()}
			<button class="action-btn" onclick={() => (showFontModal = false)}>{m.users_btn_cancel()}</button>
			<button class="action-btn action-btn-primary" onclick={saveFont} disabled={saving || !fontForm.name.trim()}>
				{saving ? '…' : editingFont ? m.users_btn_save() : m.typo_font_modal_add()}
			</button>
	{/snippet}
</Modal>

<!-- ── Style modal ────────────────────────────────────────────────────────── -->
<Modal open={showStyleModal} title={editingStyle ? m.typo_style_modal_edit() : m.typo_style_modal_add()} size="sm" onClose={() => (showStyleModal = false)}>
		<div class="modal-fields">
			<div class="field-row">
				<div class="field">
					<label for="s-name">{m.typo_style_name_label()} <span class="req">*</span></label>
					<input id="s-name" type="text" bind:value={styleForm.name} placeholder="H1, Body, Caption…" />
				</div>
				<div class="field field-sm">
					<label for="s-tag">{m.typo_style_tag_label()}</label>
					<input id="s-tag" type="text" bind:value={styleForm.tag} placeholder="h1, p…" />
				</div>
			</div>
			<div class="field">
				<label for="s-theme">{m.typo_style_theme_label()}</label>
				<select id="s-theme" bind:value={styleForm.theme}>
					<option value="universal">{m.typo_style_theme_universal()}</option>
					<option value="light">{m.typo_style_theme_light_opt()}</option>
					<option value="dark">{m.typo_style_theme_dark_opt()}</option>
				</select>
				{#if styleForm.theme === 'light'}
					<p class="field-hint">{m.typo_style_theme_hint_light()}</p>
				{:else if styleForm.theme === 'dark'}
					<p class="field-hint">{m.typo_style_theme_hint_dark()}</p>
				{/if}
			</div>
			<div class="field-row">
				<div class="field">
					<label for="s-size">{m.typo_style_size_label()}</label>
					<input id="s-size" type="number" bind:value={styleForm.size} min="6" max="200" />
				</div>
				<div class="field">
					<label for="s-weight">{m.typo_col_weight()}</label>
					<input id="s-weight" type="number" bind:value={styleForm.weight} min="100" max="900" step="100" />
				</div>
			</div>
			<div class="field-row">
				<div class="field">
					<label for="s-lh">{m.typo_style_lh_label()}</label>
					<input id="s-lh" type="number" bind:value={styleForm.lineHeight} min="0.8" max="3" step="0.05" />
				</div>
				<div class="field">
					<label for="s-tr">{m.typo_style_tracking_label()}</label>
					<input id="s-tr" type="number" bind:value={styleForm.tracking} step="0.01" />
				</div>
			</div>
			<div class="field">
				<span class="field-label-text">{m.typo_style_colors_label()}</span>
				<p class="field-hint">{m.typo_style_colors_hint()}</p>
				<div class="allowed-color-grid">
{#each colorOptions() as color (color.token)}
						<button
							type="button"
							class="allowed-color-option"
							class:selected={styleForm.allowedColors.includes(color.token)}
							onclick={() => toggleAllowedColor(color.token)}
						>
							<span class="allowed-color-swatch" style="background:{color.hex}"></span>
							<span class="allowed-color-name">{color.name}</span>
							<span class="allowed-color-source">{color.source === 'base' ? m.typo_source_base() : m.typo_source_brand()}</span>
						</button>
					{/each}
				</div>
				{#if styleForm.allowedColors.length > 0}
					<div class="style-contrast-list">
	{#each styleForm.allowedColors as token (token)}
							{@const option = colorOption(token)}
							{#if option}
								<div class="style-contrast-row">
									<span class="style-color-dot" title={option.name} style="background:{option.hex}"></span>
									<span class="style-contrast-name">{option.name}</span>
									<span class="contrast-pill" class:fail={checkContrast(option.hex, '#FFFFFF').level === 'Fail'}>{checkContrast(option.hex, '#FFFFFF').ratioDisplay} {m.typo_on_white()}</span>
									<span class="contrast-pill" class:fail={checkContrast(option.hex, '#000000').level === 'Fail'}>{checkContrast(option.hex, '#000000').ratioDisplay} {m.typo_on_black()}</span>
								</div>
							{/if}
						{/each}
					</div>
				{:else}
					<p class="field-hint">{m.typo_no_color_restriction()}</p>
				{/if}
			</div>
		</div>
		{#if error}<div class="modal-error">{error}</div>{/if}
	{#snippet footer()}
			<button class="action-btn" onclick={() => (showStyleModal = false)}>{m.users_btn_cancel()}</button>
			<button class="action-btn action-btn-primary" onclick={saveStyle} disabled={saving || !styleForm.name.trim()}>
				{saving ? '…' : editingStyle ? m.users_btn_save() : m.typo_style_modal_add()}
			</button>
	{/snippet}
</Modal>

<!-- ── Variable axes modal ─────────────────────────────────────────────────── -->
<Modal open={showAxesModal} title={m.typo_axes_modal_title()} size="md" onClose={() => (showAxesModal = false)}>
		<p class="axes-hint">{m.typo_axes_hint()}</p>
		<div class="axes-list">
			{#each editingAxes as ax, i (i)}
				<div class="axis-row">
					<div class="axis-tag-wrap">
						<input class="axis-input axis-tag" bind:value={ax.tag} placeholder="wght" />
						<select class="axis-preset" onchange={(e) => applyCommonAxis(i, (e.target as HTMLSelectElement).value)} title="Fill from preset">
							<option value="">preset…</option>
	{#each COMMON_AXES as ca (ca.tag)}
								<option value={ca.tag}>{ca.tag} — {ca.label}</option>
							{/each}
						</select>
					</div>
					<input class="axis-input axis-label" bind:value={ax.label} placeholder="Label" />
					<input class="axis-input axis-num" type="number" bind:value={ax.min} placeholder="min" />
					<input class="axis-input axis-num" type="number" bind:value={ax.max} placeholder="max" />
					<input class="axis-input axis-num" type="number" bind:value={ax.default} placeholder="default" />
					<button class="icon-btn icon-btn-danger" onclick={() => removeAxis(i)} title="Remove">
						<IconX size={12} stroke={2} />
					</button>
				</div>
			{/each}
		</div>
		<button class="text-btn mt-4" onclick={addAxis}>{m.typo_add_axis()}</button>
	{#snippet footer()}
			<button class="action-btn" onclick={() => (showAxesModal = false)}>{m.users_btn_cancel()}</button>
			<button class="action-btn action-btn-primary" onclick={saveAxes} disabled={saving}>
				{saving ? '…' : m.typo_save_axes()}
			</button>
	{/snippet}
</Modal>

<!-- ── Glyph modal ──────────────────────────────────────────────────────────── -->
<Modal open={!!glyphModal} title={glyphModal?.fontName ?? ''} description={glyphModal ? charCodeStr(glyphModal.char) : ''} size="sm" onClose={() => (glyphModal = null)}>
	{#if glyphModal}
		<div class="glyph-modal-preview" style="font-family:{glyphModal.fontFamily}; font-weight:{glyphModal.weight}; font-style:{glyphModal.italic ? 'italic' : 'normal'}">
			{glyphModal.char}
		</div>
	{/if}
	{#snippet footer()}
		<button class="btn btn-secondary" onclick={() => { navigator.clipboard.writeText(glyphModal!.char); toast.success(m.users_magic_copied()); }}>{m.typo_copy_glyph()}</button>
		<button class="btn btn-secondary" onclick={() => { navigator.clipboard.writeText(charCodeStr(glyphModal!.char)); toast.success(m.users_magic_copied()); }}>{m.typo_copy_code()}</button>
	{/snippet}
</Modal>

<style>
	.page {
		width: 100%;
		max-width: 960px;
		min-width: 0;
		min-height: 100vh;
		overflow-x: hidden;
	}

/* ── Topbar ───────────────────────────────────────────────────────────────── */
.topbar {
	display: flex; align-items: flex-start; justify-content: space-between;
	padding: 32px 32px 0; margin-bottom: 32px; gap: 16px;
}
.page-title { font-size: var(--text-2xl); font-weight: 600; letter-spacing: var(--tracking-tight); }
.page-sub { margin-top: 4px; font-size: var(--text-base); color: var(--color-muted); }
.topbar-actions { display: flex; gap: 8px; flex-shrink: 0; }

/* ── Empty state ──────────────────────────────────────────────────────────── */
.empty-state {
	display: flex; flex-direction: column; align-items: center;
	gap: 12px; padding: 80px 32px; text-align: center;
}
.empty-icon { margin-bottom: 4px; }
.empty-title { font-size: var(--text-md); font-weight: 600; color: var(--color-text); }
.empty-sub { font-size: var(--text-base); color: var(--color-muted); max-width: 280px; line-height: 1.5; }

/* ── Role filter tabs ─────────────────────────────────────────────────────── */
.role-tab-bar {
	display: flex; align-items: center; gap: 4px;
	padding: 0 32px;
	border-bottom: 1px solid var(--color-border);
	margin-bottom: 24px; overflow-x: auto; scrollbar-width: none;
}
.role-tab-bar::-webkit-scrollbar { display: none; }
.ptab {
	display: flex; align-items: center; gap: 8px;
	padding: 8px 0; margin-right: var(--space-5); border: none; background: none;
	color: var(--color-muted); cursor: pointer; font-size: var(--text-sm); font-weight: 400;
	border-bottom: 2px solid transparent; margin-bottom: -4px; white-space: nowrap;
	transition: color 0.1s, border-color 0.1s;
}
.ptab:hover { color: var(--color-text); }
.ptab.active { color: var(--color-text); border-bottom-color: var(--color-accent); font-weight: 500; }
.ptab-count { font-size: var(--text-xs); color: var(--color-placeholder); font-variant-numeric: tabular-nums; }
.ptab.active .ptab-count { color: var(--color-muted); }

/* ── Font cards ───────────────────────────────────────────────────────────── */
	.fonts-list { display: flex; flex-direction: column; gap: 0; padding: 0 32px 48px; min-width: 0; }

/* ── Role group sections ──────────────────────────────────────────────────── */
.font-role-section { display: flex; flex-direction: column; gap: 20px; margin-bottom: 40px; }
.font-role-section:last-child { margin-bottom: 0; }
.palette-group-header {
	display: flex; align-items: center; gap: 8px;
	padding-bottom: var(--space-3); border-bottom: 1px solid var(--color-border-strong);
}
.palette-group-name {
	font-size: var(--text-2xs); font-weight: 500; letter-spacing: var(--tracking-eyebrow);
	text-transform: uppercase; color: var(--color-text);
}
.palette-group-count {
	font-size: var(--text-xs); color: var(--color-muted); font-variant-numeric: tabular-nums;
}

.font-card {
	border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		overflow: hidden;
		background: var(--color-surface);
		box-shadow: var(--shadow-xs);
		min-width: 0;
	}

.font-header-left { display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1; min-width: 0; }
.font-header-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

.font-name { font-size: var(--text-md); font-weight: 600; }
.font-meta { font-size: var(--text-sm); color: var(--color-muted); }

/* ── Specimen ─────────────────────────────────────────────────────────────── */
.font-specimen {
	display: flex; align-items: flex-start; gap: 24px;
	padding: 4px 24px 20px;
}
.specimen-left {
	display: flex; flex-direction: column; align-items: center; gap: 8px;
	flex-shrink: 0;
}
.specimen-aa {
	font-size: 3rem; line-height: 1;
	color: var(--color-text);
}
.specimen-variable-badge {
	font-size: var(--text-2xs); font-weight: 600; letter-spacing: var(--tracking-eyebrow); text-transform: uppercase;
	color: var(--color-text); background: var(--color-surface-raised); border: 1px solid var(--color-border-strong);
	padding: 4px 8px; border-radius: var(--radius); cursor: pointer;
	white-space: nowrap;
}
.specimen-variable-badge:hover { background: var(--color-border-strong); }
.specimen-right {
	flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px;
}
.specimen-abc {
	font-size: var(--text-md); color: var(--color-text); line-height: 1.6;
	letter-spacing: var(--tracking-eyebrow);
	overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
	min-width: 0;
}
/* Weight strips */
.weight-strips {
	display: flex; flex-direction: column; gap: 4px;
	border-top: 1px solid var(--color-border); padding-top: 8px;
	min-width: 0;
}
.weight-strip {
	display: flex; align-items: baseline; gap: 8px;
	padding: 4px 0; min-width: 0;
}
.weight-strip-num {
	font-size: var(--text-2xs); color: var(--color-muted);
	width: 30px; flex-shrink: 0; font-variant-numeric: tabular-nums;
	font-family: var(--font-mono);
}
.weight-strip-text {
	font-size: var(--text-md); color: var(--color-text);
	white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0;
}

/* ── Theme tabs ───────────────────────────────────────────────────────────── */
.section-body-no-pt { padding-top: 0; }
	.theme-tabs {
		display: flex; gap: 4px;
		padding: 8px 0 8px;
		border-bottom: 1px solid var(--color-border);
		margin-bottom: 12px;
		overflow-x: auto;
		scrollbar-width: none;
	}
	.theme-tabs::-webkit-scrollbar { display: none; }
.theme-tab {
	display: inline-flex; align-items: center; gap: 4px;
	height: 28px; padding: 0 8px; border-radius: var(--radius);
	border: 1px solid transparent; background: none;
	font-size: var(--text-sm); font-weight: 500; cursor: pointer;
	color: var(--color-muted); transition: background 0.1s, color 0.1s, border-color 0.1s;
}
.theme-tab:hover { background: var(--color-hover); color: var(--color-text); }
.theme-tab.active {
	background: var(--color-surface);
	color: var(--color-text); border-color: var(--color-border-strong); box-shadow: var(--shadow-xs);
}
.theme-tab-light.active { background: var(--color-warning-subtle); color: var(--color-warning); border-color: var(--color-warning-border); }
.theme-tab-dark.active  { background: #141414; color: var(--color-border-strong); border-color: var(--color-text); }
.theme-tab-count {
	font-size: var(--text-2xs); color: var(--color-muted);
	min-width: 12px; text-align: center;
}
	.theme-tab.active .theme-tab-count { color: var(--color-muted); }
	.theme-tab-light.active .theme-tab-count { color: var(--color-warning); }
	.theme-tab-dark.active .theme-tab-count { color: var(--color-border-strong); }

	.theme-badge {
		font-size: var(--text-2xs); padding: 4px 4px; border-radius: var(--radius-sm);
		border: 1px solid var(--color-border); line-height: 1.4;
		white-space: nowrap; flex-shrink: 0;
	}
	.theme-badge-universal { background: var(--color-surface-raised); border-color: var(--color-border); color: var(--color-muted); }
	.theme-badge-light { background: var(--color-warning-subtle); border-color: var(--color-warning-border); color: var(--color-warning); }
	.theme-badge-dark  { background: var(--color-surface-raised); border-color: var(--color-border-strong); color: var(--color-text); }

	/* ── Scale table ──────────────────────────────────────────────────────────── */
	.scale-table { display: flex; flex-direction: column; gap: 0; margin-bottom: 16px; min-width: 0; }
	.scale-row {
		display: grid; grid-template-columns: 20px minmax(0, 1fr) 70px 70px 90px 90px 88px 56px;
		align-items: center; gap: 8px;
		padding: 8px 0; border-bottom: 1px solid var(--color-border);
		min-width: 0;
	}
.scale-row:last-child { border-bottom: none; }
.scale-row-header { font-size: var(--text-2xs); font-weight: 600; color: var(--color-muted); letter-spacing: var(--tracking-eyebrow); text-transform: uppercase; }
	.scale-preview {
		display: flex; align-items: baseline; gap: 8px;
		white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
		min-width: 0;
	}
.scale-tag {
	font-size: var(--text-2xs); font-weight: 400; color: var(--color-muted);
	background: var(--color-surface-raised); padding: 4px 4px;
	border-radius: var(--radius-sm); border: 1px solid var(--color-border);
	font-family: var(--font-mono); letter-spacing: 0; flex-shrink: 0;
}
.scale-val { font-size: var(--text-sm); color: var(--color-muted); font-variant-numeric: tabular-nums; }
.scale-muted { font-size: var(--text-xs); color: var(--color-muted); }
.scale-btns { display: flex; gap: 4px; justify-content: flex-end; }
.style-color-dots { display: flex; align-items: center; gap: 4px; min-width: 0; }
.style-color-dot {
	display: inline-block; width: 14px; height: 14px; border-radius: 50%;
	border: 1px solid color-mix(in srgb, var(--color-border) 70%, #000);
	box-shadow: inset 0 0 0 1px rgba(255,255,255,.18);
	flex: 0 0 auto;
}
.style-color-more { font-size: var(--text-2xs); color: var(--color-muted); }

/* ── DnD ──────────────────────────────────────────────────────────────────── */
.drag-handle {
	display: flex; align-items: center; justify-content: center;
	color: var(--color-border); cursor: grab; transition: color 0.1s;
}
.scale-row:hover .drag-handle { color: var(--color-muted); }
.drag-handle:active { cursor: grabbing; }
.scale-row.drag-over {
	border-top: 2px solid var(--color-accent);
	background: color-mix(in srgb, var(--color-accent) 5%, transparent);
}
.scale-row.dragging { opacity: 0.4; }

	/* ── Live preview ─────────────────────────────────────────────────────────── */
	.style-preview-toolbar {
		display: flex; align-items: center; justify-content: space-between;
		gap: 12px; margin: 0 0 8px;
	}
	.style-preview-title {
		font-size: var(--text-2xs); font-weight: 600; color: var(--color-muted);
		text-transform: uppercase; letter-spacing: var(--tracking-eyebrow);
	}
	.preview-theme-toggle {
		display: inline-flex; align-items: center; gap: 4px;
		padding: 4px; border: 1px solid var(--color-border);
		border-radius: var(--radius); background: var(--color-bg);
	}
	.preview-theme-btn {
		display: inline-flex; align-items: center; gap: 4px;
		height: 26px; padding: 0 8px; border: 1px solid transparent;
		border-radius: var(--radius); background: transparent; color: var(--color-muted);
		font-size: var(--text-xs); font-weight: 500; transition: background 0.1s, color 0.1s, border-color 0.1s;
	}
	.preview-theme-btn:hover { color: var(--color-text); background: var(--color-hover); }
	.preview-theme-btn.active {
		background: var(--color-warning-subtle); color: var(--color-warning); border-color: var(--color-warning-border);
	}
	.preview-theme-btn-dark.active {
		background: #141414; color: var(--color-border-strong); border-color: var(--color-text);
	}
	.scale-preview-live {
		display: flex; flex-direction: column; gap: 0;
		padding: 20px; background: var(--color-bg);
		border-radius: var(--radius-lg); border: 1px solid var(--color-border);
		min-width: 0;
	}
	.scale-preview-live.preview-dark {
		background: #111; border-color: #333;
	}
	.scale-preview-live.preview-dark .preview-label { color: rgba(255,255,255,0.35); }
	.scale-preview-live.preview-dark .preview-text  { color: rgba(255,255,255,0.9); }
	.scale-preview-live.preview-dark .preview-row   { border-color: rgba(255,255,255,0.08); }
.preview-row {
	display: flex; align-items: baseline; gap: 16px;
	padding: 8px 0; border-bottom: 1px solid var(--color-border);
}
.preview-row:last-child { border-bottom: none; }
.preview-label {
	font-size: var(--text-2xs); font-weight: 600; color: var(--color-muted);
	text-transform: uppercase; letter-spacing: var(--tracking-eyebrow);
	width: 56px; flex-shrink: 0; font-family: var(--font-mono);
}
	.preview-text { color: var(--color-text); min-width: 0; overflow-wrap: anywhere; }

.scale-empty { font-size: var(--text-base); color: var(--color-muted); }
.inline-btn {
	background: none; border: none; cursor: pointer; color: var(--color-accent);
	font-size: inherit; padding: 0; text-decoration: underline;
}

/* ── Type tester ──────────────────────────────────────────────────────────── */
	.tester-slider {
		-webkit-appearance: none; appearance: none; width: 120px; height: 4px;
	background: var(--color-border); border-radius: var(--radius-xs); outline: none; cursor: pointer;
}
.tester-slider::-webkit-slider-thumb {
	-webkit-appearance: none; width: 14px; height: 14px;
	border-radius: 50%; background: var(--color-accent); cursor: pointer;
}
.tester-text {
	min-height: 1.5em; color: var(--color-text); line-height: 1.2;
	outline: none; cursor: text; font-weight: 400; letter-spacing: var(--tracking-snug);
	padding: 4px 0;
}
.tester-text:empty::before { content: 'Type here…'; color: var(--color-muted); }

	/* ── Glyphs ───────────────────────────────────────────────────────────────── */
	.glyph-controls-row {
		display: flex; align-items: center; flex-wrap: wrap; gap: 16px;
		padding-bottom: 12px; margin-bottom: 12px;
		border-bottom: 1px solid var(--color-border);
	}
	.glyph-controls-row:empty { display: none; }
	.glyphs-grid { display: flex; flex-wrap: wrap; gap: 4px; }
	.glyph {
		display: flex; align-items: center; justify-content: center;
		width: 36px; height: 36px; font-size: var(--text-xl);
		font-family: inherit; font-weight: inherit; font-style: inherit;
		background: var(--color-bg); border: 1px solid var(--color-border);
		border-radius: var(--radius); color: var(--color-text);
		transition: background 0.1s;
}
.glyph:hover { background: var(--color-hover); }

/* ── Buttons ──────────────────────────────────────────────────────────────── */
.action-btn {
	display: inline-flex; align-items: center; gap: 8px;
	height: 34px; padding: 0 12px;
	background: var(--color-surface); border: 1px solid var(--color-border);
	border-radius: var(--radius); font-size: var(--text-sm); font-weight: 500;
	cursor: pointer; color: var(--color-text); white-space: nowrap;
	transition: background 0.1s, box-shadow 0.1s;
}
.action-btn:hover { background: var(--color-hover); box-shadow: var(--shadow-sm); }
.action-btn:disabled { opacity: 0.5; pointer-events: none; }
.action-btn-primary { background: var(--color-accent); color: var(--color-accent-contrast); border-color: var(--color-accent); }
.action-btn-primary:hover { background: var(--color-accent-hover); border-color: var(--color-accent-hover); }

.icon-btn {
	display: flex; align-items: center; justify-content: center;
	width: 30px; height: 30px; border-radius: var(--radius); border: none;
	background: none; cursor: pointer; color: var(--color-muted);
	transition: background 0.1s, color 0.1s;
}
.icon-btn:hover { background: var(--color-hover); color: var(--color-text); }
.icon-btn-danger:hover { color: var(--color-danger); }

.icon-btn-xs {
	display: flex; align-items: center; justify-content: center;
	width: 22px; height: 22px; border-radius: var(--radius-sm); border: none;
	background: none; cursor: pointer; color: var(--color-muted);
	transition: background 0.1s, color 0.1s;
}
.icon-btn-xs:hover { background: var(--color-hover); color: var(--color-text); }
.icon-btn-xs-danger:hover { color: var(--color-danger); }

.text-btn {
	background: none; border: none; cursor: pointer; color: var(--color-accent);
	font-size: var(--text-sm); font-weight: 500; padding: 0;
}
.text-btn:hover { text-decoration: underline; }
.text-btn:disabled { opacity: 0.5; pointer-events: none; }
.mt-4 { margin-top: 4px; display: block; }

/* ── Card fold ────────────────────────────────────────────────────────────── */
.font-card.collapsed { border-radius: var(--radius-lg); }
/* Header is a container — no hover/click on entire header */
.font-card-header {
	background: var(--color-surface);
}
/* When expanded, header gets a border-bottom separating it from detail sections */
.font-card-header.header-expanded {
	border-bottom: 1px solid var(--color-border);
}

/* Top row: static name + action buttons */
.font-card-toprow {
	display: flex; align-items: center; justify-content: space-between;
	padding: 16px 24px 12px;
}

/* Expand bar — "roleta" at the bottom of the header */
.font-expand-bar {
	display: flex; align-items: center; justify-content: center;
	height: 24px;
	background: color-mix(in srgb, var(--color-border) 28%, transparent);
	border-top: 1px solid var(--color-border);
	cursor: pointer; user-select: none;
	transition: background 0.12s, color 0.12s;
	color: var(--color-muted);
}
.font-expand-bar:hover {
	background: color-mix(in srgb, var(--color-border) 55%, transparent);
	color: var(--color-text);
}
.expand-chevron {
	display: flex; align-items: center; justify-content: center;
	width: 20px; height: 20px; border-radius: 50%;
	background: var(--color-surface);
	border: 1px solid var(--color-border);
	color: var(--color-muted);
	transition: transform 0.2s, border-color 0.12s, background 0.12s;
}
.font-expand-bar:hover .expand-chevron {
	border-color: color-mix(in srgb, var(--color-text) 35%, transparent);
	color: var(--color-text);
}
.expand-chevron.open { transform: rotate(180deg); }

/* Summary elements never show text cursor */
summary, summary * { cursor: pointer; user-select: none; }
/* Buttons and links always pointer */
button { cursor: pointer; }
a { cursor: pointer; }

.fold-chevron {
	display: flex; align-items: center; color: var(--color-muted);
	transition: transform 0.2s; flex-shrink: 0;
}
.fold-chevron.open { transform: rotate(90deg); }

.font-header-names { display: flex; flex-direction: column; gap: 4px; min-width: 0; }

.styles-count, .files-count {
	font-size: var(--text-2xs); color: var(--color-muted);
	background: var(--color-surface-raised);
	padding: 4px 8px; border-radius: var(--radius-xs); font-variant-numeric: tabular-nums;
	display: inline-flex; align-items: center; line-height: 1;
	height: 20px;
}

/* ── Card sections (foldable) ─────────────────────────────────────────────── */
.card-section {
	border-top: 1px solid var(--color-border);
}
.card-section:last-child { border-radius: 0 0 var(--radius-lg) var(--radius-lg); overflow: hidden; }

.section-summary {
	display: flex; align-items: center; gap: 8px;
	padding: 8px 24px; cursor: pointer; list-style: none;
	transition: background 0.1s;
}
.section-summary::-webkit-details-marker { display: none; }
.section-summary::marker { display: none; }
.section-summary:hover { background: var(--color-hover); }

.section-title {
	font-size: var(--text-2xs); font-weight: 500; color: var(--color-muted);
	letter-spacing: var(--tracking-eyebrow); text-transform: uppercase;
}
.section-count {
	font-size: var(--text-xs); color: var(--color-placeholder); font-variant-numeric: tabular-nums;
}
.section-chevron {
	display: flex; align-items: center; color: var(--color-muted);
	transition: transform 0.15s; margin-right: auto;
}
details[open] .section-chevron { transform: rotate(180deg); }

.section-actions {
	display: flex; align-items: center; gap: 8px; margin-left: auto;
	/* don't let summary flex override the button area */
}
.section-body { padding: 16px 24px 20px; }
.section-body-no-pt { padding-top: 0; }

/* ── Modals ───────────────────────────────────────────────────────────────── */
.modal-fields { display: flex; flex-direction: column; gap: 16px; }
.modal-error { padding: 8px 12px; background: var(--color-danger-subtle); color: var(--color-danger); border-radius: var(--radius); font-size: var(--text-base); margin-top: 8px; }

/* ── Form fields ──────────────────────────────────────────────────────────── */
.field { display: flex; flex-direction: column; gap: 4px; }
.field label,
.field-label-text { font-size: var(--text-sm); font-weight: 500; color: var(--color-text); }
.field-hint { font-size: var(--text-xs); color: var(--color-muted); margin-top: 4px; }
.req { color: var(--color-danger); }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field-sm { max-width: 100px; }
.field input, .field select {
	height: 36px; padding: 0 8px;
	border: 1px solid var(--color-border); border-radius: var(--radius);
	background: var(--color-surface); color: var(--color-text);
	font-size: var(--text-base); outline: none;
	transition: border-color 0.15s;
}
.field input:focus, .field select:focus { border-color: var(--color-border-focus); box-shadow: var(--focus-ring); }

.allowed-color-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
	gap: 8px;
}
.allowed-color-option {
	display: grid; grid-template-columns: 18px minmax(0, 1fr) auto;
	align-items: center; gap: 8px; min-width: 0;
	min-height: 34px; padding: 8px 8px;
	border: 1px solid var(--color-border); border-radius: var(--radius);
	background: var(--color-surface); color: var(--color-text);
	font-size: var(--text-sm); text-align: left;
}
.allowed-color-option:hover { border-color: color-mix(in srgb, var(--color-accent) 35%, var(--color-border)); background: var(--color-hover); }
.allowed-color-option.selected {
	border-color: var(--color-accent);
	background: color-mix(in srgb, var(--color-accent) 8%, transparent);
}
.allowed-color-swatch {
	width: 16px; height: 16px; border-radius: 50%;
	border: 1px solid var(--color-border);
	box-shadow: inset 0 0 0 1px rgba(255,255,255,.22);
}
.allowed-color-name {
	min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
	font-weight: 500;
}
.allowed-color-source {
	font-size: var(--text-2xs); color: var(--color-muted);
	text-transform: uppercase; letter-spacing: var(--tracking-eyebrow);
}
.style-contrast-list {
	display: flex; flex-direction: column; gap: 4px;
	margin-top: 8px;
}
.style-contrast-row {
	display: grid; grid-template-columns: 14px minmax(0, 1fr) auto auto;
	align-items: center; gap: 8px;
	min-width: 0; font-size: var(--text-xs);
}
.style-contrast-name {
	min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
	color: var(--color-text);
}
.contrast-pill {
	padding: 4px 8px; border-radius: var(--radius-sm);
	background: var(--color-success-subtle); color: var(--color-success);
	font-variant-numeric: tabular-nums; white-space: nowrap;
}
.contrast-pill.fail { background: var(--color-danger-subtle); color: var(--color-danger); }

/* ── Weights grid ─────────────────────────────────────────────────────────── */
.weights-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.weight-chip {
	height: 32px; padding: 0 12px; border-radius: var(--radius);
	border: 1px solid var(--color-border); background: none;
	font-size: var(--text-sm); cursor: pointer; color: var(--color-text);
	transition: border-color 0.1s, background 0.1s, color 0.1s;
}
.weight-chip.selected {
	border-color: var(--color-accent); background: color-mix(in srgb, var(--color-accent) 10%, transparent);
	color: var(--color-accent);
}

/* ── Specimen layout ──────────────────────────────────────────────────────── */
.specimen-right { display: flex; flex-direction: column; gap: 8px; min-width: 0; flex: 1; }

/* ── Variable badge ───────────────────────────────────────────────────────── */
.variable-badge {
	display: inline-flex; align-items: center;
	font-size: var(--text-2xs); font-weight: 600; letter-spacing: var(--tracking-eyebrow);
	text-transform: uppercase; color: var(--color-text);
	background: color-mix(in srgb, var(--color-text) 12%, transparent);
	padding: 4px 8px; border-radius: var(--radius-sm); white-space: nowrap;
}
.variable-badge-sm { font-size: var(--text-2xs); padding: 4px 8px; }

/* ── Font files ───────────────────────────────────────────────────────────── */
.files-section { padding: 16px 24px; border-bottom: 1px solid var(--color-border); }
.files-upload-btn { cursor: pointer; position: relative; }
.files-upload-btn.uploading { opacity: 0.6; pointer-events: none; }
.files-list { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }
.file-row {
	display: flex; align-items: center; gap: 8px;
	padding: 8px 8px; border-radius: var(--radius);
	background: var(--color-bg); border: 1px solid var(--color-border);
}
.file-format {
	font-size: var(--text-2xs); font-weight: 600; letter-spacing: var(--tracking-eyebrow);
	color: var(--color-muted); background: var(--color-surface-raised);
	padding: 4px 8px; border-radius: var(--radius-sm); border: 1px solid var(--color-border);
	flex-shrink: 0; width: 52px; text-align: center;
}
.file-name { font-size: var(--text-base); color: var(--color-text); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.file-size { font-size: var(--text-sm); color: var(--color-muted); flex-shrink: 0; font-variant-numeric: tabular-nums; }
.file-actions { display: flex; gap: 4px; flex-shrink: 0; }
.files-empty { font-size: var(--text-sm); color: var(--color-muted); margin-top: 8px; }

/* ── Variable axes modal ──────────────────────────────────────────────────── */
.axes-hint { font-size: var(--text-sm); color: var(--color-muted); margin-bottom: 16px; line-height: 1.5; }
.axes-list { display: flex; flex-direction: column; gap: 8px; }
.axis-row {
	display: grid; grid-template-columns: 1fr 1fr 64px 64px 72px 30px;
	gap: 8px; align-items: center;
}
.axis-tag-wrap { display: flex; gap: 4px; }
.axis-input {
	height: 32px; padding: 0 8px;
	border: 1px solid var(--color-border); border-radius: var(--radius);
	background: var(--color-surface); color: var(--color-text);
	font-size: var(--text-sm); outline: none; width: 100%;
}
.axis-input:focus { border-color: var(--color-border-focus); box-shadow: var(--focus-ring); }
.axis-tag { font-family: var(--font-mono); }
.axis-num { text-align: right; }
.axis-preset {
	height: 32px; padding: 0 4px;
	border: 1px solid var(--color-border); border-radius: var(--radius);
	background: var(--color-surface); color: var(--color-muted);
	font-size: var(--text-xs); cursor: pointer; outline: none; flex-shrink: 0;
}

/* ── Toggle ───────────────────────────────────────────────────────────────── */
.toggle-label {
	display: flex; align-items: center; gap: 8px; cursor: pointer;
	font-size: var(--text-sm); font-weight: 500; color: var(--color-text);
	user-select: none;
}
.toggle-check { display: none; }
.toggle-track {
	width: 36px; height: 20px; border-radius: var(--radius-full);
	background: var(--color-border); transition: background 0.2s;
	position: relative; flex-shrink: 0;
}
.toggle-check:checked ~ .toggle-track { background: var(--color-accent); }
.toggle-thumb {
	position: absolute; top: 3px; left: 3px;
	width: 14px; height: 14px; border-radius: 50%;
	background: #fff; transition: transform 0.2s;
	box-shadow: 0 1px 3px rgba(0,0,0,.2);
}
.toggle-check:checked ~ .toggle-track .toggle-thumb { transform: translateX(16px); }

/* ── Type tester controls ─────────────────────────────────────────────────── */
.tester-controls-row {
	display: flex; flex-wrap: wrap; gap: 16px; align-items: center;
	padding-bottom: 12px; margin-bottom: 12px;
	border-bottom: 1px solid var(--color-border);
}
.tester-controls-row:empty { display: none; }
.tester-control { display: flex; align-items: center; gap: 8px; }
.tester-ctrl-label {
	font-size: var(--text-xs); font-weight: 600; color: var(--color-muted);
	text-transform: uppercase; letter-spacing: var(--tracking-eyebrow); flex-shrink: 0;
}
.tester-ctrl-val {
	font-size: var(--text-sm); color: var(--color-muted);
	font-variant-numeric: tabular-nums; width: 32px;
}
.tester-slider-wide { width: 160px; }
.tester-toggle-ctrl { cursor: pointer; }
.tester-weight-chips { display: flex; gap: 4px; flex-wrap: wrap; }
.weight-chip-sm {
	height: 26px; padding: 0 8px; border-radius: var(--radius);
	border: 1px solid var(--color-border); background: none;
	font-size: var(--text-xs); cursor: pointer; color: var(--color-text);
	transition: border-color 0.1s, background 0.1s;
}
	.weight-chip-sm.selected {
		border-color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 10%, transparent);
		color: var(--color-accent);
	}
	.tester-dark .weight-chip-sm.selected {
		border-color: var(--color-text) !important;
		background: rgba(124, 58, 237, 0.24) !important;
		color: var(--color-surface-raised) !important;
	}

/* ── OT features ──────────────────────────────────────────────────────────── */
.ot-features-row {
	display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
	padding-bottom: 12px; margin-bottom: 12px;
	border-bottom: 1px solid var(--color-border);
}
.ot-chip {
	height: 24px; padding: 0 8px; border-radius: var(--radius-sm);
	border: 1px solid var(--color-border); background: none;
	font-size: var(--text-2xs); font-family: var(--font-mono); font-weight: 500;
	cursor: pointer; color: var(--color-muted);
	transition: border-color 0.1s, background 0.1s, color 0.1s;
}
.ot-chip:hover { border-color: var(--color-text); color: var(--color-text); }
	.ot-chip.ot-active {
		border-color: var(--color-accent); background: color-mix(in srgb, var(--color-accent) 10%, transparent);
		color: var(--color-accent);
	}
	.tester-dark .ot-chip.ot-active {
		border-color: var(--color-text) !important;
		background: rgba(124, 58, 237, 0.24) !important;
		color: var(--color-surface-raised) !important;
	}

/* Dark tester toggle */
.toggle-track-dark { background: #374151; }
.toggle-check:checked ~ .toggle-track-dark { background: var(--color-text); }

/* Tester body dark mode transition */
.tester-section-body { transition: background 0.2s; }

/* ── Glyph set select ─────────────────────────────────────────────────────── */
.glyph-set-select {
	height: 28px; padding: 0 8px;
	border: 1px solid var(--color-border); border-radius: var(--radius);
	background: var(--color-surface); color: var(--color-text);
	font-size: var(--text-xs); cursor: pointer; outline: none;
}
.glyph-set-select:focus { border-color: var(--color-border-focus); box-shadow: var(--focus-ring); }

/* ── Glyphs as buttons ────────────────────────────────────────────────────── */
	.glyph {
		display: flex; align-items: center; justify-content: center;
		width: 36px; height: 36px; font-size: var(--text-xl);
		font-family: inherit; font-weight: inherit; font-style: inherit;
		background: var(--color-bg); border: 1px solid var(--color-border);
		border-radius: var(--radius); color: var(--color-text); cursor: pointer;
		transition: background 0.1s, border-color 0.1s, transform 0.1s;
}
.glyph:hover {
	background: var(--color-hover);
	border-color: var(--color-border-strong);
	transform: scale(1.1);
}

/* ── Confirm / danger button ──────────────────────────────────────────────── */
.action-btn-danger {
	background: var(--color-danger-subtle); color: var(--color-danger);
	border-color: color-mix(in srgb, var(--color-danger) 30%, transparent);
}
.action-btn-danger:hover {
	background: var(--color-danger); color: #fff;
	border-color: var(--color-danger);
}

/* ── Font info ────────────────────────────────────────────────────────────── */
.font-info-grid { display: flex; flex-direction: column; gap: 0; }
.fi-row {
	display: flex; align-items: baseline; gap: 16px;
	padding: 8px 0; border-bottom: 1px solid var(--color-border);
}
.fi-row:last-child { border-bottom: none; }
.fi-row-tags { align-items: center; }
.fi-label {
	font-size: var(--text-xs); font-weight: 600; color: var(--color-muted);
	text-transform: uppercase; letter-spacing: var(--tracking-eyebrow);
	width: 80px; flex-shrink: 0; font-family: var(--font-mono);
}
.fi-value { font-size: var(--text-base); color: var(--color-text); }
.fi-link {
	font-size: var(--text-sm); color: var(--color-accent); text-decoration: none;
	overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
	max-width: 400px;
}
.fi-link:hover { text-decoration: underline; }
.fi-tags { display: flex; gap: 4px; flex-wrap: wrap; }
.fi-tag {
	font-size: var(--text-xs); padding: 4px 8px; border-radius: var(--radius);
	background: var(--color-surface-raised); border: 1px solid var(--color-border);
	color: var(--color-text); font-family: var(--font-mono);
}

/* ── Disabled order buttons ───────────────────────────────────────────────── */
.icon-btn-xs:disabled { opacity: 0.25; pointer-events: none; }

/* ── Glyph modal ──────────────────────────────────────────────────────────── */
.glyph-modal-preview {
	font-size: 8rem; line-height: 1; color: var(--color-text);
	user-select: all; text-align: center;
}

	/* ── Responsive ───────────────────────────────────────────────────────────── */
	@media (max-width: 768px) {
		.page { max-width: 100%; padding: 0; }
		.topbar {
			padding: 16px 16px 0;
			margin-bottom: 16px;
			flex-wrap: wrap;
		}
		.topbar-actions { width: 100%; justify-content: flex-start; flex-wrap: wrap; }
		.role-tab-bar { padding: 0 16px; margin-bottom: 16px; }
		.fonts-list { padding: 0 16px 32px; gap: 16px; }
		.font-card { border-radius: var(--radius-lg); }
		.font-card-toprow {
			align-items: flex-start;
			gap: 8px;
			padding: 12px 16px 12px;
		}
		.font-header-actions {
			flex-wrap: wrap;
			justify-content: flex-end;
			max-width: 112px;
		}
		.font-specimen {
			flex-direction: column;
			align-items: flex-start;
			gap: 12px;
			padding: 12px 16px 20px;
		}
		.specimen-left { flex-direction: row; align-items: baseline; gap: 8px; }
		.specimen-aa { font-size: 2.25rem; }
		.specimen-abc {
			white-space: normal;
			overflow: visible;
			text-overflow: clip;
			overflow-wrap: anywhere;
		}
		.weight-strip-text { font-size: var(--text-base); }
		.section-summary {
			padding: 8px 16px;
			flex-wrap: wrap;
		}
		.section-actions {
			width: 100%;
			justify-content: flex-start;
			margin-left: 0;
		}
		.section-actions .text-btn {
			min-height: 32px;
			padding: 8px 8px;
			border: 1px solid var(--color-border);
			border-radius: var(--radius);
			background: var(--color-surface);
		}
		.section-body { padding: 16px; }
		.section-body-no-pt { padding-top: 0; }
		.theme-tabs { margin-left: -16px; margin-right: -16px; padding-left: 16px; padding-right: 16px; }
		.scale-table { overflow-x: visible; }
		.scale-row {
			grid-template-columns: 20px minmax(0, 1fr) auto !important;
			grid-template-rows: auto auto;
			align-items: start;
			gap: 4px 8px;
			padding: 8px 0;
		}
		.scale-row-header { display: none; }
		.scale-row .scale-preview { grid-column: 2; grid-row: 1; }
		.scale-row .scale-btns { grid-column: 3; grid-row: 1; align-self: center; }
		.scale-row .scale-val { display: none; }
		.scale-row .style-color-dots { grid-column: 2 / 4; grid-row: 3; }
		.scale-preview {
			flex-wrap: wrap;
			white-space: normal;
			overflow: visible;
			text-overflow: clip;
			row-gap: 4px;
		}
		.scale-row::after {
			content: attr(data-meta);
			grid-column: 2 / 4; grid-row: 2;
			font-size: var(--text-2xs); color: var(--color-muted);
			font-family: var(--font-mono); padding-bottom: 4px;
			overflow-wrap: anywhere;
		}
		.style-preview-toolbar {
			align-items: flex-start;
			flex-direction: column;
		}
		.preview-theme-toggle { max-width: 100%; }
		.preview-row {
			display: grid;
			grid-template-columns: minmax(0, 1fr);
			gap: 4px;
			align-items: start;
			padding: 8px 0;
		}
		.preview-label {
			width: auto;
			font-size: var(--text-2xs);
		}
		.files-section,
		.section-body { min-width: 0; }
		.file-row {
			display: grid;
			grid-template-columns: 52px minmax(0, 1fr) auto;
			gap: 8px 8px;
		}
		.file-actions { grid-column: 3; grid-row: 1 / 3; align-self: center; }
		.fi-row {
			display: grid;
			grid-template-columns: minmax(0, 1fr);
			gap: 4px;
		}
		.fi-label { width: auto; }
		.fi-link { max-width: 100%; }
		.field-row { grid-template-columns: minmax(0, 1fr); }
		.axis-row { grid-template-columns: minmax(0, 1fr); }
		.glyph-controls-row { align-items: flex-start; }
		.modal-footer { flex-wrap: wrap; }
	}

	@media (max-width: 500px) {
		/* Tester slider takes more room */
		.tester-slider-wide { width: 100px; }
		.tester-controls-row { align-items: flex-start; }
		.tester-control { flex-wrap: wrap; }
		.glyph-controls-row { gap: 8px; }
		/* Weight chips wrap more aggressively */
		.tester-weight-chips { gap: 4px; }
		/* OT chips smaller */
		.ot-chip { padding: 0 8px; }
	}
</style>
