<script lang="ts">
	import { IconRotateClockwise, IconCheck, IconAlertTriangle } from '$lib/icons';
	import BrandColorPicker from './BrandColorPicker.svelte';
	import { contrastRatio } from '$lib/utils/colors';

	type BrandColor = { id: string; name: string; hex: string; paletteId: string | null };
	type BrandPalette = { id: string; name: string };
	type ContrastCheck = { label: string; against: string; min: number };

	let {
		value = $bindable(''),
		label,
		hint = '',
		placeholder,
		previewText = 'Aa',
		checks = [] as ContrastCheck[],
		brandColors = [] as BrandColor[],
		brandPalettes = [] as BrandPalette[]
	}: {
		value?: string | null;
		label: string;
		hint?: string;
		placeholder: string;
		previewText?: string;
		checks?: ContrastCheck[];
		brandColors?: BrandColor[];
		brandPalettes?: BrandPalette[];
	} = $props();

	const current = $derived(value || placeholder);
	const resolvedChecks = $derived(checks.map((check) => {
		const ratio = contrastRatio(current, check.against);
		return {
			...check,
			ratio,
			pass: ratio >= check.min
		};
	}));
</script>

<div class="theme-color-field">
	<div class="theme-color-field-head">
		<div>
			<div class="theme-color-label">{label}</div>
			{#if hint}<p>{hint}</p>{/if}
		</div>
		<div class="theme-color-sample" style="background:{current}; color:{checks[0]?.against ?? '#111'}">{previewText}</div>
	</div>

	<BrandColorPicker bind:value placeholder={placeholder} {brandColors} {brandPalettes} compact />

	{#if resolvedChecks.length}
		<div class="contrast-checks" aria-label="Contrast checks">
			{#each resolvedChecks as check (`${check.label}-${check.against}`)}
				<div class="contrast-check" class:fail={!check.pass}>
					<span class="contrast-icon" aria-hidden="true">
						{#if check.pass}<IconCheck size={13} stroke={2.3} />{:else}<IconAlertTriangle size={13} stroke={2.1} />{/if}
					</span>
					<span class="contrast-name">{check.label}</span>
					<strong>{check.ratio.toFixed(1)}:1</strong>
				</div>
			{/each}
		</div>
	{/if}

	{#if value}
		<button class="theme-reset" type="button" onclick={() => (value = '')}>
			<IconRotateClockwise size={13} stroke={1.9} />
			Reset
		</button>
	{/if}
</div>

<style>
	.theme-color-field {
		display: grid;
		gap: 8px;
		padding: 12px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-bg);
		min-width: 0;
	}
	.theme-color-field-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
		min-width: 0;
	}
	.theme-color-label {
		font-size: var(--text-base);
		font-weight: 600;
		color: var(--color-text);
		line-height: 1.2;
	}
	.theme-color-field-head p {
		margin: .18rem 0 0;
		color: var(--color-muted);
		font-size: var(--text-xs);
		line-height: 1.35;
	}
	.theme-color-sample {
		width: 38px;
		height: 30px;
		display: grid;
		place-items: center;
		border: 1px solid rgba(0,0,0,.12);
		border-radius: var(--radius);
		font-size: var(--text-xs);
		font-weight: 600;
		flex: 0 0 auto;
		box-shadow: inset 0 0 0 1px rgba(255,255,255,.14);
	}
	.contrast-checks {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 4px;
	}
	.contrast-check {
		display: flex;
		align-items: center;
		gap: 4px;
		min-width: 0;
		padding: 4px 8px;
		border: 1px solid color-mix(in srgb, var(--color-success) 30%, var(--color-border));
		border-radius: var(--radius);
		background: color-mix(in srgb, var(--color-success) 7%, var(--color-bg));
		color: var(--color-success);
		font-size: var(--text-xs);
	}
	.contrast-check.fail {
		border-color: color-mix(in srgb, var(--color-danger) 34%, var(--color-border));
		background: color-mix(in srgb, var(--color-danger) 7%, var(--color-bg));
		color: var(--color-danger);
	}
	.contrast-icon {
		display: grid;
		place-items: center;
		flex: 0 0 auto;
	}
	.contrast-name {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--color-muted);
	}
	.contrast-check strong {
		margin-left: auto;
		color: inherit;
		white-space: nowrap;
	}
	.theme-reset {
		justify-self: start;
		display: inline-flex;
		align-items: center;
		gap: 4px;
		border: 0;
		background: transparent;
		color: var(--color-muted);
		padding: 0;
		font-size: var(--text-xs);
		font-weight: 600;
		cursor: pointer;
	}
	.theme-reset:hover { color: var(--color-text); }

	@media (max-width: 560px) {
		.contrast-checks { grid-template-columns: 1fr; }
	}
</style>
