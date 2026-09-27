<!--
  ImageField — the one way an editor sets an image.
  Empty: a quiet "choose from assets" target. Filled: a preview (graphics on a
  transparency grid, photos full-bleed), the file name, Replace / Remove.
  The raw URL stays available behind a small disclosure for external images.
-->
<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { IconPhoto, IconReplace, IconTrash, IconLink } from '$lib/icons';

	let {
		label,
		hint,
		value,
		onChoose,
		onChange,
		compact = false
	}: {
		label: string;
		hint?: string;
		value: string;
		onChoose: () => void;
		onChange: (url: string) => void;
		compact?: boolean;
	} = $props();

	let showUrl = $state(false);
	let broken = $state(false);

	const fileName = $derived(decodeURIComponent(value.split('?')[0].split('/').pop() ?? ''));
	const ext = $derived((fileName.split('.').pop() ?? '').toUpperCase());
	const isPhoto = $derived(/^(JPE?G|HEIC|HEIF|AVIF)$/.test(ext));

	$effect(() => { void value; broken = false; });
</script>

<div class="imf" class:compact>
	<div class="imf-head">
		<span class="imf-label">{label}{#if hint}<span class="imf-hint"> {hint}</span>{/if}</span>
		<button type="button" class="imf-url-toggle" class:on={showUrl} onclick={() => (showUrl = !showUrl)}
			title={m.be_image_url()} aria-label={m.be_image_url()} aria-pressed={showUrl}>
			<IconLink size={13} stroke={1.5} />
		</button>
	</div>

	{#if value}
		<div class="imf-filled">
			<button type="button" class="imf-preview" class:graphic={!isPhoto} onclick={onChoose} aria-label={m.be_change_image()}>
				{#if !broken}
					<img src={value} alt="" onerror={() => (broken = true)} />
				{:else}
					<IconPhoto size={20} stroke={1.25} />
				{/if}
			</button>
			<div class="imf-meta">
				<span class="imf-name" title={fileName}>{fileName}</span>
				{#if ext}<span class="imf-ext">{ext}</span>{/if}
				<div class="imf-actions">
					<button type="button" class="btn btn-secondary btn-sm" onclick={onChoose}>
						<IconReplace size={13} stroke={1.5} /> {m.be_change_image()}
					</button>
					<button type="button" class="btn btn-ghost btn-sm imf-remove" onclick={() => onChange('')} aria-label={m.be_remove_image()} title={m.be_remove_image()}>
						<IconTrash size={13} stroke={1.5} />
					</button>
				</div>
			</div>
		</div>
	{:else}
		<button type="button" class="imf-empty" onclick={onChoose}>
			<span class="imf-empty-icon"><IconPhoto size={18} stroke={1.25} /></span>
			<span class="imf-empty-text">
				<strong>{m.be_choose_image()}</strong>
				<small>{m.be_choose_image_hint()}</small>
			</span>
		</button>
	{/if}

	{#if showUrl}
		<input class="input imf-url" type="text" {value} placeholder="https://… / /uploads/…"
			oninput={(e) => onChange((e.currentTarget as HTMLInputElement).value)} />
	{/if}
</div>

<style>
	.imf { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
	.imf-head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); }
	.imf-label { font-size: var(--text-sm); font-weight: 500; color: var(--color-text); }
	.imf-hint { font-weight: 400; color: var(--color-muted); }
	.imf-url-toggle {
		display: grid; place-items: center; width: 24px; height: 24px;
		border: 0; border-radius: var(--radius-sm); background: none; color: var(--color-placeholder);
		transition: background var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease);
	}
	.imf-url-toggle:hover, .imf-url-toggle.on { background: var(--color-hover); color: var(--color-text); }

	.imf-filled {
		display: flex; gap: var(--space-4); align-items: stretch;
		padding: 8px; border: 1px solid var(--color-border); border-radius: var(--radius-lg);
		background: var(--color-surface); box-shadow: var(--shadow-xs);
	}
	.imf-preview {
		position: relative; flex: 0 0 auto; display: grid; place-items: center;
		width: 132px; aspect-ratio: 4 / 3; padding: 0; overflow: hidden;
		border: 0; border-radius: var(--radius); background: var(--color-surface-raised);
		color: var(--color-muted); cursor: pointer;
	}
	.compact .imf-preview { width: 88px; }
	.imf-preview img { width: 100%; height: 100%; object-fit: cover; }
	.imf-preview.graphic {
		--chk: rgba(20, 20, 20, 0.05);
		background-color: var(--color-surface);
		background-image:
			linear-gradient(45deg, var(--chk) 25%, transparent 25%, transparent 75%, var(--chk) 75%),
			linear-gradient(45deg, var(--chk) 25%, transparent 25%, transparent 75%, var(--chk) 75%);
		background-size: 12px 12px;
		background-position: 0 0, 6px 6px;
		box-shadow: inset 0 0 0 1px var(--color-border);
	}
	.imf-preview.graphic img { object-fit: contain; padding: 10%; }
	.imf-preview:hover { box-shadow: inset 0 0 0 1px var(--color-border-strong); }

	.imf-meta { display: flex; flex-direction: column; gap: 4px; min-width: 0; flex: 1; padding: 4px 4px 4px 0; }
	.imf-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: var(--text-sm); font-weight: 500; color: var(--color-text); }
	.imf-ext { font-family: var(--font-mono); font-size: var(--text-2xs); letter-spacing: 0.04em; color: var(--color-muted); }
	.imf-actions { display: flex; gap: 4px; margin-top: auto; }
	.imf-remove { width: 30px; padding: 0; }
	.imf-remove:hover { color: var(--color-danger); background: var(--color-danger-subtle); }

	.imf-empty {
		display: flex; align-items: center; gap: var(--space-3); width: 100%;
		padding: var(--space-3); border: 1px dashed var(--color-border-strong); border-radius: var(--radius-lg);
		background: var(--color-surface); text-align: left;
		transition: border-color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease);
	}
	.imf-empty:hover { border-color: var(--color-accent); background: var(--color-accent-subtle); }
	.imf-empty-icon {
		display: grid; place-items: center; width: 40px; height: 40px; flex-shrink: 0;
		border-radius: var(--radius); background: var(--color-surface-raised); color: var(--color-muted);
	}
	.imf-empty:hover .imf-empty-icon { color: var(--color-accent); }
	.imf-empty-text { display: flex; flex-direction: column; gap: 4px; }
	.imf-empty-text strong { font-size: var(--text-sm); font-weight: 500; color: var(--color-text); }
	.imf-empty-text small { font-size: var(--text-xs); color: var(--color-muted); }
	.imf-url { font-family: var(--font-mono); font-size: var(--text-xs); }
</style>
