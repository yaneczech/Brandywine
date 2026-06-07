<!--
  BlockConfigPanel — form-based config for each block type.
  Props:
    block  — the block being edited
    onSave — callback(config) called with updated config
-->
<script lang="ts">
	import { IconCheck } from '@tabler/icons-svelte';

	type Block = {
		id: string; type: string;
		config: Record<string, unknown>;
		anchor: string | null;
	};

	const { block, onSave }: { block: Block; onSave: (config: Record<string, unknown>) => void } = $props();

	// Local copy of config — editable
	let cfg = $state<Record<string, unknown>>({ ...block.config });

	// Reset when block changes
	$effect(() => {
		cfg = { ...block.config };
	});

	function save() {
		onSave({ ...cfg });
	}

	// ── helpers ──────────────────────────────────────────────────────────────
	function str(key: string, def = ''): string {
		return typeof cfg[key] === 'string' ? (cfg[key] as string) : def;
	}
	function num(key: string, def = 0): number {
		return typeof cfg[key] === 'number' ? (cfg[key] as number) : def;
	}
	function bool(key: string, def = false): boolean {
		return typeof cfg[key] === 'boolean' ? (cfg[key] as boolean) : def;
	}
	function arr<T>(key: string): T[] {
		return Array.isArray(cfg[key]) ? (cfg[key] as T[]) : [];
	}

	// ── Do/Don't items ───────────────────────────────────────────────────────
	type DoDontItem = { text: string; type: 'do' | 'dont' };
	let doDontItems = $state<DoDontItem[]>(arr<DoDontItem>('items'));
	$effect(() => { doDontItems = arr<DoDontItem>('items'); });

	// ── Process steps ────────────────────────────────────────────────────────
	type ProcessStep = { title: string; description: string };
	let processSteps = $state<ProcessStep[]>(arr<ProcessStep>('steps'));
	$effect(() => { processSteps = arr<ProcessStep>('steps'); });

	// ── Table ────────────────────────────────────────────────────────────────
	type TableRow = string[];
	let tableHeaders = $state<string[]>(arr<string>('headers'));
	let tableRows = $state<TableRow[]>(arr<TableRow>('rows'));

	// ── Cards ─────────────────────────────────────────────────────────────────
	type Card = { title: string; description: string; imageUrl?: string };
	let cards = $state<Card[]>(arr<Card>('cards'));
	$effect(() => { cards = arr<Card>('cards'); });

	// ── Accordion ────────────────────────────────────────────────────────────
	type AccordionItem = { question: string; answer: string };
	let accordionItems = $state<AccordionItem[]>(arr<AccordionItem>('items'));
	$effect(() => { accordionItems = arr<AccordionItem>('items'); });

	// Placeholder strings with curly braces (can't be inline in Svelte templates)
	const pinsPlaceholder = '[{"x":50,"y":30,"text":"Ochranná zóna"}]';
	const chartPlaceholder = 'Moderní:85\nTradiční:30\nHravý:60\nSeriózní:70\nPřátelský:90\nFormální:40';

	// ── Save helpers per type ────────────────────────────────────────────────
	function saveDoDont() {
		onSave({ ...cfg, items: doDontItems });
	}
	function saveProcess() {
		onSave({ ...cfg, steps: processSteps });
	}
	function saveTable() {
		onSave({ ...cfg, headers: tableHeaders, rows: tableRows });
	}
	function saveCards() {
		onSave({ ...cfg, cards });
	}
	function saveAccordion() {
		onSave({ ...cfg, items: accordionItems });
	}
</script>

<div class="panel">

<!-- ── Anchor / shared ───────────────────────────────────────────────────────── -->
<div class="section">
	<label class="field">
		<span>Kotva (anchor) <span class="muted">— pro TOC</span></span>
		<input type="text" value={block.anchor ?? ''} placeholder="napr. nase-barvy"
			oninput={e => cfg['__anchor'] = (e.target as HTMLInputElement).value}
		/>
	</label>
</div>

<!-- ══ Per-type config ═══════════════════════════════════════════════════════ -->

{#if block.type === 'rich_text'}
	<div class="section">
		<label class="field">
			<span>Nadpis sekce <span class="muted">(volitelný)</span></span>
			<input type="text" bind:value={cfg['heading'] as string} placeholder="Nadpis…" />
		</label>
		<label class="field">
			<span>Obsah <span class="muted">(Markdown)</span></span>
			<textarea rows={8} bind:value={cfg['markdown'] as string} placeholder="## Nadpis&#10;&#10;Text odstavce…"></textarea>
		</label>
	</div>
	<button class="btn-save" onclick={save}><IconCheck size={14} /> Uložit</button>

{:else if block.type === 'image'}
	<div class="section">
		<label class="field">
			<span>URL obrázku</span>
			<input type="text" bind:value={cfg['url'] as string} placeholder="/uploads/…" />
		</label>
		<label class="field">
			<span>Alternativní text</span>
			<input type="text" bind:value={cfg['alt'] as string} placeholder="Popis obrázku" />
		</label>
		<label class="field">
			<span>Titulek <span class="muted">(caption)</span></span>
			<input type="text" bind:value={cfg['caption'] as string} placeholder="Volitelný popis pod obrázkem" />
		</label>
		<label class="field checkbox">
			<input type="checkbox" checked={bool('fullWidth')} onchange={e => cfg['fullWidth'] = (e.target as HTMLInputElement).checked} />
			<span>Celá šířka</span>
		</label>
		<label class="field">
			<span>Ochranná zóna <span class="muted">(tooltips — JSON pole)</span></span>
			<textarea rows={3} bind:value={cfg['pins'] as string} placeholder={pinsPlaceholder}></textarea>
		</label>
	</div>
	<button class="btn-save" onclick={save}><IconCheck size={14} /> Uložit</button>

{:else if block.type === 'colors'}
	<div class="section">
		<label class="field">
			<span>Nadpis sekce</span>
			<input type="text" bind:value={cfg['heading'] as string} placeholder="Naše barvy" />
		</label>
		<label class="field">
			<span>Zdroj</span>
			<select bind:value={cfg['source'] as string}>
				<option value="all">Všechny palety</option>
				<option value="primary">Primární paleta</option>
				<option value="secondary">Sekundární paleta</option>
				<option value="accent">Doplňkové barvy</option>
			</select>
		</label>
		<label class="field checkbox">
			<input type="checkbox" checked={bool('showContrast')} onchange={e => cfg['showContrast'] = (e.target as HTMLInputElement).checked} />
			<span>Zobrazit WCAG kontrast</span>
		</label>
		<label class="field checkbox">
			<input type="checkbox" checked={bool('showCodes')} onchange={e => cfg['showCodes'] = (e.target as HTMLInputElement).checked} />
			<span>Zobrazit kódy barev (HEX, RGB, CMYK)</span>
		</label>
	</div>
	<button class="btn-save" onclick={save}><IconCheck size={14} /> Uložit</button>

{:else if block.type === 'typography'}
	<div class="section">
		<label class="field">
			<span>Nadpis sekce</span>
			<input type="text" bind:value={cfg['heading'] as string} placeholder="Typografie" />
		</label>
		<label class="field checkbox">
			<input type="checkbox" checked={bool('showSpecimen')} onchange={e => cfg['showSpecimen'] = (e.target as HTMLInputElement).checked} />
			<span>Zobrazit specimenový text</span>
		</label>
		<label class="field checkbox">
			<input type="checkbox" checked={bool('showStyles')} onchange={e => cfg['showStyles'] = (e.target as HTMLInputElement).checked} />
			<span>Zobrazit tabulku stylů</span>
		</label>
	</div>
	<button class="btn-save" onclick={save}><IconCheck size={14} /> Uložit</button>

{:else if block.type === 'text_styles'}
	<div class="section">
		<label class="field">
			<span>Nadpis sekce</span>
			<input type="text" bind:value={cfg['heading'] as string} placeholder="Kombinace stylů" />
		</label>
		<label class="field">
			<span>Popis</span>
			<textarea rows={2} bind:value={cfg['description'] as string} placeholder="Jak kombinovat nadpisy a odstavce…"></textarea>
		</label>
	</div>
	<button class="btn-save" onclick={save}><IconCheck size={14} /> Uložit</button>

{:else if block.type === 'grid'}
	<div class="section">
		<label class="field">
			<span>Nadpis sekce</span>
			<input type="text" bind:value={cfg['heading'] as string} placeholder="Grid systém" />
		</label>
		<label class="field">
			<span>Médium</span>
			<select bind:value={cfg['medium'] as string}>
				<option value="web">Web</option>
				<option value="print">Tisk</option>
				<option value="social">Social media</option>
				<option value="general">Obecné</option>
			</select>
		</label>
		<label class="field">
			<span>Počet sloupců</span>
			<input type="number" min={1} max={24} value={num('columns', 12)} oninput={e => cfg['columns'] = Number((e.target as HTMLInputElement).value)} />
		</label>
		<label class="field">
			<span>Gutter (mezera) — px</span>
			<input type="number" min={0} max={120} value={num('gutter', 24)} oninput={e => cfg['gutter'] = Number((e.target as HTMLInputElement).value)} />
		</label>
		<label class="field">
			<span>Margin (okraj) — px</span>
			<input type="number" min={0} max={240} value={num('margin', 40)} oninput={e => cfg['margin'] = Number((e.target as HTMLInputElement).value)} />
		</label>
		<label class="field">
			<span>Max šířka obsahu — px</span>
			<input type="number" min={320} max={3840} value={num('maxWidth', 1280)} oninput={e => cfg['maxWidth'] = Number((e.target as HTMLInputElement).value)} />
		</label>
		<label class="field">
			<span>Popis</span>
			<textarea rows={3} bind:value={cfg['description'] as string} placeholder="Popis použití gridu…"></textarea>
		</label>
	</div>
	<button class="btn-save" onclick={save}><IconCheck size={14} /> Uložit</button>

{:else if block.type === 'logo_spec'}
	<div class="section">
		<label class="field">
			<span>Nadpis sekce</span>
			<input type="text" bind:value={cfg['heading'] as string} placeholder="Specifikace loga" />
		</label>
		<label class="field">
			<span>URL loga (SVG)</span>
			<input type="text" bind:value={cfg['logoUrl'] as string} placeholder="/uploads/…" />
		</label>
		<label class="field">
			<span>Ochranná zóna — násobek výšky X</span>
			<input type="number" step={0.1} min={0} max={10} value={num('clearspace', 1)} oninput={e => cfg['clearspace'] = Number((e.target as HTMLInputElement).value)} />
		</label>
		<label class="field">
			<span>Min. velikost — px</span>
			<input type="number" min={1} value={num('minSizePx', 24)} oninput={e => cfg['minSizePx'] = Number((e.target as HTMLInputElement).value)} />
		</label>
		<label class="field">
			<span>Min. velikost — mm</span>
			<input type="number" step={0.5} min={1} value={num('minSizeMm', 10)} oninput={e => cfg['minSizeMm'] = Number((e.target as HTMLInputElement).value)} />
		</label>
		<label class="field">
			<span>Popis použití</span>
			<textarea rows={3} bind:value={cfg['description'] as string}></textarea>
		</label>
	</div>
	<button class="btn-save" onclick={save}><IconCheck size={14} /> Uložit</button>

{:else if block.type === 'do_dont'}
	<div class="section">
		<label class="field">
			<span>Nadpis sekce</span>
			<input type="text" bind:value={cfg['heading'] as string} placeholder="Správně / Špatně" />
		</label>
		<div class="list-editor">
			{#each doDontItems as item, i}
				<div class="list-row">
					<select bind:value={item.type} style="width:80px; flex-shrink:0">
						<option value="do">✅ Do</option>
						<option value="dont">❌ Don't</option>
					</select>
					<input type="text" bind:value={item.text} placeholder="Popis…" style="flex:1" />
					<button class="btn-ghost sm danger" onclick={() => { doDontItems = doDontItems.filter((_, j) => j !== i); }}>✕</button>
				</div>
			{/each}
			<button class="btn-add" onclick={() => { doDontItems = [...doDontItems, { type: 'do', text: '' }]; }}>+ Přidat položku</button>
		</div>
	</div>
	<button class="btn-save" onclick={saveDoDont}><IconCheck size={14} /> Uložit</button>

{:else if block.type === 'naming'}
	<div class="section">
		<label class="field">
			<span>Nadpis sekce</span>
			<input type="text" bind:value={cfg['heading'] as string} placeholder="Psaní názvů" />
		</label>
		<label class="field">
			<span>Obsah <span class="muted">(Markdown)</span></span>
			<textarea rows={6} bind:value={cfg['markdown'] as string} placeholder="Pravidla psaní názvů…"></textarea>
		</label>
	</div>
	<button class="btn-save" onclick={save}><IconCheck size={14} /> Uložit</button>

{:else if block.type === 'process'}
	<div class="section">
		<label class="field">
			<span>Nadpis sekce</span>
			<input type="text" bind:value={cfg['heading'] as string} placeholder="Proces tvorby" />
		</label>
		<div class="list-editor">
			{#each processSteps as step, i}
				<div class="process-row">
					<div class="step-num">{i + 1}</div>
					<div class="step-fields">
						<input type="text" bind:value={step.title} placeholder="Název kroku" />
						<textarea rows={2} bind:value={step.description} placeholder="Popis…"></textarea>
					</div>
					<button class="btn-ghost sm danger" onclick={() => { processSteps = processSteps.filter((_, j) => j !== i); }}>✕</button>
				</div>
			{/each}
			<button class="btn-add" onclick={() => { processSteps = [...processSteps, { title: '', description: '' }]; }}>+ Přidat krok</button>
		</div>
	</div>
	<button class="btn-save" onclick={saveProcess}><IconCheck size={14} /> Uložit</button>

{:else if block.type === 'chart'}
	<div class="section">
		<label class="field">
			<span>Nadpis sekce</span>
			<input type="text" bind:value={cfg['heading'] as string} placeholder="Charakteristika brandu" />
		</label>
		<label class="field">
			<span>Popisek datasetu</span>
			<input type="text" bind:value={cfg['datasetLabel'] as string} placeholder="Brand" />
		</label>
		<label class="field">
			<span>Osy a hodnoty <span class="muted">(jeden řádek = Osa:Hodnota 0-100)</span></span>
			<textarea rows={6} bind:value={cfg['data'] as string}
				placeholder={chartPlaceholder}
			></textarea>
		</label>
	</div>
	<button class="btn-save" onclick={save}><IconCheck size={14} /> Uložit</button>

{:else if block.type === 'table'}
	<div class="section">
		<label class="field">
			<span>Nadpis sekce</span>
			<input type="text" bind:value={cfg['heading'] as string} placeholder="Tabulka" />
		</label>
		<div class="field">
			<span>Záhlaví sloupců <span class="muted">(oddělte čárkou)</span></span>
			<input type="text"
				value={tableHeaders.join(', ')}
				oninput={e => { tableHeaders = (e.target as HTMLInputElement).value.split(',').map(s => s.trim()); }}
				placeholder="Název, Hodnota, Popis"
			/>
		</div>
		<div class="field">
			<span>Řádky <span class="muted">(jeden řádek = buňky oddělené čárkou)</span></span>
			<textarea rows={5}
				value={tableRows.map(r => r.join(', ')).join('\n')}
				oninput={e => { tableRows = (e.target as HTMLTextAreaElement).value.split('\n').filter(Boolean).map(r => r.split(',').map(s => s.trim())); }}
				placeholder="Hodnota A, 100, Popis A&#10;Hodnota B, 200, Popis B"
			></textarea>
		</div>
	</div>
	<button class="btn-save" onclick={saveTable}><IconCheck size={14} /> Uložit</button>

{:else if block.type === 'accordion'}
	<div class="section">
		<label class="field">
			<span>Nadpis sekce</span>
			<input type="text" bind:value={cfg['heading'] as string} placeholder="Časté otázky" />
		</label>
		<div class="list-editor">
			{#each accordionItems as item, i}
				<div class="process-row">
					<div class="step-fields">
						<input type="text" bind:value={item.question} placeholder="Otázka…" />
						<textarea rows={2} bind:value={item.answer} placeholder="Odpověď…"></textarea>
					</div>
					<button class="btn-ghost sm danger" onclick={() => { accordionItems = accordionItems.filter((_, j) => j !== i); }}>✕</button>
				</div>
			{/each}
			<button class="btn-add" onclick={() => { accordionItems = [...accordionItems, { question: '', answer: '' }]; }}>+ Přidat položku</button>
		</div>
	</div>
	<button class="btn-save" onclick={saveAccordion}><IconCheck size={14} /> Uložit</button>

{:else if block.type === 'cards'}
	<div class="section">
		<label class="field">
			<span>Nadpis sekce</span>
			<input type="text" bind:value={cfg['heading'] as string} placeholder="Kartičky" />
		</label>
		<div class="list-editor">
			{#each cards as card, i}
				<div class="process-row">
					<div class="step-fields">
						<input type="text" bind:value={card.title} placeholder="Název…" />
						<textarea rows={2} bind:value={card.description} placeholder="Popis…"></textarea>
						<input type="text" bind:value={card.imageUrl} placeholder="URL obrázku (volitelné)" />
					</div>
					<button class="btn-ghost sm danger" onclick={() => { cards = cards.filter((_, j) => j !== i); }}>✕</button>
				</div>
			{/each}
			<button class="btn-add" onclick={() => { cards = [...cards, { title: '', description: '' }]; }}>+ Přidat kartu</button>
		</div>
	</div>
	<button class="btn-save" onclick={saveCards}><IconCheck size={14} /> Uložit</button>

{:else if block.type === 'html'}
	<div class="section">
		<label class="field">
			<span>Nadpis sekce</span>
			<input type="text" bind:value={cfg['heading'] as string} placeholder="HTML blok" />
		</label>
		<label class="field">
			<span>HTML kód</span>
			<textarea class="code-area" rows={10} bind:value={cfg['html'] as string} placeholder="<div>…</div>"></textarea>
		</label>
		<label class="field checkbox">
			<input type="checkbox" checked={bool('showPreview', true)} onchange={e => cfg['showPreview'] = (e.target as HTMLInputElement).checked} />
			<span>Zobrazit live náhled</span>
		</label>
	</div>
	<button class="btn-save" onclick={save}><IconCheck size={14} /> Uložit</button>

{:else if block.type === 'code'}
	<div class="section">
		<label class="field">
			<span>Jazyk <span class="muted">(pro zvýraznění)</span></span>
			<select bind:value={cfg['language'] as string}>
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
			<textarea class="code-area" rows={8} bind:value={cfg['code'] as string} placeholder="…kód…"></textarea>
		</label>
	</div>
	<button class="btn-save" onclick={save}><IconCheck size={14} /> Uložit</button>

{:else if block.type === 'divider'}
	<div class="section">
		<label class="field">
			<span>Styl oddělovače</span>
			<select bind:value={cfg['style'] as string}>
				<option value="line">Čára</option>
				<option value="space">Pouze mezera</option>
				<option value="dots">Tečky</option>
			</select>
		</label>
		<label class="field">
			<span>Výška mezery — rem</span>
			<input type="number" step={0.5} min={1} max={20} value={num('spacing', 4)} oninput={e => cfg['spacing'] = Number((e.target as HTMLInputElement).value)} />
		</label>
	</div>
	<button class="btn-save" onclick={save}><IconCheck size={14} /> Uložit</button>

{:else if block.type === 'download'}
	<div class="section">
		<label class="field">
			<span>Nadpis sekce</span>
			<input type="text" bind:value={cfg['heading'] as string} placeholder="Ke stažení" />
		</label>
		<label class="field">
			<span>Popis</span>
			<textarea rows={2} bind:value={cfg['description'] as string}></textarea>
		</label>
		<label class="field">
			<span>Složka (folder ID) nebo tagy <span class="muted">— ID nebo čárkou oddělené tagy</span></span>
			<input type="text" bind:value={cfg['filter'] as string} placeholder="folder:abc123 nebo tag:logo,vector" />
		</label>
	</div>
	<button class="btn-save" onclick={save}><IconCheck size={14} /> Uložit</button>

{:else if block.type === 'asset_gallery'}
	<div class="section">
		<label class="field">
			<span>Nadpis sekce</span>
			<input type="text" bind:value={cfg['heading'] as string} placeholder="Galerie" />
		</label>
		<label class="field">
			<span>Folder ID nebo tagy</span>
			<input type="text" bind:value={cfg['filter'] as string} placeholder="folder:abc123" />
		</label>
		<label class="field">
			<span>Rozložení</span>
			<select bind:value={cfg['layout'] as string}>
				<option value="grid">Grid</option>
				<option value="masonry">Masonry</option>
				<option value="list">Seznam</option>
			</select>
		</label>
	</div>
	<button class="btn-save" onclick={save}><IconCheck size={14} /> Uložit</button>

{:else if block.type === 'icons'}
	<div class="section">
		<label class="field">
			<span>Nadpis sekce</span>
			<input type="text" bind:value={cfg['heading'] as string} placeholder="Ikony" />
		</label>
		<label class="field">
			<span>Popis</span>
			<textarea rows={3} bind:value={cfg['description'] as string}></textarea>
		</label>
		<label class="field">
			<span>Folder ID s ikonami</span>
			<input type="text" bind:value={cfg['folderId'] as string} placeholder="folder ID" />
		</label>
		<label class="field">
			<span>Velikost náhledu — px</span>
			<input type="number" min={16} max={128} value={num('size', 32)} oninput={e => cfg['size'] = Number((e.target as HTMLInputElement).value)} />
		</label>
	</div>
	<button class="btn-save" onclick={save}><IconCheck size={14} /> Uložit</button>

{:else if block.type === 'image_gallery' || block.type === 'carousel'}
	<div class="section">
		<label class="field">
			<span>Nadpis sekce</span>
			<input type="text" bind:value={cfg['heading'] as string} placeholder="Galerie" />
		</label>
		<label class="field">
			<span>Folder ID</span>
			<input type="text" bind:value={cfg['folderId'] as string} />
		</label>
		{#if block.type === 'carousel'}
			<label class="field checkbox">
				<input type="checkbox" checked={bool('autoplay')} onchange={e => cfg['autoplay'] = (e.target as HTMLInputElement).checked} />
				<span>Automatické přehrávání</span>
			</label>
		{/if}
	</div>
	<button class="btn-save" onclick={save}><IconCheck size={14} /> Uložit</button>

{:else if block.type === 'before_after'}
	<div class="section">
		<label class="field">
			<span>Nadpis sekce</span>
			<input type="text" bind:value={cfg['heading'] as string} placeholder="Before / After" />
		</label>
		<label class="field">
			<span>URL obrázku PŘED</span>
			<input type="text" bind:value={cfg['beforeUrl'] as string} placeholder="/uploads/…" />
		</label>
		<label class="field">
			<span>Popisek PŘED</span>
			<input type="text" bind:value={cfg['beforeLabel'] as string} placeholder="Špatně" />
		</label>
		<label class="field">
			<span>URL obrázku PO</span>
			<input type="text" bind:value={cfg['afterUrl'] as string} placeholder="/uploads/…" />
		</label>
		<label class="field">
			<span>Popisek PO</span>
			<input type="text" bind:value={cfg['afterLabel'] as string} placeholder="Správně" />
		</label>
	</div>
	<button class="btn-save" onclick={save}><IconCheck size={14} /> Uložit</button>

{:else}
	<!-- Fallback for any unknown type -->
	<div class="section">
		<p class="muted" style="font-size:.85rem">Konfigurace pro typ <strong>{block.type}</strong> ještě není implementována.</p>
		<label class="field">
			<span>Raw JSON config</span>
			<textarea class="code-area" rows={8}
				value={JSON.stringify(block.config, null, 2)}
				oninput={e => { try { cfg = JSON.parse((e.target as HTMLTextAreaElement).value); } catch {} }}
			></textarea>
		</label>
	</div>
	<button class="btn-save" onclick={save}><IconCheck size={14} /> Uložit</button>
{/if}

</div>

<style>
.panel { display: flex; flex-direction: column; gap: 0; }
.section { display: flex; flex-direction: column; gap: .85rem; margin-bottom: 1.2rem; }
.field { display: flex; flex-direction: column; gap: .35rem; font-size: .875rem; }
.field span { font-weight: 500; color: var(--color-text); }
.field.checkbox { flex-direction: row; align-items: center; gap: .5rem; }
.field.checkbox span { font-weight: 400; }
.field input[type="text"],
.field input[type="number"],
.field select,
.field textarea {
	padding: .45rem .65rem;
	border: 1px solid var(--color-border);
	border-radius: 6px;
	font-size: .875rem;
	background: var(--color-surface-raised);
	color: var(--color-text);
	outline: none;
	width: 100%;
	box-sizing: border-box;
}
.field input:focus, .field select:focus, .field textarea:focus { border-color: var(--brand); }
.field textarea { resize: vertical; }
.code-area { font-family: 'Fira Code', 'Cascadia Code', monospace; font-size: .8rem; }
.muted { color: var(--color-muted); font-weight: 400 !important; }

/* List editors */
.list-editor { display: flex; flex-direction: column; gap: .5rem; }
.list-row { display: flex; align-items: center; gap: .5rem; }
.list-row input { flex: 1; padding: .4rem .6rem; border: 1px solid var(--color-border); border-radius: 5px; font-size: .85rem; background: var(--color-surface-raised); color: var(--color-text); outline: none; }
.list-row input:focus { border-color: var(--brand); }
.process-row { display: flex; align-items: flex-start; gap: .5rem; border: 1px solid var(--color-border); border-radius: 7px; padding: .6rem; }
.step-num { width: 24px; height: 24px; border-radius: 50%; background: var(--brand); color: #fff; display: flex; align-items: center; justify-content: center; font-size: .75rem; font-weight: 700; flex-shrink: 0; margin-top: .1rem; }
.step-fields { flex: 1; display: flex; flex-direction: column; gap: .4rem; }
.step-fields input, .step-fields textarea {
	padding: .4rem .6rem;
	border: 1px solid var(--color-border);
	border-radius: 5px;
	font-size: .85rem;
	background: var(--color-surface-raised);
	color: var(--color-text);
	outline: none;
	resize: vertical;
}
.step-fields input:focus, .step-fields textarea:focus { border-color: var(--brand); }
.btn-add { padding: .4rem .8rem; background: none; border: 1px dashed var(--color-border); border-radius: 6px; color: var(--color-muted); font-size: .8rem; cursor: pointer; text-align: left; }
.btn-add:hover { border-color: var(--brand); color: var(--brand); }

.btn-save {
	display: flex; align-items: center; gap: .4rem;
	padding: .5rem 1.2rem;
	background: var(--brand); color: #fff;
	border: none; border-radius: 7px;
	font-size: .875rem; cursor: pointer;
	margin-top: .5rem;
	align-self: flex-start;
}
.btn-save:hover { filter: brightness(1.1); }
.btn-ghost { display: flex; align-items: center; gap: .3rem; padding: .2rem .4rem; background: none; border: none; border-radius: 5px; cursor: pointer; color: var(--color-muted); }
.btn-ghost.sm { font-size: .75rem; }
.btn-ghost.danger:hover { color: #ef4444; }
</style>
