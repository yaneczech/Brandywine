<!--
  FontSpecimen — one typeface: specimen, download/open action, and expandable
  weights, info, glyph map and a live type tester.
-->
<script lang="ts">
	import { IconDownload, IconExternalLink, IconChevronDown } from '@tabler/icons-svelte';
	import { useManualStrings } from '$lib/manual/ui-strings';

	type FontRow = {
		id: string; name: string; foundry: string | null; role: string | null; license?: string | null;
		sourceUrl: string | null; weights: number[] | null; isVariable: boolean | null;
		variableAxes?: { tag: string; label: string; min: number; max: number; default: number }[] | null;
	};
	type FontFileRow = { id: string; fontId: string; format: string; fileSize?: number | null };

	const {
		font,
		files = [],
		blockId,
		allowDownload = false,
		description = '',
		sections = { weights: true, info: true, glyphs: true, tester: true },
	}: {
		font: FontRow;
		files?: FontFileRow[];
		blockId: string;
		allowDownload?: boolean;
		description?: string;
		sections?: { weights: boolean; info: boolean; glyphs: boolean; tester: boolean };
	} = $props();

	const strings = useManualStrings();
	const t = $derived(strings());
	const family = $derived(`'${font.name.replace(/'/g, '')}', var(--manual-font)`);
	const weights = $derived(
		[...new Set((font.weights?.length ? font.weights : [400]).filter((w) => Number.isInteger(w) && w >= 1 && w <= 1000))].sort((a, b) => a - b)
	);
	const weightAxis = $derived(font.variableAxes?.find((a) => a.tag === 'wght') ?? null);

	const WEIGHT_NAMES: Record<number, string> = {
		100: 'Thin', 200: 'ExtraLight', 300: 'Light', 400: 'Regular', 500: 'Medium',
		600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black',
	};

	const openUrl = $derived.by(() => {
		if (!font.sourceUrl) return null;
		try {
			const url = new URL(font.sourceUrl);
			// Link to the human-readable specimen rather than the CSS API
			if (url.hostname === 'fonts.googleapis.com') {
				const fam = url.searchParams.get('family')?.split(':')[0];
				return fam ? `https://fonts.google.com/specimen/${encodeURIComponent(fam).replace(/%20/g, '+')}` : null;
			}
			return url.protocol === 'https:' ? url.href : null;
		} catch {
			return null;
		}
	});
	const canDownload = $derived(allowDownload && files.length > 0);
	const formats = $derived([...new Set(files.map((f) => f.format.toUpperCase()))]);

	const GLYPHS = [
		'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
		'abcdefghijklmnopqrstuvwxyz',
		'ÁČĎÉĚÍŇÓŘŠŤÚŮÝŽáčďéěíňóřšťúůýž',
		'0123456789',
		'.,:;…!?¡¿-–—()[]{}„“”‚‘’«»"\'/\\|@&*#%‰§©®™°+−×÷=<>≤≥±~^$€£¥₿¢',
	];
	let activeGlyph = $state('A');

	// Tester
	let testerText = $state('');
	let testerSize = $state(48);
	// svelte-ignore state_referenced_locally
	let testerWeight = $state(weights.includes(400) ? 400 : weights[0] ?? 400);
	let testerItalic = $state(false);
	const pangram = $derived(t.pangram);
</script>

<article class="fs" style="--fs-family:{family}">
	<div class="fs-hero">
		<span class="fs-aa" aria-hidden="true">Aa</span>
		<span class="fs-name">{font.name}</span>
		{#if font.role || font.foundry}
			<span class="fs-meta">
				{#if font.role}<span class="fs-role">{t.fontRoles[font.role as keyof typeof t.fontRoles] ?? font.role}</span>{/if}
				{#if font.foundry}<span>{font.foundry}</span>{/if}
			</span>
		{/if}
	</div>

	{#if description}
		<p class="fs-desc">{description}</p>
	{/if}

	<div class="fs-rows">
		{#if canDownload || openUrl}
			<div class="fs-row fs-row-action">
				<span>{canDownload ? t.downloadFont : t.fontSource}</span>
				{#if canDownload}
					<a class="fs-btn" href="/api/manual/blocks/{blockId}/font-pack?font={font.id}" download>
						<IconDownload size={15} stroke={2} /> {t.download}{#if formats.length} <small>{formats.join(', ')}</small>{/if}
					</a>
				{:else if openUrl}
					<a class="fs-btn" href={openUrl} target="_blank" rel="noopener noreferrer">
						<IconExternalLink size={15} stroke={2} /> {t.openLink}
					</a>
				{/if}
			</div>
		{/if}

		{#if sections.weights}
			<details class="fs-row">
				<summary><span>{t.fontWeights}</span><span class="fs-summary-end">{weights.length} <IconChevronDown size={16} stroke={2} /></span></summary>
				<ul class="fs-weights">
					{#each weights as w (w)}
						<li style="font-weight:{w}">
							<span class="fs-weight-sample">{font.name} {WEIGHT_NAMES[Math.round(w / 100) * 100] ?? w}</span>
							<span class="fs-weight-num">{w}</span>
						</li>
					{/each}
				</ul>
			</details>
		{/if}

		{#if sections.info}
			<details class="fs-row">
				<summary><span>{t.fontInfo}</span><span class="fs-summary-end"><IconChevronDown size={16} stroke={2} /></span></summary>
				<dl class="fs-info">
					<div><dt>{t.fontFamily}</dt><dd>{font.name}</dd></div>
					{#if font.foundry}<div><dt>{t.foundry}</dt><dd>{font.foundry}</dd></div>{/if}
					{#if font.license}<div><dt>{t.license}</dt><dd>{font.license}</dd></div>{/if}
					<div><dt>{t.fontType}</dt><dd>{font.isVariable ? t.variableFont : t.staticFont}</dd></div>
					{#if font.variableAxes?.length}
						<div><dt>{t.axes}</dt><dd>{font.variableAxes.map((a) => `${a.label || a.tag} ${a.min}–${a.max}`).join(' · ')}</dd></div>
					{/if}
					{#if formats.length}<div><dt>{t.formats}</dt><dd>{formats.join(', ')}</dd></div>{/if}
					<div><dt>CSS</dt><dd><code>font-family: '{font.name}';</code></dd></div>
				</dl>
			</details>
		{/if}

		{#if sections.glyphs}
			<details class="fs-row">
				<summary><span>{t.glyphs}</span><span class="fs-summary-end"><IconChevronDown size={16} stroke={2} /></span></summary>
				<div class="fs-glyphs">
					<div class="fs-glyph-big" aria-live="polite">{activeGlyph}</div>
					<div class="fs-glyph-grid">
						{#each GLYPHS.join('') as ch, gi (gi)}
							<button class:active={activeGlyph === ch} onmouseenter={() => (activeGlyph = ch)} onfocus={() => (activeGlyph = ch)} onclick={() => (activeGlyph = ch)} aria-label={ch}>{ch}</button>
						{/each}
					</div>
				</div>
			</details>
		{/if}

		{#if sections.tester}
			<details class="fs-row">
				<summary><span>{t.fontTester}</span><span class="fs-summary-end"><IconChevronDown size={16} stroke={2} /></span></summary>
				<div class="fs-tester">
					<div class="fs-tester-controls">
						<label>
							<span>{t.size}</span>
							<input type="range" min="12" max="160" bind:value={testerSize} />
							<output>{testerSize} px</output>
						</label>
						{#if weightAxis}
							<label>
								<span>{t.weight}</span>
								<input type="range" min={weightAxis.min} max={weightAxis.max} bind:value={testerWeight} />
								<output>{testerWeight}</output>
							</label>
						{:else if weights.length > 1}
							<label>
								<span>{t.weight}</span>
								<select bind:value={testerWeight}>
									{#each weights as w (w)}<option value={w}>{WEIGHT_NAMES[Math.round(w / 100) * 100] ?? w} · {w}</option>{/each}
								</select>
							</label>
						{/if}
						<label class="fs-check"><input type="checkbox" bind:checked={testerItalic} /> <span>{t.italic}</span></label>
					</div>
					<textarea
						class="fs-tester-text"
						rows="2"
						bind:value={testerText}
						placeholder={pangram}
						aria-label={t.fontTester}
						style="font-size:{testerSize}px; font-weight:{testerWeight}; font-style:{testerItalic ? 'italic' : 'normal'}"
					></textarea>
				</div>
			</details>
		{/if}
	</div>
</article>

<style>
	.fs {
		overflow: hidden;
		border: 1px solid var(--manual-border);
		border-radius: calc(var(--manual-radius) + 4px);
		background: var(--manual-surface);
	}
	.fs-hero {
		display: flex; flex-direction: column; align-items: center; gap: .35rem;
		padding: clamp(2rem, 6vw, 3.5rem) 1.25rem clamp(1.5rem, 4vw, 2.25rem);
		font-family: var(--fs-family);
		color: var(--manual-ink);
		text-align: center;
	}
	.fs-aa { font-size: clamp(5rem, 14vw, 9rem); font-weight: 600; line-height: .95; letter-spacing: var(--tracking-display); }
	.fs-name { font-size: clamp(1.4rem, 3vw, 2rem); font-weight: 600; letter-spacing: var(--tracking-snug); }
	.fs-meta { display: flex; flex-wrap: wrap; justify-content: center; gap: .4rem .8rem; margin-top: .35rem; font-family: var(--manual-font); color: var(--manual-muted); font-size: var(--text-sm); }
	.fs-role { color: var(--manual-muted); font-size: var(--text-2xs); font-weight: 500; text-transform: uppercase; letter-spacing: var(--tracking-eyebrow); }
	.fs-desc { margin: 0; padding: 0 1.25rem 1.25rem; color: var(--manual-muted); font-size: var(--text-md); line-height: 1.6; text-align: center; }
	.fs-rows { border-top: 1px solid var(--manual-border); }
	.fs-row { border-top: 1px solid var(--manual-border); }
	.fs-row:first-child { border-top: 0; }
	.fs-row-action, .fs-row summary {
		display: flex; align-items: center; justify-content: space-between; gap: 1rem;
		min-height: 56px; padding: .6rem 1.15rem; color: var(--manual-ink); font-size: var(--text-md); font-weight: 500;
	}
	.fs-row summary { list-style: none; cursor: pointer; transition: background .15s ease; }
	.fs-row summary::-webkit-details-marker { display: none; }
	.fs-row summary:hover { background: var(--manual-hover); }
	.fs-summary-end { display: inline-flex; align-items: center; gap: .5rem; color: var(--manual-muted); font-weight: 500; font-variant-numeric: tabular-nums; }
	.fs-summary-end :global(svg) { transition: transform .2s ease; }
	details[open] > summary .fs-summary-end :global(svg) { transform: rotate(180deg); }
	.fs-btn {
		display: inline-flex; align-items: center; gap: .35rem; height: 36px; padding: 0 .95rem;
		border: 1px solid var(--manual-border-strong); border-radius: var(--radius-full);
		color: var(--manual-ink); font-size: var(--text-sm); font-weight: 500; text-decoration: none; white-space: nowrap;
		transition: background .15s ease;
	}
	.fs-btn:hover { background: var(--manual-hover); }
	.fs-btn small { color: var(--manual-muted); font-weight: 500; }

	.fs-weights { margin: 0; padding: 0 1.15rem 1rem; list-style: none; font-family: var(--fs-family); }
	.fs-weights li { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; padding: .55rem 0; border-top: 1px solid var(--manual-border); color: var(--manual-ink); font-size: clamp(1.1rem, 2.2vw, 1.5rem); }
	.fs-weight-sample { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.fs-weight-num { flex: 0 0 auto; color: var(--manual-muted); font-family: var(--manual-font); font-size: var(--text-xs); font-weight: 500; font-variant-numeric: tabular-nums; }

	.fs-info { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr)); gap: .9rem 1.5rem; margin: 0; padding: .25rem 1.15rem 1.15rem; }
	.fs-info dt { color: var(--manual-muted); font-size: var(--text-xs); font-weight: 500; }
	.fs-info dd { margin: .15rem 0 0; color: var(--manual-ink); font-size: var(--text-base); overflow-wrap: anywhere; }
	.fs-info code { font-family: var(--manual-mono, monospace); font-size: var(--text-sm); }

	.fs-glyphs { display: grid; grid-template-columns: minmax(140px, 220px) minmax(0, 1fr); gap: 1rem; padding: .25rem 1.15rem 1.15rem; font-family: var(--fs-family); }
	.fs-glyph-big {
		position: sticky; top: calc(var(--manual-topbar, 60px) + 16px); align-self: start;
		display: grid; place-items: center; aspect-ratio: 1; border-radius: var(--manual-radius);
		background: color-mix(in srgb, var(--manual-ink) 4%, var(--manual-surface)); color: var(--manual-ink);
		font-size: clamp(4rem, 10vw, 7.5rem); line-height: 1;
	}
	.fs-glyph-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(40px, 1fr)); gap: 2px; }
	.fs-glyph-grid button {
		aspect-ratio: 1; padding: 0; border: 0; border-radius: var(--radius); background: transparent; color: var(--manual-ink);
		font-family: inherit; font-size: var(--text-xl); cursor: default;
	}
	.fs-glyph-grid button:hover, .fs-glyph-grid button.active { background: var(--manual-ink); color: var(--manual-paper); }

	.fs-tester { display: flex; flex-direction: column; gap: .75rem; padding: .25rem 1.15rem 1.15rem; }
	.fs-tester-controls { display: flex; flex-wrap: wrap; align-items: center; gap: .6rem 1.5rem; color: var(--manual-muted); font-size: var(--text-sm); }
	.fs-tester-controls label { display: inline-flex; align-items: center; gap: .5rem; }
	.fs-tester-controls input[type="range"] { width: 140px; accent-color: var(--manual-brand); }
	.fs-tester-controls output { min-width: 3.5em; color: var(--manual-ink); font-weight: 500; font-variant-numeric: tabular-nums; }
	.fs-tester-controls select { height: 30px; padding: 0 .5rem; border: 1px solid var(--manual-border); border-radius: var(--radius); background: var(--manual-paper); color: var(--manual-ink); font-family: inherit; }
	.fs-check input { accent-color: var(--manual-brand); }
	.fs-tester-text {
		width: 100%; min-height: 1.6em; padding: .5rem 0; border: 0; border-bottom: 1px solid var(--manual-border);
		background: transparent; color: var(--manual-ink); font-family: var(--fs-family); line-height: 1.15;
		resize: vertical; outline: none; field-sizing: content;
	}
	.fs-tester-text:focus { border-bottom-color: var(--manual-brand); }
	.fs-tester-text::placeholder { color: var(--manual-ink); opacity: .9; }

	@media (max-width: 560px) {
		.fs-glyphs { grid-template-columns: minmax(0, 1fr); }
		.fs-glyph-big { position: static; max-width: 160px; }
	}
</style>
