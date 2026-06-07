<script lang="ts">
	import type { LayoutData } from './$types';
	import { page } from '$app/state';
	import * as m from '$lib/paraglide/messages';

	const { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	type NavPage = {
		id: string;
		parentId: string | null;
		title: string;
		slug: string;
		description?: string | null;
		sortOrder: number;
		isLanding: boolean;
	};

	const brand = $derived(data.settings);
	const brandName = $derived(brand?.name ?? 'Brand Manual');
	const primaryColor = $derived(brand?.primaryColor ?? '#4A1204');
	const lang = $derived(page.params.lang ?? brand?.defaultLanguage ?? 'cs');
	const activeLanguages = $derived((brand?.activeLanguages?.length ? brand.activeLanguages : ['cs', 'en']) as string[]);
	const allPages = $derived((data.pages ?? []) as NavPage[]);
	const landingTitle = $derived(allPages.find(p => p.isLanding)?.title ?? 'Overview');
	const currentPathLabel = $derived(page.url.pathname === `/${lang}` || page.url.pathname === `/${lang}/` ? landingTitle : currentPageTitle());

	let mobileMenuOpen = $state(false);

	function assetSrc(path: string | null | undefined): string | null {
		if (!path) return null;
		if (/^(https?:)?\/\//.test(path) || path.startsWith('/')) return path;
		return `/uploads/${path.replace(/^\/+/, '')}`;
	}

	function childrenOf(parentId: string | null): NavPage[] {
		return allPages
			.filter(p => p.parentId === parentId && !p.isLanding)
			.sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
	}

	function pageHref(p: NavPage): string {
		const parts: string[] = [];
		let cur: NavPage | undefined = p;
		while (cur && !cur.isLanding) {
			parts.unshift(cur.slug);
			cur = allPages.find(x => x.id === cur!.parentId);
		}
		return `/${lang}/${parts.join('/')}`;
	}

	function languageHref(targetLang: string): string {
		const parts = page.url.pathname.split('/').filter(Boolean);
		parts[0] = targetLang;
		return `/${parts.join('/')}${page.url.pathname.endsWith('/') ? '/' : ''}`;
	}

	function isActive(href: string): boolean {
		const pathname = page.url.pathname.replace(/\/$/, '');
		const cleanHref = href.replace(/\/$/, '');
		if (cleanHref === `/${lang}`) return pathname === `/${lang}`;
		return pathname === cleanHref || pathname.startsWith(`${cleanHref}/`);
	}

	function currentPageTitle(): string {
		const pathname = page.url.pathname.replace(/\/$/, '');
		const match = allPages.find(p => pageHref(p).replace(/\/$/, '') === pathname);
		return match?.title ?? brandName;
	}
</script>

<svelte:head>
	<title>{currentPathLabel} · {brandName}</title>
	<meta name="description" content="{brandName} brand manual" />
	<style>:root { color-scheme: light; } body { background: #f8f7f4; }</style>
</svelte:head>

<div class="manual-shell" style="--manual-brand:{primaryColor}">
	<header class="topbar">
		<div class="topbar-inner">
			<a href="/{lang}/" class="wordmark" aria-label="{brandName} manual home">
				{#if assetSrc(brand?.logoPath)}
					<img src={assetSrc(brand?.logoPath) ?? ''} alt={brandName} class="logo-img" />
				{:else}
					<span class="logo-fallback">{brandName.slice(0, 1)}</span>
				{/if}
				<span class="brand-name">{brandName}</span>
			</a>

			<div class="topbar-right">
				<nav class="language-switcher" aria-label="Manual language">
					{#each activeLanguages as code}
						<a href={languageHref(code)} class:active={code === lang}>{code.toUpperCase()}</a>
					{/each}
				</nav>
				{#if data.user}
					<a href="/admin/manual" class="admin-link" target="_blank" rel="noreferrer">{m.manual_admin_link()}</a>
				{/if}
				<button class="mobile-menu-btn" onclick={() => mobileMenuOpen = !mobileMenuOpen} aria-label="Menu" aria-expanded={mobileMenuOpen}>
					<span></span><span></span><span></span>
				</button>
			</div>
		</div>
	</header>

	<div class="content-area">
		{#if mobileMenuOpen}
			<button class="mobile-scrim" aria-label="Close navigation" onclick={() => (mobileMenuOpen = false)}></button>
		{/if}

		<aside class="sidebar" class:open={mobileMenuOpen}>
			<nav class="sidebar-nav" aria-label="Brand Manual">
				<a href="/{lang}/" class="nav-item root-item" class:active={isActive(`/${lang}`)} onclick={() => mobileMenuOpen = false}>
					<span>{landingTitle}</span>
				</a>
				{@render navTree(null, 0)}
			</nav>
		</aside>

		<main class="page-main">
			{@render children()}
		</main>
	</div>

	<footer class="footer">
		<div class="footer-inner">
			<div class="footer-left">
				<strong>{brandName}</strong>
				<span>{brand?.customFooterText ?? m.manual_hero_desc_fallback()}</span>
			</div>
			{#if brand?.showAttribution !== false}
				<div class="footer-right">
					{m.manual_made_with()} <a href="https://github.com/yaneczech/Brandywine" target="_blank" rel="noopener" class="attr-link">Brandywine</a>
				</div>
			{/if}
		</div>
	</footer>
</div>

{#snippet navTree(parentId: string | null, depth: number)}
	{#each childrenOf(parentId) as p (p.id)}
		{@const href = pageHref(p)}
		{@const hasChildren = childrenOf(p.id).length > 0}
		<div class="nav-group" style="--depth:{depth}">
			<a {href} class="nav-item" class:active={isActive(href)} onclick={() => mobileMenuOpen = false}>
				<span>{p.title}</span>
			</a>
			{#if hasChildren && isActive(href)}
				{@render navTree(p.id, depth + 1)}
			{/if}
		</div>
	{/each}
{/snippet}

<style>
	*, *::before, *::after { box-sizing: border-box; }
	.manual-shell {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
		color: #171717;
		background:
			linear-gradient(180deg, color-mix(in srgb, var(--manual-brand) 5%, transparent), transparent 240px),
			#f8f7f4;
	}
	.topbar {
		position: sticky;
		top: 0;
		z-index: 50;
		height: 64px;
		background: rgba(248,247,244,.9);
		backdrop-filter: blur(16px);
		border-bottom: 1px solid rgba(23,23,23,.08);
	}
	.topbar-inner {
		max-width: 1440px;
		height: 100%;
		margin: 0 auto;
		padding: 0 24px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
	}
	.wordmark {
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
		color: inherit;
		text-decoration: none;
	}
	.logo-img { max-width: 148px; height: 32px; object-fit: contain; }
	.logo-fallback {
		width: 34px;
		height: 34px;
		border-radius: 9px;
		display: grid;
		place-items: center;
		background: var(--manual-brand);
		color: #fff;
		font-weight: 800;
	}
	.brand-name {
		font-size: .98rem;
		font-weight: 780;
		letter-spacing: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.topbar-right { display: flex; align-items: center; gap: 10px; }
	.language-switcher {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		padding: 3px;
		border: 1px solid rgba(23,23,23,.1);
		border-radius: 9px;
		background: rgba(255,255,255,.72);
	}
	.language-switcher a {
		min-width: 36px;
		height: 28px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 7px;
		color: #646464;
		text-decoration: none;
		font-size: .72rem;
		font-weight: 760;
	}
	.language-switcher a.active {
		background: #171717;
		color: #fff;
	}
	.admin-link {
		height: 34px;
		display: inline-flex;
		align-items: center;
		padding: 0 11px;
		border: 1px solid rgba(23,23,23,.1);
		border-radius: 8px;
		background: rgba(255,255,255,.72);
		color: #3f3f3f;
		font-size: .8rem;
		font-weight: 650;
		text-decoration: none;
	}
	.mobile-menu-btn {
		display: none;
		width: 38px;
		height: 38px;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 4px;
		border: 1px solid rgba(23,23,23,.1);
		border-radius: 9px;
		background: rgba(255,255,255,.72);
		cursor: pointer;
	}
	.mobile-menu-btn span { width: 18px; height: 2px; background: #171717; border-radius: 1px; }
	.content-area {
		flex: 1;
		width: 100%;
		max-width: 1440px;
		margin: 0 auto;
		padding: 0 24px;
		display: grid;
		grid-template-columns: 260px minmax(0, 1fr);
		gap: 40px;
	}
	.sidebar {
		position: sticky;
		top: 64px;
		height: calc(100vh - 64px);
		padding: 34px 0 56px;
		overflow-y: auto;
		border-right: 1px solid rgba(23,23,23,.08);
	}
	.sidebar-nav { padding-right: 22px; display: flex; flex-direction: column; gap: 3px; }
	.nav-group { padding-left: calc(var(--depth) * 14px); }
	.nav-item {
		display: flex;
		align-items: center;
		min-height: 34px;
		padding: 7px 10px;
		border-radius: 8px;
		color: #5f5f5f;
		text-decoration: none;
		font-size: .88rem;
		line-height: 1.25;
		transition: background .14s, color .14s;
	}
	.nav-item:hover { background: rgba(23,23,23,.045); color: #171717; }
	.nav-item.active {
		background: color-mix(in srgb, var(--manual-brand) 10%, #fff);
		color: var(--manual-brand);
		font-weight: 720;
	}
	.root-item { margin-bottom: 8px; color: #171717; font-weight: 760; }
	.page-main {
		min-width: 0;
		width: 100%;
		padding: 44px 0 88px;
	}
	.footer {
		border-top: 1px solid rgba(23,23,23,.08);
		padding: 22px 24px;
		color: #737373;
		font-size: .82rem;
	}
	.footer-inner {
		max-width: 1440px;
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
	}
	.footer-left { display: flex; flex-direction: column; gap: 3px; }
	.footer-left strong { color: #171717; }
	.attr-link { color: #171717; text-underline-offset: 3px; }
	.mobile-scrim { display: none; }
	@media (max-width: 900px) {
		.topbar-inner { padding: 0 16px; }
		.content-area { display: block; padding: 0; }
		.mobile-menu-btn { display: flex; }
		.admin-link { display: none; }
		.sidebar {
			position: fixed;
			inset: 64px auto 0 0;
			z-index: 45;
			width: min(340px, calc(100vw - 44px));
			height: auto;
			padding: 24px 18px 40px;
			background: #f8f7f4;
			border-right: 1px solid rgba(23,23,23,.12);
			box-shadow: 24px 0 60px rgba(0,0,0,.16);
			transform: translateX(-104%);
			transition: transform .2s ease;
		}
		.sidebar.open { transform: translateX(0); }
		.sidebar-nav { padding-right: 0; }
		.mobile-scrim {
			display: block;
			position: fixed;
			inset: 64px 0 0;
			z-index: 44;
			border: 0;
			background: rgba(0,0,0,.18);
		}
		.page-main { padding: 28px 16px 64px; }
		.footer-inner { align-items: flex-start; flex-direction: column; }
	}
	@media (max-width: 560px) {
		.language-switcher a { min-width: 32px; }
		.brand-name { max-width: 150px; }
	}
</style>
