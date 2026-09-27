<script lang="ts">
	import type { BlockRenderProps } from '../types';
	import { assetSrc } from '../_shared/assets';
	import { configList, configString } from '../_shared/config';

	const { block }: BlockRenderProps = $props();

	const list = <T = Record<string, unknown>>(key: string) => configList<T>(block.config, key);

	const cfgStr = (key: string, fallback = '') => configString(block.config, key, fallback);

	let activeHotspot = $state<number | null>(null);

	const spots = $derived(list<{ x: number; y: number; title?: string; text?: string }>('points').filter((p) => Number.isFinite(Number(p?.x)) && Number.isFinite(Number(p?.y))));
</script>

{#if cfgStr('imageUrl')}
	<figure class="hs-figure">
		<div class="hs-stage">
			<img src={assetSrc(cfgStr('imageUrl'))} alt={cfgStr('alt')} loading="lazy" decoding="async" />
			{#each spots as spot, si (si)}
				<button
					class="hs-dot"
					class:active={activeHotspot === si}
					style="left:{Math.min(100, Math.max(0, Number(spot.x)))}%; top:{Math.min(100, Math.max(0, Number(spot.y)))}%"
					onclick={() => (activeHotspot = si)}
					onmouseenter={() => (activeHotspot = si)}
					aria-expanded={activeHotspot === si}
					aria-label={spot.title || `${si + 1}`}
				>{si + 1}</button>
				{#if activeHotspot === si && (spot.title || spot.text)}
					<div
						class="hs-tip"
						class:left={Number(spot.x) > 60}
						class:top={Number(spot.y) < 20}
						class:bottom={Number(spot.y) > 80}
						style="left:{Number(spot.x)}%; top:{Number(spot.y)}%"
						role="tooltip"
					>
						{#if spot.title}<strong>{spot.title}</strong>{/if}
						{#if spot.text}<span>{spot.text}</span>{/if}
					</div>
				{/if}
			{/each}
		</div>
		{#if block.config.showList !== false && spots.some((s) => s.title || s.text)}
			<ol class="hs-list">
				{#each spots as spot, si (si)}
					<li class:active={activeHotspot === si}>
						<button onclick={() => (activeHotspot = si)}>
							<span class="hs-num">{si + 1}</span>
							<span>{#if spot.title}<strong>{spot.title}</strong>{/if}{#if spot.text}<small>{spot.text}</small>{/if}</span>
						</button>
					</li>
				{/each}
			</ol>
		{/if}
	</figure>
{/if}

<style>
	.hs-figure { display: flex; flex-direction: column; gap: 20px; margin: 0; }
	.hs-stage { position: relative; width: fit-content; max-width: 100%; margin-inline: auto; border-radius: var(--manual-radius); }
	.hs-stage img { display: block; width: auto; max-width: 100%; height: auto; max-height: min(80vh, 760px); border-radius: inherit; }
	.hs-dot {
		position: absolute; z-index: 2; display: grid; place-items: center; width: 24px; height: 24px; transform: translate(-50%, -50%);
		border: 0; border-radius: 50%; background: #fff; color: #111;
		font-family: inherit; font-size: var(--text-2xs); font-weight: 600; font-variant-numeric: tabular-nums; cursor: pointer;
		box-shadow: 0 0 0 1px rgba(0,0,0,.08), 0 2px 8px rgba(0,0,0,.25);
		transition: transform .2s var(--manual-ease, ease), background .15s ease, color .15s ease;
	}
	.hs-dot:hover, .hs-dot.active { transform: translate(-50%, -50%) scale(1.1); background: var(--manual-brand); color: #fff; }
	.hs-tip {
		position: absolute; z-index: 3; display: flex; flex-direction: column; gap: .2rem;
		width: max-content; max-width: min(280px, 70vw); transform: translate(32px, -50%);
		padding: 12px 12px; border-radius: var(--manual-radius); background: var(--manual-ink); color: var(--manual-paper);
		font-size: var(--text-sm); line-height: 1.45; box-shadow: 0 12px 32px rgba(0,0,0,.24); pointer-events: none;
	}
	.hs-tip.left { transform: translate(calc(-100% - 32px), -50%); }
	.hs-tip.top { transform: translate(32px, 20px); }
	.hs-tip.left.top { transform: translate(calc(-100% - 32px), 20px); }
	.hs-tip.bottom { transform: translate(32px, calc(-100% - 20px)); }
	.hs-tip.left.bottom { transform: translate(calc(-100% - 32px), calc(-100% - 20px)); }
	.hs-tip strong { font-weight: 500; }
	.hs-tip span { opacity: .75; }
	.hs-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr)); gap: 0 24px; margin: 0; padding: 0; list-style: none; border-top: 1px solid var(--manual-border); }
	.hs-list li { border-bottom: 1px solid var(--manual-border); }
	.hs-list button { display: flex; align-items: flex-start; gap: 12px; width: 100%; padding: 12px 0; border: 0; background: transparent; color: var(--manual-ink); font-family: inherit; text-align: left; cursor: pointer; }
	.hs-list strong { display: block; font-size: var(--text-sm); font-weight: 500; transition: color .15s ease; }
	.hs-list li.active strong, .hs-list button:hover strong { color: var(--manual-brand); }
	.hs-list small { display: block; margin-top: 2px; color: var(--manual-muted); font-size: var(--text-sm); line-height: 1.45; }
	.hs-num { flex: 0 0 auto; min-width: 1.4rem; padding-top: 1px; color: var(--manual-muted); font-family: var(--manual-mono); font-size: var(--text-xs); font-variant-numeric: tabular-nums; }
</style>
