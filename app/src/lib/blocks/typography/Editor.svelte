<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { BlockEditorProps } from '../types';
	import { configFields } from '../_shared/editor';

	const { cfg, onUpdate, brandFonts }: BlockEditorProps = $props();
	const { str, bool, set, setStr, setBool } = configFields(() => cfg, (next) => onUpdate(next));

	function toggleFontId(key: string, id: string, on: boolean) {
		const current = Array.isArray(cfg[key]) ? (cfg[key] as string[]) : [];
		set(key, on ? [...new Set([...current, id])] : current.filter(x => x !== id));
	}
</script>

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
