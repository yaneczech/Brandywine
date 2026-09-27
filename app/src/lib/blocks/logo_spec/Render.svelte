<script lang="ts">
	import type { BlockRenderProps } from '../types';
	import { assetSrc } from '../_shared/assets';
	import { useManualStrings } from '$lib/manual/ui-strings';

	const { block }: BlockRenderProps = $props();
	const strings = useManualStrings();
	const t = $derived(strings());
</script>

{#if block.config.logoUrl}
	<div class="logo-spec">
		<div class="logo-preview-wrap" style="--cz:{Math.min(3, Math.max(0.1, Number(block.config.clearspace ?? 1)))}">
			<div class="logo-stage">
				<div class="logo-zone">
					<span class="logo-zone-label">{t.clearZone}</span>
					<img src={assetSrc(block.config.logoUrl)} alt="Logo" class="logo-preview-img" />
				</div>
			</div>
			<div class="logo-stage logo-stage-dark">
				<div class="logo-zone">
					<span class="logo-zone-label">{t.clearZone}</span>
					<img
						src={assetSrc(block.config.logoDarkUrl || block.config.logoUrl)}
						alt="Logo"
						class="logo-preview-img"
						class:auto-invert={!block.config.logoDarkUrl}
					/>
				</div>
			</div>
		</div>
		<dl class="logo-specs">
			{#if block.config.clearspace != null}
				<div><dt>{t.clearspace}</dt><dd>{block.config.clearspace}{t.xHeight}</dd></div>
			{/if}
			{#if block.config.minSizePx != null}
				<div><dt>{t.minSize}</dt><dd>{block.config.minSizePx}px / {block.config.minSizeMm ?? '—'}mm</dd></div>
			{/if}
		</dl>
		{#if block.config.description}
			<p class="block-text">{block.config.description}</p>
		{/if}
	</div>
{/if}

<style>
	.logo-spec { display: flex; flex-direction: column; gap: 20px; }
	.logo-preview-wrap { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)); gap: 12px; }
	.logo-stage {
		display: grid; place-items: center;
		min-height: 280px; padding: clamp(2rem, 6%, 3.5rem);
		border-radius: var(--manual-radius);
		background: #fff;
		box-shadow: inset 0 0 0 1px color-mix(in srgb, #000 7%, transparent);
	}
	.logo-stage-dark {
		background: #111;
		box-shadow: none;
	}
	.logo-zone {
		position: relative;
		padding: calc(var(--cz) * 2.25rem);
		outline: 1px dashed color-mix(in srgb, var(--manual-brand) 60%, transparent);
		background: color-mix(in srgb, var(--manual-brand) 4%, #fff);
	}
	.logo-stage-dark .logo-zone { background: color-mix(in srgb, #fff 3%, #111); outline-color: rgba(255,255,255,.35); }
	.logo-zone-label {
		position: absolute; left: 0; top: calc(100% + 8px);
		color: #6b6b6b;
		font-size: var(--manual-label-size); font-weight: 500; letter-spacing: var(--manual-label-tracking); text-transform: uppercase; white-space: nowrap;
	}
	.logo-stage-dark .logo-zone-label { color: rgba(255,255,255,.55); }
	.logo-preview-img { max-width: 100%; max-height: 96px; display: block; }
	.logo-preview-img.auto-invert { filter: invert(1) brightness(2); }
	.logo-specs { display: flex; flex-wrap: wrap; gap: 12px 40px; margin: 0; padding-top: 16px; border-top: 1px solid var(--manual-border); }
	.logo-specs div { display: flex; flex-direction: column; gap: 4px; }
	.logo-specs dt { font-size: var(--manual-label-size); color: var(--manual-muted); font-weight: 500; letter-spacing: var(--manual-label-tracking); text-transform: uppercase; }
	.logo-specs dd { margin: 0; font-size: var(--text-md); font-weight: 500; color: var(--manual-ink); font-variant-numeric: tabular-nums; }
	@media (max-width: 680px) {
		.logo-preview-wrap { grid-template-columns: 1fr; }
	}
</style>
