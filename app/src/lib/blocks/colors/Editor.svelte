<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { BlockEditorProps } from '../types';
	import { configFields } from '../_shared/editor';
	import { resolveColorPalette } from '$lib/manual/color-source';

	const { cfg, onUpdate, brandPalettes }: BlockEditorProps = $props();
	const { str, bool, setStr, setBool } = configFields(() => cfg, (next) => onUpdate(next));
</script>

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
