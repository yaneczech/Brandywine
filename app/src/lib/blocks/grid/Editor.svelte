<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { BlockEditorProps } from '../types';
	import { configFields } from '../_shared/editor';

	const { cfg, onUpdate }: BlockEditorProps = $props();
	const { str, num, setStr, setNum } = configFields(() => cfg, (next) => onUpdate(next));
</script>

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

<style>
	.field-group-label { font-size: var(--text-2xs); font-weight: 500; color: var(--color-muted); text-transform: uppercase; letter-spacing: var(--tracking-eyebrow); margin-top: 4px; }
</style>
