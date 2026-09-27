<script lang="ts">
	import { page } from '$app/stores';
	import * as m from '$lib/paraglide/messages';
	import { ensureContrast, readableOn } from '$lib/ui/contrast';
	import Toaster from '$lib/components/ui/Toaster.svelte';
	import DialogHost from '$lib/components/ui/DialogHost.svelte';
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
	} from '$lib/icons';
	const { children, data } = $props();

	const brand = $derived(data.brand);
	const systemName = $derived(brand?.name || brand?.systemName || 'Brandywine');
	const logoSrc = $derived(brand?.logoPath ?? '/logo.svg');
	const primaryColor = $derived(brand?.primaryColor ?? '#4A1204');

	$effect(() => {
		const root = document.documentElement.style;
		root.setProperty('--brand', primaryColor);
		root.setProperty('--brand-light', primaryColor + 'cc');
		root.setProperty('--color-accent-contrast', readableOn(primaryColor));
	});

	let mobileOpen = $state(false);

	import type { IconComponent } from '$lib/icons';
	// Brand as UI accent on the admin background: same hue, ≥ 3:1
	const uiBrand = $derived(ensureContrast(primaryColor, '#f7f7f5'));
	type NavItem = { href: string; label: string; icon: IconComponent };

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
	<Icon size={16} stroke={1.5} />
{/snippet}

<!-- Mobile overlay -->
{#if mobileOpen}
	<button class="mobile-overlay" type="button" aria-label={m.layout_close_nav()} onclick={() => (mobileOpen = false)}></button>
{/if}

<!-- Mobile topbar -->
<div class="mobile-topbar">
	<button class="hamburger" onclick={() => (mobileOpen = !mobileOpen)} aria-label="Menu">
		<IconMenu2 size={18} stroke={1.5} />
	</button>
	<span class="mobile-brand">{systemName}</span>
</div>

<!-- brand vars inline too, so SSR paints the right accent before hydration -->
<div class="shell brand-scope" style="--brand:{uiBrand}; --color-accent-contrast:{readableOn(uiBrand)}">
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
						</a>
					{/each}
				</div>
			{/each}
		</nav>

		<!-- View manual -->
		<div class="sidebar-manual-link">
			<a href="/" target="_blank" rel="noreferrer" class="manual-link">
				<IconBook2 size={16} stroke={1.5} />
				<span>{m.layout_view_manual()}</span>
				<IconExternalLink size={13} stroke={1.5} class="ext-icon" />
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
						<button type="submit" class="logout-btn" title={m.layout_sign_out()} aria-label={m.layout_sign_out()}>
							<IconLogout size={16} stroke={1.5} />
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

<Toaster />
<DialogHost />

<style>
	.shell {
		display: flex;
		min-height: 100vh;
	}

	/* ── Sidebar ─────────────────────────── */
	.sidebar {
		width: var(--sidebar-width);
		flex-shrink: 0;
		background: var(--color-bg);
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
		height: 64px;
		display: flex;
		align-items: center;
		padding: 0 var(--space-5);
		flex-shrink: 0;
	}
	.logo-link {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
		border-radius: var(--radius-sm);
	}
	.logo-img {
		height: 22px;
		width: auto;
		max-width: 120px;
		object-fit: contain;
	}
	.logo-text {
		font-size: var(--text-sm);
		font-weight: 600;
		letter-spacing: var(--tracking-snug);
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Nav */
	.sidebar-nav {
		flex: 1;
		padding: var(--space-2) var(--space-3) var(--space-6);
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
	}

	.nav-group {
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.nav-group-label {
		font-size: var(--text-2xs);
		font-weight: 500;
		letter-spacing: var(--tracking-eyebrow);
		text-transform: uppercase;
		color: var(--color-muted);
		padding: 0 var(--space-2);
		margin-bottom: var(--space-2);
	}

	.nav-item {
		position: relative;
		display: flex;
		align-items: center;
		gap: 8px;
		height: 32px;
		padding: 0 var(--space-2);
		border-radius: var(--radius);
		font-size: var(--text-sm);
		font-weight: 400;
		letter-spacing: var(--tracking-snug);
		color: var(--color-text-secondary);
		transition: background var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease);
	}
	.nav-item:hover {
		background: var(--color-hover);
		color: var(--color-text);
	}
	.nav-item.active {
		background: var(--color-surface);
		color: var(--color-text);
		font-weight: 500;
		box-shadow: 0 0 0 1px var(--color-border), var(--shadow-xs);
	}

	.nav-icon {
		width: 16px;
		height: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		color: var(--color-muted);
		transition: color var(--dur-fast) var(--ease);
	}
	.nav-item:hover .nav-icon { color: var(--color-text); }
	.nav-item.active .nav-icon { color: var(--color-accent); }

	/* View manual link */
	.sidebar-manual-link {
		padding: var(--space-2) var(--space-3);
		flex-shrink: 0;
	}
	.manual-link {
		display: flex;
		align-items: center;
		gap: 8px;
		height: 32px;
		padding: 0 var(--space-2);
		border-radius: var(--radius);
		font-size: var(--text-sm);
		letter-spacing: var(--tracking-snug);
		color: var(--color-text-secondary);
		transition: background var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease);
	}
	.manual-link :global(svg) { color: var(--color-muted); }
	.manual-link:hover {
		background: var(--color-hover);
		color: var(--color-text);
	}
	.manual-link :global(.ext-icon) { margin-left: auto; }

	/* User block */
	.sidebar-user {
		border-top: 1px solid var(--color-border);
		padding: var(--space-3);
		flex-shrink: 0;
	}
	.user-block {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: var(--space-1) var(--space-2);
	}
	.user-avatar {
		width: 28px;
		height: 28px;
		border-radius: var(--radius-full);
		background: var(--color-surface);
		box-shadow: inset 0 0 0 1px var(--color-border-strong);
		color: var(--color-text);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--text-xs);
		font-weight: 500;
		flex-shrink: 0;
	}
	.user-meta {
		flex: 1;
		min-width: 0;
		line-height: var(--leading-snug);
	}
	.user-name {
		font-size: var(--text-sm);
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		color: var(--color-text);
	}
	.user-role {
		font-size: var(--text-xs);
		color: var(--color-muted);
		text-transform: capitalize;
	}

	.logout-form { margin-left: auto; }
	.logout-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: var(--radius);
		border: none;
		background: none;
		color: var(--color-muted);
		transition: background var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease);
		flex-shrink: 0;
	}
	.logout-btn:hover {
		background: var(--color-hover);
		color: var(--color-text);
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
		background: color-mix(in srgb, var(--color-bg) 88%, transparent);
		-webkit-backdrop-filter: saturate(180%) blur(12px);
		backdrop-filter: saturate(180%) blur(12px);
		border-bottom: 1px solid var(--color-border);
		align-items: center;
		padding: 0 var(--space-3);
		gap: var(--space-2);
		z-index: 30;
	}
	.hamburger {
		display: flex; align-items: center; justify-content: center;
		width: 36px; height: 36px; border: none; background: none;
		color: var(--color-text); border-radius: var(--radius);
		transition: background var(--dur-fast) var(--ease);
	}
	.hamburger:hover { background: var(--color-hover); }
	.mobile-brand { font-weight: 600; font-size: var(--text-sm); letter-spacing: var(--tracking-snug); color: var(--color-text); }
	.mobile-overlay {
		display: none;
		position: fixed; inset: 0;
		padding: 0; border: 0; cursor: pointer;
		background: rgba(20, 20, 20, 0.28);
		z-index: 19;
	}

	@media (max-width: 900px) {
		.shell {
			display: block;
		}
		.sidebar {
			transform: translateX(-100%);
			transition: transform var(--dur-slow) var(--ease);
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
		padding: var(--space-10) var(--space-12) var(--space-16);
	}
	/* topbar: title/sub on left, actions on right */
	:global(.ap-topbar) {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: var(--space-4);
		margin-bottom: var(--space-8);
		flex-wrap: wrap;
	}
	:global(.ap-title) {
		margin: 0 0 8px;
		font-size: var(--text-2xl);
		font-weight: 600;
		letter-spacing: var(--tracking-tight);
		line-height: var(--leading-tight);
		color: var(--color-text);
	}
	:global(.ap-sub) {
		margin: 0;
		max-width: 64ch;
		font-size: var(--text-base);
		color: var(--color-muted);
		line-height: var(--leading-normal);
	}
	:global(.ap-actions) {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		flex-shrink: 0;
		flex-wrap: wrap;
	}
	/* pages that use split-padding (topbar + scrollable sub-sections) */
	:global(.ap-split) {
		padding: 0;
	}
	:global(.ap-split .ap-topbar) {
		padding: var(--space-10) var(--space-12) 0;
		margin-bottom: 0;
	}
	:global(.ap-content) {
		padding: 0 var(--space-12) var(--space-16);
	}

	@media (max-width: 1200px) {
		:global(.ap) { padding: var(--space-8) var(--space-8) var(--space-12); }
		:global(.ap-split .ap-topbar) { padding: var(--space-8) var(--space-8) 0; }
		:global(.ap-content) { padding: 0 var(--space-8) var(--space-12); }
	}
	@media (max-width: 900px) {
		:global(.ap) { padding: var(--space-5) var(--space-4) var(--space-10); }
		:global(.ap-split .ap-topbar) { padding: var(--space-5) var(--space-4) 0; }
		:global(.ap-content) { padding: 0 var(--space-4) var(--space-10); }
		:global(.ap-topbar) { margin-bottom: var(--space-5); align-items: flex-start; }
		:global(.ap-title) { font-size: var(--text-xl); }
	}
</style>
