<script lang="ts">
	import type { PageData } from './$types';
	import {
		IconPalette, IconTypography, IconFolder, IconUsers,
		IconArrowUpRight, IconDroplet, IconLetterCase, IconFile, IconUserCircle
	} from '@tabler/icons-svelte';
	import type { Component } from 'svelte';

	const { data }: { data: PageData } = $props();

	const greeting = (() => {
		const h = new Date().getHours();
		if (h < 12) return 'Good morning';
		if (h < 17) return 'Good afternoon';
		return 'Good evening';
	})();

	type Card = {
		href: string; title: string; description: string;
		count: number | null; unit: string | null;
		icon: Component<{ size?: number; stroke?: number }>;
		accent: string; iconBg: string; grad: string;
	};

	const sections: Card[] = [
		{
			href: '/admin/colors',
			title: 'Colors',
			description: 'Palettes, swatches, gradients & export formats',
			count: data.stats.colors, unit: 'colors',
			icon: IconPalette,
			accent: '#c0392b',
			iconBg: 'rgba(192,57,43,.12)',
			grad: 'linear-gradient(135deg, #fdf3f1 0%, #fde8e4 100%)',
		},
		{
			href: '/admin/typography',
			title: 'Typography',
			description: 'Fonts, type scales, variable axes & styles',
			count: data.stats.fonts, unit: 'fonts',
			icon: IconTypography,
			accent: '#2563eb',
			iconBg: 'rgba(37,99,235,.1)',
			grad: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
		},
		{
			href: '/admin/assets',
			title: 'Assets',
			description: 'Logos, images & downloadable brand files',
			count: data.stats.assets, unit: 'files',
			icon: IconFolder,
			accent: '#7c3aed',
			iconBg: 'rgba(124,58,237,.1)',
			grad: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
		},
		{
			href: '/admin/users',
			title: 'Users & Teams',
			description: 'Members, roles & access permissions',
			count: data.stats.users, unit: 'members',
			icon: IconUsers,
			accent: '#059669',
			iconBg: 'rgba(5,150,105,.1)',
			grad: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
		},
	];

	const stats = [
		{ label: 'Colors', value: data.stats.colors, icon: IconDroplet, unit: '' },
		{ label: 'Fonts', value: data.stats.fonts, icon: IconLetterCase, unit: '' },
		{ label: 'Assets', value: data.stats.assets, icon: IconFile, unit: '' },
		{ label: 'Members', value: data.stats.users, icon: IconUserCircle, unit: '' },
	];
</script>

<svelte:head><title>Dashboard · Brandywine</title></svelte:head>

<!-- eslint-disable svelte/no-navigation-without-resolve -->
<div class="page">
	<!-- Topbar -->
	<div class="topbar">
		<h1 class="page-title">{greeting}{data.user?.name ? `, ${data.user.name.split(' ')[0]}` : ''}.</h1>
		<p class="page-sub">Here's what's in your brand system.</p>
	</div>

	<!-- Section cards -->
	<div class="sections-grid">
		{#each sections as s (s.href)}
			<a href={s.href} class="section-card" style="--accent:{s.accent}; --icon-bg:{s.iconBg}; --grad:{s.grad}">
				<!-- gradient bg layer, fades in on hover -->
				<div class="card-grad"></div>

				<div class="card-header">
					<div class="card-icon-wrap">
						<s.icon size={19} stroke={1.5} />
					</div>
					<span class="card-arrow">
						<IconArrowUpRight size={14} stroke={2} />
					</span>
				</div>

				<div class="card-footer">
					<div class="card-titles">
						<span class="card-title">{s.title}</span>
						<p class="card-desc">{s.description}</p>
					</div>
					{#if s.count !== null}
						<div class="card-count">
							{s.count}
							<span class="card-unit">{s.unit}</span>
						</div>
					{/if}
				</div>
			</a>
		{/each}
	</div>

	<!-- Stats strip -->
	<div class="stats-strip">
		{#each stats as st, i (st.label)}
			{#if i > 0}<div class="strip-divider"></div>{/if}
			<div class="strip-stat">
				<span class="strip-icon"><st.icon size={14} stroke={1.75} /></span>
				<span class="strip-val">{st.value}</span>
				<span class="strip-label">{st.label}</span>
			</div>
		{/each}
		<div class="strip-divider"></div>
		<div class="strip-stat strip-version">
			<span class="strip-label">Version</span>
			<span class="strip-val strip-mono">0.1.0</span>
		</div>
	</div>
</div>

<style>
	.page {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	/* ── Topbar ──────────────────────────────────────────────────────────── */
	.topbar {
		padding: 2.5rem 2.5rem 2rem;
	}
	.page-title {
		font-size: 1.625rem;
		font-weight: 650;
		letter-spacing: -0.03em;
		color: var(--color-text);
		line-height: 1.2;
	}
	.page-sub {
		margin-top: 5px;
		font-size: 0.875rem;
		color: var(--color-muted);
	}

	/* ── Section cards ───────────────────────────────────────────────────── */
	.sections-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.875rem;
		padding: 0 2.5rem;
	}

	.section-card {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		min-height: 160px;
		padding: 1.375rem;
		border: 1.5px solid var(--color-border);
		border-radius: 14px;
		background: var(--color-surface);
		transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
		position: relative;
		overflow: hidden;
	}
	/* gradient bg layer */
	.card-grad {
		position: absolute;
		inset: 0;
		background: var(--grad);
		opacity: 0;
		transition: opacity 0.2s;
		pointer-events: none;
	}
	.section-card:hover {
		border-color: color-mix(in srgb, var(--accent) 40%, transparent);
		box-shadow: 0 6px 24px rgba(0,0,0,.07);
		transform: translateY(-2px);
	}
	.section-card:hover .card-grad { opacity: 1; }
	.section-card:hover .card-arrow { opacity: 1; transform: translate(0, 0); }
	.section-card:hover .card-icon-wrap { background: var(--icon-bg); color: var(--accent); }

	/* header row: icon + arrow */
	.card-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		position: relative;
		z-index: 1;
		margin-bottom: 1rem;
	}
	.card-icon-wrap {
		width: 40px; height: 40px;
		border-radius: 10px;
		background: var(--color-surface-raised);
		color: var(--color-muted);
		display: flex; align-items: center; justify-content: center;
		transition: background 0.2s, color 0.2s;
	}
	.card-arrow {
		color: var(--accent);
		opacity: 0;
		transform: translate(-3px, 3px);
		transition: opacity 0.15s, transform 0.15s;
		display: flex;
	}

	/* footer row: title+desc left, count right */
	.card-footer {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 12px;
		position: relative;
		z-index: 1;
	}
	.card-titles { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
	.card-title {
		font-size: 1rem;
		font-weight: 600;
		letter-spacing: -0.02em;
		color: var(--color-text);
	}
	.card-desc {
		font-size: 0.8rem;
		color: var(--color-muted);
		line-height: 1.4;
	}
	.card-count {
		font-size: 2rem;
		font-weight: 750;
		letter-spacing: -0.04em;
		color: var(--accent);
		line-height: 1;
		flex-shrink: 0;
		text-align: right;
	}
	.card-unit {
		display: block;
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		opacity: 0.65;
		text-align: right;
		margin-top: 2px;
	}

	/* ── Stats strip ─────────────────────────────────────────────────────── */
	.stats-strip {
		margin: 1.25rem 2.5rem 2.5rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 12px;
		display: flex;
		align-items: center;
		padding: 0 1.5rem;
	}
	.strip-stat {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 1.125rem 0;
	}
	.strip-icon {
		display: flex;
		color: var(--color-muted);
		flex-shrink: 0;
	}
	.strip-val {
		font-size: 1.25rem;
		font-weight: 700;
		letter-spacing: -0.03em;
		color: var(--color-text);
		line-height: 1;
	}
	.strip-label {
		font-size: 0.75rem;
		color: var(--color-muted);
		font-weight: 500;
	}
	.strip-divider {
		width: 1px;
		height: 32px;
		background: var(--color-border);
		flex-shrink: 0;
		margin: 0 1.25rem;
	}
	.strip-version {
		flex: none;
		gap: 8px;
	}
	.strip-mono {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-muted);
		font-family: var(--font-mono);
		letter-spacing: 0;
	}

	/* ── Responsive ──────────────────────────────────────────────────────── */
	@media (max-width: 700px) {
		.topbar { padding: 1.5rem 1rem 1.5rem; }
		.sections-grid { grid-template-columns: 1fr; padding: 0 1rem; }
		.stats-strip { margin: 1rem 1rem 2rem; padding: 0 1rem; flex-wrap: wrap; }
		.strip-divider { display: none; }
		.strip-stat { flex: 1 1 40%; padding: 0.875rem 0; }
	}
</style>
