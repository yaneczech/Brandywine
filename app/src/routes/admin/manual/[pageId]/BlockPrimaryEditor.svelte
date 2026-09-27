<!--
  BlockPrimaryEditor — inline primary content editor for each block type.
  Shown expanded inside the block row in the main column.
  Props:
    block     — the block being edited
    cfg       — current config (from parent editingCfg)
    onUpdate  — called with updated config whenever a field changes
    onSave    — called when user clicks "Uložit"
    saving    — whether save is in progress
-->
<script lang="ts">
	import { ask, askText } from '$lib/ui/dialog.svelte';
	import * as m from '$lib/paraglide/messages';
	import { resolveColorPalette } from '$lib/manual/color-source';
	import { untrack } from 'svelte';
	import { IconCheck, IconPhoto, IconPlus, IconFolder } from '$lib/icons';
	import RichContentEditor from './RichContentEditor.svelte';
	import AssetPickerModal from '$lib/components/admin/AssetPickerModal.svelte';
	import ImageField from '$lib/components/admin/ImageField.svelte';
	import FolderPicker, { type FolderPickerItem } from '$lib/components/admin/FolderPicker.svelte';
	import { resolveEmbed } from '$lib/manual/embed';

	type Block = { id: string; type: string; config: Record<string, unknown>; anchor: string | null };

	const { block, cfg, onUpdate, onSave, saving = false, brandColors = [], brandFonts = [], brandPalettes = [] }: {
		block: Block;
		brandColors?: { id: string; name: string; hex: string }[];
		brandFonts?: { id: string; name: string }[];
		brandPalettes?: { id: string; name: string }[];
		cfg: Record<string, unknown>;
		onUpdate: (newCfg: Record<string, unknown>) => void;
		onSave: () => void;
		saving?: boolean;
	} = $props();

	// ── helpers ──────────────────────────────────────────────────────────────────
	function str(key: string): string   { return typeof cfg[key] === 'string'  ? (cfg[key] as string)  : ''; }
	function num(key: string, def = 0): number { return typeof cfg[key] === 'number'  ? (cfg[key] as number)  : def; }
	function bool(key: string, def = false): boolean { return typeof cfg[key] === 'boolean' ? (cfg[key] as boolean) : def; }

	function set(key: string, value: unknown) { onUpdate({ ...cfg, [key]: value }); }
	function setStr(e: Event, key: string) { set(key, (e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value); }
	function setNum(e: Event, key: string) { set(key, Number((e.target as HTMLInputElement).value)); }
	function setBool(e: Event, key: string) { set(key, (e.target as HTMLInputElement).checked); }

	// ── List types ────────────────────────────────────────────────────────────────
	type DoDontItem    = { text: string; type: 'do' | 'dont'; imageUrl?: string };
	type ProcessStep   = { title: string; description: string };
	type Card          = { title: string; description: string; imageUrl?: string };
	type AccordionItem = { question: string; answer: string };
	type TypoRule      = { category: string; rule: string; correct?: string; wrong?: string };
	type TypoLang      = { lang: string; label: string; rules: TypoRule[] };
	type StatItem      = { value: string; label: string; description?: string };
	type LinkItem      = { title: string; url: string; description?: string };
	type RatioItem     = { colorId: string; percent: number };
	type LogoFile      = { label: string; url: string };
	type UsageRow      = { label: string; fontIds: string[] };
	type LogoVariant   = { label: string; url: string; background: string; files: LogoFile[] };
	type Hotspot       = { x: number; y: number; title: string; text: string };

	let doDontItems    = $state<DoDontItem[]>([]);
	let processSteps   = $state<ProcessStep[]>([]);
	let cards          = $state<Card[]>([]);
	let accordionItems = $state<AccordionItem[]>([]);
	let tableHeaders   = $state<string[]>([]);
	let tableRows      = $state<string[][]>([]);
	let typoLangs      = $state<TypoLang[]>([]);
	let typoLangTab    = $state(0);
	let statItems      = $state<StatItem[]>([]);
	let linkItems      = $state<LinkItem[]>([]);
	let ratioItems     = $state<RatioItem[]>([]);
	let logoVariants   = $state<LogoVariant[]>([]);
	let usageRows      = $state<UsageRow[]>([]);
	let hotspots       = $state<Hotspot[]>([]);

	// Reset local list state only when block changes (untrack cfg to avoid loop)
	$effect(() => {
		block.id; // dependency
		untrack(() => {
			const a = <T>(k: string) => Array.isArray(cfg[k]) ? [...cfg[k] as T[]] : [];
			doDontItems    = a<DoDontItem>('items');
			processSteps   = a<ProcessStep>('steps');
			cards          = a<Card>('cards');
			accordionItems = a<AccordionItem>('items');
			tableHeaders   = a<string>('headers');
			tableRows      = a<string[]>('rows');
			typoLangs      = a<TypoLang>('languages');
			typoLangTab    = 0;
			statItems      = a<StatItem>('items');
			linkItems      = a<LinkItem>('items');
			ratioItems     = a<RatioItem>('items');
			usageRows      = a<UsageRow>('rows').map(r => ({ ...r, fontIds: Array.isArray(r.fontIds) ? r.fontIds : [] }));
			logoVariants   = a<LogoVariant>('variants').map(v => ({ ...v, files: Array.isArray(v.files) ? v.files : [] }));
			hotspots       = a<Hotspot>('points');
		});
	});

	// typo_rules helpers
	function updateTypoLangs(langs: TypoLang[]) { typoLangs = langs; onUpdate({ ...cfg, languages: langs }); }
	function updateTypoRules(langIdx: number, rules: TypoRule[]) {
		updateTypoLangs(typoLangs.map((l, i) => i === langIdx ? { ...l, rules } : l));
	}

	function updateRichContent(items: unknown[]) {
		const next = { ...cfg, content: items };
		delete (next as Record<string, unknown>)['markdown'];
		onUpdate(next);
	}

	// List mutation helpers — mutate local state then propagate
	function updateDoDont(newItems: DoDontItem[]) {
		doDontItems = newItems;
		onUpdate({ ...cfg, items: newItems });
	}
	function updateProcess(newSteps: ProcessStep[]) {
		processSteps = newSteps;
		onUpdate({ ...cfg, steps: newSteps });
	}
	function updateCards(newCards: Card[]) {
		cards = newCards;
		onUpdate({ ...cfg, cards: newCards });
	}
	function updateAccordion(newItems: AccordionItem[]) {
		accordionItems = newItems;
		onUpdate({ ...cfg, items: newItems });
	}
	function updateStats(items: StatItem[]) {
		statItems = items;
		onUpdate({ ...cfg, items });
	}
	function updateLinks(items: LinkItem[]) {
		linkItems = items;
		onUpdate({ ...cfg, items });
	}
	function updateUsage(rows: UsageRow[]) {
		usageRows = rows;
		onUpdate({ ...cfg, rows });
	}
	function toggleFontId(key: string, id: string, on: boolean) {
		const current = Array.isArray(cfg[key]) ? (cfg[key] as string[]) : [];
		set(key, on ? [...new Set([...current, id])] : current.filter(x => x !== id));
	}
	function updateVariants(variants: LogoVariant[]) {
		logoVariants = variants;
		onUpdate({ ...cfg, variants });
	}
	function patchVariant(i: number, patch: Partial<LogoVariant>) {
		updateVariants(logoVariants.map((v, j) => j === i ? { ...v, ...patch } : v));
	}
	function updateRatio(items: RatioItem[]) {
		ratioItems = items;
		onUpdate({ ...cfg, items });
	}
	const ratioTotal = $derived(ratioItems.reduce((sum, i) => sum + (Number(i.percent) || 0), 0));
	function updateHotspots(points: Hotspot[]) {
		hotspots = points;
		onUpdate({ ...cfg, points });
	}
	function addHotspotAt(e: MouseEvent) {
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10;
		const y = Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10;
		updateHotspots([...hotspots, { x, y, title: '', text: '' }]);
	}
	function moveItem<T>(items: T[], from: number, to: number): T[] {
		if (to < 0 || to >= items.length) return items;
		const next = [...items];
		const [moved] = next.splice(from, 1);
		next.splice(to, 0, moved);
		return next;
	}
	const embedHint = $derived(resolveEmbed(cfg['url']));

	function updateTable(headers: string[], rows: string[][]) {
		tableHeaders = headers;
		tableRows = rows;
		onUpdate({ ...cfg, headers, rows });
	}

	const chartPlaceholder = m.be_chart_placeholder();

	// ── Asset picker ──────────────────────────────────────────────────────────────
	// pickerTarget: which config key to fill when user picks an asset
	let pickerOpen   = $state(false);
	let pickerTarget = $state<string>('url');
	let pickerMime   = $state<'image' | 'all'>('image');

	function openPicker(targetKey: string, mime: 'image' | 'all' = 'image') {
		pickerTarget = targetKey;
		pickerMime = mime;
		pickerOpen = true;
	}

	function onAssetPick(url: string) {
		if (pickerTarget.startsWith('lv:')) {
			// lv:<variant> → variant file, lv:<variant>:<file> → extra file
			const [, vi, fi] = pickerTarget.split(':');
			const v = Number(vi);
			if (fi === undefined) patchVariant(v, { url });
			else patchVariant(v, { files: logoVariants[v].files.map((f, j) => j === Number(fi) ? { ...f, url, label: f.label || (url.split('.').pop() ?? '').toUpperCase() } : f) });
			pickerOpen = false;
			return;
		}
		if (pickerTarget.startsWith('dd:')) {
			const idx = Number(pickerTarget.slice(3));
			updateDoDont(doDontItems.map((x, j) => j === idx ? { ...x, imageUrl: url } : x));
			pickerOpen = false;
			return;
		}
		set(pickerTarget, url);
		pickerOpen = false;
	}

	// ── Folder picker ─────────────────────────────────────────────────────────────
	let folderList    = $state<FolderPickerItem[]>([]);
	let foldersLoaded = $state(false);
	let foldersLoading = $state(false);
	let folderPickerKey = $state<string | null>(null);

	async function openFolderPicker(key: string) {
		folderPickerKey = folderPickerKey === key ? null : key;
		if (!foldersLoaded && !foldersLoading) {
			foldersLoading = true;
			try {
				const r = await fetch('/api/folders');
				if (r.ok) folderList = await r.json();
				foldersLoaded = true;
			} finally {
				foldersLoading = false;
			}
		}
	}

	function pickFolder(key: string, id: string | null) {
		set(key, id ?? '');
		folderPickerKey = null;
	}

	function folderLabel(id: string): string {
		if (!id) return m.be_no_folder();
		return folderList.find(f => f.id === id)?.name ?? id.slice(0, 8) + '…';
	}
</script>

<div class="primary-editor">

<!-- ── rich_text ──────────────────────────────────────────────────────────────── -->
{#if block.type === 'rich_text'}
	{#key block.id}
		<RichContentEditor
			value={cfg['content']}
			legacyMarkdown={str('markdown')}
			onChange={updateRichContent}
		/>
	{/key}

<!-- ── image ─────────────────────────────────────────────────────────────────── -->
{:else if block.type === 'image'}
	<div class="fields">
		<ImageField label={m.be_image_url()} value={str('url')} onChoose={() => openPicker('url')} onChange={(v) => set('url', v)} />
		<div class="fields-row">
			<label class="field">
				<span>{m.be_alt()}</span>
				<input type="text" value={str('alt')} placeholder={m.be_alt_placeholder()} oninput={e => setStr(e, 'alt')} />
			</label>
			<label class="field">
				<span>{m.be_caption()} <span class="muted">{m.be_caption_hint()}</span></span>
				<input type="text" value={str('caption')} placeholder={m.be_caption_placeholder()} oninput={e => setStr(e, 'caption')} />
			</label>
		</div>
		<div class="fields-row">
			<label class="field checkbox">
				<input type="checkbox" checked={bool('fullWidth')} onchange={e => setBool(e, 'fullWidth')} />
				<span>{m.be_full_width()}</span>
			</label>
			<label class="field checkbox">
				<input type="checkbox" checked={bool('frame')} onchange={e => setBool(e, 'frame')} />
				<span>{m.be_background()}</span>
			</label>
			<label class="field checkbox">
				<input type="checkbox" checked={bool('zoom', true)} onchange={e => setBool(e, 'zoom')} />
				<span>{m.be_zoom()}</span>
			</label>
		</div>
		{#if bool('frame')}
			<div class="fields-row frame-opts">
				<label class="field">
					<span>{m.be_bg_color()}</span>
					<div class="color-row">
						<input type="color" value={str('frameBg') || '#ffffff'} oninput={e => setStr(e, 'frameBg')} class="color-swatch" />
						<input type="text" value={str('frameBg') || '#ffffff'} placeholder="#ffffff" oninput={e => setStr(e, 'frameBg')} class="color-text" />
					</div>
				</label>
				<label class="field">
					<span>{m.be_border_color()} <span class="muted">{m.be_border_hint()}</span></span>
					<div class="color-row">
						<input type="color" value={str('frameBorderColor') || '#e5e5e5'} oninput={e => setStr(e, 'frameBorderColor')} class="color-swatch" />
						<input type="text" value={str('frameBorderColor')} placeholder={m.be_no_border()} oninput={e => setStr(e, 'frameBorderColor')} class="color-text" />
					</div>
				</label>
			</div>
		{/if}
	</div>

<!-- ── image_gallery / carousel ──────────────────────────────────────────────── -->
{:else if block.type === 'image_gallery' || block.type === 'carousel'}
	<div class="fields">
		<div class="field">
			<span>{m.be_image_folder()}</span>
			<div class="folder-field">
				<div class="folder-selected">
					<IconFolder size={14} />
					<span class={str('folderId') ? '' : 'muted'}>{str('folderId') ? folderLabel(str('folderId')) : 'Žádný folder'}</span>
					<button type="button" class="btn-pick" onclick={() => openFolderPicker('folderId')}>
						{foldersLoading && folderPickerKey === 'folderId' ? '…' : folderPickerKey === 'folderId' ? m.common_close() : m.be_choose()}
					</button>
				</div>
				{#if folderPickerKey === 'folderId'}
					<div class="folder-panel">
						<FolderPicker
							folders={folderList}
							selectedId={str('folderId') || null}
							includeRoot={false}
							showCounts={true}
							onPick={(id) => pickFolder('folderId', id)}
						/>
					</div>
				{/if}
			</div>
		</div>
		{#if block.type === 'carousel'}
			<label class="field checkbox">
				<input type="checkbox" checked={bool('autoplay')} onchange={e => setBool(e, 'autoplay')} />
				<span>{m.be_autoplay()}</span>
			</label>
		{/if}
	</div>

<!-- ── before_after ──────────────────────────────────────────────────────────── -->
{:else if block.type === 'before_after'}
	<div class="fields fields-row">
		<div class="fields col">
			<ImageField label={m.be_before_url()} value={str('beforeUrl')} onChoose={() => openPicker('beforeUrl')} onChange={(v) => set('beforeUrl', v)} />
			<label class="field"><span>{m.be_before_label()}</span>
				<input type="text" value={str('beforeLabel')} placeholder={m.be_wrong()} oninput={e => setStr(e, 'beforeLabel')} /></label>
		</div>
		<div class="fields col">
			<ImageField label={m.be_after_url()} value={str('afterUrl')} onChoose={() => openPicker('afterUrl')} onChange={(v) => set('afterUrl', v)} />
			<label class="field"><span>{m.be_after_label()}</span>
				<input type="text" value={str('afterLabel')} placeholder={m.be_right()} oninput={e => setStr(e, 'afterLabel')} /></label>
		</div>
	</div>

<!-- ── colors ────────────────────────────────────────────────────────────────── -->
{:else if block.type === 'colors'}
	<div class="fields">
		<label class="field">
			<span>{m.be_source()}</span>
			<select value={resolveColorPalette(str('source'), brandPalettes)?.id ?? (str('source') || 'all')} onchange={e => setStr(e, 'source')}>
				<option value="all">{m.be_all_palettes()}</option>
				{#each brandPalettes as palette (palette.id)}
					<option value={palette.id}>{palette.name}</option>
				{/each}
				{#if str('source') && str('source') !== 'all' && !resolveColorPalette(str('source'), brandPalettes)}
					<option value={str('source')} disabled>Nedostupná paleta ({str('source')})</option>
				{/if}
			</select>
		</label>
		<label class="field">
			<span>{m.be_display()}</span>
			<select value={str('display') || 'cards'} onchange={e => setStr(e, 'display')}>
				<option value="cards">{m.be_colors_cards()}</option>
				<option value="swatches">{m.be_colors_swatch()}</option>
				<option value="compact">{m.be_colors_compact()}</option>
			</select>
		</label>
		<label class="field checkbox">
			<input type="checkbox" checked={bool('showContrast', true)} onchange={e => setBool(e, 'showContrast')} />
			<span>{m.be_show_wcag()}</span>
		</label>
		<label class="field checkbox">
			<input type="checkbox" checked={bool('showCodes', true)} onchange={e => setBool(e, 'showCodes')} />
			<span>{m.be_show_codes()}</span>
		</label>
		<label class="field checkbox">
			<input type="checkbox" checked={bool('showPaletteNames', true)} onchange={e => setBool(e, 'showPaletteNames')} />
			<span>{m.be_show_palette_names()}</span>
		</label>
		<label class="field checkbox">
			<input type="checkbox" checked={bool('showShades')} onchange={e => setBool(e, 'showShades')} />
			<span>{m.be_show_shades()}</span>
		</label>
	</div>

<!-- ── typography ────────────────────────────────────────────────────────────── -->
{:else if block.type === 'typography'}
	<div class="fields">
		{#if brandFonts.length > 1}
			<div class="field">
				<span>{m.be_shown_fonts()} <span class="muted">{m.be_shown_fonts_hint()}</span></span>
				<div class="chip-checks">
					{#each brandFonts as f (f.id)}
						<label class="chip-check">
							<input type="checkbox" checked={Array.isArray(cfg['fontIds']) && (cfg['fontIds'] as string[]).includes(f.id)}
								onchange={e => toggleFontId('fontIds', f.id, (e.target as HTMLInputElement).checked)} />
							<span>{f.name}</span>
						</label>
					{/each}
				</div>
			</div>
		{/if}
		<label class="field">
			<span>{m.be_font_desc()} <span class="muted">{m.be_font_desc_hint()}</span></span>
			<textarea rows={2} value={str('fontDescription')} placeholder={m.be_font_desc_placeholder()} oninput={e => setStr(e, 'fontDescription')}></textarea>
		</label>
		<label class="field checkbox">
			<input type="checkbox" checked={bool('allowDownload')} onchange={e => setBool(e, 'allowDownload')} />
			<span>{m.be_font_download()} <span class="muted">{m.be_font_download_hint()}</span></span>
		</label>
		<div class="fields-row">
			<label class="field checkbox"><input type="checkbox" checked={bool('showWeights', true)} onchange={e => setBool(e, 'showWeights')} /><span>{m.be_weights()}</span></label>
			<label class="field checkbox"><input type="checkbox" checked={bool('showInfo', true)} onchange={e => setBool(e, 'showInfo')} /><span>{m.be_info()}</span></label>
			<label class="field checkbox"><input type="checkbox" checked={bool('showGlyphs', true)} onchange={e => setBool(e, 'showGlyphs')} /><span>{m.be_glyphs()}</span></label>
			<label class="field checkbox"><input type="checkbox" checked={bool('showTester', true)} onchange={e => setBool(e, 'showTester')} /><span>Tester</span></label>
			<label class="field checkbox"><input type="checkbox" checked={bool('showStyles', true)} onchange={e => setBool(e, 'showStyles')} /><span>{m.be_style_table()}</span></label>
		</div>
	</div>

<!-- ── text_styles ───────────────────────────────────────────────────────────── -->
{:else if block.type === 'text_styles'}
	<div class="fields">
		<label class="field">
			<span>{m.be_description()}</span>
			<textarea rows={4} value={str('description')} placeholder={m.be_styles_placeholder()} oninput={e => setStr(e, 'description')}></textarea>
		</label>
	</div>

<!-- ── grid ──────────────────────────────────────────────────────────────────── -->
{:else if block.type === 'grid'}
	<div class="fields">
		<div class="fields-row">
			<label class="field">
				<span>{m.be_medium()}</span>
				<select value={str('medium') || 'web'} onchange={e => setStr(e, 'medium')}>
					<option value="web">Web</option>
					<option value="print">{m.be_print()}</option>
					<option value="social">Social media</option>
				</select>
			</label>
			{#if (str('medium') || 'web') === 'print'}
				<label class="field">
					<span>{m.be_format()}</span>
					<select value={str('format') || 'A4'} onchange={e => setStr(e, 'format')}>
						<option value="A4">A4</option>
						<option value="A3">A3</option>
						<option value="A5">A5</option>
						<option value="Letter">Letter</option>
					</select>
				</label>
				<label class="field">
					<span>{m.be_orientation()}</span>
					<select value={str('orientation') || 'portrait'} onchange={e => setStr(e, 'orientation')}>
						<option value="portrait">{m.be_portrait()}</option>
						<option value="landscape">{m.be_landscape()}</option>
					</select>
				</label>
			{:else if (str('medium') || 'web') === 'social'}
				<label class="field">
					<span>{m.be_format()}</span>
					<select value={str('format') || 'square'} onchange={e => setStr(e, 'format')}>
						<option value="square">{m.be_square()}</option>
						<option value="story">Story (9:16)</option>
					</select>
				</label>
			{:else}
				<label class="field">
					<span>{m.be_max_width()}</span>
					<input type="number" min={320} max={3840} value={num('maxWidth', 1280)} oninput={e => setNum(e, 'maxWidth')} />
				</label>
			{/if}
			<label class="field">
				<span>{m.be_units()}</span>
				<select value={str('unit') || ((str('medium')||'web')==='print' ? 'mm' : 'px')} onchange={e => setStr(e, 'unit')}>
					<option value="px">px</option>
					<option value="mm">mm</option>
					<option value="pt">pt</option>
				</select>
			</label>
		</div>
		<div class="fields-row">
			<label class="field">
				<span>{m.be_columns()}</span>
				<input type="number" min={1} max={24} value={num('columns', 12)} oninput={e => setNum(e, 'columns')} />
			</label>
			<label class="field">
				<span>{m.be_rows()} <span class="muted">{m.be_rows_hint()}</span></span>
				<input type="number" min={0} max={60} value={num('rows', 0)} oninput={e => setNum(e, 'rows')} />
			</label>
			<label class="field">
				<span>{m.be_gutter_cols()}</span>
				<input type="number" min={0} max={120} value={num('gutter', 24)} oninput={e => setNum(e, 'gutter')} />
			</label>
			{#if num('rows', 0) > 0}
				<label class="field">
					<span>{m.be_gutter_rows()}</span>
					<input type="number" min={0} max={120} value={num('gutterRow', num('gutter', 24))} oninput={e => setNum(e, 'gutterRow')} />
				</label>
			{/if}
			<label class="field">
				<span>Baseline grid <span class="muted">{m.be_baseline_hint()}</span></span>
				<input type="number" min={0} max={120} step={1} value={num('baselineGrid', 0)} oninput={e => setNum(e, 'baselineGrid')} />
			</label>
		</div>
		<!-- Margins -->
		{#if (str('medium') || 'web') === 'print'}
			<div class="field-group-label">{m.be_margins()}</div>
			<div class="fields-row">
				<label class="field">
					<span>{m.be_top()}</span>
					<input type="number" min={0} max={240} value={num('marginTop', num('margin', 20))} oninput={e => setNum(e, 'marginTop')} />
				</label>
				<label class="field">
					<span>{m.be_right_side()}</span>
					<input type="number" min={0} max={240} value={num('marginRight', num('margin', 20))} oninput={e => setNum(e, 'marginRight')} />
				</label>
				<label class="field">
					<span>{m.be_bottom()}</span>
					<input type="number" min={0} max={240} value={num('marginBottom', num('margin', 20))} oninput={e => setNum(e, 'marginBottom')} />
				</label>
				<label class="field">
					<span>{m.be_left_side()}</span>
					<input type="number" min={0} max={240} value={num('marginLeft', num('margin', 20))} oninput={e => setNum(e, 'marginLeft')} />
				</label>
			</div>
		{:else}
			<div class="fields-row">
				<label class="field">
					<span>{m.be_side_margin()}</span>
					<input type="number" min={0} max={240} value={num('margin', 40)} oninput={e => setNum(e, 'margin')} />
				</label>
			</div>
		{/if}
		<label class="field">
			<span>{m.be_usage()}</span>
			<textarea rows={2} value={str('description')} placeholder={m.be_grid_usage_placeholder()} oninput={e => setStr(e, 'description')}></textarea>
		</label>
	</div>

<!-- ── logo_spec ─────────────────────────────────────────────────────────────── -->
{:else if block.type === 'logo_spec'}
	<div class="fields">
		<ImageField label={m.be_logo_url()} value={str('logoUrl')} onChoose={() => openPicker('logoUrl')} onChange={(v) => set('logoUrl', v)} />
		<ImageField label={m.be_logo_dark()} hint={m.be_logo_dark_hint()} value={str('logoDarkUrl')} onChoose={() => openPicker('logoDarkUrl')} onChange={(v) => set('logoDarkUrl', v)} />
		<div class="fields-row">
			<label class="field">
				<span>{m.be_clear_space()}</span>
				<input type="number" step={0.1} min={0} max={10} value={num('clearspace', 1)} oninput={e => setNum(e, 'clearspace')} />
			</label>
			<label class="field">
				<span>{m.be_min_size_px()}</span>
				<input type="number" min={1} value={num('minSizePx', 24)} oninput={e => setNum(e, 'minSizePx')} />
			</label>
			<label class="field">
				<span>{m.be_min_size_mm()}</span>
				<input type="number" step={0.5} min={1} value={num('minSizeMm', 10)} oninput={e => setNum(e, 'minSizeMm')} />
			</label>
		</div>
		<label class="field">
			<span>{m.be_usage()}</span>
			<textarea rows={3} value={str('description')} oninput={e => setStr(e, 'description')}></textarea>
		</label>
	</div>

<!-- ── do_dont ───────────────────────────────────────────────────────────────── -->
{:else if block.type === 'do_dont'}
	<div class="list-editor">
	{#each doDontItems as item, i (i)}
			<div class="list-row">
				<select value={item.type}
					onchange={e => updateDoDont(doDontItems.map((x, j) => j === i ? { ...x, type: (e.target as HTMLSelectElement).value as 'do' | 'dont' } : x))}
					style="width:90px;flex-shrink:0">
					<option value="do">✅ Do</option>
					<option value="dont">❌ Don't</option>
				</select>
				<input type="text" value={item.text} placeholder={m.be_desc_placeholder()} style="flex:1"
					oninput={e => updateDoDont(doDontItems.map((x, j) => j === i ? { ...x, text: (e.target as HTMLInputElement).value } : x))} />
				{#if item.imageUrl}
					<button type="button" class="dd-thumb" onclick={() => openPicker(`dd:${i}`)} title={m.be_change_image()}>
						<img src={item.imageUrl} alt="" />
					</button>
					<button class="btn-ghost sm" onclick={() => updateDoDont(doDontItems.map((x, j) => j === i ? { ...x, imageUrl: '' } : x))} title={m.be_remove_image()}>⌫</button>
				{:else}
					<button type="button" class="btn-pick" onclick={() => openPicker(`dd:${i}`)} title={m.be_add_image_example()}><IconPhoto size={14} /></button>
				{/if}
				<button class="btn-ghost sm danger" onclick={() => updateDoDont(doDontItems.filter((_, j) => j !== i))}>✕</button>
			</div>
		{/each}
		<button class="btn-add" onclick={() => updateDoDont([...doDontItems, { type: 'do', text: '' }])}>{m.be_add_item()}</button>
	</div>

<!-- ── naming ────────────────────────────────────────────────────────────────── -->
{:else if block.type === 'naming'}
	{#key block.id}
		<RichContentEditor
			value={cfg['content']}
			legacyMarkdown={str('markdown')}
			onChange={updateRichContent}
		/>
	{/key}

<!-- ── icons ─────────────────────────────────────────────────────────────────── -->
{:else if block.type === 'icons'}
	<div class="fields">
		<div class="field">
			<span>{m.be_icon_folder()}</span>
			<div class="folder-field">
				<div class="folder-selected">
					<IconFolder size={14} />
					<span class={str('folderId') ? '' : 'muted'}>{str('folderId') ? folderLabel(str('folderId')) : 'Žádný folder'}</span>
					<button type="button" class="btn-pick" onclick={() => openFolderPicker('folderId-icons')}>
						{foldersLoading && folderPickerKey === 'folderId-icons' ? '…' : folderPickerKey === 'folderId-icons' ? 'Zavřít' : 'Vybrat'}
					</button>
				</div>
				{#if folderPickerKey === 'folderId-icons'}
					<div class="folder-panel">
						<FolderPicker
							folders={folderList}
							selectedId={str('folderId') || null}
							includeRoot={false}
							showCounts={true}
							onPick={(id) => pickFolder('folderId', id)}
						/>
					</div>
				{/if}
			</div>
		</div>
		<div class="fields-row">
			<label class="field">
				<span>{m.be_preview_size()}</span>
				<input type="number" min={16} max={128} value={num('size', 32)} oninput={e => setNum(e, 'size')} />
			</label>
		</div>
		<label class="field">
			<span>{m.be_description()}</span>
			<textarea rows={3} value={str('description')} oninput={e => setStr(e, 'description')}></textarea>
		</label>
	</div>

<!-- ── process ───────────────────────────────────────────────────────────────── -->
{:else if block.type === 'process'}
	<div class="list-editor">
	{#each processSteps as step, i (i)}
			<div class="process-row">
				<div class="step-num">{i + 1}</div>
				<div class="step-fields">
					<input type="text" value={step.title} placeholder={m.be_step_title()}
						oninput={e => updateProcess(processSteps.map((x, j) => j === i ? { ...x, title: (e.target as HTMLInputElement).value } : x))} />
					<textarea rows={2} value={step.description} placeholder={m.be_desc_placeholder()}
						oninput={e => updateProcess(processSteps.map((x, j) => j === i ? { ...x, description: (e.target as HTMLTextAreaElement).value } : x))}></textarea>
				</div>
				<button class="btn-ghost sm danger" onclick={() => updateProcess(processSteps.filter((_, j) => j !== i))}>✕</button>
			</div>
		{/each}
		<button class="btn-add" onclick={() => updateProcess([...processSteps, { title: '', description: '' }])}>{m.be_add_step()}</button>
	</div>

<!-- ── chart ─────────────────────────────────────────────────────────────────── -->
{:else if block.type === 'chart'}
	<div class="fields">
		<label class="field">
			<span>{m.be_dataset_label()}</span>
			<input type="text" value={str('datasetLabel')} placeholder="Brand" oninput={e => setStr(e, 'datasetLabel')} />
		</label>
		<label class="field">
			<span>{m.be_axes()} <span class="muted">{m.be_axes_hint()}</span></span>
			<textarea rows={7} value={str('data')} placeholder={chartPlaceholder} oninput={e => setStr(e, 'data')}></textarea>
		</label>
	</div>

<!-- ── table ─────────────────────────────────────────────────────────────────── -->
{:else if block.type === 'table'}
	<div class="fields">
		<label class="field">
			<span>{m.be_table_headers()} <span class="muted">{m.be_comma_hint()}</span></span>
			<input type="text"
				value={tableHeaders.join(', ')}
				oninput={e => updateTable((e.target as HTMLInputElement).value.split(',').map(s => s.trim()), tableRows)}
				placeholder={m.be_table_headers_placeholder()} />
		</label>
		<label class="field">
			<span>{m.be_rows()} <span class="muted">{m.be_table_rows_hint()}</span></span>
			<textarea rows={6}
				value={tableRows.map(r => r.join(', ')).join('\n')}
				oninput={e => updateTable(tableHeaders, (e.target as HTMLTextAreaElement).value.split('\n').filter(Boolean).map(r => r.split(',').map(s => s.trim())))}
				placeholder="Hodnota A, 100, Popis A&#10;Hodnota B, 200, Popis B"></textarea>
		</label>
	</div>

<!-- ── asset_gallery ─────────────────────────────────────────────────────────── -->
{:else if block.type === 'asset_gallery'}
	<div class="fields">
		<div class="field">
			<span>{m.be_folder()}</span>
			<div class="folder-field">
				<div class="folder-selected">
					<IconFolder size={14} />
					<span class={str('folderId') ? '' : 'muted'}>{str('folderId') ? folderLabel(str('folderId')) : m.be_all_folders()}</span>
					<button type="button" class="btn-pick" onclick={() => openFolderPicker('folderId-ag')}>
						{foldersLoading && folderPickerKey === 'folderId-ag' ? '…' : folderPickerKey === 'folderId-ag' ? 'Zavřít' : 'Vybrat'}
					</button>
				</div>
				{#if folderPickerKey === 'folderId-ag'}
					<div class="folder-panel">
						<FolderPicker
							folders={folderList}
							selectedId={str('folderId') || null}
							includeRoot={true}
							rootLabel="Všechny složky"
							showCounts={true}
							onPick={(id) => pickFolder('folderId', id)}
						/>
					</div>
				{/if}
			</div>
		</div>
		<label class="field">
			<span>{m.assets_upload_tags()} <span class="muted">{m.assets_upload_tags_hint()}</span></span>
			<input type="text" value={str('tags')} placeholder="logo, vector, print" oninput={e => setStr(e, 'tags')} />
		</label>
		<label class="field">
			<span>{m.be_layout()}</span>
			<select value={str('layout') || 'grid'} onchange={e => setStr(e, 'layout')}>
				<option value="grid">Grid</option>
				<option value="masonry">Masonry</option>
				<option value="list">{m.be_list()}</option>
			</select>
		</label>
	</div>

<!-- ── download ──────────────────────────────────────────────────────────────── -->
{:else if block.type === 'download'}
	<div class="fields">
		<label class="field">
			<span>{m.be_description()}</span>
			<textarea rows={3} value={str('description')} oninput={e => setStr(e, 'description')}></textarea>
		</label>
		<div class="field">
			<span>{m.be_folder()}</span>
			<div class="folder-field">
				<div class="folder-selected">
					<IconFolder size={14} />
					<span class={str('folderId') ? '' : 'muted'}>{str('folderId') ? folderLabel(str('folderId')) : m.be_all_folders()}</span>
					<button type="button" class="btn-pick" onclick={() => openFolderPicker('folderId-dl')}>
						{foldersLoading && folderPickerKey === 'folderId-dl' ? '…' : folderPickerKey === 'folderId-dl' ? 'Zavřít' : 'Vybrat'}
					</button>
				</div>
				{#if folderPickerKey === 'folderId-dl'}
					<div class="folder-panel">
						<FolderPicker
							folders={folderList}
							selectedId={str('folderId') || null}
							includeRoot={true}
							rootLabel="Všechny složky"
							showCounts={true}
							onPick={(id) => pickFolder('folderId', id)}
						/>
					</div>
				{/if}
			</div>
		</div>
		<label class="field">
			<span>{m.assets_upload_tags()} <span class="muted">{m.assets_upload_tags_hint()}</span></span>
			<input type="text" value={str('tags')} placeholder="logo, vector, print" oninput={e => setStr(e, 'tags')} />
		</label>
	</div>

<!-- ── accordion ─────────────────────────────────────────────────────────────── -->
{:else if block.type === 'accordion'}
	<div class="list-editor">
	{#each accordionItems as item, i (i)}
			<div class="process-row">
				<div class="step-fields">
					<input type="text" value={item.question} placeholder={m.be_question()}
						oninput={e => updateAccordion(accordionItems.map((x, j) => j === i ? { ...x, question: (e.target as HTMLInputElement).value } : x))} />
					<textarea rows={2} value={item.answer} placeholder={m.be_answer()}
						oninput={e => updateAccordion(accordionItems.map((x, j) => j === i ? { ...x, answer: (e.target as HTMLTextAreaElement).value } : x))}></textarea>
				</div>
				<button class="btn-ghost sm danger" onclick={() => updateAccordion(accordionItems.filter((_, j) => j !== i))}>✕</button>
			</div>
		{/each}
		<button class="btn-add" onclick={() => updateAccordion([...accordionItems, { question: '', answer: '' }])}>{m.be_add_item()}</button>
	</div>

<!-- ── cards ─────────────────────────────────────────────────────────────────── -->
{:else if block.type === 'cards'}
	<div class="list-editor">
	{#each cards as card, i (i)}
			<div class="process-row">
				<div class="step-fields">
					<input type="text" value={card.title} placeholder={m.be_title_placeholder()}
						oninput={e => updateCards(cards.map((x, j) => j === i ? { ...x, title: (e.target as HTMLInputElement).value } : x))} />
					<textarea rows={2} value={card.description} placeholder={m.be_desc_placeholder()}
						oninput={e => updateCards(cards.map((x, j) => j === i ? { ...x, description: (e.target as HTMLTextAreaElement).value } : x))}></textarea>
					<input type="text" value={card.imageUrl ?? ''} placeholder={m.be_image_url_optional()}
						oninput={e => updateCards(cards.map((x, j) => j === i ? { ...x, imageUrl: (e.target as HTMLInputElement).value } : x))} />
				</div>
				<button class="btn-ghost sm danger" onclick={() => updateCards(cards.filter((_, j) => j !== i))}>✕</button>
			</div>
		{/each}
		<button class="btn-add" onclick={() => updateCards([...cards, { title: '', description: '' }])}>{m.be_add_card()}</button>
	</div>

<!-- ── html ──────────────────────────────────────────────────────────────────── -->
{:else if block.type === 'html'}
	<div class="fields">
		<label class="field">
			<span>{m.be_html_code()}</span>
			<textarea class="code-area" rows={12} value={str('html')} placeholder="<div>…</div>" oninput={e => setStr(e, 'html')}></textarea>
		</label>
		<label class="field checkbox">
			<input type="checkbox" checked={bool('showPreview', true)} onchange={e => setBool(e, 'showPreview')} />
			<span>{m.be_live_preview()}</span>
		</label>
	</div>

<!-- ── code ──────────────────────────────────────────────────────────────────── -->
{:else if block.type === 'code'}
	<div class="fields">
		<label class="field">
			<span>{m.be_language()}</span>
			<select value={str('language') || 'text'} onchange={e => setStr(e, 'language')}>
				<option value="html">HTML</option>
				<option value="css">CSS</option>
				<option value="javascript">JavaScript</option>
				<option value="typescript">TypeScript</option>
				<option value="json">JSON</option>
				<option value="bash">Bash</option>
				<option value="text">{m.be_plain_text()}</option>
			</select>
		</label>
		<label class="field">
			<span>{m.be_code()}</span>
			<textarea class="code-area" rows={10} value={str('code')} placeholder={m.be_code_placeholder()} oninput={e => setStr(e, 'code')}></textarea>
		</label>
	</div>

<!-- ── divider ───────────────────────────────────────────────────────────────── -->
{:else if block.type === 'divider'}
	<div class="fields fields-row">
		<label class="field">
			<span>{m.be_style()}</span>
			<select value={str('style') || 'line'} onchange={e => setStr(e, 'style')}>
				<option value="line">{m.be_line()}</option>
				<option value="space">{m.be_space_only()}</option>
				<option value="dots">{m.be_dots()}</option>
			</select>
		</label>
		<label class="field">
			<span>{m.be_height_rem()}</span>
			<input type="number" step={0.5} min={1} max={20} value={num('spacing', 4)} oninput={e => setNum(e, 'spacing')} />
		</label>
	</div>

<!-- ── typo_rules ─────────────────────────────────────────────────────────────── -->
{:else if block.type === 'typo_rules'}
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

<!-- ── quote ─────────────────────────────────────────────────────────────────── -->
{:else if block.type === 'quote'}
	<div class="fields">
		<label class="field">
			<span>{m.be_quote()}</span>
			<textarea rows={3} value={str('quote')} placeholder={m.be_quote_placeholder()} oninput={e => setStr(e, 'quote')}></textarea>
		</label>
		<div class="fields-row">
			<label class="field">
				<span>{m.be_author()} <span class="muted">{m.common_optional()}</span></span>
				<input type="text" value={str('author')} placeholder={m.be_name()} oninput={e => setStr(e, 'author')} />
			</label>
			<label class="field">
				<span>{m.be_role()} <span class="muted">{m.common_optional()}</span></span>
				<input type="text" value={str('role')} placeholder="CEO, Brand strategy 2026" oninput={e => setStr(e, 'role')} />
			</label>
			<label class="field">
				<span>{m.be_size()}</span>
				<select value={str('size') || 'large'} onchange={e => setStr(e, 'size')}>
					<option value="large">{m.be_size_claim()}</option>
					<option value="normal">{m.be_size_quote()}</option>
				</select>
			</label>
		</div>
	</div>

<!-- ── callout ───────────────────────────────────────────────────────────────── -->
{:else if block.type === 'callout'}
	<div class="fields">
		<div class="tone-picker" role="radiogroup" aria-label={m.be_callout_type()}>
			{#each [['info', m.be_callout_info()], ['success', m.be_callout_tip()], ['warning', m.be_callout_warning()], ['danger', m.be_callout_prohibit()]] as [value, label] (value)}
				<label class="tone-opt tone-{value}" class:active={(str('tone') || 'info') === value}>
					<input type="radio" name="tone-{block.id}" {value} checked={(str('tone') || 'info') === value} onchange={() => set('tone', value)} />
					{label}
				</label>
			{/each}
		</div>
		<label class="field">
			<span>{m.be_title()}</span>
			<input type="text" value={str('title')} placeholder={m.be_callout_title_placeholder()} oninput={e => setStr(e, 'title')} />
		</label>
		<label class="field">
			<span>Text</span>
			<textarea rows={3} value={str('text')} placeholder={m.be_callout_text_placeholder()} oninput={e => setStr(e, 'text')}></textarea>
		</label>
	</div>

<!-- ── stats ─────────────────────────────────────────────────────────────────── -->
{:else if block.type === 'stats'}
	<div class="list-editor">
		{#each statItems as item, i (i)}
			<div class="process-row">
				<div class="step-num">{i + 1}</div>
				<div class="step-fields">
					<div class="inline-pair">
						<input type="text" class="stat-value-input" value={item.value} placeholder="120+"
							oninput={e => updateStats(statItems.map((x, j) => j === i ? { ...x, value: (e.target as HTMLInputElement).value } : x))} />
						<input type="text" value={item.label} placeholder={m.be_stat_label()}
							oninput={e => updateStats(statItems.map((x, j) => j === i ? { ...x, label: (e.target as HTMLInputElement).value } : x))} />
					</div>
					<input type="text" value={item.description ?? ''} placeholder={m.be_stat_note()}
						oninput={e => updateStats(statItems.map((x, j) => j === i ? { ...x, description: (e.target as HTMLInputElement).value } : x))} />
				</div>
				<div class="row-actions">
					<button class="btn-ghost sm" onclick={() => updateStats(moveItem(statItems, i, i - 1))} disabled={i === 0} aria-label={m.editor_move_up()}>↑</button>
					<button class="btn-ghost sm" onclick={() => updateStats(moveItem(statItems, i, i + 1))} disabled={i === statItems.length - 1} aria-label={m.editor_move_down()}>↓</button>
					<button class="btn-ghost sm danger" onclick={() => updateStats(statItems.filter((_, j) => j !== i))} aria-label={m.common_remove()}>✕</button>
				</div>
			</div>
		{/each}
		<button class="btn-add" onclick={() => updateStats([...statItems, { value: '', label: '' }])}>{m.be_add_stat()}</button>
	</div>

<!-- ── embed ─────────────────────────────────────────────────────────────────── -->
{:else if block.type === 'embed'}
	<div class="fields">
		<label class="field">
			<span>{m.be_embed_url()}</span>
			<input type="text" value={str('url')} placeholder="https://youtube.com/…, vimeo.com/…, figma.com/…, loom.com/… nebo /uploads/video.mp4" oninput={e => setStr(e, 'url')} />
			{#if str('url')}
				<small class="embed-status" class:ok={embedHint.kind !== 'none'}>
					{#if embedHint.kind === 'iframe'}{m.be_embed_recognised({ provider: embedHint.provider })}
					{:else if embedHint.kind === 'video'}{m.be_embed_video()}
					{:else}{m.be_embed_unsupported()}{/if}
				</small>
			{/if}
		</label>
		<div class="fields-row">
			<label class="field">
				<span>{m.be_aspect()}</span>
				<select value={str('ratio') || '16/9'} onchange={e => setStr(e, 'ratio')}>
					<option value="16/9">16 : 9</option>
					<option value="21/9">21 : 9</option>
					<option value="4/3">4 : 3</option>
					<option value="1/1">1 : 1</option>
					<option value="9/16">9 : 16 (story)</option>
				</select>
			</label>
			<label class="field">
				<span>{m.manual_field_title()} <span class="muted">{m.be_title_sr_hint()}</span></span>
				<input type="text" value={str('title')} placeholder="Brand film 2026" oninput={e => setStr(e, 'title')} />
			</label>
		</div>
		<label class="field">
			<span>{m.be_label()} <span class="muted">{m.be_caption_hint()}</span></span>
			<input type="text" value={str('caption')} placeholder={m.be_caption_placeholder()} oninput={e => setStr(e, 'caption')} />
		</label>
		{#if embedHint.kind === 'video'}
			<div class="fields-row">
				<label class="field checkbox"><input type="checkbox" checked={bool('autoplay')} onchange={e => setBool(e, 'autoplay')} /><span>{m.be_autoplay_muted()}</span></label>
				<label class="field checkbox"><input type="checkbox" checked={bool('loop')} onchange={e => setBool(e, 'loop')} /><span>{m.be_loop()}</span></label>
				<label class="field checkbox"><input type="checkbox" checked={bool('controls', true)} onchange={e => setBool(e, 'controls')} /><span>{m.be_controls()}</span></label>
			</div>
		{/if}
	</div>

<!-- ── text_image ────────────────────────────────────────────────────────────── -->
{:else if block.type === 'text_image'}
	<div class="fields">
		<label class="field">
			<span>{m.be_title()}</span>
			<input type="text" value={str('title')} placeholder={m.be_ti_title_placeholder()} oninput={e => setStr(e, 'title')} />
		</label>
		<div class="field">
			<span>Text</span>
			{#key block.id}
				<RichContentEditor value={cfg['content']} legacyMarkdown={str('markdown')} onChange={updateRichContent} />
			{/key}
		</div>
		<ImageField label={m.be_image()} value={str('imageUrl')} onChoose={() => openPicker('imageUrl')} onChange={(v) => set('imageUrl', v)} />
		<div class="fields-row">
			<label class="field">
				<span>{m.be_alt()}</span>
				<input type="text" value={str('alt')} placeholder={m.be_alt_placeholder()} oninput={e => setStr(e, 'alt')} />
			</label>
			<label class="field">
				<span>{m.be_image_position()}</span>
				<select value={str('imagePosition') || 'right'} onchange={e => setStr(e, 'imagePosition')}>
					<option value="right">{m.be_right_side()}</option>
					<option value="left">{m.be_left_side()}</option>
				</select>
			</label>
			<label class="field">
				<span>{m.be_crop()}</span>
				<select value={str('fit') || 'cover'} onchange={e => setStr(e, 'fit')}>
					<option value="cover">{m.be_fill()}</option>
					<option value="contain">{m.be_contain()}</option>
				</select>
			</label>
		</div>
		<div class="fields-row">
			<label class="field">
				<span>{m.be_button_text()} <span class="muted">{m.common_optional()}</span></span>
				<input type="text" value={str('ctaLabel')} placeholder={m.be_button_text_placeholder()} oninput={e => setStr(e, 'ctaLabel')} />
			</label>
			<label class="field">
				<span>{m.be_button_link()}</span>
				<input type="text" value={str('ctaUrl')} placeholder={m.be_button_link_placeholder()} oninput={e => setStr(e, 'ctaUrl')} />
			</label>
		</div>
	</div>

<!-- ── links ─────────────────────────────────────────────────────────────────── -->
{:else if block.type === 'links'}
	<div class="list-editor">
		{#each linkItems as item, i (i)}
			<div class="process-row">
				<div class="step-num">{i + 1}</div>
				<div class="step-fields">
					<div class="inline-pair">
						<input type="text" value={item.title} placeholder={m.be_link_title()}
							oninput={e => updateLinks(linkItems.map((x, j) => j === i ? { ...x, title: (e.target as HTMLInputElement).value } : x))} />
						<input type="text" value={item.url} placeholder="https://…"
							oninput={e => updateLinks(linkItems.map((x, j) => j === i ? { ...x, url: (e.target as HTMLInputElement).value } : x))} />
					</div>
					<input type="text" value={item.description ?? ''} placeholder={m.be_link_desc()}
						oninput={e => updateLinks(linkItems.map((x, j) => j === i ? { ...x, description: (e.target as HTMLInputElement).value } : x))} />
				</div>
				<div class="row-actions">
					<button class="btn-ghost sm" onclick={() => updateLinks(moveItem(linkItems, i, i - 1))} disabled={i === 0} aria-label={m.editor_move_up()}>↑</button>
					<button class="btn-ghost sm" onclick={() => updateLinks(moveItem(linkItems, i, i + 1))} disabled={i === linkItems.length - 1} aria-label={m.editor_move_down()}>↓</button>
					<button class="btn-ghost sm danger" onclick={() => updateLinks(linkItems.filter((_, j) => j !== i))} aria-label={m.common_remove()}>✕</button>
				</div>
			</div>
		{/each}
		<button class="btn-add" onclick={() => updateLinks([...linkItems, { title: '', url: '' }])}>{m.be_add_link()}</button>
	</div>

<!-- ── font_usage ────────────────────────────────────────────────────────────── -->
{:else if block.type === 'font_usage'}
	<div class="list-editor">
		{#if !brandFonts.length}
			<p class="muted" style="font-size:.85rem">{m.be_need_fonts()}</p>
		{/if}
		{#each usageRows as row, i (i)}
			<div class="variant-card">
				<div class="variant-head">
					<input type="text" value={row.label} placeholder={m.be_usage_context()}
						oninput={e => updateUsage(usageRows.map((r, j) => j === i ? { ...r, label: (e.target as HTMLInputElement).value } : r))} />
					<button class="btn-ghost sm" onclick={() => updateUsage(moveItem(usageRows, i, i - 1))} disabled={i === 0} aria-label={m.editor_move_up()}>↑</button>
					<button class="btn-ghost sm danger" onclick={() => updateUsage(usageRows.filter((_, j) => j !== i))} aria-label={m.common_remove()}>✕</button>
				</div>
				<div class="chip-checks">
					{#each brandFonts as f (f.id)}
						<label class="chip-check">
							<input type="checkbox" checked={row.fontIds.includes(f.id)}
								onchange={e => updateUsage(usageRows.map((r, j) => j === i ? { ...r, fontIds: (e.target as HTMLInputElement).checked ? [...r.fontIds, f.id] : r.fontIds.filter(x => x !== f.id) } : r))} />
							<span>{f.name}</span>
						</label>
					{/each}
				</div>
			</div>
		{/each}
		<button class="btn-add" onclick={() => updateUsage([...usageRows, { label: '', fontIds: brandFonts.map(f => f.id) }])}>{m.be_add_usage()}</button>
	</div>

<!-- ── logo_download ─────────────────────────────────────────────────────────── -->
{:else if block.type === 'logo_download'}
	<div class="fields">
		<p class="muted" style="font-size:.82rem;margin:0">{m.be_logo_download_hint()}</p>
		<div class="fields-row">
			<label class="field">
				<span>{m.be_min_height_px()}</span>
				<input type="number" min={1} value={num('minSizePx', 0) || ''} placeholder={m.be_eg_20()} oninput={e => setNum(e, 'minSizePx')} />
			</label>
			<label class="field">
				<span>{m.be_min_height_mm()}</span>
				<input type="number" min={1} value={num('minSizeMm', 0) || ''} placeholder={m.be_eg_15()} oninput={e => setNum(e, 'minSizeMm')} />
			</label>
		</div>
		<div class="list-editor">
			{#each logoVariants as v, i (i)}
				<div class="variant-card">
					<div class="variant-head">
						<input type="text" value={v.label} placeholder={m.be_variant_name()} oninput={e => patchVariant(i, { label: (e.target as HTMLInputElement).value })} />
						<select value={v.background || 'light'} onchange={e => patchVariant(i, { background: (e.target as HTMLSelectElement).value })} aria-label={m.be_preview_bg()}>
							<option value="light">{m.be_light_bg()}</option>
							<option value="dark">{m.be_dark_bg()}</option>
							{#each brandColors as bc (bc.id)}<option value={bc.hex}>{bc.name}</option>{/each}
						</select>
						<button class="btn-ghost sm" onclick={() => updateVariants(moveItem(logoVariants, i, i - 1))} disabled={i === 0} aria-label={m.editor_move_up()}>↑</button>
						<button class="btn-ghost sm danger" onclick={() => updateVariants(logoVariants.filter((_, j) => j !== i))} aria-label={m.be_remove_variant()}>✕</button>
					</div>
					<div class="input-with-btn">
						<input type="text" value={v.url} placeholder="/uploads/…logo.svg" oninput={e => patchVariant(i, { url: (e.target as HTMLInputElement).value })} />
						<button type="button" class="btn-pick" onclick={() => openPicker(`lv:${i}`)} title={m.editor_pick_asset()}><IconPhoto size={14} /></button>
					</div>
					{#if v.url}
						<div class="variant-preview" style="background:{v.background === 'dark' ? '#111' : /^#/.test(v.background) ? v.background : '#fff'}"><img src={v.url} alt="" /></div>
					{/if}
					{#each v.files as f, fi (fi)}
						<div class="list-row">
							<input type="text" value={f.label} placeholder={m.be_file_label()} style="width:140px;flex-shrink:0"
								oninput={e => patchVariant(i, { files: v.files.map((x, j) => j === fi ? { ...x, label: (e.target as HTMLInputElement).value } : x) })} />
							<input type="text" value={f.url} placeholder="/uploads/…" style="flex:1"
								oninput={e => patchVariant(i, { files: v.files.map((x, j) => j === fi ? { ...x, url: (e.target as HTMLInputElement).value } : x) })} />
							<button type="button" class="btn-pick" onclick={() => openPicker(`lv:${i}:${fi}`, 'all')} title={m.editor_pick_asset()}><IconPhoto size={14} /></button>
							<button class="btn-ghost sm danger" onclick={() => patchVariant(i, { files: v.files.filter((_, j) => j !== fi) })} aria-label={m.be_remove_file()}>✕</button>
						</div>
					{/each}
					<button class="btn-add sm-add" onclick={() => patchVariant(i, { files: [...v.files, { label: '', url: '' }] })}>{m.be_add_file()}</button>
				</div>
			{/each}
			<button class="btn-add" onclick={() => updateVariants([...logoVariants, { label: '', url: '', background: logoVariants.length % 2 ? 'dark' : 'light', files: [] }])}>{m.be_add_variant()}</button>
		</div>
	</div>

<!-- ── color_ratio ───────────────────────────────────────────────────────────── -->
{:else if block.type === 'color_ratio'}
	<div class="list-editor">
		{#if !brandColors.length}
			<p class="muted" style="font-size:.85rem">{m.be_need_colors()}</p>
		{/if}
		{#each ratioItems as item, i (i)}
			{@const c = brandColors.find(b => b.id === item.colorId)}
			<div class="ratio-row">
				<span class="ratio-swatch" style="background:{c?.hex ?? 'transparent'}"></span>
				<select value={item.colorId} onchange={e => updateRatio(ratioItems.map((x, j) => j === i ? { ...x, colorId: (e.target as HTMLSelectElement).value } : x))}>
					{#each brandColors as bc (bc.id)}<option value={bc.id}>{bc.name} · {bc.hex}</option>{/each}
				</select>
				<input type="number" min="0" max="100" value={item.percent}
					oninput={e => updateRatio(ratioItems.map((x, j) => j === i ? { ...x, percent: Number((e.target as HTMLInputElement).value) } : x))} />
				<span class="muted">%</span>
				<button class="btn-ghost sm danger" onclick={() => updateRatio(ratioItems.filter((_, j) => j !== i))} aria-label={m.common_remove()}>✕</button>
			</div>
		{/each}
		{#if ratioItems.length}
			<small class="ratio-total" class:warn={ratioTotal !== 100}>{m.be_ratio_total({ total: String(ratioTotal) })}{ratioTotal !== 100 ? m.be_ratio_normalised() : ''}</small>
		{/if}
		{#if brandColors.length}
			<button class="btn-add" onclick={() => updateRatio([...ratioItems, { colorId: brandColors[ratioItems.length % brandColors.length].id, percent: 10 }])}>{m.be_add_color()}</button>
		{/if}
	</div>

<!-- ── contrast_checker ──────────────────────────────────────────────────────── -->
{:else if block.type === 'contrast_checker'}
	<div class="fields">
		<p class="muted" style="font-size:.82rem;margin:0">{m.be_contrast_hint()}</p>
		<div class="fields-row">
			<label class="field">
				<span>{m.be_default_text()}</span>
				<div class="color-row">
					<input type="color" value={str('foreground') || '#171717'} oninput={e => setStr(e, 'foreground')} class="color-swatch" />
					<input type="text" value={str('foreground')} placeholder="#171717" oninput={e => setStr(e, 'foreground')} class="color-text" />
				</div>
			</label>
			<label class="field">
				<span>{m.be_default_bg()}</span>
				<div class="color-row">
					<input type="color" value={str('background') || '#ffffff'} oninput={e => setStr(e, 'background')} class="color-swatch" />
					<input type="text" value={str('background')} placeholder="#ffffff" oninput={e => setStr(e, 'background')} class="color-text" />
				</div>
			</label>
		</div>
		<label class="field">
			<span>{m.be_sample_text()} <span class="muted">{m.common_optional()}</span></span>
			<input type="text" value={str('sample')} placeholder={m.be_sample_text_placeholder()} oninput={e => setStr(e, 'sample')} />
		</label>
	</div>

<!-- ── hotspots ──────────────────────────────────────────────────────────────── -->
{:else if block.type === 'hotspots'}
	<div class="fields">
		<ImageField label={m.be_image()} value={str('imageUrl')} onChoose={() => openPicker('imageUrl')} onChange={(v) => set('imageUrl', v)} />
		{#if str('imageUrl')}
			<p class="muted" style="font-size:.8rem;margin:0">{m.be_hotspot_hint()}</p>
			<button type="button" class="hs-editor-stage" onclick={addHotspotAt} aria-label={m.be_hotspot_aria()}>
				<img src={str('imageUrl')} alt="" />
				{#each hotspots as p, i (i)}
					<span class="hs-editor-dot" style="left:{p.x}%;top:{p.y}%">{i + 1}</span>
				{/each}
			</button>
		{/if}
		<label class="field">
			<span>{m.be_alt()}</span>
			<input type="text" value={str('alt')} placeholder={m.be_alt_placeholder()} oninput={e => setStr(e, 'alt')} />
		</label>
		<div class="list-editor">
			{#each hotspots as p, i (i)}
				<div class="process-row">
					<div class="step-num">{i + 1}</div>
					<div class="step-fields">
						<input type="text" value={p.title} placeholder={m.be_hotspot_title()}
							oninput={e => updateHotspots(hotspots.map((x, j) => j === i ? { ...x, title: (e.target as HTMLInputElement).value } : x))} />
						<textarea rows={2} value={p.text} placeholder={m.be_explanation()}
							oninput={e => updateHotspots(hotspots.map((x, j) => j === i ? { ...x, text: (e.target as HTMLTextAreaElement).value } : x))}></textarea>
						<div class="inline-pair">
							<input type="number" min="0" max="100" step="0.5" value={p.x} aria-label="X %"
								oninput={e => updateHotspots(hotspots.map((x, j) => j === i ? { ...x, x: Number((e.target as HTMLInputElement).value) } : x))} />
							<input type="number" min="0" max="100" step="0.5" value={p.y} aria-label="Y %"
								oninput={e => updateHotspots(hotspots.map((x, j) => j === i ? { ...x, y: Number((e.target as HTMLInputElement).value) } : x))} />
						</div>
					</div>
					<button class="btn-ghost sm danger" onclick={() => updateHotspots(hotspots.filter((_, j) => j !== i))} aria-label={m.common_remove()}>✕</button>
				</div>
			{/each}
		</div>
		<label class="field checkbox">
			<input type="checkbox" checked={bool('showList', true)} onchange={e => setBool(e, 'showList')} />
			<span>{m.be_hotspot_list()}</span>
		</label>
	</div>

<!-- ── fallback ──────────────────────────────────────────────────────────────── -->
{:else}
	<div class="fields">
		<p class="muted" style="font-size:.85rem">{m.be_type()} <strong>{block.type}</strong> {m.be_no_editor()}</p>
		<label class="field">
			<span>Raw JSON config</span>
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

<!-- ── Save bar ───────────────────────────────────────────────────────────────── -->
<div class="save-bar">
	<button class="btn-save" onclick={onSave} disabled={saving}>
		<IconCheck size={14} /> {saving ? m.common_saving() : m.common_save()}
	</button>
</div>

</div>

<AssetPickerModal
	open={pickerOpen}
	mimeFilter={pickerMime}
	onPick={(url) => onAssetPick(url)}
	onClose={() => (pickerOpen = false)}
/>

<style>
/* One control language for every block form — mirrors the global .input */
.primary-editor :where(input[type="text"], input[type="number"], input:not([type]), select, textarea) {
	width: 100%;
	min-width: 0;
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
.primary-editor :where(textarea) { height: auto; min-height: 76px; padding: 8px 12px; line-height: var(--leading-normal); resize: vertical; }
.primary-editor :where(select) {
	appearance: none;
	padding-right: 32px;
	background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237a7a75' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
	background-repeat: no-repeat;
	background-position: right 10px center;
}
.primary-editor :where(input, select, textarea):hover:not(:focus):not(:disabled) { border-color: var(--color-border-strong); }
.primary-editor :where(input, select, textarea):focus { border-color: var(--color-border-focus); box-shadow: var(--focus-ring); }
.primary-editor :where(input[type="checkbox"], input[type="radio"]) { accent-color: var(--color-accent); width: 15px; height: 15px; }

.primary-editor {
	display: flex;
	flex-direction: column;
	gap: 12px;
}
.fields {
	display: flex;
	flex-direction: column;
	gap: var(--space-4);
}
.fields-row {
	display: flex;
	gap: var(--space-3);
	flex-wrap: wrap;
}
.fields-row .field { flex: 1; min-width: 160px; }
.field-group-label { font-size: var(--text-2xs); font-weight: 500; color: var(--color-muted); text-transform: uppercase; letter-spacing: var(--tracking-eyebrow); margin-top: 4px; }
.col { display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 200px; }

.field { display: flex; flex-direction: column; gap: 8px; font-size: var(--text-sm); }
.field > span { font-weight: 500; color: var(--color-text); letter-spacing: var(--tracking-snug); }
.field.checkbox { flex-direction: row; align-items: center; gap: 8px; }
.field.checkbox > span { font-weight: 400; }
.muted { color: var(--color-muted); font-weight: 400 !important; }

.field input[type="text"],
.field input[type="number"],
.field select,
.field textarea {
	width: 100%;
}
.field textarea { resize: vertical; }

.input-with-btn {
	display: flex;
	gap: 4px;
	align-items: center;
}
.input-with-btn input {
	flex: 1;
	min-width: 0;
}
.btn-pick {
	flex-shrink: 0;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 4px;
	height: 32px;
	padding: 0 8px;
	border: 1px solid var(--color-border);
	border-radius: var(--radius);
	background: var(--color-surface-raised);
	color: var(--color-muted);
	font-size: var(--text-xs);
	cursor: pointer;
	white-space: nowrap;
	font-family: inherit;
}
.btn-pick:hover {
	border-color: var(--color-border-strong);
	color: var(--color-text);
	background: color-mix(in srgb, var(--color-accent) 7%, var(--color-surface-raised));
}
.code-area { font-family: 'Fira Code', 'Cascadia Code', monospace; font-size: var(--text-sm); }


/* List editors */
.list-editor { display: flex; flex-direction: column; gap: 8px; }
.list-row { display: flex; align-items: center; gap: 8px; }
.list-row input {
	flex: 1;
}
.process-row {
	display: flex; align-items: flex-start; gap: 8px;
	border: 1px solid var(--color-border); border-radius: var(--radius); padding: 8px;
	background: var(--color-surface);
}
.step-num {
	min-width: 22px; padding-top: 8px;
	color: var(--color-accent); font-family: var(--font-mono);
	font-size: var(--text-xs); font-variant-numeric: tabular-nums; flex-shrink: 0;
}
.step-fields { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.step-fields input, .step-fields textarea { resize: vertical;
}

.btn-add {
	padding: 8px 12px; background: none;
	border: 1px dashed var(--color-border); border-radius: var(--radius);
	color: var(--color-muted); font-size: var(--text-sm); cursor: pointer; text-align: left;
}
.btn-add:hover { border-color: var(--color-border-strong); color: var(--color-text); }
.chip-checks { display: flex; flex-wrap: wrap; gap: 4px; }
.chip-check { display: inline-flex; align-items: center; gap: 4px; height: 30px; padding: 0 12px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-surface); font-size: var(--text-sm); cursor: pointer; }
.chip-check:has(input:checked) { border-color: var(--color-accent); background: color-mix(in srgb, var(--color-accent) 8%, var(--color-surface)); }
.chip-check input { accent-color: var(--color-accent); }
.variant-card { display: flex; flex-direction: column; gap: 8px; padding: 12px; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); }
.variant-head { display: flex; align-items: center; gap: 8px; }
.variant-head input { flex: 1; min-width: 0; font-weight: 600; }
.variant-preview { display: grid; place-items: center; height: 96px; border: 1px solid var(--color-border); border-radius: var(--radius); }
.variant-preview img { max-width: 70%; max-height: 64px; }
.sm-add { padding: 4px 8px; font-size: var(--text-xs); }
.dd-thumb { width: 36px; height: 36px; flex: 0 0 auto; padding: 4px; border: 1px solid var(--color-border); border-radius: var(--radius); background: #fff; cursor: pointer; }
.dd-thumb img { width: 100%; height: 100%; object-fit: contain; }
.ratio-row { display: flex; align-items: center; gap: 8px; }
.ratio-row select { flex: 1; min-width: 0; }
.ratio-row input { width: 72px; }
.ratio-swatch { width: 22px; height: 22px; flex: 0 0 auto; border-radius: 50%; border: 1px solid var(--color-border); }
.ratio-total { font-size: var(--text-xs); color: var(--color-success); }
.ratio-total.warn { color: var(--color-warning); }
.hs-editor-stage { position: relative; display: block; width: 100%; padding: 0; border: 1px solid var(--color-border); border-radius: var(--radius); background: none; cursor: crosshair; overflow: hidden; }
.hs-editor-stage img { display: block; width: 100%; height: auto; }
.hs-editor-dot { position: absolute; display: grid; place-items: center; width: 24px; height: 24px; transform: translate(-50%, -50%); border: 2px solid #fff; border-radius: 50%; background: var(--color-accent); color: var(--color-accent-contrast); font-size: var(--text-2xs); font-weight: 600; pointer-events: none; }
.inline-pair { display: grid; grid-template-columns: minmax(90px, 140px) minmax(0, 1fr); gap: 8px; }
.inline-pair .stat-value-input { font-weight: 600; }
.row-actions { display: flex; flex-direction: column; gap: 4px; }
.embed-status { color: var(--color-warning); font-size: var(--text-xs); }
.embed-status.ok { color: var(--color-success); }
.tone-picker { display: flex; flex-wrap: wrap; gap: 8px; }
.tone-opt {
	display: inline-flex; align-items: center; gap: 8px; height: 32px; padding: 0 12px;
	border: 1px solid var(--color-border); border-radius: var(--radius-full); font-size: var(--text-sm); cursor: pointer;
	background: var(--color-surface);
}
.tone-opt input { position: absolute; opacity: 0; pointer-events: none; }
.tone-opt::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: var(--tone); }
.tone-opt.tone-info { --tone: var(--color-info); }
.tone-opt.tone-success { --tone: var(--color-success); }
.tone-opt.tone-warning { --tone: var(--color-warning); }
.tone-opt.tone-danger { --tone: var(--color-danger); }
.tone-opt.active { border-color: var(--tone); background: color-mix(in srgb, var(--tone) 8%, var(--color-surface)); font-weight: 500; }
.tone-opt:has(input:focus-visible) { outline: 2px solid var(--color-accent); outline-offset: 2px; }

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

.btn-ghost { display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; background: none; border: none; border-radius: var(--radius-sm); cursor: pointer; color: var(--color-muted); font-size: var(--text-sm); }
.btn-ghost.sm { padding: 4px 4px; font-size: var(--text-xs); }
.btn-ghost.danger:hover { color: var(--color-danger); }

/* ── typo_rules editor ────────────────────────────────────────────────────── */
.typo-lang-bar {
	display: flex; align-items: center; gap: 4px; flex-wrap: wrap;
	border-bottom: 1px solid var(--color-border); padding-bottom: 4px; margin-bottom: 8px;
}
.typo-lang-tab {
	padding: 4px 12px; font-size: var(--text-sm); font-weight: 500; border: none;
	background: transparent; color: var(--color-muted); cursor: pointer;
	border-bottom: 2px solid transparent; margin-bottom: -4px; border-radius: 0;
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
.typo-rule-fields input { width: 100%;
}
.rule-cat { font-weight: 600 !important; }
.rule-examples { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }

/* ── color row (frame bg / border) ──────────────────────────────────────── */
.frame-opts { align-items: flex-start; }
.color-row { display: flex; align-items: center; gap: 8px; }
.color-swatch { width: 32px; height: 32px; padding: 4px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); cursor: pointer; background: none; flex-shrink: 0; }
.color-text { flex: 1; padding: 8px 8px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-size: var(--text-base); background: var(--color-surface); color: var(--color-text); outline: none; font-family: monospace; }
.color-text:focus { border-color: var(--color-border-focus); box-shadow: var(--focus-ring); }

/* ── folder picker ───────────────────────────────────────────────────────── */
.folder-field { display: flex; flex-direction: column; gap: 4px; }
.folder-selected {
	display: flex; align-items: center; gap: 8px;
	padding: 8px 12px;
	border: 1px solid var(--color-border); border-radius: var(--radius);
	background: var(--color-surface); font-size: var(--text-base);
	cursor: default;
}
.folder-selected :global(svg) { color: var(--color-muted); flex-shrink: 0; }
.folder-selected > span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.folder-panel {
	border: 1px solid var(--color-border); border-radius: var(--radius);
	background: var(--color-surface);
	box-shadow: 0 4px 16px rgba(0,0,0,.1);
	overflow: hidden;
	padding: 8px 0;
}
</style>
