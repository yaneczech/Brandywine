<script lang="ts">
	import type { LayoutData } from './$types';
	import { page } from '$app/state';
	import { onMount, tick } from 'svelte';
	import * as m from '$lib/paraglide/messages';
	import { IconSearch, IconSunFilled, IconMoonFilled, IconX, IconPencil } from '@tabler/icons-svelte';

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
	type ManualLanguage = 'en' | 'cs';

	const brand = $derived(data.settings);
	const brandName = $derived(brand?.name ?? 'Brand Manual');
	const manualThemeMode = $derived((brand?.manualThemeMode ?? 'light') as 'light' | 'dark' | 'system' | 'toggle');
	// User toggle — only active when brand has chosen 'toggle' mode
	let userTheme = $state<'light' | 'dark' | null>(null);
	const effectiveThemeMode = $derived<'light' | 'dark' | 'system'>(
		manualThemeMode === 'toggle' ? (userTheme ?? 'light') : manualThemeMode
	);
	const logoSrc = $derived(assetSrc(
		effectiveThemeMode === 'dark' && brand?.logoDarkPath ? brand.logoDarkPath : brand?.logoPath
	));
	const manualAccentLight = $derived(brand?.manualAccentColor || brand?.primaryColor || '#4A1204');
	const manualAccentDark  = $derived(brand?.manualAccentColorDark || manualAccentLight);
	const themeDefaults = {
		light: { paper: '#FBFAF8', surface: '#FFFFFF', ink: '#171717', muted: '#737373' },
		dark: { paper: '#101010', surface: '#171717', ink: '#F4F4F4', muted: '#A3A3A3' }
	};
	const manualShellStyle = $derived.by(() => {
		const mode = effectiveThemeMode; // explicit read — registers reactive dependency
		// Resolve whether we're effectively in dark mode (including system preference)
		const isDark = mode === 'dark' || (mode === 'system' && systemDark);
		const pairs = [
			`--manual-brand:${isDark ? manualAccentDark : manualAccentLight}`,
			`--manual-brand-dark:${manualAccentDark}`,
			`--manual-radius:${radiusValue(brand?.manualBorderRadius)}px`,
		];
		// Pick light or dark custom value; fall back to null so CSS class handles defaults
		const pick = (light: string | null | undefined, dark: string | null | undefined) =>
			mode === 'dark' ? (dark || light || null) : (light || null);
		const add = (name: string, value: string | null | undefined, key: keyof typeof themeDefaults.light) => {
			const resolved = themeValue(value, key, mode);
			if (resolved) pairs.push(`${name}:${resolved}`);
		};
		add('--manual-paper',   pick(brand?.manualBackgroundColor, brand?.manualBackgroundColorDark), 'paper');
		add('--manual-surface', pick(brand?.manualSurfaceColor,    brand?.manualSurfaceColorDark),    'surface');
		add('--manual-ink',     pick(brand?.manualTextColor,       brand?.manualTextColorDark),       'ink');
		add('--manual-muted',   pick(brand?.manualMutedColor,      brand?.manualMutedColorDark),      'muted');
		return pairs.join(';');
	});
	const manualLanguage = $derived((brand?.defaultLanguage === 'cs' ? 'cs' : 'en') as ManualLanguage);
	const allPages = $derived((data.pages ?? []) as NavPage[]);
	const landingTitle = $derived(allPages.find(p => p.isLanding)?.title ?? 'Overview');
	const currentPathLabel = $derived(page.url.pathname === '/' ? landingTitle : currentPageTitle());

	let mobileMenuOpen = $state(false);
	let scrolled = $state(false);
	let systemDark = $state(false); // tracks prefers-color-scheme for 'system' mode

	// ── Search ──────────────────────────────────────────────────────────────────
	let searchOpen = $state(false);
	let searchQuery = $state('');
	let searchInputEl = $state<HTMLInputElement | null>(null);

	const searchResults = $derived.by(() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return [];
		return allPages
			.filter(p => !p.isLanding)
			.filter(p =>
				p.title.toLowerCase().includes(q) ||
				(p.description ?? '').toLowerCase().includes(q)
			)
			.slice(0, 8);
	});

	async function openSearch() {
		searchOpen = true;
		searchQuery = '';
		await tick();
		searchInputEl?.focus();
	}

	function closeSearch() {
		searchOpen = false;
		searchQuery = '';
	}

	onMount(() => {
		const saved = localStorage.getItem('manual-theme') as 'light' | 'dark' | null;
		if (saved === 'light' || saved === 'dark') userTheme = saved;

		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		systemDark = mq.matches;
		const onMqChange = (e: MediaQueryListEvent) => { systemDark = e.matches; };
		mq.addEventListener('change', onMqChange);

		const onScroll = () => { scrolled = window.scrollY > 5; };
		window.addEventListener('scroll', onScroll, { passive: true });

		const onKeydown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openSearch(); }
			if (e.key === 'Escape' && searchOpen) closeSearch();
		};
		window.addEventListener('keydown', onKeydown);

		return () => {
			mq.removeEventListener('change', onMqChange);
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('keydown', onKeydown);
		};
	});

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
		return `/${parts.join('/')}`;
	}

	function isActive(href: string): boolean {
		const pathname = page.url.pathname.replace(/\/$/, '');
		const cleanHref = href.replace(/\/$/, '');
		if (cleanHref === '') return pathname === '';
		return pathname === cleanHref || pathname.startsWith(`${cleanHref}/`);
	}

	function currentPageTitle(): string {
		const pathname = page.url.pathname.replace(/\/$/, '');
		const match = allPages.find(p => pageHref(p).replace(/\/$/, '') === pathname);
		return match?.title ?? brandName;
	}

	function currentPageId(): string | null {
		const pathname = page.url.pathname.replace(/\/$/, '');
		// Landing page (root /)
		if (pathname === '') return allPages.find(p => p.isLanding)?.id ?? null;
		return allPages.find(p => pageHref(p).replace(/\/$/, '') === pathname)?.id ?? null;
	}

	const editPageId = $derived(currentPageId());

	function themeValue(value: string | null | undefined, key: keyof typeof themeDefaults.light, mode: 'light' | 'dark' | 'system') {
		// No custom value → let CSS class (.theme-dark / @media dark) handle defaults,
		// don't set inline style (inline style would override the class with wrong value)
		if (!value) return null;
		const light = themeDefaults.light[key];
		const dark = themeDefaults.dark[key];
		// Custom value equals the opposite mode's default → swap to correct default
		if (mode === 'dark'   && value === light) return dark;
		if (mode === 'light'  && value === dark)  return light;
		if (mode === 'system' && (value === light || value === dark)) return null;
		return value;
	}

	// Update body background to avoid light flash around the dark shell
	$effect(() => {
		if (typeof document === 'undefined') return;
		const isDark = effectiveThemeMode === 'dark' ||
			(effectiveThemeMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
		document.body.style.background = isDark ? '#101010' : '';
		return () => { document.body.style.background = ''; };
	});

	function radiusValue(value: number | null | undefined) {
		const radius = Number(value ?? 8);
		if (!Number.isFinite(radius)) return 8;
		return Math.min(32, Math.max(0, Math.round(radius)));
	}
</script>

<svelte:head>
	<title>{currentPathLabel} · {brandName}</title>
	<meta name="description" content="{brandName} brand manual" />
	<style>:root { color-scheme: light dark; } body { background: #f8f7f4; }</style>
</svelte:head>

<div
	class="manual-shell"
	class:theme-dark={effectiveThemeMode === 'dark'}
	class:theme-system={effectiveThemeMode === 'system'}
	style={manualShellStyle}
>
	<header class="topbar" class:scrolled>
		<div class="topbar-inner">
			<a href="/" class="wordmark" aria-label="{brandName} manual home">
				{#if logoSrc}
					<img src={logoSrc} alt={brandName} class="logo-img" />
				{:else}
					<span class="logo-fallback">{brandName.slice(0, 1)}</span>
				{/if}
				<span class="brand-name">{brandName}</span>
			</a>

			<div class="topbar-right">
				{#if data.user}
					{#if editPageId}
						<a href="/admin/manual/{editPageId}" class="edit-link" title="Upravit tuto stránku">
							<IconPencil size={13} stroke={2} /><span>Upravit</span>
						</a>
					{/if}
					<a href="/admin/manual" class="admin-link" target="_blank" rel="noreferrer">{m.manual_admin_link({}, { languageTag: manualLanguage })}</a>
				{/if}
				<button class="topbar-icon-btn" onclick={openSearch} aria-label="Vyhledat (⌘K)" title="Vyhledat (⌘K)">
					<IconSearch size={17} stroke={1.8} />
				</button>
				{#if manualThemeMode === 'toggle'}
			<div class="theme-seg" role="group" aria-label="Motiv stránky">
					<button class="theme-seg-btn theme-seg-light"
						class:active={effectiveThemeMode !== 'dark'}
						onclick={() => { userTheme = 'light'; localStorage.setItem('manual-theme', 'light'); }}>
						<IconSunFilled size={13} />Light
					</button>
					<button class="theme-seg-btn theme-seg-dark"
						class:active={effectiveThemeMode === 'dark'}
						onclick={() => { userTheme = 'dark'; localStorage.setItem('manual-theme', 'dark'); }}>
						<IconMoonFilled size={13} />Dark
					</button>
				</div>
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
			<button class="sidebar-close" onclick={() => (mobileMenuOpen = false)} aria-label="Zavřít menu">
				<IconX size={16} stroke={2} />
			</button>
			<nav class="sidebar-nav" aria-label="Brand Manual">
				<a href="/" class="nav-item root-item" class:active={isActive('/')} onclick={() => mobileMenuOpen = false}>
					<span>{landingTitle}</span>
				</a>
				{@render navTree(null, 0)}
			</nav>
		</aside>

		<main class="page-main">
			{@render children()}
		</main>
	</div>

	{#if searchOpen}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="search-overlay" onclick={(e) => { if (e.target === e.currentTarget) closeSearch(); }}>
			<div class="search-modal" role="dialog" aria-label="Vyhledávání" aria-modal="true">
				<div class="search-header">
					<IconSearch size={16} stroke={1.8} class="search-icon" />
					<input
						bind:this={searchInputEl}
						bind:value={searchQuery}
						class="search-input"
						type="search"
						placeholder="Hledat v manuálu…"
						autocomplete="off"
						spellcheck="false"
					/>
					<button class="search-close" onclick={closeSearch} aria-label="Zavřít">
						<IconX size={15} stroke={2} />
					</button>
				</div>
				{#if searchResults.length > 0}
					<ul class="search-results" role="listbox">
						{#each searchResults as p (p.id)}
							{@const href = pageHref(p)}
							<li role="option" aria-selected="false">
								<a {href} class="search-result-item" onclick={closeSearch}>
									<span class="search-result-title">{p.title}</span>
									{#if p.description}
										<span class="search-result-desc">{p.description}</span>
									{/if}
								</a>
							</li>
						{/each}
					</ul>
				{:else if searchQuery.trim()}
					<p class="search-empty">Žádné výsledky pro „{searchQuery.trim()}"</p>
				{/if}
			</div>
		</div>
	{/if}

	<footer class="footer">
		<div class="footer-inner">
			<div class="footer-left">
				<strong>{brandName}</strong>
				<span>{brand?.customFooterText ?? m.manual_hero_desc_fallback({}, { languageTag: manualLanguage })}</span>
			</div>
			{#if brand?.showAttribution !== false}
				<div class="footer-right">
					{m.manual_made_with({}, { languageTag: manualLanguage })} <a href="https://github.com/yaneczech/Brandywine" target="_blank" rel="noopener" class="attr-link">Brandywine</a>
				</div>
			{/if}
		</div>
	</footer>
</div>

{#snippet navTree(parentId: string | null, depth: number)}
	{#each childrenOf(parentId) as p (p.id)}
		{@const href = pageHref(p)}
		{@const hasChildren = childrenOf(p.id).length > 0}
		{@const exactActive = page.url.pathname.replace(/\/$/, '') === (href === '/' ? '' : href.replace(/\/$/, ''))}
		{@const ancestorActive = isActive(href) && !exactActive}
		<div class="nav-group" style="--depth:{depth}">
			<a {href} class="nav-item"
				class:active={exactActive}
				class:ancestor={ancestorActive}
				onclick={() => mobileMenuOpen = false}>
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
		--manual-sidebar: 260px;
		--manual-gutter: 40px;
		--manual-page-pad: clamp(24px, 3.4vw, 48px);
		--manual-ink: #171717;
		--manual-muted: #737373;
		--manual-paper: #fbfaf8;
		--manual-surface: #fff;
		--manual-border: color-mix(in srgb, var(--manual-ink) 10%, transparent);
		--manual-radius: 8px;
		--manual-info: #2563eb;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
		color: var(--manual-ink);
		background: var(--manual-paper);
	}
	.manual-shell.theme-dark {
		--manual-brand: var(--manual-brand-dark);
		--manual-info: #60a5fa;
		--manual-paper: #101010;
		--manual-surface: #171717;
		--manual-ink: #f4f4f4;
		--manual-muted: #a3a3a3;
	}
	@media (prefers-color-scheme: dark) {
		.manual-shell.theme-system {
			--manual-ink: #f4f4f4;
			--manual-muted: #a3a3a3;
			--manual-paper: #101010;
			--manual-surface: #171717;
			--manual-brand: var(--manual-brand-dark);
			--manual-info: #60a5fa;
		}
	}
	.topbar {
		position: sticky;
		top: 0;
		z-index: 50;
		height: 64px;
		background: var(--manual-paper);
		border-bottom: 1px solid var(--manual-border);
		box-shadow: none;
		transition: box-shadow .2s ease;
	}
	.topbar.scrolled {
		box-shadow: 0 2px 12px color-mix(in srgb, var(--manual-ink) 8%, transparent);
	}
	.topbar-inner {
		height: 100%;
		padding: 0 var(--manual-page-pad);
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
	.logo-img { display: block; width: auto; height: auto; max-width: 148px; max-height: 40px; }
	.logo-fallback {
		width: 34px;
		height: 34px;
		border-radius: max(4px, var(--manual-radius));
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
	.topbar-right { display: flex; align-items: center; gap: 8px; }
	.topbar-icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 34px;
		height: 34px;
		border: 1px solid var(--manual-border);
		border-radius: max(4px, var(--manual-radius));
		background: color-mix(in srgb, var(--manual-surface) 78%, transparent);
		color: var(--manual-ink);
		cursor: pointer;
		transition: background .14s, border-color .14s;
	}
	.topbar-icon-btn:hover {
		background: color-mix(in srgb, var(--manual-ink) 7%, var(--manual-surface));
		border-color: color-mix(in srgb, var(--manual-ink) 18%, transparent);
	}
	.theme-seg {
		display: flex;
		border: 1px solid var(--manual-border);
		border-radius: 999px;
		background: color-mix(in srgb, var(--manual-ink) 5%, var(--manual-surface));
		padding: 3px;
		gap: 2px;
	}
	.theme-seg-btn {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		height: 26px;
		padding: 0 10px;
		border: none;
		border-radius: 999px;
		background: transparent;
		color: var(--manual-muted);
		font-size: .78rem;
		font-weight: 650;
		cursor: pointer;
		transition: background .15s, color .15s;
		white-space: nowrap;
	}
	.theme-seg-btn:hover:not(.active) { color: var(--manual-ink); }
	.theme-seg-light.active { background: #ffffff; color: #171717; }
	.theme-seg-dark.active  { background: #1e1b4b; color: #c4b5fd; }

	/* ── Search overlay ─────────────────────────────────────────────────────── */
	.search-overlay {
		position: fixed;
		inset: 0;
		z-index: 200;
		background: color-mix(in srgb, var(--manual-ink) 36%, transparent);
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding-top: clamp(60px, 12vh, 120px);
		backdrop-filter: blur(2px);
	}
	.search-modal {
		width: min(560px, calc(100vw - 32px));
		background: var(--manual-surface);
		border: 1px solid var(--manual-border);
		border-radius: max(8px, var(--manual-radius));
		box-shadow: 0 24px 60px color-mix(in srgb, var(--manual-ink) 22%, transparent);
		overflow: hidden;
	}
	.search-header {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 0 14px;
		border-bottom: 1px solid var(--manual-border);
		height: 52px;
	}
	:global(.search-icon) { color: var(--manual-muted); flex-shrink: 0; }
	.search-input {
		flex: 1;
		border: none;
		background: transparent;
		color: var(--manual-ink);
		font-size: .96rem;
		line-height: 1;
		outline: none;
	}
	.search-input::placeholder { color: var(--manual-muted); }
	.search-input::-webkit-search-cancel-button { display: none; }
	.search-close {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		border: 1px solid var(--manual-border);
		border-radius: 5px;
		background: transparent;
		color: var(--manual-muted);
		cursor: pointer;
		flex-shrink: 0;
	}
	.search-close:hover { color: var(--manual-ink); }
	.search-results {
		list-style: none;
		margin: 0;
		padding: 6px;
	}
	.search-result-item {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 9px 12px;
		border-radius: max(5px, calc(var(--manual-radius) - 2px));
		text-decoration: none;
		color: inherit;
		transition: background .12s;
	}
	.search-result-item:hover { background: color-mix(in srgb, var(--manual-brand) 8%, var(--manual-surface)); }
	.search-result-title { font-size: .92rem; font-weight: 660; color: var(--manual-ink); }
	.search-result-desc { font-size: .8rem; color: var(--manual-muted); line-height: 1.4; }
	.search-empty {
		margin: 0;
		padding: 20px 18px;
		color: var(--manual-muted);
		font-size: .88rem;
		text-align: center;
	}
	.edit-link {
		height: 34px;
		display: inline-flex;
		align-items: center;
		gap: .35rem;
		padding: 0 11px;
		border: 1px solid var(--manual-brand);
		border-radius: max(4px, var(--manual-radius));
		background: color-mix(in srgb, var(--manual-brand) 10%, transparent);
		color: var(--manual-brand);
		font-size: .8rem;
		font-weight: 650;
		text-decoration: none;
		transition: background .15s;
	}
	.edit-link:hover {
		background: color-mix(in srgb, var(--manual-brand) 18%, transparent);
	}
	.admin-link {
		height: 34px;
		display: inline-flex;
		align-items: center;
		padding: 0 11px;
		border: 1px solid var(--manual-border);
		border-radius: max(4px, var(--manual-radius));
		background: color-mix(in srgb, var(--manual-surface) 78%, transparent);
		color: var(--manual-ink);
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
		border: 1px solid var(--manual-border);
		border-radius: max(4px, var(--manual-radius));
		background: color-mix(in srgb, var(--manual-surface) 78%, transparent);
		cursor: pointer;
	}
	.mobile-menu-btn span { width: 18px; height: 2px; background: var(--manual-ink); border-radius: 1px; }
	.content-area {
		flex: 1;
		width: 100%;
		padding: 0 0 0 var(--manual-page-pad);
		display: grid;
		grid-template-columns: var(--manual-sidebar) minmax(0, 1fr);
		gap: var(--manual-gutter);
	}
	.sidebar {
		position: sticky;
		top: 64px;
		height: calc(100vh - 64px);
		padding: 34px 0 56px;
		overflow-y: auto;
		border-right: 1px solid var(--manual-border);
	}
	.sidebar-close { display: none; }
	.sidebar-nav { padding-right: 22px; display: flex; flex-direction: column; gap: 3px; }
	.nav-group { padding-left: calc(var(--depth) * 14px); }
	.nav-item {
		display: flex;
		align-items: center;
		min-height: 34px;
		padding: 7px 10px;
		border-radius: max(4px, var(--manual-radius));
		color: var(--manual-muted);
		text-decoration: none;
		font-size: .88rem;
		line-height: 1.25;
		transition: background .14s, color .14s;
	}
	.nav-item:hover { background: color-mix(in srgb, var(--manual-ink) 5%, transparent); color: var(--manual-ink); }
	.nav-item.active {
		background: color-mix(in srgb, var(--manual-brand) 10%, var(--manual-surface));
		color: var(--manual-brand);
		font-weight: 720;
	}
	/* Parent page that has visible active children — heavier weight only */
	.nav-item.ancestor {
		color: var(--manual-ink);
		font-weight: 720;
	}
	.nav-item.ancestor:hover {
		background: color-mix(in srgb, var(--manual-ink) 5%, transparent);
	}
	.root-item { margin-bottom: 8px; color: var(--manual-ink); font-weight: 760; }
	.page-main {
		min-width: 0;
		width: 100%;
		padding: 0 0 104px;
	}
	.footer {
		border-top: 1px solid var(--manual-border);
		padding: 24px var(--manual-page-pad);
		color: var(--manual-muted);
		font-size: .82rem;
	}
	.footer-inner {
		max-width: 1440px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
	}
	.footer-left { display: flex; flex-direction: column; gap: 3px; }
	.footer-left strong { color: var(--manual-ink); }
	.attr-link { color: var(--manual-ink); text-underline-offset: 3px; }
	.mobile-scrim { display: none; }
	@media (max-width: 900px) {
		.manual-shell {
			--manual-page-pad: 16px;
			--manual-gutter: 0px;
		}
		.topbar-inner { padding: 0 16px; }
		.content-area { display: block; padding: 0; }
		.mobile-menu-btn { display: flex; }
		.admin-link { display: none; }
		.edit-link { display: none; }
		.topbar-icon-btn { width: 38px; height: 38px; }
		.sidebar {
			position: fixed;
			inset: 64px auto 0 0;
			z-index: 45;
			width: min(340px, calc(100vw - 44px));
			height: auto;
			padding: 24px 18px 40px;
			background: var(--manual-paper);
			border-right: 1px solid var(--manual-border);
			box-shadow: 24px 0 60px rgba(0,0,0,.16);
			transform: translateX(-104%);
			transition: transform .2s ease;
		}
		.sidebar.open { transform: translateX(0); }
		.sidebar-close {
			display: flex;
			align-items: center;
			justify-content: center;
			position: absolute;
			top: 14px;
			right: 14px;
			width: 30px;
			height: 30px;
			border: 1px solid var(--manual-border);
			border-radius: max(4px, var(--manual-radius));
			background: var(--manual-surface);
			color: var(--manual-muted);
			cursor: pointer;
		}
		.sidebar-close:hover { color: var(--manual-ink); }
		.sidebar-nav { padding-right: 0; }
		.mobile-scrim {
			display: block;
			position: fixed;
			inset: 64px 0 0;
			z-index: 44;
			border: 0;
			background: rgba(0,0,0,.18);
		}
		.page-main { padding: 0 0 72px; }
		.footer-inner { align-items: flex-start; flex-direction: column; }
	}
	@media (max-width: 560px) {
		.brand-name { max-width: 150px; }
		.theme-seg { display: none; }
	}
</style>
