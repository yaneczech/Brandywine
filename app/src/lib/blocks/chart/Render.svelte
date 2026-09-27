<script lang="ts">
	import type { BlockRenderProps } from '../types';

	const { block }: BlockRenderProps = $props();
</script>

{#if block.config.data}
	{@const lines = String(block.config.data).trim().split('\n').filter(Boolean)}
	{@const entries = lines.map(l => { const [label, val] = l.split(':'); return { label: label?.trim() ?? '', value: Math.min(100, Math.max(0, Number(val?.trim() ?? 0))) }; })}
	{@const count = entries.length}
	{@const cx = 220}
	{@const cy = 190}
	{@const r  = 130}
	<div class="chart-wrap">
		<svg class="radar-chart" viewBox="0 0 440 380" aria-label={String(block.config.datasetLabel ?? 'Brand chart')}>
			<!-- grid rings -->
			{#each [0.25,0.5,0.75,1] as ring (ring)}
				<polygon class="radar-grid"
					points={Array.from({length:count},(_,i)=>{
						const angle = (i/count)*Math.PI*2 - Math.PI/2;
						return `${cx+Math.cos(angle)*r*ring},${cy+Math.sin(angle)*r*ring}`;
					}).join(' ')}
				/>
			{/each}
			<!-- axes -->
			{#each entries as _,i (i)}
				{@const angle = (i/count)*Math.PI*2 - Math.PI/2}
				<line class="radar-axis" x1={cx} y1={cy} x2={cx+Math.cos(angle)*r} y2={cy+Math.sin(angle)*r} />
			{/each}
			<!-- data polygon -->
			<polygon class="radar-data"
				points={entries.map(({value},i)=>{
					const angle=(i/count)*Math.PI*2-Math.PI/2;
					return `${cx+Math.cos(angle)*r*(value/100)},${cy+Math.sin(angle)*r*(value/100)}`;
				}).join(' ')}
			/>
			<!-- labels -->
			{#each entries as {label},i (`${label}-${i}`)}
				{@const angle=(i/count)*Math.PI*2-Math.PI/2}
				{@const lx=cx+Math.cos(angle)*(r+26)}
				{@const ly=cy+Math.sin(angle)*(r+26)}
				<text class="radar-label" x={lx} y={ly}
					text-anchor={lx<cx-8?'end':lx>cx+8?'start':'middle'}
					dominant-baseline={ly<cy-8?'auto':ly>cy+8?'hanging':'middle'}
				>{label}</text>
			{/each}
		</svg>
		<div class="chart-legend">
			{#each entries as {label,value}, i (`${label}-${i}`)}
				<div class="legend-row">
					<span class="legend-label">{label}</span>
					<div class="legend-bar-wrap"><div class="legend-bar" style="width:{value}%"></div></div>
					<span class="legend-value">{value}</span>
				</div>
			{/each}
		</div>
	</div>
{/if}

<style>
	.chart-wrap { display: grid; grid-template-columns: 380px minmax(0,1fr); gap: 32px; align-items: center; }
	.radar-chart { width: 100%; max-width: 380px; display: block; }
	.radar-grid { fill: none; stroke: var(--manual-border); stroke-width: 1; }
	.radar-axis { stroke: var(--manual-border); stroke-width: 1; }
	.radar-data {
		fill: color-mix(in srgb, var(--manual-brand) 10%, transparent);
		stroke: var(--manual-brand); stroke-width: 1.5; stroke-linejoin: round;
	}
	.radar-label { font-size: var(--text-2xs); fill: var(--manual-muted); }
	.chart-legend { display: flex; flex-direction: column; gap: 8px; }
	.chart-legend { gap: 0; border-top: 1px solid var(--manual-border); }
	.legend-row { display: grid; grid-template-columns: 110px 1fr 28px; align-items: center; gap: 16px; min-height: 40px; border-bottom: 1px solid var(--manual-border); }
	.legend-label { font-size: var(--text-sm); color: var(--manual-ink); }
	.legend-bar-wrap { height: 2px; background: var(--manual-border); overflow: hidden; }
	.legend-bar { height: 100%; background: var(--manual-ink); }
	.legend-value { font-size: var(--text-xs); color: var(--manual-muted); text-align: right; font-variant-numeric: tabular-nums; }
	@media (max-width: 680px) {
		.chart-wrap { grid-template-columns: 1fr; }
		.radar-chart { max-width: 320px; margin: 0 auto; }
		.legend-row { grid-template-columns: 90px 1fr 24px; }
	}
</style>
