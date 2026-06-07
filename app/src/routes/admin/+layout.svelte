<script lang="ts">
	import { page } from '$app/stores';
	import * as m from '$lib/paraglide/messages';
	const { children, data } = $props();

	const brand = $derived(data.brand);
	const systemName = $derived(brand?.systemName ?? 'Brandywine');
	const logoSrc = $derived(brand?.logoPath ?? '/logo.svg');
	const primaryColor = $derived(brand?.primaryColor ?? '#4A1204');

	$effect(() => {
		document.documentElement.style.setProperty('--brand', primaryColor);
		document.documentElement.style.setProperty('--brand-light', primaryColor + 'cc');
	});

	let mobileOpen = $state(false);
	$effect(() => { mobileOpen = false; });

	type NavItem = { href: string; label: string; icon: string; };

	// $derived so nav labels re-evaluate when language changes
	const navGroups: { label: string; items: NavItem[] }[] = $derived([
		{
			label: m.admin_group_brand(),
			items: [
				{ href: '/admin',            label: m.admin_dashboard(), icon: `<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" stroke-width="1.4"/><rect x="8.5" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" stroke-width="1.4"/><rect x="1" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" stroke-width="1.4"/><rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" stroke-width="1.4"/></svg>` },
				{ href: '/admin/brand',       label: m.admin_brand(),      icon: `<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5l1.8 4.2 4.2.3-3.2 2.7 1 4.1-3.8-2.3-3.8 2.3 1-4.1L1.5 6l4.2-.3z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>` },
				{ href: '/admin/colors',      label: m.admin_colors(),     icon: `<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6" stroke="currentColor" stroke-width="1.4"/><path d="M7.5 1.5C9.5 3 11.5 5 11.5 7.5S9.5 12 7.5 13.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>` },
				{ href: '/admin/typography',  label: m.admin_typography(), icon: `<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 4h11M7.5 4v8M5 12h5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>` },
			]
		},
		{
			label: m.admin_group_assets(),
			items: [
				{ href: '/admin/assets', label: m.admin_assets(), icon: `<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="3" width="12" height="9.5" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M1.5 6.5h12" stroke="currentColor" stroke-width="1.4"/><path d="M5 3V1.5M10 3V1.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>` },
			]
		},
		{
			label: m.admin_group_admin(),
			items: [
				{ href: '/admin/users',    label: m.admin_users(),    icon: `<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="5.5" cy="4.5" r="2.5" stroke="currentColor" stroke-width="1.4"/><path d="M1 13c0-2.5 2-4 4.5-4S10 10.5 10 13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M11 7c1.5 0 3 .8 3 2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="11.5" cy="4" r="1.5" stroke="currentColor" stroke-width="1.4"/></svg>` },
				{ href: '/admin/settings', label: m.admin_settings(), icon: `<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="2" stroke="currentColor" stroke-width="1.4"/><path d="M7.5 1v1.5M7.5 12.5V14M14 7.5h-1.5M2.5 7.5H1M12.36 3.64l-1.06 1.06M3.7 11.3l-1.06 1.06M12.36 11.36l-1.06-1.06M3.7 3.7L2.64 2.64" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>` },
			]
		}
	]);

	function isActive(href: string) {
		if (href === '/admin') return $page.url.pathname === '/admin';
		return $page.url.pathname.startsWith(href);
	}
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -->

<!-- Mobile overlay -->
{#if mobileOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="mobile-overlay" onclick={() => (mobileOpen = false)}></div>
{/if}

<!-- Mobile topbar -->
<div class="mobile-topbar">
	<button class="hamburger" onclick={() => (mobileOpen = !mobileOpen)} aria-label="Menu">
		<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 5h14M2 9h14M2 13h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
	</button>
	<span class="mobile-brand">{systemName}</span>
</div>

<div class="shell">
	<aside class="sidebar" class:mobile-open={mobileOpen}>
		<!-- Logo -->
		<div class="sidebar-logo">
			<a href="/admin" class="logo-link">
				<img src={logoSrc} alt={systemName} class="logo-img" />
				<span class="logo-text">{systemName}</span>
			</a>
		</div>

		<!-- Nav -->
		<nav class="sidebar-nav">
			{#each navGroups as group (group.label)}
				<div class="nav-group">
					<div class="nav-group-label">{group.label}</div>
					{#each group.items as item (item.href)}
						<a
							href={item.href}
							class="nav-item"
							class:active={isActive(item.href)}
							aria-current={isActive(item.href) ? 'page' : undefined}
						>
							<span class="nav-icon">{@html item.icon}</span>
							<span>{item.label}</span>
							{#if isActive(item.href)}
								<span class="nav-dot"></span>
							{/if}
						</a>
					{/each}
				</div>
			{/each}
		</nav>

		<!-- User -->
		<div class="sidebar-user">
			{#if data.user}
				<div class="user-block">
					<div class="user-avatar">
						{(data.user.name ?? data.user.email)[0].toUpperCase()}
					</div>
					<div class="user-meta">
						<div class="user-name">{data.user.name ?? data.user.email}</div>
						<div class="user-role">{data.user.role}</div>
					</div>
					<form method="POST" action="/api/auth/logout" class="logout-form">
						<button type="submit" class="logout-btn" title="Sign out">
							<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M5 13H2.5a.5.5 0 01-.5-.5v-10a.5.5 0 01.5-.5H5M9.5 10.5L12.5 7.5M12.5 7.5L9.5 4.5M12.5 7.5H5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
						</button>
					</form>
				</div>
			{/if}
		</div>
	</aside>

	<main class="main">
		{@render children()}
	</main>
</div>

<style>
	.shell {
		display: flex;
		min-height: 100vh;
	}

	/* ── Sidebar ─────────────────────────── */
	.sidebar {
		width: var(--sidebar-width);
		flex-shrink: 0;
		background: var(--color-surface);
		border-right: 1px solid var(--color-border);
		display: flex;
		flex-direction: column;
		position: fixed;
		top: 0;
		left: 0;
		height: 100vh;
		z-index: 20;
	}

	/* Logo */
	.sidebar-logo {
		height: 56px;
		display: flex;
		align-items: center;
		padding: 0 1rem;
		border-bottom: 1px solid var(--color-border);
		flex-shrink: 0;
	}
	.logo-link {
		display: flex;
		align-items: center;
		gap: 9px;
	}
	.logo-img {
		height: 26px;
		width: auto;
	}
	.logo-text {
		font-size: 0.9375rem;
		font-weight: 700;
		letter-spacing: -0.025em;
		color: var(--brand);
	}

	/* Nav */
	.sidebar-nav {
		flex: 1;
		padding: 1rem 0.5rem;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;

		/* Thin custom scrollbar */
		scrollbar-width: thin;
		scrollbar-color: var(--color-border) transparent;
	}

	.nav-group {
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.nav-group-label {
		font-size: 0.6875rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-muted);
		padding: 0 0.75rem;
		margin-bottom: 3px;
		opacity: 0.6;
	}

	.nav-item {
		position: relative;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 0.4rem 0.75rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 450;
		color: var(--color-muted);
		transition: background 0.1s, color 0.1s;
		cursor: pointer;
	}
	.nav-item:hover {
		background: var(--color-surface-raised);
		color: var(--color-text);
	}
	.nav-item.active {
		background: rgba(74,18,4,.07);
		color: var(--brand);
		font-weight: 550;
	}

	.nav-icon {
		width: 15px;
		height: 15px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		opacity: 0.8;
	}
	.nav-item.active .nav-icon { opacity: 1; }

	.nav-dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--brand);
		margin-left: auto;
		opacity: 0.6;
	}

	/* User block */
	.sidebar-user {
		border-top: 1px solid var(--color-border);
		padding: 0.75rem;
		flex-shrink: 0;
	}
	.user-block {
		display: flex;
		align-items: center;
		gap: 9px;
		padding: 0.375rem 0.25rem;
	}
	.user-avatar {
		width: 28px;
		height: 28px;
		border-radius: 7px;
		background: var(--brand);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		font-weight: 700;
		flex-shrink: 0;
		letter-spacing: 0;
	}
	.user-meta {
		flex: 1;
		min-width: 0;
	}
	.user-name {
		font-size: 0.8125rem;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		color: var(--color-text);
	}
	.user-role {
		font-size: 0.6875rem;
		color: var(--color-muted);
		text-transform: capitalize;
		margin-top: 1px;
	}

	.logout-form { margin-left: auto; }
	.logout-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 6px;
		border: none;
		background: none;
		color: var(--color-muted);
		cursor: pointer;
		transition: background 0.1s, color 0.1s;
		flex-shrink: 0;
	}
	.logout-btn:hover {
		background: var(--color-surface-raised);
		color: var(--color-danger);
	}

	/* ── Main ────────────────────────────── */
	.main {
		margin-left: var(--sidebar-width);
		flex: 1;
		min-height: 100vh;
		background: var(--color-bg);
	}

	/* ── Mobile ──────────────────────────── */
	.mobile-topbar {
		display: none;
		position: fixed;
		top: 0; left: 0; right: 0;
		height: 52px;
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
		align-items: center;
		padding: 0 1rem;
		gap: 12px;
		z-index: 30;
	}
	.hamburger {
		display: flex; align-items: center; justify-content: center;
		width: 36px; height: 36px; border: none; background: none;
		cursor: pointer; color: var(--color-text); border-radius: 8px;
		transition: background 0.1s;
	}
	.hamburger:hover { background: var(--color-surface-raised); }
	.mobile-brand { font-weight: 700; font-size: 0.9375rem; letter-spacing: -0.02em; color: var(--brand); }
	.mobile-overlay {
		display: none;
		position: fixed; inset: 0;
		background: rgba(0,0,0,0.35);
		z-index: 19;
	}

	@media (max-width: 900px) {
		.sidebar {
			transform: translateX(-100%);
			transition: transform 0.25s cubic-bezier(0.4,0,0.2,1);
			box-shadow: none;
		}
		.sidebar.mobile-open {
			transform: translateX(0);
			box-shadow: var(--shadow-lg);
		}
		.mobile-topbar { display: flex; }
		.mobile-overlay { display: block; }
		.main {
			margin-left: 0;
			padding-top: 52px;
		}
	}
</style>
