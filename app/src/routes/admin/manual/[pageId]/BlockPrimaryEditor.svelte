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
	import { untrack } from 'svelte';
	import { IconCheck, IconPhoto, IconPlus, IconFolder } from '@tabler/icons-svelte';
	import RichContentEditor from './RichContentEditor.svelte';
	import AssetPickerModal from '$lib/components/admin/AssetPickerModal.svelte';
	import FolderPicker, { type FolderPickerItem } from '$lib/components/admin/FolderPicker.svelte';

	type Block = { id: string; type: string; config: Record<string, unknown>; anchor: string | null };

	const { block, cfg, onUpdate, onSave, saving = false }: {
		block: Block;
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
	type DoDontItem    = { text: string; type: 'do' | 'dont' };
	type ProcessStep   = { title: string; description: string };
	type Card          = { title: string; description: string; imageUrl?: string };
	type AccordionItem = { question: string; answer: string };
	type TypoRule      = { category: string; rule: string; correct?: string; wrong?: string };
	type TypoLang      = { lang: string; label: string; rules: TypoRule[] };

	let doDontItems    = $state<DoDontItem[]>([]);
	let processSteps   = $state<ProcessStep[]>([]);
	let cards          = $state<Card[]>([]);
	let accordionItems = $state<AccordionItem[]>([]);
	let tableHeaders   = $state<string[]>([]);
	let tableRows      = $state<string[][]>([]);
	let typoLangs      = $state<TypoLang[]>([]);
	let typoLangTab    = $state(0);

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
	function updateTable(headers: string[], rows: string[][]) {
		tableHeaders = headers;
		tableRows = rows;
		onUpdate({ ...cfg, headers, rows });
	}

	const pinsPlaceholder = '[{"x":50,"y":30,"text":"Ochranná zóna"}]';
	const chartPlaceholder = 'Moderní:85\nTradiční:30\nHravý:60\nSeriózní:70\nPřátelský:90\nFormální:40';

	// ── Asset picker ──────────────────────────────────────────────────────────────
	// pickerTarget: which config key to fill when user picks an asset
	let pickerOpen   = $state(false);
	let pickerTarget = $state<string>('url');

	function openPicker(targetKey: string) {
		pickerTarget = targetKey;
		pickerOpen = true;
	}

	function onAssetPick(url: string) {
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
		if (!id) return 'Žádný folder';
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
		<div class="field">
			<span>URL obrázku</span>
			<div class="input-with-btn">
				<input type="text" value={str('url')} placeholder="/uploads/…" oninput={e => setStr(e, 'url')} />
				<button type="button" class="btn-pick" onclick={() => openPicker('url')} title="Vybrat z assetů">
					<IconPhoto size={14} />
				</button>
			</div>
		</div>
		{#if str('url')}
			<div class="img-preview">
				<img src={str('url')} alt="preview"
					onerror={(e) => (e.currentTarget as HTMLImageElement).style.display='none'} />
			</div>
		{/if}
		<div class="fields-row">
			<label class="field">
				<span>Alternativní text</span>
				<input type="text" value={str('alt')} placeholder="Popis obrázku" oninput={e => setStr(e, 'alt')} />
			</label>
			<label class="field">
				<span>Titulek <span class="muted">(caption)</span></span>
				<input type="text" value={str('caption')} placeholder="Volitelný popis…" oninput={e => setStr(e, 'caption')} />
			</label>
		</div>
		<div class="fields-row">
			<label class="field checkbox">
				<input type="checkbox" checked={bool('fullWidth')} onchange={e => setBool(e, 'fullWidth')} />
				<span>Celá šířka</span>
			</label>
			<label class="field checkbox">
				<input type="checkbox" checked={bool('frame')} onchange={e => setBool(e, 'frame')} />
				<span>Pozadí</span>
			</label>
		</div>
		{#if bool('frame')}
			<div class="fields-row frame-opts">
				<label class="field">
					<span>Barva pozadí</span>
					<div class="color-row">
						<input type="color" value={str('frameBg') || '#ffffff'} oninput={e => setStr(e, 'frameBg')} class="color-swatch" />
						<input type="text" value={str('frameBg') || '#ffffff'} placeholder="#ffffff" oninput={e => setStr(e, 'frameBg')} class="color-text" />
					</div>
				</label>
				<label class="field">
					<span>Barva okraje <span class="muted">(prázdné = bez okraje)</span></span>
					<div class="color-row">
						<input type="color" value={str('frameBorderColor') || '#e5e5e5'} oninput={e => setStr(e, 'frameBorderColor')} class="color-swatch" />
						<input type="text" value={str('frameBorderColor')} placeholder="— bez okraje" oninput={e => setStr(e, 'frameBorderColor')} class="color-text" />
					</div>
				</label>
			</div>
		{/if}
	</div>

<!-- ── image_gallery / carousel ──────────────────────────────────────────────── -->
{:else if block.type === 'image_gallery' || block.type === 'carousel'}
	<div class="fields">
		<div class="field">
			<span>Folder s obrázky</span>
			<div class="folder-field">
				<div class="folder-selected">
					<IconFolder size={14} />
					<span class={str('folderId') ? '' : 'muted'}>{str('folderId') ? folderLabel(str('folderId')) : 'Žádný folder'}</span>
					<button type="button" class="btn-pick" onclick={() => openFolderPicker('folderId')}>
						{foldersLoading && folderPickerKey === 'folderId' ? '…' : folderPickerKey === 'folderId' ? 'Zavřít' : 'Vybrat'}
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
				<span>Automatické přehrávání</span>
			</label>
		{/if}
	</div>

<!-- ── before_after ──────────────────────────────────────────────────────────── -->
{:else if block.type === 'before_after'}
	<div class="fields fields-row">
		<div class="fields col">
			<div class="field">
				<span>Obrázek PŘED — URL</span>
				<div class="input-with-btn">
					<input type="text" value={str('beforeUrl')} placeholder="/uploads/…" oninput={e => setStr(e, 'beforeUrl')} />
					<button type="button" class="btn-pick" onclick={() => openPicker('beforeUrl')} title="Vybrat z assetů">
						<IconPhoto size={14} />
					</button>
				</div>
			</div>
			<label class="field"><span>Popisek PŘED</span>
				<input type="text" value={str('beforeLabel')} placeholder="Špatně" oninput={e => setStr(e, 'beforeLabel')} /></label>
		</div>
		<div class="fields col">
			<div class="field">
				<span>Obrázek PO — URL</span>
				<div class="input-with-btn">
					<input type="text" value={str('afterUrl')} placeholder="/uploads/…" oninput={e => setStr(e, 'afterUrl')} />
					<button type="button" class="btn-pick" onclick={() => openPicker('afterUrl')} title="Vybrat z assetů">
						<IconPhoto size={14} />
					</button>
				</div>
			</div>
			<label class="field"><span>Popisek PO</span>
				<input type="text" value={str('afterLabel')} placeholder="Správně" oninput={e => setStr(e, 'afterLabel')} /></label>
		</div>
	</div>

<!-- ── colors ────────────────────────────────────────────────────────────────── -->
{:else if block.type === 'colors'}
	<div class="fields">
		<label class="field">
			<span>Zdroj</span>
			<select value={str('source') || 'all'} onchange={e => setStr(e, 'source')}>
				<option value="all">Všechny palety</option>
				<option value="primary">Primární paleta</option>
				<option value="secondary">Sekundární paleta</option>
				<option value="accent">Doplňkové barvy</option>
			</select>
		</label>
		<label class="field checkbox">
			<input type="checkbox" checked={bool('showContrast')} onchange={e => setBool(e, 'showContrast')} />
			<span>Zobrazit WCAG kontrast</span>
		</label>
		<label class="field checkbox">
			<input type="checkbox" checked={bool('showCodes')} onchange={e => setBool(e, 'showCodes')} />
			<span>Zobrazit kódy barev (HEX, RGB, CMYK)</span>
		</label>
		<label class="field checkbox">
			<input type="checkbox" checked={bool('showPaletteNames', true)} onchange={e => setBool(e, 'showPaletteNames')} />
			<span>Zobrazit názvy palet</span>
		</label>
		<label class="field checkbox">
			<input type="checkbox" checked={bool('showShades')} onchange={e => setBool(e, 'showShades')} />
			<span>Zobrazit paletu odstínů (100–900)</span>
		</label>
	</div>

<!-- ── typography ────────────────────────────────────────────────────────────── -->
{:else if block.type === 'typography'}
	<div class="fields">
		<label class="field checkbox">
			<input type="checkbox" checked={bool('showSpecimen')} onchange={e => setBool(e, 'showSpecimen')} />
			<span>Zobrazit specimenový text</span>
		</label>
		<label class="field checkbox">
			<input type="checkbox" checked={bool('showStyles')} onchange={e => setBool(e, 'showStyles')} />
			<span>Zobrazit tabulku stylů</span>
		</label>
	</div>

<!-- ── text_styles ───────────────────────────────────────────────────────────── -->
{:else if block.type === 'text_styles'}
	<div class="fields">
		<label class="field">
			<span>Popis</span>
			<textarea rows={4} value={str('description')} placeholder="Jak kombinovat nadpisy a odstavce…" oninput={e => setStr(e, 'description')}></textarea>
		</label>
	</div>

<!-- ── grid ──────────────────────────────────────────────────────────────────── -->
{:else if block.type === 'grid'}
	<div class="fields">
		<div class="fields-row">
			<label class="field">
				<span>Médium</span>
				<select value={str('medium') || 'web'} onchange={e => setStr(e, 'medium')}>
					<option value="web">Web</option>
					<option value="print">Tisk</option>
					<option value="social">Social media</option>
				</select>
			</label>
			{#if (str('medium') || 'web') === 'print'}
				<label class="field">
					<span>Formát</span>
					<select value={str('format') || 'A4'} onchange={e => setStr(e, 'format')}>
						<option value="A4">A4</option>
						<option value="A3">A3</option>
						<option value="A5">A5</option>
						<option value="Letter">Letter</option>
					</select>
				</label>
				<label class="field">
					<span>Orientace</span>
					<select value={str('orientation') || 'portrait'} onchange={e => setStr(e, 'orientation')}>
						<option value="portrait">Na výšku</option>
						<option value="landscape">Na šířku</option>
					</select>
				</label>
			{:else if (str('medium') || 'web') === 'social'}
				<label class="field">
					<span>Formát</span>
					<select value={str('format') || 'square'} onchange={e => setStr(e, 'format')}>
						<option value="square">Čtverec (1:1)</option>
						<option value="story">Story (9:16)</option>
					</select>
				</label>
			{:else}
				<label class="field">
					<span>Max šířka</span>
					<input type="number" min={320} max={3840} value={num('maxWidth', 1280)} oninput={e => setNum(e, 'maxWidth')} />
				</label>
			{/if}
			<label class="field">
				<span>Jednotky</span>
				<select value={str('unit') || ((str('medium')||'web')==='print' ? 'mm' : 'px')} onchange={e => setStr(e, 'unit')}>
					<option value="px">px</option>
					<option value="mm">mm</option>
					<option value="pt">pt</option>
				</select>
			</label>
		</div>
		<div class="fields-row">
			<label class="field">
				<span>Sloupce</span>
				<input type="number" min={1} max={24} value={num('columns', 12)} oninput={e => setNum(e, 'columns')} />
			</label>
			<label class="field">
				<span>Řádky <span class="muted">(0 = žádné)</span></span>
				<input type="number" min={0} max={60} value={num('rows', 0)} oninput={e => setNum(e, 'rows')} />
			</label>
			<label class="field">
				<span>Gutter (sloupce)</span>
				<input type="number" min={0} max={120} value={num('gutter', 24)} oninput={e => setNum(e, 'gutter')} />
			</label>
			{#if num('rows', 0) > 0}
				<label class="field">
					<span>Gutter (řádky)</span>
					<input type="number" min={0} max={120} value={num('gutterRow', num('gutter', 24))} oninput={e => setNum(e, 'gutterRow')} />
				</label>
			{/if}
			<label class="field">
				<span>Baseline grid <span class="muted">(0 = vypnout)</span></span>
				<input type="number" min={0} max={120} step={1} value={num('baselineGrid', 0)} oninput={e => setNum(e, 'baselineGrid')} />
			</label>
		</div>
		<!-- Margins -->
		{#if (str('medium') || 'web') === 'print'}
			<div class="field-group-label">Okraje</div>
			<div class="fields-row">
				<label class="field">
					<span>Nahoře</span>
					<input type="number" min={0} max={240} value={num('marginTop', num('margin', 20))} oninput={e => setNum(e, 'marginTop')} />
				</label>
				<label class="field">
					<span>Vpravo</span>
					<input type="number" min={0} max={240} value={num('marginRight', num('margin', 20))} oninput={e => setNum(e, 'marginRight')} />
				</label>
				<label class="field">
					<span>Dole</span>
					<input type="number" min={0} max={240} value={num('marginBottom', num('margin', 20))} oninput={e => setNum(e, 'marginBottom')} />
				</label>
				<label class="field">
					<span>Vlevo</span>
					<input type="number" min={0} max={240} value={num('marginLeft', num('margin', 20))} oninput={e => setNum(e, 'marginLeft')} />
				</label>
			</div>
		{:else}
			<div class="fields-row">
				<label class="field">
					<span>Okraj (strany)</span>
					<input type="number" min={0} max={240} value={num('margin', 40)} oninput={e => setNum(e, 'margin')} />
				</label>
			</div>
		{/if}
		<label class="field">
			<span>Popis použití</span>
			<textarea rows={2} value={str('description')} placeholder="Popis použití gridu…" oninput={e => setStr(e, 'description')}></textarea>
		</label>
	</div>

<!-- ── logo_spec ─────────────────────────────────────────────────────────────── -->
{:else if block.type === 'logo_spec'}
	<div class="fields">
		<div class="field">
			<span>URL loga (SVG)</span>
			<div class="input-with-btn">
				<input type="text" value={str('logoUrl')} placeholder="/uploads/…" oninput={e => setStr(e, 'logoUrl')} />
				<button type="button" class="btn-pick" onclick={() => openPicker('logoUrl')} title="Vybrat z assetů">
					<IconPhoto size={14} />
				</button>
			</div>
		</div>
		<div class="fields-row">
			<label class="field">
				<span>Ochranná zóna — násobek výšky X</span>
				<input type="number" step={0.1} min={0} max={10} value={num('clearspace', 1)} oninput={e => setNum(e, 'clearspace')} />
			</label>
			<label class="field">
				<span>Min. velikost — px</span>
				<input type="number" min={1} value={num('minSizePx', 24)} oninput={e => setNum(e, 'minSizePx')} />
			</label>
			<label class="field">
				<span>Min. velikost — mm</span>
				<input type="number" step={0.5} min={1} value={num('minSizeMm', 10)} oninput={e => setNum(e, 'minSizeMm')} />
			</label>
		</div>
		<label class="field">
			<span>Popis použití</span>
			<textarea rows={3} value={str('description')} oninput={e => setStr(e, 'description')}></textarea>
		</label>
	</div>

<!-- ── do_dont ───────────────────────────────────────────────────────────────── -->
{:else if block.type === 'do_dont'}
	<div class="list-editor">
		{#each doDontItems as item, i}
			<div class="list-row">
				<select value={item.type}
					onchange={e => updateDoDont(doDontItems.map((x, j) => j === i ? { ...x, type: (e.target as HTMLSelectElement).value as 'do' | 'dont' } : x))}
					style="width:90px;flex-shrink:0">
					<option value="do">✅ Do</option>
					<option value="dont">❌ Don't</option>
				</select>
				<input type="text" value={item.text} placeholder="Popis…" style="flex:1"
					oninput={e => updateDoDont(doDontItems.map((x, j) => j === i ? { ...x, text: (e.target as HTMLInputElement).value } : x))} />
				<button class="btn-ghost sm danger" onclick={() => updateDoDont(doDontItems.filter((_, j) => j !== i))}>✕</button>
			</div>
		{/each}
		<button class="btn-add" onclick={() => updateDoDont([...doDontItems, { type: 'do', text: '' }])}>+ Přidat položku</button>
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
			<span>Folder s ikonami</span>
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
				<span>Velikost náhledu — px</span>
				<input type="number" min={16} max={128} value={num('size', 32)} oninput={e => setNum(e, 'size')} />
			</label>
		</div>
		<label class="field">
			<span>Popis</span>
			<textarea rows={3} value={str('description')} oninput={e => setStr(e, 'description')}></textarea>
		</label>
	</div>

<!-- ── process ───────────────────────────────────────────────────────────────── -->
{:else if block.type === 'process'}
	<div class="list-editor">
		{#each processSteps as step, i}
			<div class="process-row">
				<div class="step-num">{i + 1}</div>
				<div class="step-fields">
					<input type="text" value={step.title} placeholder="Název kroku"
						oninput={e => updateProcess(processSteps.map((x, j) => j === i ? { ...x, title: (e.target as HTMLInputElement).value } : x))} />
					<textarea rows={2} value={step.description} placeholder="Popis…"
						oninput={e => updateProcess(processSteps.map((x, j) => j === i ? { ...x, description: (e.target as HTMLTextAreaElement).value } : x))}></textarea>
				</div>
				<button class="btn-ghost sm danger" onclick={() => updateProcess(processSteps.filter((_, j) => j !== i))}>✕</button>
			</div>
		{/each}
		<button class="btn-add" onclick={() => updateProcess([...processSteps, { title: '', description: '' }])}>+ Přidat krok</button>
	</div>

<!-- ── chart ─────────────────────────────────────────────────────────────────── -->
{:else if block.type === 'chart'}
	<div class="fields">
		<label class="field">
			<span>Popisek datasetu</span>
			<input type="text" value={str('datasetLabel')} placeholder="Brand" oninput={e => setStr(e, 'datasetLabel')} />
		</label>
		<label class="field">
			<span>Osy a hodnoty <span class="muted">(Osa:Hodnota 0-100, jeden řádek)</span></span>
			<textarea rows={7} value={str('data')} placeholder={chartPlaceholder} oninput={e => setStr(e, 'data')}></textarea>
		</label>
	</div>

<!-- ── table ─────────────────────────────────────────────────────────────────── -->
{:else if block.type === 'table'}
	<div class="fields">
		<label class="field">
			<span>Záhlaví sloupců <span class="muted">(čárkou)</span></span>
			<input type="text"
				value={tableHeaders.join(', ')}
				oninput={e => updateTable((e.target as HTMLInputElement).value.split(',').map(s => s.trim()), tableRows)}
				placeholder="Název, Hodnota, Popis" />
		</label>
		<label class="field">
			<span>Řádky <span class="muted">(buňky čárkou, řádky odřádkováním)</span></span>
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
			<span>Folder</span>
			<div class="folder-field">
				<div class="folder-selected">
					<IconFolder size={14} />
					<span class={str('folderId') ? '' : 'muted'}>{str('folderId') ? folderLabel(str('folderId')) : 'Všechny složky'}</span>
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
			<span>Tagy <span class="muted">(volitelné, čárkou)</span></span>
			<input type="text" value={str('tags')} placeholder="logo, vector, print" oninput={e => setStr(e, 'tags')} />
		</label>
		<label class="field">
			<span>Rozložení</span>
			<select value={str('layout') || 'grid'} onchange={e => setStr(e, 'layout')}>
				<option value="grid">Grid</option>
				<option value="masonry">Masonry</option>
				<option value="list">Seznam</option>
			</select>
		</label>
	</div>

<!-- ── download ──────────────────────────────────────────────────────────────── -->
{:else if block.type === 'download'}
	<div class="fields">
		<label class="field">
			<span>Popis</span>
			<textarea rows={3} value={str('description')} oninput={e => setStr(e, 'description')}></textarea>
		</label>
		<div class="field">
			<span>Folder</span>
			<div class="folder-field">
				<div class="folder-selected">
					<IconFolder size={14} />
					<span class={str('folderId') ? '' : 'muted'}>{str('folderId') ? folderLabel(str('folderId')) : 'Všechny složky'}</span>
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
			<span>Tagy <span class="muted">(volitelné, čárkou)</span></span>
			<input type="text" value={str('tags')} placeholder="logo, vector, print" oninput={e => setStr(e, 'tags')} />
		</label>
	</div>

<!-- ── accordion ─────────────────────────────────────────────────────────────── -->
{:else if block.type === 'accordion'}
	<div class="list-editor">
		{#each accordionItems as item, i}
			<div class="process-row">
				<div class="step-fields">
					<input type="text" value={item.question} placeholder="Otázka…"
						oninput={e => updateAccordion(accordionItems.map((x, j) => j === i ? { ...x, question: (e.target as HTMLInputElement).value } : x))} />
					<textarea rows={2} value={item.answer} placeholder="Odpověď…"
						oninput={e => updateAccordion(accordionItems.map((x, j) => j === i ? { ...x, answer: (e.target as HTMLTextAreaElement).value } : x))}></textarea>
				</div>
				<button class="btn-ghost sm danger" onclick={() => updateAccordion(accordionItems.filter((_, j) => j !== i))}>✕</button>
			</div>
		{/each}
		<button class="btn-add" onclick={() => updateAccordion([...accordionItems, { question: '', answer: '' }])}>+ Přidat položku</button>
	</div>

<!-- ── cards ─────────────────────────────────────────────────────────────────── -->
{:else if block.type === 'cards'}
	<div class="list-editor">
		{#each cards as card, i}
			<div class="process-row">
				<div class="step-fields">
					<input type="text" value={card.title} placeholder="Název…"
						oninput={e => updateCards(cards.map((x, j) => j === i ? { ...x, title: (e.target as HTMLInputElement).value } : x))} />
					<textarea rows={2} value={card.description} placeholder="Popis…"
						oninput={e => updateCards(cards.map((x, j) => j === i ? { ...x, description: (e.target as HTMLTextAreaElement).value } : x))}></textarea>
					<input type="text" value={card.imageUrl ?? ''} placeholder="URL obrázku (volitelné)"
						oninput={e => updateCards(cards.map((x, j) => j === i ? { ...x, imageUrl: (e.target as HTMLInputElement).value } : x))} />
				</div>
				<button class="btn-ghost sm danger" onclick={() => updateCards(cards.filter((_, j) => j !== i))}>✕</button>
			</div>
		{/each}
		<button class="btn-add" onclick={() => updateCards([...cards, { title: '', description: '' }])}>+ Přidat kartu</button>
	</div>

<!-- ── html ──────────────────────────────────────────────────────────────────── -->
{:else if block.type === 'html'}
	<div class="fields">
		<label class="field">
			<span>HTML kód</span>
			<textarea class="code-area" rows={12} value={str('html')} placeholder="<div>…</div>" oninput={e => setStr(e, 'html')}></textarea>
		</label>
		<label class="field checkbox">
			<input type="checkbox" checked={bool('showPreview', true)} onchange={e => setBool(e, 'showPreview')} />
			<span>Zobrazit live náhled</span>
		</label>
	</div>

<!-- ── code ──────────────────────────────────────────────────────────────────── -->
{:else if block.type === 'code'}
	<div class="fields">
		<label class="field">
			<span>Jazyk</span>
			<select value={str('language') || 'text'} onchange={e => setStr(e, 'language')}>
				<option value="html">HTML</option>
				<option value="css">CSS</option>
				<option value="javascript">JavaScript</option>
				<option value="typescript">TypeScript</option>
				<option value="json">JSON</option>
				<option value="bash">Bash</option>
				<option value="text">Prostý text</option>
			</select>
		</label>
		<label class="field">
			<span>Kód</span>
			<textarea class="code-area" rows={10} value={str('code')} placeholder="…kód…" oninput={e => setStr(e, 'code')}></textarea>
		</label>
	</div>

<!-- ── divider ───────────────────────────────────────────────────────────────── -->
{:else if block.type === 'divider'}
	<div class="fields fields-row">
		<label class="field">
			<span>Styl</span>
			<select value={str('style') || 'line'} onchange={e => setStr(e, 'style')}>
				<option value="line">Čára</option>
				<option value="space">Pouze mezera</option>
				<option value="dots">Tečky</option>
			</select>
		</label>
		<label class="field">
			<span>Výška — rem</span>
			<input type="number" step={0.5} min={1} max={20} value={num('spacing', 4)} oninput={e => setNum(e, 'spacing')} />
		</label>
	</div>

<!-- ── typo_rules ─────────────────────────────────────────────────────────────── -->
{:else if block.type === 'typo_rules'}
	<div class="fields">
		<!-- Language management -->
		<div class="typo-lang-bar">
			{#each typoLangs as tl, i}
				<button type="button"
					class="typo-lang-tab"
					class:active={typoLangTab === i}
					onclick={() => (typoLangTab = i)}
				>{tl.label || tl.lang}</button>
			{/each}
			<button type="button" class="typo-lang-add"
				onclick={() => {
					const lang = prompt('Kód jazyka (cs, en, de…)');
					if (!lang) return;
					const label = lang === 'cs' ? 'Čeština' : lang === 'en' ? 'English' : lang === 'de' ? 'Deutsch' : lang;
					updateTypoLangs([...typoLangs, { lang, label, rules: [] }]);
					typoLangTab = typoLangs.length - 1;
				}}
			><IconPlus size={13} /> Jazyk</button>
			{#if typoLangs.length > 0}
				<button type="button" class="typo-lang-remove"
					onclick={() => {
						if (!confirm('Smazat jazyk?')) return;
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
				<span>Název jazyka</span>
				<input type="text" value={tl.label} placeholder="Čeština"
					oninput={e => updateTypoLangs(typoLangs.map((l, i) => i === ti ? { ...l, label: (e.target as HTMLInputElement).value } : l))} />
			</label>

			<!-- Rules list -->
			<div class="typo-rules-list">
				{#each tl.rules as rule, ri}
					<div class="typo-rule-row">
						<div class="typo-rule-fields">
							<input type="text" value={rule.category} placeholder="Kategorie (Uvozovky, Pomlčka…)"
								oninput={e => updateTypoRules(ti, tl.rules.map((r, j) => j === ri ? { ...r, category: (e.target as HTMLInputElement).value } : r))}
								class="rule-cat" />
							<input type="text" value={rule.rule} placeholder="Popis pravidla…"
								oninput={e => updateTypoRules(ti, tl.rules.map((r, j) => j === ri ? { ...r, rule: (e.target as HTMLInputElement).value } : r))}
								class="rule-desc" />
							<div class="rule-examples">
								<input type="text" value={rule.correct ?? ''} placeholder="✓ Správně"
									oninput={e => updateTypoRules(ti, tl.rules.map((r, j) => j === ri ? { ...r, correct: (e.target as HTMLInputElement).value } : r))} />
								<input type="text" value={rule.wrong ?? ''} placeholder="✗ Špatně"
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
				>+ Přidat pravidlo</button>
			</div>
		{:else}
			<p class="muted" style="font-size:.85rem">Přidej alespoň jeden jazyk tlačítkem výše.</p>
		{/if}
	</div>

<!-- ── fallback ──────────────────────────────────────────────────────────────── -->
{:else}
	<div class="fields">
		<p class="muted" style="font-size:.85rem">Typ <strong>{block.type}</strong> nemá editor — upravte přímo JSON:</p>
		<label class="field">
			<span>Raw JSON config</span>
			<textarea class="code-area" rows={8}
				value={JSON.stringify(cfg, null, 2)}
				oninput={e => { try { onUpdate(JSON.parse((e.target as HTMLTextAreaElement).value)); } catch {} }}
			></textarea>
		</label>
	</div>
{/if}

<!-- ── Save bar ───────────────────────────────────────────────────────────────── -->
<div class="save-bar">
	<button class="btn-save" onclick={onSave} disabled={saving}>
		<IconCheck size={14} /> {saving ? 'Ukládám…' : 'Uložit'}
	</button>
</div>

</div>

<AssetPickerModal
	open={pickerOpen}
	mimeFilter="image"
	onPick={(url) => onAssetPick(url)}
	onClose={() => (pickerOpen = false)}
/>

<style>
.primary-editor {
	display: flex;
	flex-direction: column;
	gap: .85rem;
}
.fields {
	display: flex;
	flex-direction: column;
	gap: .75rem;
}
.fields-row {
	display: flex;
	gap: .75rem;
	flex-wrap: wrap;
}
.fields-row .field { flex: 1; min-width: 160px; }
.field-group-label { font-size: .72rem; font-weight: 650; color: var(--color-muted); text-transform: uppercase; letter-spacing: .05em; margin-top: .25rem; }
.col { display: flex; flex-direction: column; gap: .6rem; flex: 1; min-width: 200px; }

.field { display: flex; flex-direction: column; gap: .35rem; font-size: .875rem; }
.field > span { font-weight: 500; color: var(--color-text); }
.field.checkbox { flex-direction: row; align-items: center; gap: .5rem; }
.field.checkbox > span { font-weight: 400; }
.muted { color: var(--color-muted); font-weight: 400 !important; }

.field input[type="text"],
.field input[type="number"],
.field select,
.field textarea {
	padding: .45rem .65rem;
	border: 1px solid var(--color-border);
	border-radius: 6px;
	font-size: .875rem;
	background: var(--color-surface);
	color: var(--color-text);
	outline: none;
	width: 100%;
	box-sizing: border-box;
	font-family: inherit;
}
.field input:focus, .field select:focus, .field textarea:focus { border-color: var(--brand); }
.field textarea { resize: vertical; }

.input-with-btn {
	display: flex;
	gap: .35rem;
	align-items: center;
}
.input-with-btn input {
	flex: 1;
	padding: .45rem .65rem;
	border: 1px solid var(--color-border);
	border-radius: 6px;
	font-size: .875rem;
	background: var(--color-surface);
	color: var(--color-text);
	outline: none;
	box-sizing: border-box;
	font-family: inherit;
	min-width: 0;
}
.input-with-btn input:focus { border-color: var(--brand); }
.btn-pick {
	flex-shrink: 0;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: .3rem;
	height: 32px;
	padding: 0 .6rem;
	border: 1px solid var(--color-border);
	border-radius: 6px;
	background: var(--color-surface-raised);
	color: var(--color-muted);
	font-size: .78rem;
	cursor: pointer;
	white-space: nowrap;
	font-family: inherit;
}
.btn-pick:hover {
	border-color: var(--brand);
	color: var(--brand);
	background: color-mix(in srgb, var(--brand) 7%, var(--color-surface-raised));
}
.code-area { font-family: 'Fira Code', 'Cascadia Code', monospace; font-size: .8rem; }

.img-preview {
	max-width: 100%;
	border-radius: 6px;
	overflow: hidden;
	border: 1px solid var(--color-border);
	max-height: 200px;
}
.img-preview img {
	width: 100%; height: 100%; object-fit: contain; display: block;
	max-height: 200px;
}

/* List editors */
.list-editor { display: flex; flex-direction: column; gap: .5rem; }
.list-row { display: flex; align-items: center; gap: .5rem; }
.list-row input {
	flex: 1; padding: .4rem .6rem; border: 1px solid var(--color-border);
	border-radius: 5px; font-size: .85rem; background: var(--color-surface);
	color: var(--color-text); outline: none; font-family: inherit;
}
.list-row input:focus { border-color: var(--brand); }
.list-row select {
	padding: .4rem .5rem; border: 1px solid var(--color-border);
	border-radius: 5px; font-size: .82rem; background: var(--color-surface);
	color: var(--color-text); outline: none;
}
.process-row {
	display: flex; align-items: flex-start; gap: .5rem;
	border: 1px solid var(--color-border); border-radius: 7px; padding: .6rem;
	background: var(--color-surface);
}
.step-num {
	width: 24px; height: 24px; border-radius: 50%;
	background: var(--brand); color: #fff;
	display: flex; align-items: center; justify-content: center;
	font-size: .75rem; font-weight: 700; flex-shrink: 0; margin-top: .1rem;
}
.step-fields { flex: 1; display: flex; flex-direction: column; gap: .4rem; }
.step-fields input, .step-fields textarea {
	padding: .4rem .6rem; border: 1px solid var(--color-border);
	border-radius: 5px; font-size: .85rem; background: var(--color-surface);
	color: var(--color-text); outline: none; resize: vertical; font-family: inherit;
}
.step-fields input:focus, .step-fields textarea:focus { border-color: var(--brand); }

.btn-add {
	padding: .4rem .8rem; background: none;
	border: 1px dashed var(--color-border); border-radius: 6px;
	color: var(--color-muted); font-size: .8rem; cursor: pointer; text-align: left;
}
.btn-add:hover { border-color: var(--brand); color: var(--brand); }

.save-bar {
	padding-top: .75rem;
	border-top: 1px solid var(--color-border);
	margin-top: .25rem;
}
.btn-save {
	display: inline-flex; align-items: center; gap: .4rem;
	padding: .5rem 1.4rem;
	background: var(--brand); color: #fff;
	border: none; border-radius: 7px;
	font-size: .875rem; cursor: pointer; font-weight: 550;
}
.btn-save:hover:not(:disabled) { filter: brightness(1.1); }
.btn-save:disabled { opacity: .6; cursor: default; }

.btn-ghost { display: inline-flex; align-items: center; gap: .3rem; padding: .25rem .45rem; background: none; border: none; border-radius: 5px; cursor: pointer; color: var(--color-muted); font-size: .8rem; }
.btn-ghost.sm { padding: .15rem .35rem; font-size: .78rem; }
.btn-ghost.danger:hover { color: #ef4444; }

/* ── typo_rules editor ────────────────────────────────────────────────────── */
.typo-lang-bar {
	display: flex; align-items: center; gap: 4px; flex-wrap: wrap;
	border-bottom: 1px solid var(--color-border); padding-bottom: 2px; margin-bottom: .6rem;
}
.typo-lang-tab {
	padding: 5px 12px; font-size: .82rem; font-weight: 500; border: none;
	background: transparent; color: var(--color-muted); cursor: pointer;
	border-bottom: 2px solid transparent; margin-bottom: -3px; border-radius: 0;
	transition: color .14s, border-color .14s;
}
.typo-lang-tab:hover { color: var(--color-text); }
.typo-lang-tab.active { color: var(--brand); border-bottom-color: var(--brand); }
.typo-lang-add {
	display: inline-flex; align-items: center; gap: 4px;
	padding: 4px 8px; border: 1px dashed var(--color-border); border-radius: 6px;
	background: transparent; color: var(--color-muted); font-size: .78rem; cursor: pointer;
	margin-left: auto; transition: border-color .14s, color .14s;
}
.typo-lang-add:hover { border-color: var(--brand); color: var(--brand); }
.typo-lang-remove {
	padding: 4px 7px; border: none; background: transparent; color: var(--color-muted);
	cursor: pointer; font-size: .82rem; border-radius: 5px;
	transition: color .14s, background .14s;
}
.typo-lang-remove:hover { color: #ef4444; background: color-mix(in srgb, #ef4444 10%, transparent); }

.typo-rules-list { display: flex; flex-direction: column; gap: .5rem; }
.typo-rule-row {
	display: flex; gap: .45rem; align-items: flex-start;
	padding: .55rem; border: 1px solid var(--color-border); border-radius: 7px;
	background: var(--color-surface);
}
.typo-rule-fields { flex: 1; display: flex; flex-direction: column; gap: .35rem; }
.typo-rule-fields input {
	padding: .38rem .55rem; border: 1px solid var(--color-border); border-radius: 5px;
	font-size: .82rem; background: var(--color-surface-raised); color: var(--color-text);
	outline: none; font-family: inherit; width: 100%;
}
.typo-rule-fields input:focus { border-color: var(--brand); }
.rule-cat { font-weight: 600 !important; }
.rule-examples { display: grid; grid-template-columns: 1fr 1fr; gap: .35rem; }
.rule-examples input { font-family: monospace; font-size: .8rem !important; }

/* ── color row (frame bg / border) ──────────────────────────────────────── */
.frame-opts { align-items: flex-start; }
.color-row { display: flex; align-items: center; gap: .4rem; }
.color-swatch { width: 32px; height: 32px; padding: 2px; border: 1px solid var(--color-border); border-radius: 5px; cursor: pointer; background: none; flex-shrink: 0; }
.color-text { flex: 1; padding: .4rem .55rem; border: 1px solid var(--color-border); border-radius: 5px; font-size: .85rem; background: var(--color-surface); color: var(--color-text); outline: none; font-family: monospace; }
.color-text:focus { border-color: var(--brand); }

/* ── folder picker ───────────────────────────────────────────────────────── */
.folder-field { display: flex; flex-direction: column; gap: 4px; }
.folder-selected {
	display: flex; align-items: center; gap: .5rem;
	padding: .4rem .65rem;
	border: 1px solid var(--color-border); border-radius: 6px;
	background: var(--color-surface); font-size: .875rem;
	cursor: default;
}
.folder-selected :global(svg) { color: var(--color-muted); flex-shrink: 0; }
.folder-selected > span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.folder-panel {
	border: 1px solid var(--color-border); border-radius: 8px;
	background: var(--color-surface);
	box-shadow: 0 4px 16px rgba(0,0,0,.1);
	overflow: hidden;
	padding: .5rem 0;
}
</style>
