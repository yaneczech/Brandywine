<script lang="ts">
	import type { PageData } from './$types';
	import * as m from '$lib/paraglide/messages';
	import {
		IconPalette, IconTypography, IconFolder, IconUsers, IconBook, IconArrowUpRight
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
	};

	const sections: Card[] = $derived([
		{ href: '/admin/manual',     title: m.admin_manual(),      description: m.dash_manual_desc(),     count: data.stats.pages,  unit: m.dash_stat_pages(),                   icon: IconBook },
		{ href: '/admin/colors',     title: m.admin_colors(),      description: m.dash_colors_desc(),     count: data.stats.colors, unit: m.admin_colors().toLowerCase(),        icon: IconPalette },
		{ href: '/admin/typography', title: m.admin_typography(),  description: m.dash_typography_desc(), count: data.stats.fonts,  unit: m.dash_stat_fonts().toLowerCase(),     icon: IconTypography },
		{ href: '/admin/assets',     title: m.admin_assets(),      description: m.dash_assets_desc(),     count: data.stats.assets, unit: m.dash_stat_files(),                   icon: IconFolder },
		{ href: '/admin/users',      title: m.dash_users_title(),  description: m.dash_users_desc(),      count: data.stats.users,  unit: m.dash_stat_members().toLowerCase(),   icon: IconUsers },
	].filter(section => section.href !== '/admin/users' || data.user?.role === 'admin'));
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

	<!-- Section index -->
	<div class="sections-grid">
		{#each sections as s, i (s.href)}
			<a href={s.href} class="section-card">
				<div class="card-header">
					<span class="card-index">{String(i + 1).padStart(2, '0')}</span>
					<span class="card-arrow"><IconArrowUpRight size={16} stroke={1.5} /></span>
				</div>

				{#if s.count !== null}
					<div class="card-count">
						<span class="card-num">{s.count}</span>
						<span class="card-unit">{s.unit}</span>
					</div>
				{/if}

				<div class="card-titles">
					<span class="card-title"><s.icon size={16} stroke={1.5} />{s.title}</span>
					<p class="card-desc">{s.description}</p>
				</div>
			</a>
		{/each}
	</div>

	<footer class="dash-meta">
		<span>Brandywine</span>
		<span class="dash-meta-sep" aria-hidden="true"></span>
		<span>{m.dash_version()} <span class="mono">0.1.0</span></span>
	</footer>
</div>

<style>
	.page {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	/* ── Section index — hairline grid ───────────────────────────────────── */
	.sections-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		border-top: 1px solid var(--color-border-strong);
		/* hairline grid: every cell draws its own right + bottom rule; the
		   rightmost column's rule is clipped so the index reads open-edged */
		clip-path: inset(0 1px 0 0);
	}

	.section-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
		padding: var(--space-5) var(--space-6) var(--space-8) var(--space-6);
		border-right: 1px solid var(--color-border);
		border-bottom: 1px solid var(--color-border);
		transition: background var(--dur) var(--ease);
	}
	.section-card:hover { background: var(--color-surface); }
	.section-card:hover .card-arrow { color: var(--color-text); transform: translate(2px, -2px); }

	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.card-index {
		font-family: var(--font-mono);
		font-size: var(--text-2xs);
		color: var(--color-muted);
		letter-spacing: var(--tracking-eyebrow);
	}
	.card-arrow {
		display: flex;
		color: var(--color-placeholder);
		transition: color var(--dur) var(--ease), transform var(--dur) var(--ease);
	}

	.card-count {
		display: flex;
		align-items: baseline;
		gap: var(--space-2);
		padding-top: var(--space-4);
	}
	.card-num {
		font-size: var(--text-5xl);
		font-weight: 400;
		letter-spacing: var(--tracking-display);
		line-height: 0.9;
		font-variant-numeric: tabular-nums;
		color: var(--color-text);
	}
	.card-unit {
		font-size: var(--text-sm);
		color: var(--color-muted);
	}

	.card-titles {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.card-title {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--text-md);
		font-weight: 500;
		letter-spacing: var(--tracking-snug);
		color: var(--color-text);
	}
	.card-title :global(svg) { color: var(--color-muted); }
	.card-desc {
		font-size: var(--text-sm);
		color: var(--color-muted);
		line-height: var(--leading-snug);
	}

	/* ── Meta ────────────────────────────────────────────────────────────── */
	.dash-meta {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		margin-top: var(--space-6);
		font-size: var(--text-xs);
		color: var(--color-muted);
	}
	.dash-meta-sep { width: 3px; height: 3px; border-radius: 50%; background: currentColor; opacity: 0.5; }

	@media (max-width: 700px) {
		.section-card { gap: var(--space-5); padding: var(--space-5) var(--space-4) var(--space-6); }
		.card-num { font-size: var(--text-4xl); }
	}
</style>
