<script lang="ts">
	import { IconPencil, IconX } from '@tabler/icons-svelte';
	import { generateShades } from '$lib/utils/colors';

	type BrandColor = { id: string; name: string; hex: string; paletteId: string | null };
	type Palette    = { id: string; name: string };

	let {
		value = $bindable(''),
		placeholder = '#000000',
		brandColors = [] as BrandColor[],
		brandPalettes = [] as Palette[],
		label = '',
		compact = false,
	}: {
		value?: string | null;
		placeholder?: string;
		brandColors?: BrandColor[];
		brandPalettes?: Palette[];
		label?: string;
		compact?: boolean;
	} = $props();

	let expandedColorId = $state<string | null>(null);
	let customMode = $state(false);

	// Group colors by palette
	const grouped = $derived.by(() => {
		const unpinned = brandColors.filter(c => !c.paletteId);
		const byPalette = brandPalettes.map(p => ({
			palette: p,
			colors: brandColors.filter(c => c.paletteId === p.id),
		})).filter(g => g.colors.length > 0);
		return [...byPalette, ...(unpinned.length ? [{ palette: null, colors: unpinned }] : [])];
	});

	function select(hex: string) {
		value = hex;
		expandedColorId = null;
	}

	const displayColor = $derived(value || placeholder);
	const pickerColor = $derived(/^#[0-9a-fA-F]{6}$/.test(String(displayColor ?? '')) ? String(displayColor) : '#000000');
	const normalizedValue = $derived((value ?? '').toLowerCase());
	const isCustom = $derived(
		!!normalizedValue && !brandColors.some(c => c.hex.toLowerCase() === normalizedValue) &&
		!brandColors.some(c => generateShades(c.hex).some(s => s.hex.toLowerCase() === normalizedValue))
	);
</script>

<div class="bcp" class:compact>
	<!-- Current value pill -->
	<div class="bcp-value">
		<span class="bcp-dot" style="background:{displayColor}"></span>
		<span class="bcp-hex">{value || placeholder}</span>
		{#if value}
			<button class="bcp-clear" type="button" onclick={() => { value = ''; customMode = false; }} title="Vymazat" aria-label="Vymazat barvu">
				<IconX size={14} stroke={2.1} />
			</button>
		{/if}
	</div>

	<!-- Brand color swatches -->
	{#if brandColors.length > 0}
		<div class="bcp-swatches">
			{#each grouped as group}
				<div class="bcp-group">
					{#if group.palette}
						<span class="bcp-palette-name">{group.palette.name}</span>
					{/if}
					<div class="bcp-row">
						{#each group.colors as color}
							<div class="bcp-color-wrap">
								<button
									class="bcp-swatch"
									type="button"
									class:selected={value?.toLowerCase() === color.hex.toLowerCase()}
									style="background:{color.hex}"
									title={color.name}
									onclick={() => {
										if (expandedColorId === color.id) {
											expandedColorId = null;
										} else {
											expandedColorId = color.id;
										}
									}}
								></button>
								{#if expandedColorId === color.id}
									<div class="bcp-shades">
										{#each generateShades(color.hex) as shade}
											<button
												class="bcp-shade"
												type="button"
												class:selected={value?.toLowerCase() === shade.hex.toLowerCase()}
												style="background:{shade.hex}"
												title="{color.name} {shade.label}"
												onclick={() => select(shade.hex)}
											>
												<span class="bcp-shade-label">{shade.label}</span>
											</button>
										{/each}
										<button
											class="bcp-shade bcp-shade-base"
											type="button"
											class:selected={value?.toLowerCase() === color.hex.toLowerCase()}
											style="background:{color.hex}"
											title="{color.name} (base)"
											onclick={() => select(color.hex)}
										>
											<span class="bcp-shade-label">Base</span>
										</button>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Custom hex input -->
	<div class="bcp-custom">
		<button
			class="bcp-custom-toggle"
			type="button"
			class:active={customMode || isCustom}
			onclick={() => customMode = !customMode}
		>
			{#if isCustom}
				<IconPencil size={13} stroke={1.8} />
				<span>{value}</span>
			{:else}
				<span>Vlastní barva…</span>
			{/if}
		</button>
		{#if customMode || isCustom}
			<div class="bcp-custom-row">
				<input type="color" value={pickerColor} onchange={(e) => value = (e.currentTarget as HTMLInputElement).value} />
				<input
					class="mono"
					bind:value
					{placeholder}
					spellcheck="false"
					onchange={(e) => {
						const v = (e.currentTarget as HTMLInputElement).value.trim();
						if (/^#[0-9a-fA-F]{6}$/.test(v)) value = v;
					}}
				/>
			</div>
		{/if}
	</div>
</div>

<style>
	.bcp { display: flex; flex-direction: column; gap: .45rem; min-width: 0; }
	.bcp-value {
		display: flex; align-items: center; gap: .45rem;
		padding: .3rem .55rem; border: 1px solid var(--color-border);
		border-radius: 8px; background: var(--color-surface); min-height: 34px;
		min-width: 0;
	}
	.bcp-dot { width: 16px; height: 16px; border-radius: 4px; border: 1px solid rgba(0,0,0,.12); flex-shrink: 0; }
	.bcp-hex {
		font-family: var(--font-mono);
		font-size: .8rem;
		flex: 1;
		color: var(--color-text);
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.bcp-clear {
		display: grid;
		place-items: center;
		width: 24px;
		height: 24px;
		border: none;
		background: none;
		cursor: pointer;
		color: var(--color-muted);
		padding: 0;
		border-radius: 6px;
	}
	.bcp-clear:hover { color: var(--brand); background: color-mix(in srgb, var(--brand) 7%, transparent); }
	.bcp-palette-name { font-size: .7rem; font-weight: 680; color: var(--color-muted); text-transform: uppercase; letter-spacing: .05em; margin-top: .3rem; display: block; }
	.bcp-swatches { display: flex; flex-direction: column; gap: .2rem; }
	.bcp-group { min-width: 0; }
	.bcp-row { display: flex; flex-wrap: wrap; gap: .3rem; }
	.bcp-color-wrap { position: relative; }
	.bcp-swatch {
		width: 26px; height: 26px; border-radius: 6px;
		border: 2px solid transparent; cursor: pointer;
		transition: transform .1s, border-color .1s;
		outline: 1px solid rgba(0,0,0,.1);
	}
	.bcp-swatch:hover { transform: scale(1.15); }
	.bcp-swatch.selected { border-color: var(--brand); outline: 2px solid var(--brand); }
	.bcp-shades {
		position: absolute; top: 30px; left: 0; z-index: 30;
		display: flex; gap: 3px; flex-wrap: nowrap;
		background: var(--color-surface-raised); border: 1px solid var(--color-border);
		border-radius: 8px; padding: 6px; box-shadow: 0 8px 24px rgba(0,0,0,.14);
		min-width: 280px;
	}
	.bcp-shade {
		width: 24px; height: 40px; border-radius: 5px;
		border: 2px solid transparent; cursor: pointer; position: relative;
		flex-shrink: 0; outline: 1px solid rgba(0,0,0,.08);
		transition: transform .1s;
	}
	.bcp-shade:hover { transform: scaleY(1.08); }
	.bcp-shade.selected { border-color: var(--brand); }
	.bcp-shade-label {
		position: absolute; bottom: -14px; left: 50%; transform: translateX(-50%);
		font-size: .52rem; color: var(--color-muted); white-space: nowrap;
	}
	.bcp-shade-base { margin-left: 4px; outline: 2px solid rgba(0,0,0,.18); }
	.bcp-custom-toggle {
		display: inline-flex; align-items: center; gap: .3rem;
		border: none; background: none; cursor: pointer;
		color: var(--color-muted); font-size: .78rem; text-align: left; padding: 0;
		text-decoration: underline; text-underline-offset: 2px;
		max-width: 100%;
	}
	.bcp-custom-toggle span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.bcp-custom-toggle.active { color: var(--color-text); }
	.bcp-custom-row { display: flex; align-items: center; gap: .45rem; margin-top: .25rem; min-width: 0; }
	.bcp-custom-row input[type="color"] { width: 36px; height: 30px; padding: 2px; border: 1px solid var(--color-border); border-radius: 6px; cursor: pointer; }
	.bcp-custom-row .mono { font-family: var(--font-mono); font-size: .82rem; flex: 1; min-width: 0; border: 1px solid var(--color-border); border-radius: 6px; padding: .3rem .5rem; background: var(--color-surface); color: var(--color-text); }
	.bcp.compact .bcp-swatches {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(88px, 1fr));
		gap: .45rem;
	}
	.bcp.compact .bcp-row { gap: .22rem; }
	.bcp.compact .bcp-swatch {
		width: 22px;
		height: 22px;
		border-radius: 6px;
	}
	.bcp.compact .bcp-palette-name {
		margin: 0 0 .25rem;
		font-size: .62rem;
	}
	.bcp.compact .bcp-shades {
		top: 27px;
		min-width: min(280px, calc(100vw - 48px));
		overflow-x: auto;
	}
	@media (max-width: 560px) {
		.bcp-shades {
			position: static;
			margin-top: .35rem;
			min-width: 0;
			max-width: 100%;
			overflow-x: auto;
		}
	}
</style>
