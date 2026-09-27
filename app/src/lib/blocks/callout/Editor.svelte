<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { BlockEditorProps } from '../types';
	import { configFields } from '../_shared/editor';

	const { block, cfg, onUpdate }: BlockEditorProps = $props();
	const { str, set, setStr } = configFields(() => cfg, (next) => onUpdate(next));
</script>

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

<style>
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
</style>
