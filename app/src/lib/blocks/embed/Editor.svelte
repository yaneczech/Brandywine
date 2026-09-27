<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { BlockEditorProps } from '../types';
	import { configFields } from '../_shared/editor';
	import { resolveEmbed } from '$lib/manual/embed';

	const { cfg, onUpdate }: BlockEditorProps = $props();
	const { str, bool, setStr, setBool } = configFields(() => cfg, (next) => onUpdate(next));

	const embedHint = $derived(resolveEmbed(cfg['url']));
</script>

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

<style>
	.embed-status { color: var(--color-warning); font-size: var(--text-xs); }
	.embed-status.ok { color: var(--color-success); }
</style>
