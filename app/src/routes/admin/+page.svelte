<script lang="ts">
	import type { PageData } from './$types';
	import * as m from '$lib/paraglide/messages';
	import {
		IconPalette, IconTypography, IconFolder, IconUsers,
		IconArrowUpRight, IconDroplet, IconLetterCase, IconFile, IconUserCircle
	} from '@tabler/icons-svelte';
	import type { ComponentType } from 'svelte';

	const { data }: { data: PageData } = $props();

	const greeting = $derived((() => {
		const h = new Date().getHours();
		if (h < 12) return m.dash_greeting_morning();
		if (h < 17) return m.dash_greeting_afternoon();
		return m.dash_greeting_evening();
	})());

	type Card = {
		href: string; title: string; description: string;
		count: number | null; unit: string | null;
		icon: ComponentType;
		accent: string; iconBg: string; grad: string;
	};

	const sections: Card[] = $derived([
		{
			href: '/admin/colors',
			title: m.admin_colors(),
			description: m.dash_colors_desc(),
			count: data.stats.colors, unit: m.admin_colors().toLowerCase(),
			icon: IconPalette,
			accent: '#c0392b',
			iconBg: 'rgba(192,57,43,.12)',
			grad: 'linear-gradient(135deg, #fdf3f1 0%, #fde8e4 100%)',
		},
		{
			href: '/admin/typography',
			title: m.admin_typography(),
			description: m.dash_typography_desc(),
			count: data.stats.fonts, unit: m.dash_stat_fonts().toLowerCase(),
			icon: IconTypography,
			accent: '#2563eb',
			iconBg: 'rgba(37,99,235,.1)',
			grad: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
		},
		{
			href: '/admin/assets',
			title: m.admin_assets(),
			description: m.dash_assets_desc(),
			count: data.stats.assets, unit: m.dash_stat_files(),
			icon: IconFolder,
			accent: '#7c3aed',
			iconBg: 'rgba(124,58,237,.1)',
			grad: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
		},
		{
			href: '/admin/users',
			title: m.dash_users_title(),
			description: m.dash_users_desc(),
			count: data.stats.users, unit: m.dash_stat_members().toLowerCase(),
			icon: IconUsers,
			accent: '#059669',
			iconBg: 'rgba(5,150,105,.1)',
			grad: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
		},
	]);

	const stats = $derived([
		{ label: m.admin_colors(),     value: data.stats.colors, icon: IconDroplet,    unit: '' },
		{ label: m.dash_stat_fonts(),  value: data.stats.fonts,  icon: IconLetterCase, unit: '' },
		{ label: m.admin_assets(),     value: data.stats.assets, icon: IconFile,       unit: '' },
		{ label: m.dash_stat_members(),value: data.stats.users,  icon: IconUserCircle, unit: '' },
	]);
</script>

<svelte:head><title>Dashboard · Brandywine</title></svelte:head>

<!-- eslint-disable svelte/no-navigation-without-resolve -->
<div class="page ap">
	<!-- Topbar -->
	<div class="ap-topbar">
		<div>
			<h1 class="ap-title">{greeting}{data.user?.name ? `, ${data.user.name.split(' ')[0]}` : ''}.</h1>
			<p class="ap-sub">{m.dash_sub()}</p>
		</div>
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
			<span class="strip-label">{m.dash_version()}</span>
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

	/* ── Section cards ───────────────────────────────────────────────────── */
	.sections-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.875rem;
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
		margin: 1.25rem 0 0;
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
		.sections-grid { grid-template-columns: 1fr; }
		.stats-strip { margin: 1rem 0 0; padding: 0 1rem; flex-wrap: wrap; }
		.strip-divider { display: none; }
		.strip-stat { flex: 1 1 40%; padding: 0.875rem 0; }
	}
</style>
