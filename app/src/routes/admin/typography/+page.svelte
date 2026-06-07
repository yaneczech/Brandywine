<script lang="ts">
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';
	import { checkContrast } from '$lib/utils/colors';
	import * as m from '$lib/paraglide/messages';
	import {
		IconPlus, IconPencil, IconTrash, IconX, IconDownload, IconUpload,
		IconTypography, IconChevronDown, IconChevronRight, IconGripVertical,
		IconSunFilled, IconMoonFilled
	} from '@tabler/icons-svelte';

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

	let fonts = $state<Font[]>(data.fonts as Font[]);
	let brandColors = $state<BrandColor[]>((data.colors ?? []) as BrandColor[]);
	let saving = $state(false);
	let error  = $state('');

	// Expanded cards — all expanded by default
	let expandedFonts = $state<Set<string>>(new Set((data.fonts as Font[]).map(f => f.id)));
	function toggleFont(id: string) {
		const next = new Set(expandedFonts);
		next.has(id) ? next.delete(id) : next.add(id);
		expandedFonts = next;
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

	// ── Confirm modal ─────────────────────────────────────────────────────────
	let confirmModal = $state<{ title: string; message: string; onConfirm: () => void } | null>(null);
	function showConfirm(title: string, message: string, onConfirm: () => void) {
		confirmModal = { title, message, onConfirm };
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
	let uploadProgress  = $state(false);

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
		if (theme === 'universal') return 'Both';
		return theme === 'light' ? 'Light' : 'Dark';
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
		const set = new Set(styleForm.allowedColors);
		set.has(token) ? set.delete(token) : set.add(token);
		styleForm.allowedColors = [...set];
	}

	// ── Type tester ────────────────────────────────────────────────────────────
	let testerText      = $state('The quick brown fox jumps over the lazy dog');
	let testerSize      = $state(32);
	let testerDark      = $state<Record<string, boolean>>({});
	let testerFeatures  = $state<Record<string, Set<string>>>({});

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
		return new Set(GLYPH_SETS.flatMap(set => set.chars.split(''))).size;
	}
	function coverageTooltip(group: (typeof COVERAGE_GROUPS)[number]): string {
		const count = group.sets.reduce((sum, label) => sum + (GLYPH_SETS.find(set => set.label === label)?.chars.length ?? 0), 0);
		return `${group.sets.join(', ')} · ${count} preview glyphs`;
	}
	function toggleOTFeature(fontId: string, tag: string) {
		const current = new Set(testerFeatures[fontId] ?? []);
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
			'Delete font',
			`Delete "${f.name}" and all its styles and uploaded files? This cannot be undone.`,
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
			'Delete style',
			`Delete style "${s.name}"?`,
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

	// ── Role filter ─────────────────────────────────────────────────────────────
	let roleFilter = $state('all');
	function visibleFonts() {
		return roleFilter === 'all' ? fonts : fonts.filter(f => f.role === roleFilter);
	}
	const ROLES = ['display', 'body', 'mono', 'accent'] as const;

	// ── Font file upload / delete ──────────────────────────────────────────────
	async function uploadFontFile(fontId: string, fileInput: HTMLInputElement) {
		const file = fileInput.files?.[0];
		if (!file) return;
		uploadingFontId = fontId;
		uploadProgress = true;
		try {
			const fd = new FormData();
			fd.append('file', file);
			const res = await fetch(`/api/typography/fonts/${fontId}/files`, { method: 'POST', body: fd });
			if (!res.ok) {
				const msg = (await res.json().catch(() => ({}))).message ?? 'Upload failed';
				alert(msg);
			} else {
				await refresh();
			}
		} finally {
			uploadProgress = false;
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

	// ── Inline style edit ──────────────────────────────────────────────────────
	async function patchStyle(fontId: string, styleId: string, field: string, value: unknown) {
		await api('PATCH', `/api/typography/fonts/${fontId}/styles/${styleId}`, { [field]: value });
		await refresh();
	}

	// ── Weight toggle ──────────────────────────────────────────────────────────
	const ALL_WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];
	function toggleWeight(w: number) {
		const current = fontForm.weights;
		fontForm.weights = current.includes(w) ? current.filter(x => x !== w) : [...current, w].sort((a,b) => a-b);
	}

	// ── Role label ─────────────────────────────────────────────────────────────
	const ROLE_LABELS: Record<string, string> = { display: 'Display', body: 'Body', mono: 'Mono', accent: 'Accent' };
	const ROLE_COLORS: Record<string, string> = { display: '#6366f1', body: '#10b981', mono: '#f59e0b', accent: '#ec4899' };

	// ── Google Fonts helper ────────────────────────────────────────────────────
	function googleFontsUrl(name: string, weights: number[]) {
		const family = name.replace(/ /g, '+');
		const wgts = weights.join(';');
		return `https://fonts.googleapis.com/css2?family=${family}:wght@${wgts}&display=swap`;
	}

	// Glyphs to display
	const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,;:!?@#$%&()[]{}"\'/\\-–—…';

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

<svelte:window onkeydown={(e) => {
	if (e.key !== 'Escape') return;
	if (glyphModal) { glyphModal = null; return; }
	if (confirmModal) { confirmModal = null; return; }
	if (showAxesModal) { showAxesModal = false; return; }
	if (showStyleModal) { showStyleModal = false; return; }
	if (showFontModal) { showFontModal = false; return; }
}} />

<svelte:head><title>Typography · Brandywine</title></svelte:head>

<div class="page">
	<!-- ── Topbar ──────────────────────────────────────────────────────────── -->
	<div class="topbar">
		<div class="topbar-left">
			<h1 class="page-title">Typography</h1>
			<p class="page-sub">{fonts.length} font{fonts.length !== 1 ? 's' : ''} defined</p>
		</div>
		<div class="topbar-actions">
			<button class="action-btn action-btn-primary" onclick={openAddFont}>
				<IconPlus size={13} stroke={2} />
				Add font
			</button>
		</div>
	</div>

	<!-- ── Role filter tabs ──────────────────────────────────────────────────── -->
	{#if fonts.length > 0}
	<div class="role-filter-bar">
		<button class="role-filter-tab" class:active={roleFilter === 'all'} onclick={() => roleFilter = 'all'}>
			All <span class="role-filter-count">{fonts.length}</span>
		</button>
		{#each ROLES as role}
			{@const cnt = fonts.filter(f => f.role === role).length}
			{#if cnt > 0}
				<button class="role-filter-tab" class:active={roleFilter === role}
					onclick={() => roleFilter = role}
					style="--role-color:{ROLE_COLORS[role] ?? '#888'}">
					{ROLE_LABELS[role]} <span class="role-filter-count">{cnt}</span>
				</button>
			{/if}
		{/each}
	</div>
	{/if}

	{#if fonts.length === 0}
		<!-- ── Empty state ─────────────────────────────────────────────────── -->
		<div class="empty-state">
			<div class="empty-icon">
				<IconTypography size={48} stroke={1} color="var(--color-border)" />
			</div>
			<p class="empty-title">No fonts yet</p>
			<p class="empty-sub">Add your brand fonts and define the typographic scale.</p>
			<button class="action-btn action-btn-primary" onclick={openAddFont}>Add first font</button>
		</div>
	{:else}
		<!-- ── Font cards ───────────────────────────────────────────────────── -->
		<div class="fonts-list">
			{#each visibleFonts() as f (f.id)}
				{@const expanded = expandedFonts.has(f.id)}
				<div class="font-card" class:collapsed={!expanded}>

					<!-- ── Card header (always visible) ─────────────────────── -->
					<div class="font-card-header" role="button" tabindex="0"
						onclick={() => toggleFont(f.id)}
						onkeydown={(e) => e.key === 'Enter' && toggleFont(f.id)}
					>
						<div class="font-header-left">
							<span class="fold-chevron" class:open={expanded}>
								<IconChevronRight size={14} stroke={2} />
							</span>
							<span class="role-badge" style="--role-color:{ROLE_COLORS[f.role] ?? '#888'}">{ROLE_LABELS[f.role] ?? f.role}</span>
							<div class="font-header-names">
								<h2 class="font-name" style="font-family:'{f.name}',sans-serif">{f.name}</h2>
								{#if f.foundry || f.license}
									<span class="font-meta">{[f.foundry, f.license].filter(Boolean).join(' · ')}</span>
								{/if}
							</div>
							<!-- Compact specimen in collapsed state -->
							{#if !expanded}
								<span class="collapsed-preview" style="font-family:'{f.name}',sans-serif">
									Aa Bb Cc 123
								</span>
							{/if}
						</div>
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<div class="font-header-actions" onclick={(e) => e.stopPropagation()}>
							{#if f.isVariable}
								<span class="variable-badge">Variable</span>
							{/if}
							{#if f.styles.length}
								<span class="styles-count">{f.styles.length} styles</span>
							{/if}
							{#if f.files?.length}
								<span class="files-count">{f.files.length} file{f.files.length !== 1 ? 's' : ''}</span>
							{/if}
							<button class="icon-btn" onclick={() => openEditFont(f)} title="Edit font">
								<IconPencil size={14} stroke={1.75} />
							</button>
							<button class="icon-btn icon-btn-danger" onclick={() => deleteFont(f)} title="Delete font">
								<IconTrash size={14} stroke={1.75} />
							</button>
						</div>
					</div>

					{#if expanded}
						<!-- ── Specimen ──────────────────────────────────────── -->
						<div class="font-specimen" style="font-family:'{f.name}', sans-serif">
							<div class="specimen-aa">Aa</div>
							<div class="specimen-right">
								<div class="specimen-weights">
									{#if f.isVariable}
										{#each (f.variableAxes ?? []) as ax}
											<span class="specimen-weight">{ax.label} {ax.min}–{ax.max}</span>
										{/each}
										<button class="text-btn" onclick={() => openAxesModal(f)}>Edit axes</button>
									{:else}
										{#each f.weights as w (w)}
											<span class="specimen-weight" style="font-weight:{w}">{w}</span>
										{/each}
									{/if}
								</div>
								<div class="specimen-abc" style="font-weight:{f.isVariable ? 400 : (f.weights.includes(400) ? 400 : f.weights[0])}">
									AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz
								</div>
							</div>
						</div>

						<!-- ── Font info ─────────────────────────────────────── -->
						<details class="card-section">
							<summary class="section-summary">
								<span class="section-title">Font info</span>
								<span class="section-chevron"><IconChevronDown size={11} stroke={2} /></span>
							</summary>
							<div class="section-body">
								<div class="font-info-grid">
									<div class="fi-row">
										<span class="fi-label">Family</span>
										<span class="fi-value">{f.name}</span>
									</div>
									{#if f.foundry}
										<div class="fi-row">
											<span class="fi-label">Producer</span>
											<span class="fi-value">{f.foundry}</span>
										</div>
									{/if}
									{#if f.license}
										<div class="fi-row">
											<span class="fi-label">License</span>
											<span class="fi-value">{f.license}</span>
										</div>
									{/if}
									{#if f.role}
										<div class="fi-row">
											<span class="fi-label">Role</span>
											<span class="fi-value" style="color:{ROLE_COLORS[f.role] ?? '#888'}">{ROLE_LABELS[f.role] ?? f.role}</span>
										</div>
									{/if}
									{#if f.isVariable}
										<div class="fi-row">
											<span class="fi-label">Type</span>
											<span class="fi-value">Variable font</span>
										</div>
										{#if f.variableAxes?.length}
											<div class="fi-row fi-row-tags">
												<span class="fi-label">Axes</span>
												<div class="fi-tags">
													{#each f.variableAxes as ax}
														<span class="fi-tag" title="{ax.label} {ax.min}–{ax.max}">{ax.tag}</span>
													{/each}
												</div>
											</div>
										{/if}
									{:else if f.weights?.length}
										<div class="fi-row fi-row-tags">
											<span class="fi-label">Weights</span>
											<div class="fi-tags">
												{#each f.weights as w}
													<span class="fi-tag" style="font-weight:{w}">{w}</span>
												{/each}
											</div>
										</div>
									{/if}
									{#if f.sourceUrl}
										<div class="fi-row">
											<span class="fi-label">Source</span>
											<a class="fi-link" href={f.sourceUrl} target="_blank" rel="noopener">{f.sourceUrl}</a>
										</div>
									{/if}
									<div class="fi-row fi-row-tags">
										<span class="fi-label">OT controls</span>
										<div class="fi-tags">
											{#each OT_FEATURES as feat}
												<span class="fi-tag" title={feat.label}>{feat.tag}</span>
											{/each}
										</div>
									</div>
									<div class="fi-row">
										<span class="fi-label">Glyphs</span>
										<span class="fi-value">{previewGlyphCount()} preview characters across {COVERAGE_GROUPS.length} coverage groups</span>
									</div>
									<div class="fi-row fi-row-tags">
										<span class="fi-label">Coverage</span>
										<div class="fi-tags">
											{#each COVERAGE_GROUPS as group}
												<span class="fi-tag" title={coverageTooltip(group)}>{group.label}</span>
											{/each}
										</div>
									</div>
									{#if f.files?.length}
										<div class="fi-row">
											<span class="fi-label">Files</span>
											<span class="fi-value">{f.files.length} uploaded ({f.files.map(ff => ff.format.toUpperCase()).join(', ')})</span>
										</div>
									{/if}
								</div>
							</div>
						</details>

						<!-- ── Font files ─────────────────────────────────────── -->
						<details class="card-section" open={!!f.files?.length}>
							<summary class="section-summary">
								<span class="section-title">Font files</span>
								<span class="section-count">{f.files?.length ?? 0}</span>
								<span class="section-chevron"><IconChevronDown size={11} stroke={2} /></span>
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<label class="action-btn files-upload-btn" class:uploading={uploadingFontId === f.id}
									onclick={(e) => e.stopPropagation()}>
									{#if uploadingFontId === f.id}
										Uploading…
									{:else}
										<IconUpload size={12} stroke={2} />
										Upload
									{/if}
									<input type="file" accept=".woff2,.woff,.ttf,.otf,.eot" style="display:none"
										onchange={(e) => uploadFontFile(f.id, e.currentTarget as HTMLInputElement)}
										disabled={uploadingFontId !== null} />
								</label>
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
									<p class="files-empty">No font files. Upload <code>.woff2</code>, <code>.ttf</code> or <code>.otf</code> for self-hosting.</p>
								{/if}
							</div>
						</details>

						<!-- ── Type styles ────────────────────────────────────── -->
						<details class="card-section" open>
							<summary class="section-summary">
								<span class="section-title">Type styles</span>
								<span class="section-count">{f.styles.length}</span>
								<span class="section-chevron"><IconChevronDown size={11} stroke={2} /></span>
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<div class="section-actions" onclick={(e) => e.stopPropagation()}>
									{#if f.styles.length === 0}
										<button type="button" class="text-btn" onclick={(e) => { e.stopPropagation(); addDefaultStyles(f.id); }} disabled={saving}>+ Defaults</button>
									{/if}
									<button type="button" class="text-btn" onclick={(e) => {
										e.stopPropagation();
										const tab = getStyleTab(f.id);
										openAddStyle(f.id, tab === 'all' ? 'universal' : tab);
									}}>+ Add</button>
								</div>
							</summary>
							<div class="section-body section-body-no-pt">
								<!-- Theme tabs -->
								<!-- svelte-ignore a11y_click_events_have_key_events -->
									<div class="theme-tabs" onclick={(e) => e.stopPropagation()}>
										<button class="theme-tab" class:active={getStyleTab(f.id) === 'all'} onclick={() => setStyleTab(f.id, 'all')}>
											All <span class="theme-tab-count">{f.styles.length}</span>
										</button>
										<button class="theme-tab theme-tab-light" class:active={getStyleTab(f.id) === 'light'} onclick={() => setStyleTab(f.id, 'light')}>
											<IconSunFilled size={14} />&nbsp;Light <span class="theme-tab-count">{styleCountForTab(f.styles, 'light')}</span>
										</button>
										<button class="theme-tab theme-tab-dark" class:active={getStyleTab(f.id) === 'dark'} onclick={() => setStyleTab(f.id, 'dark')}>
											<IconMoonFilled size={14} />&nbsp;Dark <span class="theme-tab-count">{styleCountForTab(f.styles, 'dark')}</span>
										</button>
									</div>

								{#if visibleStylesList(f.id, f.styles).length > 0}
									<div class="scale-table">
										<div class="scale-row scale-row-header">
											<span></span><span>Name</span><span>Size</span><span>Weight</span><span>Line height</span><span>Tracking</span><span>Colors</span><span></span>
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
												<span class="drag-handle" title="Drag to reorder">
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
														{#each allowedColorsForStyle(s).slice(0, 4) as token}
															{@const option = colorOption(token)}
															{#if option}
																<span class="style-color-dot" title={option.name} style="background:{option.hex}"></span>
															{/if}
														{/each}
														{#if allowedColorsForStyle(s).length > 4}
															<span class="style-color-more">+{allowedColorsForStyle(s).length - 4}</span>
														{/if}
													{:else}
														<span class="scale-muted">Any</span>
													{/if}
												</span>
												<span class="scale-btns">
													<button class="icon-btn-xs" onclick={() => openEditStyle(f.id, s)} title="Edit"><IconPencil size={11} stroke={1.75} /></button>
													<button class="icon-btn-xs icon-btn-xs-danger" onclick={() => deleteStyle(f.id, s)} title="Delete"><IconX size={11} stroke={2} /></button>
												</span>
											</div>
										{/each}
									</div>
										{@const previewTheme = getStylePreviewMode(f.id)}
										<div class="style-preview-toolbar">
											<span class="style-preview-title">Preview</span>
											<div class="preview-theme-toggle" aria-label="Preview theme">
												<button
													type="button"
													class="preview-theme-btn"
													class:active={previewTheme === 'light'}
													onclick={() => setStylePreviewMode(f.id, 'light')}
													title="Preview light mode"
												>
													<IconSunFilled size={13} />
													<span>Light</span>
												</button>
												<button
													type="button"
													class="preview-theme-btn preview-theme-btn-dark"
													class:active={previewTheme === 'dark'}
													onclick={() => setStylePreviewMode(f.id, 'dark')}
													title="Preview dark mode"
												>
													<IconMoonFilled size={13} />
													<span>Dark</span>
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
													<span class="preview-text" style="color:{stylePreviewColor(s)}">The quick brown fox jumps over the lazy dog</span>
												</div>
											{/each}
										</div>
								{:else if f.styles.length === 0}
									<p class="scale-empty">No styles — <button class="inline-btn" onclick={() => addDefaultStyles(f.id)}>add defaults</button> or <button class="inline-btn" onclick={() => openAddStyle(f.id)}>add manually</button>.</p>
									{:else}
										{@const currentTab = getStyleTab(f.id)}
										<p class="scale-empty">No {currentTab} styles yet. <button class="inline-btn" onclick={() => openAddStyle(f.id, currentTab === 'all' ? 'universal' : currentTab)}>Add {currentTab} style</button></p>
									{/if}
							</div>
						</details>

						<!-- ── Type tester ────────────────────────────────────── -->
						<details class="card-section" class:tester-dark={testerDark[f.id]} style="{testerDark[f.id] ? 'background:#111;border-top-color:rgba(255,255,255,0.14)' : ''}">
							<summary class="section-summary">
								<span class="section-title" style="{testerDark[f.id] ? 'color:rgba(255,255,255,0.9)' : ''}">Type tester</span>
								<span class="section-count">{testerSize}px</span>
								<span class="section-chevron"><IconChevronDown size={11} stroke={2} /></span>
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<div class="section-actions" onclick={(e) => e.stopPropagation()}>
									<input type="range" min="8" max="120" bind:value={testerSize} class="tester-slider" />
								</div>
							</summary>
							<div class="section-body tester-section-body">
								<div class="tester-controls-row" style="{testerDark[f.id] ? 'border-color:rgba(255,255,255,0.16)' : ''}">
									<!-- Weight -->
									{#if f.isVariable && (f.variableAxes ?? []).some(a => a.tag === 'wght')}
										{@const wAxis = f.variableAxes.find(a => a.tag === 'wght')!}
										<div class="tester-control">
											<span class="tester-ctrl-label" style="{testerDark[f.id] ? 'color:rgba(255,255,255,0.68)' : ''}">Weight</span>
											<input type="range" min={wAxis.min} max={wAxis.max} step="1"
												value={testerWeight(f)}
												oninput={(e) => testerWeights[f.id] = Number((e.target as HTMLInputElement).value)}
												class="tester-slider tester-slider-wide" />
											<span class="tester-ctrl-val" style="{testerDark[f.id] ? 'color:rgba(255,255,255,0.78)' : ''}">{testerWeight(f)}</span>
										</div>
									{:else if f.weights.length > 1}
										<div class="tester-control">
											<span class="tester-ctrl-label" style="{testerDark[f.id] ? 'color:rgba(255,255,255,0.68)' : ''}">Weight</span>
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
											<span class="tester-ctrl-label" style="{testerDark[f.id] ? 'color:rgba(255,255,255,0.68)' : ''}">Italic</span>
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
									{#each OT_FEATURES as feat}
										<button class="ot-chip"
											class:ot-active={(testerFeatures[f.id] ?? new Set()).has(feat.tag)}
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
								<span class="section-title">Glyphs</span>
								<span class="section-count">{getGlyphSet(f.id).chars.length}</span>
								<span class="section-chevron"><IconChevronDown size={11} stroke={2} /></span>
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<div class="section-actions" onclick={(e) => e.stopPropagation()}>
									<select class="glyph-set-select"
										value={glyphSetIndex[f.id] ?? 0}
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
											<span class="tester-ctrl-label">Weight</span>
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
											<span class="tester-ctrl-label">Weight</span>
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
											<span class="tester-ctrl-label">Italic</span>
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
	{/if}
</div>

<!-- ── Font modal ─────────────────────────────────────────────────────────── -->
{#if showFontModal}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={() => (showFontModal = false)}>
		<div class="modal" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h2>{editingFont ? 'Edit font' : 'Add font'}</h2>
				<button class="modal-close" aria-label="Close" onclick={() => (showFontModal = false)}>
					<IconX size={16} stroke={1.75} />
				</button>
			</div>
			<div class="modal-body">
				<div class="modal-fields">
					<div class="field">
						<label for="f-name">Font name <span class="req">*</span></label>
						<input id="f-name" type="text" bind:value={fontForm.name} placeholder="Inter, Geist, Lexend…" autofocus />
					</div>
					<div class="field-row">
						<div class="field">
							<label for="f-foundry">Foundry</label>
							<input id="f-foundry" type="text" bind:value={fontForm.foundry} placeholder="Google, Fontshare…" />
						</div>
						<div class="field">
							<label for="f-license">License</label>
							<input id="f-license" type="text" bind:value={fontForm.license} placeholder="OFL, Commercial…" />
						</div>
					</div>
					<div class="field">
						<label for="f-role">Role</label>
						<select id="f-role" bind:value={fontForm.role}>
							<option value="display">Display — headings, hero text</option>
							<option value="body">Body — paragraphs, UI text</option>
							<option value="mono">Mono — code, technical</option>
							<option value="accent">Accent — decorative, brand</option>
						</select>
					</div>
					<div class="field">
						<label for="f-url">Source URL</label>
						<p class="field-hint">Google Fonts CSS URL, Adobe Fonts embed, or direct @font-face src.</p>
						<input id="f-url" type="text" bind:value={fontForm.sourceUrl} placeholder="https://fonts.googleapis.com/css2?family=Inter…" />
						{#if fontForm.name && fontForm.weights.length}
							<button class="text-btn mt-4" onclick={() => { fontForm.sourceUrl = googleFontsUrl(fontForm.name, fontForm.weights); }}>
								↗ Auto-fill Google Fonts URL
							</button>
						{/if}
					</div>
					<div class="field">
						<label class="toggle-label">
							<span>Variable font</span>
							<input type="checkbox" class="toggle-check" bind:checked={fontForm.isVariable} />
							<span class="toggle-track"><span class="toggle-thumb"></span></span>
						</label>
						<p class="field-hint">Enable if this font supports variable axes (wght, wdth, ital…). You can configure axes after saving.</p>
					</div>
					{#if !fontForm.isVariable}
					<div class="field">
						<label>Weights</label>
						<div class="weights-grid">
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
			</div>
			<div class="modal-footer">
				<button class="action-btn" onclick={() => (showFontModal = false)}>Cancel</button>
				<button class="action-btn action-btn-primary" onclick={saveFont} disabled={saving || !fontForm.name.trim()}>
					{saving ? '…' : editingFont ? 'Save' : 'Add font'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- ── Style modal ────────────────────────────────────────────────────────── -->
{#if showStyleModal}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={() => (showStyleModal = false)}>
		<div class="modal modal-sm" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h2>{editingStyle ? 'Edit style' : 'Add style'}</h2>
				<button class="modal-close" aria-label="Close" onclick={() => (showStyleModal = false)}>
					<IconX size={16} stroke={1.75} />
				</button>
			</div>
			<div class="modal-body">
				<div class="modal-fields">
					<div class="field-row">
						<div class="field">
							<label for="s-name">Name <span class="req">*</span></label>
							<input id="s-name" type="text" bind:value={styleForm.name} placeholder="H1, Body, Caption…" autofocus />
						</div>
						<div class="field field-sm">
							<label for="s-tag">Tag</label>
							<input id="s-tag" type="text" bind:value={styleForm.tag} placeholder="h1, p…" />
						</div>
					</div>
					<div class="field">
						<label for="s-theme">Theme</label>
						<select id="s-theme" bind:value={styleForm.theme}>
							<option value="universal">Universal — applies to both light & dark</option>
							<option value="light">☀︎ Light theme only</option>
							<option value="dark">☽ Dark theme only</option>
						</select>
						{#if styleForm.theme !== 'universal'}
							<p class="field-hint">This style will only appear in the {styleForm.theme} theme tab. Universal styles appear everywhere.</p>
						{/if}
					</div>
					<div class="field-row">
						<div class="field">
							<label for="s-size">Size (px)</label>
							<input id="s-size" type="number" bind:value={styleForm.size} min="6" max="200" />
						</div>
						<div class="field">
							<label for="s-weight">Weight</label>
							<input id="s-weight" type="number" bind:value={styleForm.weight} min="100" max="900" step="100" />
						</div>
					</div>
					<div class="field-row">
						<div class="field">
							<label for="s-lh">Line height</label>
							<input id="s-lh" type="number" bind:value={styleForm.lineHeight} min="0.8" max="3" step="0.05" />
						</div>
						<div class="field">
							<label for="s-tr">Tracking (em)</label>
							<input id="s-tr" type="number" bind:value={styleForm.tracking} step="0.01" />
						</div>
					</div>
					<div class="field">
						<span class="field-label-text">Allowed colors</span>
						<p class="field-hint">Colors this text style is allowed to use. Contrast is checked against white and black.</p>
						<div class="allowed-color-grid">
							{#each colorOptions() as color}
								<button
									type="button"
									class="allowed-color-option"
									class:selected={styleForm.allowedColors.includes(color.token)}
									onclick={() => toggleAllowedColor(color.token)}
								>
									<span class="allowed-color-swatch" style="background:{color.hex}"></span>
									<span class="allowed-color-name">{color.name}</span>
									<span class="allowed-color-source">{color.source === 'base' ? 'Base' : 'Brand'}</span>
								</button>
							{/each}
						</div>
						{#if styleForm.allowedColors.length > 0}
							<div class="style-contrast-list">
								{#each styleForm.allowedColors as token}
									{@const option = colorOption(token)}
									{#if option}
										<div class="style-contrast-row">
											<span class="style-color-dot" title={option.name} style="background:{option.hex}"></span>
											<span class="style-contrast-name">{option.name}</span>
											<span class="contrast-pill" class:fail={checkContrast(option.hex, '#FFFFFF').level === 'Fail'}>{checkContrast(option.hex, '#FFFFFF').ratioDisplay} on white</span>
											<span class="contrast-pill" class:fail={checkContrast(option.hex, '#000000').level === 'Fail'}>{checkContrast(option.hex, '#000000').ratioDisplay} on black</span>
										</div>
									{/if}
								{/each}
							</div>
						{:else}
							<p class="field-hint">No restriction set yet. The manual will treat this style as allowing any brand color.</p>
						{/if}
					</div>
				</div>
				{#if error}<div class="modal-error">{error}</div>{/if}
			</div>
			<div class="modal-footer">
				<button class="action-btn" onclick={() => (showStyleModal = false)}>Cancel</button>
				<button class="action-btn action-btn-primary" onclick={saveStyle} disabled={saving || !styleForm.name.trim()}>
					{saving ? '…' : editingStyle ? 'Save' : 'Add style'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- ── Variable axes modal ─────────────────────────────────────────────────── -->
{#if showAxesModal}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={() => (showAxesModal = false)}>
		<div class="modal" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h2>Variable font axes</h2>
				<button class="modal-close" aria-label="Close" onclick={() => (showAxesModal = false)}>
					<IconX size={16} stroke={1.75} />
				</button>
			</div>
			<div class="modal-body">
				<p class="axes-hint">Define each axis supported by this variable font. Common axes: <code>wght</code> (weight), <code>wdth</code> (width), <code>ital</code> (italic), <code>slnt</code> (slant), <code>opsz</code> (optical size).</p>
				<div class="axes-list">
					{#each editingAxes as ax, i (i)}
						<div class="axis-row">
							<div class="axis-tag-wrap">
								<input class="axis-input axis-tag" bind:value={ax.tag} placeholder="wght" />
								<select class="axis-preset" onchange={(e) => applyCommonAxis(i, (e.target as HTMLSelectElement).value)} title="Fill from preset">
									<option value="">preset…</option>
									{#each COMMON_AXES as ca}
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
				<button class="text-btn mt-4" onclick={addAxis}>+ Add axis</button>
			</div>
			<div class="modal-footer">
				<button class="action-btn" onclick={() => (showAxesModal = false)}>Cancel</button>
				<button class="action-btn action-btn-primary" onclick={saveAxes} disabled={saving}>
					{saving ? '…' : 'Save axes'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- ── Confirm modal ────────────────────────────────────────────────────────── -->
{#if confirmModal}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={() => (confirmModal = null)}>
		<div class="modal modal-sm" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h2>{confirmModal.title}</h2>
				<button class="modal-close" aria-label="Close" onclick={() => (confirmModal = null)}><IconX size={16} stroke={1.75} /></button>
			</div>
			<div class="modal-body">
				<p style="font-size:0.9rem; color:var(--color-muted); line-height:1.5">{confirmModal.message}</p>
			</div>
			<div class="modal-footer">
				<button class="action-btn" onclick={() => (confirmModal = null)}>Cancel</button>
				<button class="action-btn action-btn-danger" onclick={() => { confirmModal!.onConfirm(); confirmModal = null; }}>Delete</button>
			</div>
		</div>
	</div>
{/if}

<!-- ── Glyph modal ──────────────────────────────────────────────────────────── -->
{#if glyphModal}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="modal-backdrop" onclick={() => (glyphModal = null)}>
			<div class="glyph-modal" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()}>
				<div class="glyph-modal-preview" style="font-family:{glyphModal.fontFamily}; font-weight:{glyphModal.weight}; font-style:{glyphModal.italic ? 'italic' : 'normal'}">
					{glyphModal.char}
				</div>
			<div class="glyph-modal-info">
				<span class="glyph-modal-code">{charCodeStr(glyphModal.char)}</span>
				<span class="glyph-modal-name">{glyphModal.fontName}</span>
			</div>
			<div class="glyph-modal-actions">
				<button class="action-btn" onclick={() => { navigator.clipboard.writeText(glyphModal!.char); }}>
					Copy glyph
				</button>
				<button class="action-btn" onclick={() => { navigator.clipboard.writeText(charCodeStr(glyphModal!.char)); }}>
					Copy code
				</button>
				<button class="action-btn" onclick={() => (glyphModal = null)}>Close</button>
			</div>
		</div>
	</div>
{/if}

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
	padding: 2rem 2rem 0; margin-bottom: 2rem; gap: 1rem;
}
.page-title { font-size: 1.5rem; font-weight: 650; letter-spacing: -0.025em; }
.page-sub { margin-top: 4px; font-size: 0.875rem; color: var(--color-muted); }
.topbar-actions { display: flex; gap: 8px; flex-shrink: 0; }

/* ── Empty state ──────────────────────────────────────────────────────────── */
.empty-state {
	display: flex; flex-direction: column; align-items: center;
	gap: 12px; padding: 5rem 2rem; text-align: center;
}
.empty-icon { margin-bottom: 4px; }
.empty-title { font-size: 0.9375rem; font-weight: 600; color: var(--color-text); }
.empty-sub { font-size: 0.875rem; color: var(--color-muted); max-width: 280px; line-height: 1.5; }

/* ── Font cards ───────────────────────────────────────────────────────────── */
	.fonts-list { display: flex; flex-direction: column; gap: 2rem; padding: 0 2rem 3rem; min-width: 0; }

.font-card {
	border: 1px solid var(--color-border);
		border-radius: 14px;
		overflow: hidden;
		background: var(--color-surface);
		min-width: 0;
	}

.font-card-header {
	display: flex; align-items: center; justify-content: space-between;
	padding: 1.25rem 1.5rem;
	border-bottom: 1px solid var(--color-border);
}
	.font-header-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
.font-header-actions { display: flex; align-items: center; gap: 6px; }

.role-badge {
	font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.06em;
	text-transform: uppercase; color: var(--role-color);
	background: color-mix(in srgb, var(--role-color) 12%, transparent);
	padding: 3px 8px; border-radius: 99px; white-space: nowrap;
}
.font-name { font-size: 0.9375rem; font-weight: 600; }
.font-meta { font-size: 0.8125rem; color: var(--color-muted); }

/* ── Specimen ─────────────────────────────────────────────────────────────── */
.font-specimen {
	display: flex; align-items: baseline; gap: 2rem;
	padding: 2rem 1.5rem 1.5rem;
	border-bottom: 1px solid var(--color-border);
}
.specimen-aa {
	font-size: 4rem; font-weight: 700; line-height: 1;
	color: var(--color-text); flex-shrink: 0;
}
.specimen-weights {
	display: flex; gap: 8px; flex-wrap: wrap; flex-shrink: 0;
}
.specimen-weight {
	font-size: 0.8125rem; color: var(--color-muted);
	background: var(--color-surface-raised);
	padding: 2px 8px; border-radius: 6px; border: 1px solid var(--color-border);
}
.specimen-abc {
	font-size: 0.9375rem; color: var(--color-text); line-height: 1.6;
	overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
	min-width: 0;
}

/* ── Role filter bar — stejný styl jako .ptab u barev ─────────────────────── */
.role-filter-bar {
	display: flex; align-items: center; gap: 2px;
	padding: 0 2rem;
	border-bottom: 1px solid var(--color-border);
	margin-bottom: 1.5rem; overflow-x: auto;
}
.role-filter-tab {
	display: flex; align-items: center; gap: 6px;
	padding: 8px 12px; border: none; background: none;
	color: var(--color-muted); cursor: pointer; font-size: 0.8125rem; font-weight: 500;
	border-bottom: 2px solid transparent; margin-bottom: -1px; white-space: nowrap;
	transition: color 0.1s, border-color 0.1s;
}
.role-filter-tab:hover { color: var(--color-text); }
.role-filter-tab.active { color: var(--brand); border-bottom-color: var(--brand); }
.role-filter-count {
	font-size: 0.6875rem; background: var(--color-surface-raised);
	border: 1px solid var(--color-border);
	border-radius: 20px; padding: 0 5px; line-height: 17px;
	color: var(--color-muted); font-weight: 500;
}
.role-filter-tab.active .role-filter-count {
	background: rgba(74,18,4,.08); border-color: rgba(74,18,4,.15); color: var(--brand);
}

/* ── Theme tabs ───────────────────────────────────────────────────────────── */
.section-body-no-pt { padding-top: 0; }
	.theme-tabs {
		display: flex; gap: 2px;
		padding: 10px 0 8px;
		border-bottom: 1px solid var(--color-border);
		margin-bottom: 12px;
		overflow-x: auto;
		scrollbar-width: none;
	}
	.theme-tabs::-webkit-scrollbar { display: none; }
.theme-tab {
	display: inline-flex; align-items: center; gap: 5px;
	height: 28px; padding: 0 10px; border-radius: 7px;
	border: 1.5px solid transparent; background: none;
	font-size: 0.8rem; font-weight: 500; cursor: pointer;
	color: var(--color-muted); transition: background 0.1s, color 0.1s, border-color 0.1s;
}
.theme-tab:hover { background: var(--color-surface-raised); color: var(--color-text); }
.theme-tab.active {
	background: color-mix(in srgb, var(--brand) 10%, transparent);
	color: var(--brand); border-color: color-mix(in srgb, var(--brand) 30%, transparent);
}
.theme-tab-light.active { background: #fefce8; color: #92400e; border-color: #fde68a; }
.theme-tab-dark.active  { background: #1e1b4b; color: #c4b5fd; border-color: #4c1d95; }
.theme-tab-count {
	font-size: 0.7rem; color: var(--color-muted);
	min-width: 12px; text-align: center;
}
	.theme-tab.active .theme-tab-count { color: var(--brand); opacity: 0.7; }
	.theme-tab-light.active .theme-tab-count { color: #92400e; }
	.theme-tab-dark.active .theme-tab-count { color: #c4b5fd; }

	.theme-badge {
		font-size: 0.625rem; padding: 1px 5px; border-radius: 4px;
		border: 1px solid var(--color-border); line-height: 1.4;
		white-space: nowrap; flex-shrink: 0;
	}
	.theme-badge-universal { background: var(--color-surface-raised); border-color: var(--color-border); color: var(--color-muted); }
	.theme-badge-light { background: #fefce8; border-color: #fde68a; color: #92400e; }
	.theme-badge-dark  { background: #ede9fe; border-color: #c4b5fd; color: #4c1d95; }

	/* ── Scale table ──────────────────────────────────────────────────────────── */
	.scale-table { display: flex; flex-direction: column; gap: 0; margin-bottom: 1rem; min-width: 0; }
	.scale-row {
		display: grid; grid-template-columns: 20px minmax(0, 1fr) 70px 70px 90px 90px 88px 56px;
		align-items: center; gap: 8px;
		padding: 6px 0; border-bottom: 1px solid var(--color-border);
		min-width: 0;
	}
.scale-row:last-child { border-bottom: none; }
.scale-row-header { font-size: 0.6875rem; font-weight: 600; color: var(--color-muted); letter-spacing: 0.04em; text-transform: uppercase; }
	.scale-preview {
		display: flex; align-items: baseline; gap: 8px;
		white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
		min-width: 0;
	}
.scale-tag {
	font-size: 0.6875rem; font-weight: 400; color: var(--color-muted);
	background: var(--color-surface-raised); padding: 1px 5px;
	border-radius: 4px; border: 1px solid var(--color-border);
	font-family: var(--font-mono); letter-spacing: 0; flex-shrink: 0;
}
.scale-val { font-size: 0.8125rem; color: var(--color-muted); font-variant-numeric: tabular-nums; }
.scale-muted { font-size: 0.75rem; color: var(--color-muted); }
.scale-btns { display: flex; gap: 4px; justify-content: flex-end; }
.style-color-dots { display: flex; align-items: center; gap: 4px; min-width: 0; }
.style-color-dot {
	display: inline-block; width: 14px; height: 14px; border-radius: 50%;
	border: 1px solid color-mix(in srgb, var(--color-border) 70%, #000);
	box-shadow: inset 0 0 0 1px rgba(255,255,255,.18);
	flex: 0 0 auto;
}
.style-color-more { font-size: 0.6875rem; color: var(--color-muted); }

/* ── DnD ──────────────────────────────────────────────────────────────────── */
.drag-handle {
	display: flex; align-items: center; justify-content: center;
	color: var(--color-border); cursor: grab; transition: color 0.1s;
}
.scale-row:hover .drag-handle { color: var(--color-muted); }
.drag-handle:active { cursor: grabbing; }
.scale-row.drag-over {
	border-top: 2px solid var(--brand);
	background: color-mix(in srgb, var(--brand) 5%, transparent);
}
.scale-row.dragging { opacity: 0.4; }

	/* ── Live preview ─────────────────────────────────────────────────────────── */
	.style-preview-toolbar {
		display: flex; align-items: center; justify-content: space-between;
		gap: 12px; margin: 0 0 8px;
	}
	.style-preview-title {
		font-size: 0.6875rem; font-weight: 700; color: var(--color-muted);
		text-transform: uppercase; letter-spacing: 0.05em;
	}
	.preview-theme-toggle {
		display: inline-flex; align-items: center; gap: 2px;
		padding: 2px; border: 1px solid var(--color-border);
		border-radius: 8px; background: var(--color-bg);
	}
	.preview-theme-btn {
		display: inline-flex; align-items: center; gap: 5px;
		height: 26px; padding: 0 9px; border: 1px solid transparent;
		border-radius: 6px; background: transparent; color: var(--color-muted);
		font-size: 0.75rem; font-weight: 600; transition: background 0.1s, color 0.1s, border-color 0.1s;
	}
	.preview-theme-btn:hover { color: var(--color-text); background: var(--color-surface-raised); }
	.preview-theme-btn.active {
		background: #fefce8; color: #92400e; border-color: #fde68a;
	}
	.preview-theme-btn-dark.active {
		background: #1e1b4b; color: #c4b5fd; border-color: #4c1d95;
	}
	.scale-preview-live {
		display: flex; flex-direction: column; gap: 0;
		padding: 1.25rem; background: var(--color-bg);
		border-radius: 10px; border: 1px solid var(--color-border);
		min-width: 0;
	}
	.scale-preview-live.preview-dark {
		background: #111; border-color: #333;
	}
	.scale-preview-live.preview-dark .preview-label { color: rgba(255,255,255,0.35); }
	.scale-preview-live.preview-dark .preview-text  { color: rgba(255,255,255,0.9); }
	.scale-preview-live.preview-dark .preview-row   { border-color: rgba(255,255,255,0.08); }
.preview-row {
	display: flex; align-items: baseline; gap: 1rem;
	padding: 6px 0; border-bottom: 1px solid var(--color-border);
}
.preview-row:last-child { border-bottom: none; }
.preview-label {
	font-size: 0.6875rem; font-weight: 600; color: var(--color-muted);
	text-transform: uppercase; letter-spacing: 0.04em;
	width: 56px; flex-shrink: 0; font-family: var(--font-mono);
}
	.preview-text { color: var(--color-text); min-width: 0; overflow-wrap: anywhere; }

.scale-empty { font-size: 0.875rem; color: var(--color-muted); }
.inline-btn {
	background: none; border: none; cursor: pointer; color: var(--brand);
	font-size: inherit; padding: 0; text-decoration: underline;
}

/* ── Type tester ──────────────────────────────────────────────────────────── */
.tester-slider {
	-webkit-appearance: none; width: 120px; height: 4px;
	background: var(--color-border); border-radius: 2px; outline: none; cursor: pointer;
}
.tester-slider::-webkit-slider-thumb {
	-webkit-appearance: none; width: 14px; height: 14px;
	border-radius: 50%; background: var(--brand); cursor: pointer;
}
.tester-text {
	min-height: 1.5em; color: var(--color-text); line-height: 1.2;
	outline: none; cursor: text; font-weight: 400; letter-spacing: -0.01em;
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
		width: 36px; height: 36px; font-size: 1.125rem;
		font-family: inherit; font-weight: inherit; font-style: inherit;
		background: var(--color-bg); border: 1px solid var(--color-border);
		border-radius: 6px; color: var(--color-text);
		transition: background 0.1s;
}
.glyph:hover { background: var(--color-surface-raised); }

/* ── Buttons ──────────────────────────────────────────────────────────────── */
.action-btn {
	display: inline-flex; align-items: center; gap: 6px;
	height: 34px; padding: 0 12px;
	background: var(--color-surface); border: 1px solid var(--color-border);
	border-radius: 8px; font-size: 0.8125rem; font-weight: 500;
	cursor: pointer; color: var(--color-text); white-space: nowrap;
	transition: background 0.1s, box-shadow 0.1s;
}
.action-btn:hover { background: var(--color-surface-raised); box-shadow: var(--shadow-sm); }
.action-btn:disabled { opacity: 0.5; pointer-events: none; }
.action-btn-primary { background: var(--brand); color: #fff; border-color: var(--brand); }
.action-btn-primary:hover { background: var(--brand-light); border-color: var(--brand-light); }

.icon-btn {
	display: flex; align-items: center; justify-content: center;
	width: 30px; height: 30px; border-radius: 7px; border: none;
	background: none; cursor: pointer; color: var(--color-muted);
	transition: background 0.1s, color 0.1s;
}
.icon-btn:hover { background: var(--color-surface-raised); color: var(--color-text); }
.icon-btn-danger:hover { color: var(--color-danger); }

.icon-btn-xs {
	display: flex; align-items: center; justify-content: center;
	width: 22px; height: 22px; border-radius: 5px; border: none;
	background: none; cursor: pointer; color: var(--color-muted);
	transition: background 0.1s, color 0.1s;
}
.icon-btn-xs:hover { background: var(--color-surface-raised); color: var(--color-text); }
.icon-btn-xs-danger:hover { color: var(--color-danger); }

.text-btn {
	background: none; border: none; cursor: pointer; color: var(--brand);
	font-size: 0.8125rem; font-weight: 500; padding: 0;
}
.text-btn:hover { text-decoration: underline; }
.text-btn:disabled { opacity: 0.5; pointer-events: none; }
.mt-4 { margin-top: 4px; display: block; }

/* ── Card fold ────────────────────────────────────────────────────────────── */
.font-card.collapsed { border-radius: 10px; }
.font-card.collapsed .font-card-header { border-bottom: none; border-radius: 10px; }

.font-card-header {
	cursor: pointer;
	user-select: none;
}
.font-card-header:hover { background: color-mix(in srgb, var(--color-surface-raised) 60%, transparent); }
/* No text cursor anywhere in the card header */
.font-card-header,
.font-card-header *  { cursor: pointer; user-select: none; }
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

.font-header-names { display: flex; flex-direction: column; gap: 1px; min-width: 0; }

.collapsed-preview {
	font-size: 1rem; color: var(--color-muted);
	margin-left: 12px; opacity: 0.6; white-space: nowrap;
	overflow: hidden; text-overflow: ellipsis;
}

.styles-count, .files-count {
	font-size: 0.6875rem; color: var(--color-muted);
	background: var(--color-surface-raised);
	border: 1px solid var(--color-border);
	padding: 2px 8px; border-radius: 99px;
	display: inline-flex; align-items: center; line-height: 1;
	height: 20px;
}

/* ── Card sections (foldable) ─────────────────────────────────────────────── */
.card-section {
	border-top: 1px solid var(--color-border);
}
.card-section:last-child { border-radius: 0 0 14px 14px; overflow: hidden; }

.section-summary {
	display: flex; align-items: center; gap: 8px;
	padding: 10px 1.5rem; cursor: pointer; list-style: none;
	transition: background 0.1s;
}
.section-summary::-webkit-details-marker { display: none; }
.section-summary::marker { display: none; }
.section-summary:hover { background: color-mix(in srgb, var(--color-surface-raised) 60%, transparent); }

.section-title {
	font-size: 0.75rem; font-weight: 600; color: var(--color-muted);
	letter-spacing: 0.05em; text-transform: uppercase;
}
.section-count {
	font-size: 0.6875rem; color: var(--color-muted);
	background: var(--color-surface-raised); border: 1px solid var(--color-border);
	padding: 1px 6px; border-radius: 99px; font-variant-numeric: tabular-nums;
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
.section-body { padding: 1rem 1.5rem 1.25rem; }
.section-body-no-pt { padding-top: 0; }

/* ── Modals ───────────────────────────────────────────────────────────────── */
.modal-backdrop {
	position: fixed; inset: 0; background: rgba(0,0,0,.45);
	display: flex; align-items: center; justify-content: center;
	z-index: 100; padding: 1rem;
}
.modal {
	background: var(--color-surface); border-radius: 14px;
	width: 100%; max-width: 520px; max-height: 90vh;
	display: flex; flex-direction: column;
	box-shadow: 0 24px 64px rgba(0,0,0,.2);
}
.modal-sm { max-width: 420px; }
.modal-header {
	display: flex; align-items: center; justify-content: space-between;
	padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--color-border);
}
.modal-header h2 { font-size: 1rem; font-weight: 600; }
.modal-close {
	display: flex; align-items: center; justify-content: center;
	width: 28px; height: 28px; border: none; background: none;
	cursor: pointer; color: var(--color-muted); border-radius: 6px;
}
.modal-close:hover { background: var(--color-surface-raised); }
.modal-body { padding: 1.5rem; overflow-y: auto; flex: 1; }
.modal-footer {
	display: flex; gap: 8px; justify-content: flex-end;
	padding: 1rem 1.5rem; border-top: 1px solid var(--color-border);
}
.modal-fields { display: flex; flex-direction: column; gap: 1rem; }
.modal-error { padding: 8px 12px; background: var(--color-danger-subtle); color: var(--color-danger); border-radius: 7px; font-size: 0.875rem; margin-top: 8px; }

/* ── Form fields ──────────────────────────────────────────────────────────── */
.field { display: flex; flex-direction: column; gap: 5px; }
.field label,
.field-label-text { font-size: 0.8125rem; font-weight: 500; color: var(--color-text); }
.field-hint { font-size: 0.75rem; color: var(--color-muted); margin-top: 2px; }
.req { color: var(--color-danger); }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field-sm { max-width: 100px; }
.field input, .field select {
	height: 36px; padding: 0 10px;
	border: 1.5px solid var(--color-border); border-radius: 8px;
	background: var(--color-surface); color: var(--color-text);
	font-size: 0.875rem; outline: none;
	transition: border-color 0.15s;
}
.field input:focus, .field select:focus { border-color: var(--brand); }

.allowed-color-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
	gap: 6px;
}
.allowed-color-option {
	display: grid; grid-template-columns: 18px minmax(0, 1fr) auto;
	align-items: center; gap: 7px; min-width: 0;
	min-height: 34px; padding: 6px 8px;
	border: 1.5px solid var(--color-border); border-radius: 8px;
	background: var(--color-surface); color: var(--color-text);
	font-size: 0.8125rem; text-align: left;
}
.allowed-color-option:hover { border-color: color-mix(in srgb, var(--brand) 35%, var(--color-border)); background: var(--color-surface-raised); }
.allowed-color-option.selected {
	border-color: var(--brand);
	background: color-mix(in srgb, var(--brand) 8%, transparent);
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
	font-size: 0.625rem; color: var(--color-muted);
	text-transform: uppercase; letter-spacing: 0.04em;
}
.style-contrast-list {
	display: flex; flex-direction: column; gap: 5px;
	margin-top: 8px;
}
.style-contrast-row {
	display: grid; grid-template-columns: 14px minmax(0, 1fr) auto auto;
	align-items: center; gap: 6px;
	min-width: 0; font-size: 0.75rem;
}
.style-contrast-name {
	min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
	color: var(--color-text);
}
.contrast-pill {
	padding: 2px 6px; border-radius: 999px;
	background: #ecfdf5; color: #047857;
	font-variant-numeric: tabular-nums; white-space: nowrap;
}
.contrast-pill.fail { background: #fef2f2; color: #b91c1c; }

/* ── Weights grid ─────────────────────────────────────────────────────────── */
.weights-grid { display: flex; flex-wrap: wrap; gap: 6px; }
.weight-chip {
	height: 32px; padding: 0 12px; border-radius: 8px;
	border: 1.5px solid var(--color-border); background: none;
	font-size: 0.8125rem; cursor: pointer; color: var(--color-text);
	transition: border-color 0.1s, background 0.1s, color 0.1s;
}
.weight-chip.selected {
	border-color: var(--brand); background: color-mix(in srgb, var(--brand) 10%, transparent);
	color: var(--brand);
}

/* ── Specimen layout ──────────────────────────────────────────────────────── */
.specimen-right { display: flex; flex-direction: column; gap: 8px; min-width: 0; flex: 1; }

/* ── Variable badge ───────────────────────────────────────────────────────── */
.variable-badge {
	display: inline-flex; align-items: center;
	font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.06em;
	text-transform: uppercase; color: #6366f1;
	background: color-mix(in srgb, #6366f1 12%, transparent);
	padding: 2px 7px; border-radius: 99px; white-space: nowrap;
}
.variable-badge-sm { font-size: 0.625rem; padding: 1px 6px; }

/* ── Font files ───────────────────────────────────────────────────────────── */
.files-section { padding: 1rem 1.5rem; border-bottom: 1px solid var(--color-border); }
.files-upload-btn { cursor: pointer; position: relative; }
.files-upload-btn.uploading { opacity: 0.6; pointer-events: none; }
.files-list { display: flex; flex-direction: column; gap: 2px; margin-top: 10px; }
.file-row {
	display: flex; align-items: center; gap: 10px;
	padding: 7px 10px; border-radius: 8px;
	background: var(--color-bg); border: 1px solid var(--color-border);
}
.file-format {
	font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.06em;
	color: var(--color-muted); background: var(--color-surface-raised);
	padding: 2px 7px; border-radius: 5px; border: 1px solid var(--color-border);
	flex-shrink: 0; width: 52px; text-align: center;
}
.file-name { font-size: 0.875rem; color: var(--color-text); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.file-size { font-size: 0.8125rem; color: var(--color-muted); flex-shrink: 0; font-variant-numeric: tabular-nums; }
.file-actions { display: flex; gap: 4px; flex-shrink: 0; }
.files-empty { font-size: 0.8125rem; color: var(--color-muted); margin-top: 8px; }
.files-empty code { font-family: var(--font-mono); font-size: 0.8125rem; color: var(--color-text); }

/* ── Variable axes modal ──────────────────────────────────────────────────── */
.axes-hint { font-size: 0.8125rem; color: var(--color-muted); margin-bottom: 1rem; line-height: 1.5; }
.axes-hint code { font-family: var(--font-mono); font-size: 0.8125rem; }
.axes-list { display: flex; flex-direction: column; gap: 8px; }
.axis-row {
	display: grid; grid-template-columns: 1fr 1fr 64px 64px 72px 30px;
	gap: 6px; align-items: center;
}
.axis-tag-wrap { display: flex; gap: 4px; }
.axis-input {
	height: 32px; padding: 0 8px;
	border: 1.5px solid var(--color-border); border-radius: 7px;
	background: var(--color-surface); color: var(--color-text);
	font-size: 0.8125rem; outline: none; width: 100%;
}
.axis-input:focus { border-color: var(--brand); }
.axis-tag { font-family: var(--font-mono); }
.axis-num { text-align: right; }
.axis-preset {
	height: 32px; padding: 0 4px;
	border: 1.5px solid var(--color-border); border-radius: 7px;
	background: var(--color-surface); color: var(--color-muted);
	font-size: 0.75rem; cursor: pointer; outline: none; flex-shrink: 0;
}

/* ── Toggle ───────────────────────────────────────────────────────────────── */
.toggle-label {
	display: flex; align-items: center; gap: 10px; cursor: pointer;
	font-size: 0.8125rem; font-weight: 500; color: var(--color-text);
	user-select: none;
}
.toggle-check { display: none; }
.toggle-track {
	width: 36px; height: 20px; border-radius: 99px;
	background: var(--color-border); transition: background 0.2s;
	position: relative; flex-shrink: 0;
}
.toggle-check:checked ~ .toggle-track { background: var(--brand); }
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
	font-size: 0.75rem; font-weight: 600; color: var(--color-muted);
	text-transform: uppercase; letter-spacing: 0.04em; flex-shrink: 0;
}
.tester-ctrl-val {
	font-size: 0.8125rem; color: var(--color-muted);
	font-variant-numeric: tabular-nums; width: 32px;
}
.tester-slider-wide { width: 160px; }
.tester-toggle-ctrl { cursor: pointer; }
.tester-weight-chips { display: flex; gap: 4px; flex-wrap: wrap; }
.weight-chip-sm {
	height: 26px; padding: 0 8px; border-radius: 6px;
	border: 1.5px solid var(--color-border); background: none;
	font-size: 0.75rem; cursor: pointer; color: var(--color-text);
	transition: border-color 0.1s, background 0.1s;
}
	.weight-chip-sm.selected {
		border-color: var(--brand);
		background: color-mix(in srgb, var(--brand) 10%, transparent);
		color: var(--brand);
	}
	.tester-dark .weight-chip-sm.selected {
		border-color: #7c3aed !important;
		background: rgba(124, 58, 237, 0.24) !important;
		color: #f5f3ff !important;
	}

/* ── OT features ──────────────────────────────────────────────────────────── */
.ot-features-row {
	display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
	padding-bottom: 12px; margin-bottom: 12px;
	border-bottom: 1px solid var(--color-border);
}
.ot-chip {
	height: 24px; padding: 0 8px; border-radius: 5px;
	border: 1.5px solid var(--color-border); background: none;
	font-size: 0.7rem; font-family: var(--font-mono); font-weight: 500;
	cursor: pointer; color: var(--color-muted);
	transition: border-color 0.1s, background 0.1s, color 0.1s;
}
.ot-chip:hover { border-color: var(--color-text); color: var(--color-text); }
	.ot-chip.ot-active {
		border-color: var(--brand); background: color-mix(in srgb, var(--brand) 10%, transparent);
		color: var(--brand);
	}
	.tester-dark .ot-chip.ot-active {
		border-color: #7c3aed !important;
		background: rgba(124, 58, 237, 0.24) !important;
		color: #f5f3ff !important;
	}

/* Dark tester toggle */
.toggle-track-dark { background: #374151; }
.toggle-check:checked ~ .toggle-track-dark { background: #4c1d95; }

/* Tester body dark mode transition */
.tester-section-body { transition: background 0.2s; }

/* ── Glyph set select ─────────────────────────────────────────────────────── */
.glyph-set-select {
	height: 28px; padding: 0 8px;
	border: 1.5px solid var(--color-border); border-radius: 7px;
	background: var(--color-surface); color: var(--color-text);
	font-size: 0.75rem; cursor: pointer; outline: none;
}
.glyph-set-select:focus { border-color: var(--brand); }

/* ── Glyphs as buttons ────────────────────────────────────────────────────── */
	.glyph {
		display: flex; align-items: center; justify-content: center;
		width: 36px; height: 36px; font-size: 1.125rem;
		font-family: inherit; font-weight: inherit; font-style: inherit;
		background: var(--color-bg); border: 1px solid var(--color-border);
		border-radius: 6px; color: var(--color-text); cursor: pointer;
		transition: background 0.1s, border-color 0.1s, transform 0.1s;
}
.glyph:hover {
	background: var(--color-surface-raised);
	border-color: var(--brand);
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
	display: flex; align-items: baseline; gap: 1rem;
	padding: 7px 0; border-bottom: 1px solid var(--color-border);
}
.fi-row:last-child { border-bottom: none; }
.fi-row-tags { align-items: center; }
.fi-label {
	font-size: 0.75rem; font-weight: 600; color: var(--color-muted);
	text-transform: uppercase; letter-spacing: 0.05em;
	width: 80px; flex-shrink: 0; font-family: var(--font-mono);
}
.fi-value { font-size: 0.875rem; color: var(--color-text); }
.fi-link {
	font-size: 0.8125rem; color: var(--brand); text-decoration: none;
	overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
	max-width: 400px;
}
.fi-link:hover { text-decoration: underline; }
.fi-tags { display: flex; gap: 4px; flex-wrap: wrap; }
.fi-tag {
	font-size: 0.75rem; padding: 2px 8px; border-radius: 6px;
	background: var(--color-surface-raised); border: 1px solid var(--color-border);
	color: var(--color-text); font-family: var(--font-mono);
}

/* ── Disabled order buttons ───────────────────────────────────────────────── */
.icon-btn-xs:disabled { opacity: 0.25; pointer-events: none; }

/* ── Glyph modal ──────────────────────────────────────────────────────────── */
.glyph-modal {
	background: var(--color-surface); border-radius: 16px;
	padding: 2.5rem 2rem 1.75rem;
	display: flex; flex-direction: column; align-items: center; gap: 1rem;
	box-shadow: 0 24px 64px rgba(0,0,0,.25);
	min-width: 240px;
}
.glyph-modal-preview {
	font-size: 8rem; line-height: 1; color: var(--color-text);
	user-select: all; text-align: center;
}
.glyph-modal-info {
	display: flex; flex-direction: column; align-items: center; gap: 4px;
}
.glyph-modal-code {
	font-family: var(--font-mono); font-size: 0.875rem;
	color: var(--brand); font-weight: 600;
}
.glyph-modal-name {
	font-size: 0.8125rem; color: var(--color-muted);
}
.glyph-modal-actions {
	display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;
	margin-top: 0.5rem;
}

	/* ── Responsive ───────────────────────────────────────────────────────────── */
	@media (max-width: 768px) {
		.page { max-width: 100%; padding: 0; }
		.topbar {
			padding: 1rem 1rem 0;
			margin-bottom: 1rem;
			flex-wrap: wrap;
		}
		.topbar-actions { width: 100%; justify-content: flex-start; flex-wrap: wrap; }
		.role-filter-bar {
			padding: 0 1rem;
			margin-bottom: 1rem;
			overflow-x: auto;
			scrollbar-width: none;
		}
		.role-filter-bar::-webkit-scrollbar { display: none; }
		.fonts-list { padding: 0 1rem 2rem; gap: 1rem; }
		.font-card { border-radius: 10px; }
		.font-card-header {
			align-items: flex-start;
			gap: 10px;
			padding: 1rem;
		}
		.font-header-actions {
			flex-wrap: wrap;
			justify-content: flex-end;
			max-width: 112px;
		}
		.collapsed-preview { display: none; }
		.font-specimen {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
			padding: 1.25rem 1rem;
		}
		.specimen-aa { font-size: 3.25rem; }
		.specimen-weights { flex-shrink: 1; }
		.specimen-abc {
			white-space: normal;
			overflow: visible;
			text-overflow: clip;
			overflow-wrap: anywhere;
		}
		.section-summary {
			padding: 10px 1rem;
			flex-wrap: wrap;
		}
		.section-actions {
			width: 100%;
			justify-content: flex-start;
			margin-left: 0;
		}
		.section-actions .text-btn {
			min-height: 32px;
			padding: 6px 9px;
			border: 1px solid var(--color-border);
			border-radius: 7px;
			background: var(--color-surface);
		}
		.section-body { padding: 1rem; }
		.section-body-no-pt { padding-top: 0; }
		.theme-tabs { margin-left: -1rem; margin-right: -1rem; padding-left: 1rem; padding-right: 1rem; }
		.scale-table { overflow-x: visible; }
		.scale-row {
			grid-template-columns: 20px minmax(0, 1fr) auto !important;
			grid-template-rows: auto auto;
			align-items: start;
			gap: 4px 8px;
			padding: 10px 0;
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
			font-size: 0.6875rem; color: var(--color-muted);
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
			padding: 10px 0;
		}
		.preview-label {
			width: auto;
			font-size: 0.625rem;
		}
		.files-section,
		.section-body { min-width: 0; }
		.file-row {
			display: grid;
			grid-template-columns: 52px minmax(0, 1fr) auto;
			gap: 6px 8px;
		}
		.file-actions { grid-column: 3; grid-row: 1 / 3; align-self: center; }
		.fi-row {
			display: grid;
			grid-template-columns: minmax(0, 1fr);
			gap: 3px;
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
		.glyph-controls-row { gap: 10px; }
		/* Weight chips wrap more aggressively */
		.tester-weight-chips { gap: 3px; }
		/* OT chips smaller */
		.ot-chip { padding: 0 6px; }
	}
</style>
