<script lang="ts">
	import { page } from '$app/stores';
	import * as m from '$lib/paraglide/messages';
	import {
		IconLayoutDashboard,
		IconRosette,
		IconPalette,
		IconTypography,
		IconFolder,
		IconUsers,
		IconSettings,
		IconLogout,
		IconMenu2,
		IconBook2,
		IconExternalLink
	} from '@tabler/icons-svelte';
	const { children, data } = $props();

	const brand = $derived(data.brand);
	const systemName = $derived(brand?.name || brand?.systemName || 'Brandywine');
	const logoSrc = $derived(brand?.logoPath ?? '/logo.svg');
	const primaryColor = $derived(brand?.primaryColor ?? '#4A1204');

	$effect(() => {
		document.documentElement.style.setProperty('--brand', primaryColor);
		document.documentElement.style.setProperty('--brand-light', primaryColor + 'cc');
	});

	let mobileOpen = $state(false);
	$effect(() => { mobileOpen = false; });

	import type { ComponentType } from 'svelte';
	type NavItem = { href: string; label: string; icon: ComponentType };

	const isAdminUser = $derived(data.user?.role === 'admin');

	// $derived so nav labels re-evaluate when language changes
	const navGroups: { label: string; items: NavItem[] }[] = $derived([
		{
			label: m.admin_group_brand(),
			items: [
				{ href: '/admin',            label: m.admin_dashboard(), icon: IconLayoutDashboard },
				...(isAdminUser ? [{ href: '/admin/brand', label: m.admin_brand(), icon: IconRosette }] : []),
				{ href: '/admin/colors',      label: m.admin_colors(),    icon: IconPalette },
				{ href: '/admin/typography',  label: m.admin_typography(),icon: IconTypography },
			]
		},
		{
			label: m.admin_group_assets(),
			items: [
				{ href: '/admin/assets', label: m.admin_assets(), icon: IconFolder },
				{ href: '/admin/manual', label: m.admin_manual(),   icon: IconBook2 },
			]
		},
		...(isAdminUser ? [{
			label: m.admin_group_admin(),
			items: [
				{ href: '/admin/users',    label: m.admin_users(),    icon: IconUsers },
				{ href: '/admin/settings', label: m.admin_settings(), icon: IconSettings },
			]
		}] : [])
	]);

	function isActive(href: string) {
		if (href === '/admin') return $page.url.pathname === '/admin';
		return $page.url.pathname.startsWith(href);
	}
</script>

<!-- eslint-disable svelte/no-navigation-without-resolve -->
{#snippet iconSnippet(Icon: NavItem['icon'])}
	<Icon size={15} stroke={1.75} />
{/snippet}

<!-- Mobile overlay -->
{#if mobileOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="mobile-overlay" onclick={() => (mobileOpen = false)}></div>
{/if}

<!-- Mobile topbar -->
<div class="mobile-topbar">
	<button class="hamburger" onclick={() => (mobileOpen = !mobileOpen)} aria-label="Menu">
		<IconMenu2 size={18} stroke={1.75} />
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
							<span class="nav-icon">{@render iconSnippet(item.icon)}</span>
							<span>{item.label}</span>
							{#if isActive(item.href)}
								<span class="nav-dot"></span>
							{/if}
						</a>
					{/each}
				</div>
			{/each}
		</nav>

		<!-- View manual -->
		<div class="sidebar-manual-link">
			<a href="/" target="_blank" rel="noreferrer" class="manual-link">
				<IconBook2 size={14} stroke={1.75} />
				<span>{m.layout_view_manual()}</span>
				<IconExternalLink size={12} stroke={2} class="ext-icon" />
			</a>
		</div>

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
							<IconLogout size={15} stroke={1.75} />
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

	/* View manual link */
	.sidebar-manual-link {
		padding: 0.5rem 0.75rem;
		border-top: 1px solid var(--color-border);
		flex-shrink: 0;
	}
	.manual-link {
		display: flex;
		align-items: center;
		gap: 7px;
		padding: 0.4rem 0.5rem;
		border-radius: 6px;
		font-size: 0.8125rem;
		font-weight: 450;
		color: var(--color-muted);
		transition: background 0.1s, color 0.1s;
	}
	.manual-link:hover {
		background: var(--color-surface-raised);
		color: var(--color-text);
	}
	.manual-link :global(.ext-icon) {
		margin-left: auto;
		opacity: 0.5;
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
		min-width: 0;
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
		.shell {
			display: block;
		}
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
			width: 100%;
			max-width: 100%;
			padding-top: 52px;
		}
	}

	/* ── Shared admin page utilities ─────────────────────────────────────── */
	/* Use these classes on all admin pages to keep layout consistent.       */
	/* ap = admin page                                                        */

	:global(.ap) {
		padding: 2rem;
	}
	/* topbar: title/sub on left, actions on right */
	:global(.ap-topbar) {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
	}
	:global(.ap-title) {
		margin: 0 0 .15rem;
		font-size: 1.5rem;
		font-weight: 650;
		letter-spacing: -0.025em;
		line-height: 1.2;
		color: var(--color-text);
	}
	:global(.ap-sub) {
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-muted);
		line-height: 1.4;
	}
	:global(.ap-actions) {
		display: flex;
		align-items: center;
		gap: .5rem;
		flex-shrink: 0;
		flex-wrap: wrap;
	}
	/* pages that use split-padding (topbar + scrollable sub-sections) */
	:global(.ap-split) {
		padding: 0;
	}
	:global(.ap-split .ap-topbar) {
		padding: 2rem 2rem 0;
		margin-bottom: 0;
	}
	:global(.ap-content) {
		padding: 0 2rem 3rem;
	}

	@media (max-width: 900px) {
		:global(.ap) { padding: 1rem; }
		:global(.ap-split .ap-topbar) { padding: 1rem 1rem 0; }
		:global(.ap-content) { padding: 0 1rem 2rem; }
		:global(.ap-topbar) { margin-bottom: 1rem; }
		:global(.ap-title) { font-size: 1.25rem; }
	}
</style>
