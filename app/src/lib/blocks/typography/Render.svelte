<script lang="ts">
	import type { BlockRenderProps } from '../types';
	import { configList, configString } from '../_shared/config';
	import FontSpecimen from '$lib/components/manual/FontSpecimen.svelte';
	import { useManualStrings } from '$lib/manual/ui-strings';

	const { block, data }: BlockRenderProps = $props();
	const strings = useManualStrings();
	const t = $derived(strings());

	const list = <T = Record<string, unknown>>(key: string) => configList<T>(block.config, key);

	const cfgStr = (key: string, fallback = '') => configString(block.config, key, fallback);

	const pickedFontIds = $derived(list<string>('fontIds'));
	const shownFonts = $derived(pickedFontIds.length ? data.fontRows.filter(f => pickedFontIds.includes(f.id)) : data.fontRows);
</script>

{#if shownFonts.length}
	<div class="typo-fonts">
		{#each shownFonts as font (font.id)}
			{@const styles = data.styleRows.filter(s => s.fontId === font.id).sort((a,b) => a.order - b.order)}
			<div class="typo-font">
				<FontSpecimen
					{font}
					files={data.fontFileRows.filter(f => f.fontId === font.id)}
					blockId={block.id}
					allowDownload={block.config.allowDownload === true}
					description={shownFonts.length === 1 ? cfgStr('fontDescription') : ''}
					sections={{
						weights: block.config.showWeights !== false,
						info: block.config.showInfo !== false,
						glyphs: block.config.showGlyphs !== false,
						tester: block.config.showTester !== false,
					}}
				/>
				{#if block.config.showStyles !== false && styles.length}
					<div class="style-table-wrap">
						<table class="style-table">
							<thead><tr>
								<th>{t.style}</th><th>{t.size}</th><th>{t.lineHeight}</th><th>{t.weight}</th><th>{t.tracking}</th>
							</tr></thead>
							<tbody>
						{#each styles as style (style.id)}
									<tr>
										<td style="font-family:'{font.name}',sans-serif;font-size:{Math.min(style.size ?? 16, 28)}px;font-weight:{style.weight ?? 400};line-height:{style.lineHeight ?? 1.5};letter-spacing:{style.tracking ?? 0}em">{style.name}</td>
										<td>{style.size ?? '—'}px</td>
										<td>{style.lineHeight ?? '—'}</td>
										<td>{style.weight ?? '—'}</td>
										<td>{style.tracking != null ? `${style.tracking}em` : '—'}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		{/each}
	</div>
{:else}
	<div class="muted-block"><span class="placeholder-copy">{t.noFonts}</span></div>
{/if}

<style>
	.typo-fonts { display: flex; flex-direction: column; gap: 40px; }
	.typo-font { display: flex; flex-direction: column; gap: 40px; }
	.style-table-wrap {
		overflow-x: auto;
		--scroll-hint: linear-gradient(to right, #000 calc(100% - 28px), transparent);
		-webkit-mask-image: var(--scroll-hint);
		mask-image: var(--scroll-hint);
	}
	.style-table { width: 100%; border-collapse: collapse; font-size: var(--text-sm); font-variant-numeric: tabular-nums; }
	.style-table th { padding: 0 16px 8px 0; text-align: left; font-size: var(--manual-label-size); font-weight: 500; color: var(--manual-muted); text-transform: uppercase; letter-spacing: var(--manual-label-tracking); border-bottom: 1px solid var(--manual-border-strong); white-space: nowrap; }
	.style-table td { padding: 12px 16px 12px 0; border-bottom: 1px solid var(--manual-border); color: var(--manual-ink); vertical-align: middle; }
	.style-table td:not(:first-child) { color: var(--manual-muted); }
	@media (max-width: 680px) {
		.style-table-wrap { padding-right: 28px; }
	}
</style>
