<script lang="ts">
	import type { PageData } from './$types';
	const { data }: { data: PageData } = $props();

	const greeting = (() => {
		const h = new Date().getHours();
		if (h < 12) return 'Good morning';
		if (h < 17) return 'Good afternoon';
		return 'Good evening';
	})();

	const sections = [
		{
			href: '/admin/colors',
			title: 'Colors',
			description: 'Palettes, swatches & export formats',
			count: data.stats.colors,
			unit: 'colors',
			accent: '#c0392b',
			bg: 'linear-gradient(135deg, #fdf3f1 0%, #fce8e4 100%)',
		},
		{
			href: '/admin/typography',
			title: 'Typography',
			description: 'Fonts, weights & text styles',
			count: null,
			unit: null,
			accent: '#2563eb',
			bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
		},
		{
			href: '/admin/assets',
			title: 'Assets',
			description: 'Logos, images & downloadable files',
			count: data.stats.assets,
			unit: 'files',
			accent: '#7c3aed',
			bg: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
		},
		{
			href: '/admin/users',
			title: 'Users & Teams',
			description: 'Members, roles & permissions',
			count: data.stats.users,
			unit: 'members',
			accent: '#059669',
			bg: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
		},
	];
</script>

<svelte:head><title>Dashboard · Brandywine</title></svelte:head>

<!-- eslint-disable svelte/no-navigation-without-resolve -->
<div class="page">
	<!-- Topbar -->
	<div class="topbar">
		<div class="topbar-left">
			<h1 class="page-title">{greeting}{data.user?.name ? `, ${data.user.name.split(' ')[0]}` : ''}.</h1>
			<p class="page-sub">Here's what's in your brand system.</p>
		</div>
	</div>

	<!-- Sections grid -->
	<div class="sections-grid">
		{#each sections as s (s.href)}
			<a href={s.href} class="section-card" style="--accent: {s.accent}; --bg: {s.bg}">
				<div class="section-card-bg"></div>
				<div class="section-card-content">
					<div class="section-top">
						<h2 class="section-title">{s.title}</h2>
						{#if s.count !== null}
							<div class="section-count">{s.count} <span>{s.unit}</span></div>
						{/if}
					</div>
					<p class="section-desc">{s.description}</p>
					<div class="section-cta">
						Open
						<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
					</div>
				</div>
			</a>
		{/each}
	</div>

	<!-- Quick overview row -->
	<div class="overview-row">
		<div class="overview-card">
			<div class="ov-label">Total colors</div>
			<div class="ov-val">{data.stats.colors}</div>
		</div>
		<div class="overview-divider"></div>
		<div class="overview-card">
			<div class="ov-label">Assets</div>
			<div class="ov-val">{data.stats.assets}</div>
		</div>
		<div class="overview-divider"></div>
		<div class="overview-card">
			<div class="ov-label">Team members</div>
			<div class="ov-val">{data.stats.users}</div>
		</div>
		<div class="overview-divider"></div>
		<div class="overview-card">
			<div class="ov-label">Version</div>
			<div class="ov-val ov-version">0.1.0</div>
		</div>
	</div>
</div>

<style>
	.page {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	/* Topbar */
	.topbar {
		padding: 2.5rem 2.5rem 0;
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		margin-bottom: 2rem;
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
		font-size: 0.9rem;
		color: var(--color-muted);
	}

	/* Section cards */
	.sections-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		padding: 0 2.5rem;
	}

	.section-card {
		position: relative;
		border-radius: 14px;
		border: 1px solid var(--color-border);
		overflow: hidden;
		padding: 1.75rem;
		display: flex;
		flex-direction: column;
		transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
		background: var(--color-surface);
		cursor: pointer;
	}
	.section-card-bg {
		position: absolute;
		inset: 0;
		background: var(--bg);
		opacity: 0;
		transition: opacity 0.2s;
	}
	.section-card:hover {
		border-color: color-mix(in srgb, var(--accent) 40%, transparent);
		box-shadow: 0 4px 24px rgba(0,0,0,.06);
		transform: translateY(-1px);
	}
	.section-card:hover .section-card-bg { opacity: 1; }

	.section-card-content {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.section-top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}
	.section-title {
		font-size: 1.0625rem;
		font-weight: 600;
		letter-spacing: -0.02em;
		color: var(--color-text);
	}
	.section-count {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--accent);
		letter-spacing: -0.03em;
		line-height: 1;
	}
	.section-count span {
		font-size: 0.75rem;
		font-weight: 500;
		opacity: 0.7;
	}
	.section-desc {
		font-size: 0.8125rem;
		color: var(--color-muted);
		line-height: 1.5;
		margin-bottom: 1.25rem;
		flex: 1;
	}
	.section-cta {
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 0.8125rem;
		font-weight: 550;
		color: var(--accent);
		opacity: 0;
		transform: translateX(-4px);
		transition: opacity 0.15s, transform 0.15s;
	}
	.section-card:hover .section-cta {
		opacity: 1;
		transform: translateX(0);
	}

	/* Overview strip */
	.overview-row {
		margin: 1.5rem 2.5rem 2.5rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 12px;
		display: flex;
		align-items: center;
		padding: 0 1.5rem;
	}
	.overview-card {
		flex: 1;
		padding: 1.25rem 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.ov-label {
		font-size: 0.75rem;
		color: var(--color-muted);
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}
	.ov-val {
		font-size: 1.5rem;
		font-weight: 700;
		letter-spacing: -0.03em;
		color: var(--color-text);
	}
	.ov-version {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--color-muted);
		font-family: var(--font-mono);
	}
	.overview-divider {
		width: 1px;
		height: 40px;
		background: var(--color-border);
		flex-shrink: 0;
		margin: 0 1.5rem;
	}
</style>
