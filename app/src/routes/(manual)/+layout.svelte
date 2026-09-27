<script lang="ts">
	import { ensureContrast } from '$lib/ui/contrast';
	import { pageNumbers } from '$lib/manual/numbering';
	import type { LayoutData } from './$types';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount, tick } from 'svelte';
	import * as m from '$lib/paraglide/messages';
	import { focusTrap } from '$lib/actions/focus-trap';
	import { manualStrings, setManualStrings, type ManualLanguage } from '$lib/manual/ui-strings';
	import {
		IconSearch, IconSun, IconMoon, IconX, IconPencil, IconMenu2,
		IconChevronRight, IconCornerDownLeft, IconArrowUp, IconArrowDown, IconExternalLink,
		IconSparkles, IconPlugConnected, IconCheck
	} from '$lib/icons';

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
	const chapterNumbers = $derived(brand?.manualNumbering ? pageNumbers(data.pages ?? [], data.sectionCounts ?? {}) : new Map<string, string>());
	const brandName = $derived(brand?.name ?? 'Brand Manual');
	const manualLanguage = $derived((brand?.defaultLanguage === 'cs' ? 'cs' : 'en') as ManualLanguage);
	const t = $derived(manualStrings(manualLanguage));
	setManualStrings(() => t);

	// ── Theme ─────────────────────────────────────────────────────────────────
	const manualThemeMode = $derived((brand?.manualThemeMode ?? 'light') as 'light' | 'dark' | 'system' | 'toggle');
	// User toggle — only active when brand has chosen 'toggle' mode
	let userTheme = $state<'light' | 'dark' | null>(null);
	let systemDark = $state(false); // tracks prefers-color-scheme
	const effectiveThemeMode = $derived<'light' | 'dark' | 'system'>(
		manualThemeMode === 'toggle' ? (userTheme ?? (systemDark ? 'dark' : 'light')) : manualThemeMode
	);
	const isDark = $derived(effectiveThemeMode === 'dark' || (effectiveThemeMode === 'system' && systemDark));

	const logoSrc = $derived(assetSrc(isDark && brand?.logoDarkPath ? brand.logoDarkPath : brand?.logoPath));
	let failedLogoSrc = $state<string | null>(null);
	const visibleLogoSrc = $derived(logoSrc && failedLogoSrc !== logoSrc ? logoSrc : null);
	const manualAccentLight = $derived(brand?.manualAccentColor || brand?.primaryColor || '#4A1204');
	const manualAccentDark  = $derived(brand?.manualAccentColorDark || manualAccentLight);
	const themeDefaults = {
		light: { paper: '#FBFAF8', surface: '#FFFFFF', ink: '#171717', muted: '#737373' },
		dark: { paper: '#101010', surface: '#171717', ink: '#F4F4F4', muted: '#A3A3A3' }
	};
	// The accent marks UI (active item, focus, sliders), so it must stay
	// visible on the paper it sits on — ≥ 3:1, same hue (DESIGN.md › Přístupnost)
	const paperLight = $derived(brand?.manualBackgroundColor || themeDefaults.light.paper);
	const paperDark  = $derived(brand?.manualBackgroundColorDark || themeDefaults.dark.paper);
	const uiAccentLight = $derived(ensureContrast(manualAccentLight, paperLight));
	const uiAccentDark  = $derived(ensureContrast(manualAccentDark, paperDark));
	const manualShellStyle = $derived.by(() => {
		const mode = isDark ? 'dark' : 'light';
		const pairs = [
			`--manual-brand:${isDark ? uiAccentDark : uiAccentLight}`,
			`--manual-brand-dark:${uiAccentDark}`,
			`--manual-radius:${radiusValue(brand?.manualBorderRadius)}px`,
		];
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

	function setTheme(next: 'light' | 'dark') {
		userTheme = next;
		try { localStorage.setItem('manual-theme', next); } catch { /* storage blocked */ }
	}

	// ── Page tree ─────────────────────────────────────────────────────────────
	const allPages = $derived((data.pages ?? []) as NavPage[]);
	const landingTitle = $derived(allPages.find(p => p.isLanding)?.title ?? t.home);
	const pathname = $derived(page.url.pathname.replace(/\/$/, ''));
	const currentPage = $derived(allPages.find(p => !p.isLanding && pageHref(p) === pathname) ?? null);
	const currentPathLabel = $derived(pathname === '' ? landingTitle : currentPage?.title ?? brandName);
	const editPageId = $derived(pathname === '' ? allPages.find(p => p.isLanding)?.id ?? null : currentPage?.id ?? null);

	function childrenOf(parentId: string | null): NavPage[] {
		return allPages
			.filter(p => p.parentId === parentId && !p.isLanding)
			.sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
	}

	function pageHref(p: NavPage): string {
		const parts: string[] = [];
		let cur: NavPage | undefined = p;
		// Depth guard protects against accidental parent cycles in data
		for (let depth = 0; cur && !cur.isLanding && depth < 32; depth++) {
			parts.unshift(cur.slug);
			cur = allPages.find(x => x.id === cur!.parentId);
		}
		return `/${parts.join('/')}`;
	}

	function isActive(href: string): boolean {
		const clean = href.replace(/\/$/, '');
		if (clean === '') return pathname === '';
		return pathname === clean || pathname.startsWith(`${clean}/`);
	}

	function ancestorTitles(p: NavPage): string[] {
		const titles: string[] = [];
		let cur = allPages.find(x => x.id === p.parentId);
		while (cur && !cur.isLanding) {
			titles.unshift(cur.title);
			cur = allPages.find(x => x.id === cur!.parentId);
		}
		return titles;
	}

	// Sections the reader expanded manually (in addition to the active branch)
	let expanded = $state<Record<string, boolean>>({});
	function isExpanded(p: NavPage): boolean {
		return expanded[p.id] ?? isActive(pageHref(p));
	}

	// ── Mobile drawer ─────────────────────────────────────────────────────────
	let mobileMenuOpen = $state(false);
	let scrolled = $state(false);

	// Close the drawer after every navigation
	$effect(() => {
		void page.url.pathname;
		mobileMenuOpen = false;
	});

	// Lock background scroll while an overlay is open
	$effect(() => {
		if (typeof document === 'undefined') return;
		const locked = mobileMenuOpen || searchOpen;
		document.documentElement.style.overflow = locked ? 'hidden' : '';
		return () => { document.documentElement.style.overflow = ''; };
	});

	// ── Search ────────────────────────────────────────────────────────────────
	let searchOpen = $state(false);
	let searchQuery = $state('');
	let searchIndex = $state(0);
	let searchReturnFocus: HTMLElement | null = null;

	function normalize(s: string): string {
		return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
	}

	const searchResults = $derived.by(() => {
		const q = normalize(searchQuery.trim());
		const pool = allPages.filter(p => !p.isLanding);
		if (!q) return pool.filter(p => !p.parentId).slice(0, 8);
		return pool
			.map(p => {
				const title = normalize(p.title);
				const desc = normalize(p.description ?? '');
				const score = title.startsWith(q) ? 3 : title.includes(q) ? 2 : desc.includes(q) ? 1 : 0;
				return { p, score };
			})
			.filter(r => r.score > 0)
			.sort((a, b) => b.score - a.score || a.p.title.localeCompare(b.p.title))
			.slice(0, 10)
			.map(r => r.p);
	});

	$effect(() => {
		void searchQuery;
		searchIndex = 0;
	});

	async function openSearch() {
		searchReturnFocus = document.activeElement as HTMLElement | null;
		mobileMenuOpen = false;
		searchOpen = true;
		searchQuery = '';
		await tick();
	}

	function closeSearch() {
		searchOpen = false;
		searchQuery = '';
		searchReturnFocus?.focus?.();
	}

	function onSearchKeydown(e: KeyboardEvent) {
		const n = searchResults.length;
		if (e.key === 'ArrowDown' && n) {
			e.preventDefault();
			searchIndex = (searchIndex + 1) % n;
			scrollActiveResult();
		} else if (e.key === 'ArrowUp' && n) {
			e.preventDefault();
			searchIndex = (searchIndex - 1 + n) % n;
			scrollActiveResult();
		} else if (e.key === 'Enter' && n) {
			e.preventDefault();
			const target = searchResults[searchIndex];
			closeSearch();
			goto(pageHref(target));
		}
	}

	async function scrollActiveResult() {
		await tick();
		document.getElementById(`search-opt-${searchIndex}`)?.scrollIntoView({ block: 'nearest' });
	}

	function highlight(text: string): { text: string; hit: boolean }[] {
		const q = searchQuery.trim();
		if (!q) return [{ text, hit: false }];
		const idx = normalize(text).indexOf(normalize(q));
		if (idx < 0) return [{ text, hit: false }];
		return [
			{ text: text.slice(0, idx), hit: false },
			{ text: text.slice(idx, idx + q.length), hit: true },
			{ text: text.slice(idx + q.length), hit: false },
		].filter(part => part.text);
	}

	let isMac = $state(true);

	let mcpCopied = $state(false);
	async function copyMcpUrl() {
		const url = `${location.origin}/api/mcp`;
		try { await navigator.clipboard.writeText(url); } catch { window.prompt('MCP URL', url); return; }
		mcpCopied = true;
		setTimeout(() => (mcpCopied = false), 1800);
	}

	onMount(() => {
		try {
			const saved = localStorage.getItem('manual-theme');
			if (saved === 'light' || saved === 'dark') userTheme = saved;
		} catch { /* storage blocked */ }
		isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		systemDark = mq.matches;
		const onMqChange = (e: MediaQueryListEvent) => { systemDark = e.matches; };
		mq.addEventListener('change', onMqChange);

		const onScroll = () => { scrolled = window.scrollY > 4; };
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });

		const onKeydown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
				e.preventDefault();
				if (searchOpen) closeSearch(); else openSearch();
				return;
			}
			const target = e.target as HTMLElement | null;
			const typing = target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
			if (e.key === '/' && !typing && !searchOpen) { e.preventDefault(); openSearch(); }
			if (e.key === 'Escape' && mobileMenuOpen) mobileMenuOpen = false;
		};
		window.addEventListener('keydown', onKeydown);

		return () => {
			mq.removeEventListener('change', onMqChange);
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('keydown', onKeydown);
		};
	});

	// Keep the active nav item visible inside a long sidebar
	$effect(() => {
		void pathname;
		tick().then(() => {
			const el = document.querySelector('.sidebar .nav-item.active');
			el?.scrollIntoView({ block: 'nearest' });
		});
	});

	function assetSrc(path: string | null | undefined): string | null {
		if (!path) return null;
		if (/^(https?:)?\/\//.test(path) || path.startsWith('/')) return path;
		return `/uploads/${path.replace(/^\/+/, '')}`;
	}

	function themeValue(value: string | null | undefined, key: keyof typeof themeDefaults.light, mode: 'light' | 'dark') {
		// No custom value → CSS defaults for the active theme apply
		if (!value) return null;
		const light = themeDefaults.light[key];
		const dark = themeDefaults.dark[key];
		// Custom value equals the opposite mode's default → swap to correct default
		if (mode === 'dark'  && value === light) return dark;
		if (mode === 'light' && value === dark)  return light;
		return value;
	}

	// Paint the page background too, so overscroll never flashes the wrong colour
	$effect(() => {
		if (typeof document === 'undefined') return;
		document.body.style.background = isDark ? '#101010' : '';
		document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
		return () => {
			document.body.style.background = '';
			document.documentElement.style.colorScheme = '';
		};
	});

	function radiusValue(value: number | null | undefined) {
		const radius = Number(value ?? 8);
		if (!Number.isFinite(radius)) return 8;
		return Math.min(32, Math.max(0, Math.round(radius)));
	}
</script>

<svelte:head>
	<title>{currentPathLabel === brandName ? brandName : `${currentPathLabel} · ${brandName}`}</title>
	<meta name="description" content={currentPage?.description || `${brandName} brand manual`} />
	<meta property="og:title" content={currentPathLabel} />
	<meta property="og:site_name" content={brandName} />
	<meta name="theme-color" content={isDark ? '#101010' : '#fbfaf8'} />
</svelte:head>

<div
	class="manual-shell"
	class:is-dark={isDark}
	class:follows-system={effectiveThemeMode === 'system' || (manualThemeMode === 'toggle' && !userTheme)}
	style={manualShellStyle}
	lang={manualLanguage}
>
	<a class="skip-link" href="#manual-content">{t.skipToContent}</a>

	<header class="topbar" class:scrolled>
		<div class="topbar-inner">
			<button
				class="icon-btn mobile-menu-btn"
				onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
				aria-label={t.menu}
				aria-expanded={mobileMenuOpen}
				aria-controls="manual-sidebar"
			>
				{#if mobileMenuOpen}<IconX size={18} stroke={1.8} />{:else}<IconMenu2 size={18} stroke={1.8} />{/if}
			</button>

			<a href="/" class="wordmark" aria-label={brandName}>
				{#if visibleLogoSrc}
					<img
						src={visibleLogoSrc}
						alt=""
						class="logo-img"
						onerror={() => { failedLogoSrc = visibleLogoSrc; }}
					/>
				{:else}
					<span class="logo-fallback" aria-hidden="true">{brandName.slice(0, 1)}</span>
				{/if}
				<span class="brand-name">{brandName}</span>
			</a>

			<div class="topbar-right">
				<button class="search-trigger" onclick={openSearch} aria-label="{t.search} ({isMac ? '⌘' : 'Ctrl'}K)">
					<IconSearch size={15} stroke={1.9} />
					<span class="search-trigger-label">{t.searchPlaceholder}</span>
					<kbd class="search-kbd">{isMac ? '⌘' : 'Ctrl'} K</kbd>
				</button>

				{#if manualThemeMode === 'toggle'}
					<button
						class="icon-btn"
						onclick={() => setTheme(isDark ? 'light' : 'dark')}
						aria-label={isDark ? t.themeLight : t.themeDark}
						title={isDark ? t.themeLight : t.themeDark}
					>
						{#if isDark}<IconSun size={17} stroke={1.8} />{:else}<IconMoon size={17} stroke={1.8} />{/if}
					</button>
				{/if}

				{#if data.user}
					{#if editPageId}
						<a href="/admin/manual/{editPageId}" class="pill-link edit-link">
							<IconPencil size={14} stroke={1.9} /><span>{t.edit}</span>
						</a>
					{/if}
					<a href="/admin/manual" class="pill-link admin-link" target="_blank" rel="noreferrer">
						{m.manual_admin_link({}, { locale: manualLanguage })}
						<IconExternalLink size={13} stroke={1.9} />
					</a>
				{/if}
			</div>
		</div>
	</header>

	<div class="content-area">
		{#if mobileMenuOpen}
			<button class="mobile-scrim" aria-label={t.close} tabindex="-1" onclick={() => (mobileMenuOpen = false)}></button>
		{/if}

		<aside class="sidebar" class:open={mobileMenuOpen} id="manual-sidebar">
			<nav class="sidebar-nav" aria-label={brandName}>
				<a href="/" class="nav-item root-item" class:active={pathname === ''} aria-current={pathname === '' ? 'page' : undefined}>
					<span>{landingTitle}</span>
				</a>
				<ul class="nav-list">
					{@render navTree(null, 0)}
				</ul>
			</nav>
		</aside>

		<main class="page-main" id="manual-content" tabindex="-1">
			{@render children()}
		</main>
	</div>

	<footer class="footer">
		<div class="ai-tools" aria-label={t.forAi}>
			<span class="ai-tools-label"><IconSparkles size={15} stroke={1.8} /> {t.forAi}</span>
			<a class="ai-tool" href="/api/manual/export.md?download" download>
				<strong>{t.aiExport}</strong><small>{t.aiExportHint}</small>
			</a>
			<button class="ai-tool" onclick={copyMcpUrl}>
				<strong>
					{#if mcpCopied}<IconCheck size={14} stroke={2.4} /> {t.urlCopied}{:else}<IconPlugConnected size={14} stroke={1.9} /> {t.mcpConnect}{/if}
				</strong>
				<small>{t.mcpHint}</small>
			</button>
		</div>
		<div class="footer-inner">
			<div class="footer-left">
				<strong>{brandName}</strong>
				<span>{brand?.customFooterText ?? m.manual_hero_desc_fallback({}, { locale: manualLanguage })}</span>
			</div>
			{#if brand?.showAttribution !== false}
				<div class="footer-right">
					{m.manual_made_with({}, { locale: manualLanguage })} <a href="https://github.com/yaneczech/Brandywine" target="_blank" rel="noopener" class="attr-link">Brandywine</a>
				</div>
			{/if}
		</div>
	</footer>

	{#if searchOpen}
		<div class="search-overlay" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) closeSearch(); }}>
			<div
				class="search-modal"
				role="dialog"
				aria-label={t.search}
				aria-modal="true"
				tabindex="-1"
				use:focusTrap={{ onEscape: closeSearch, initialFocus: 'input[type="search"]' }}
			>
				<div class="search-header">
					<IconSearch size={17} stroke={1.8} class="search-icon" />
					<input
						bind:value={searchQuery}
						onkeydown={onSearchKeydown}
						class="search-input"
						type="search"
						placeholder={t.searchPlaceholder}
						autocomplete="off"
						spellcheck="false"
						role="combobox"
						aria-expanded={searchResults.length > 0}
						aria-controls="search-listbox"
						aria-activedescendant={searchResults.length ? `search-opt-${searchIndex}` : undefined}
					/>
					<button class="search-esc" onclick={closeSearch} aria-label={t.close}>Esc</button>
				</div>
				{#if searchResults.length > 0}
					<ul class="search-results" role="listbox" id="search-listbox">
						{#each searchResults as p, i (p.id)}
							{@const crumbs = ancestorTitles(p)}
							<li role="option" id="search-opt-{i}" aria-selected={i === searchIndex}>
								<a
									href={pageHref(p)}
									class="search-result-item"
									class:active={i === searchIndex}
									onclick={closeSearch}
									onmousemove={() => (searchIndex = i)}
									tabindex="-1"
								>
									<span class="search-result-main">
										{#if crumbs.length}
											<span class="search-result-crumbs">{crumbs.join(' / ')}</span>
										{/if}
										<span class="search-result-title">
											{#each highlight(p.title) as part, pi (pi)}{#if part.hit}<mark>{part.text}</mark>{:else}{part.text}{/if}{/each}
										</span>
										{#if p.description}
											<span class="search-result-desc">{p.description}</span>
										{/if}
									</span>
									<IconChevronRight size={15} stroke={1.8} class="search-result-arrow" />
								</a>
							</li>
						{/each}
					</ul>
				{:else if searchQuery.trim()}
					<p class="search-empty">{t.searchEmpty} „{searchQuery.trim()}“</p>
				{/if}
				<div class="search-footer" aria-hidden="true">
					<span><kbd><IconArrowUp size={11} /></kbd><kbd><IconArrowDown size={11} /></kbd> {t.searchHintNavigate}</span>
					<span><kbd><IconCornerDownLeft size={11} /></kbd> {t.searchHintOpen}</span>
					<span><kbd>Esc</kbd> {t.searchHintClose}</span>
				</div>
			</div>
		</div>
	{/if}
</div>

{#snippet navTree(parentId: string | null, depth: number)}
	{#each childrenOf(parentId) as p (p.id)}
		{@const href = pageHref(p)}
		{@const kids = childrenOf(p.id)}
		{@const exactActive = pathname === href}
		{@const open = kids.length > 0 && isExpanded(p)}
		<li class="nav-group" style="--depth:{depth}">
			<div class="nav-row">
				<a {href} class="nav-item"
					class:active={exactActive}
					class:ancestor={isActive(href) && !exactActive}
					aria-current={exactActive ? 'page' : undefined}>
					{#if chapterNumbers.get(p.id)}<span class="chapter-num">{chapterNumbers.get(p.id)}</span>{/if}
					<span>{p.title}</span>
				</a>
				{#if kids.length}
					<button
						class="nav-toggle"
						class:open
						onclick={() => (expanded = { ...expanded, [p.id]: !open })}
						aria-label={p.title}
						aria-expanded={open}
					>
						<IconChevronRight size={14} stroke={2} />
					</button>
				{/if}
			</div>
			{#if open}
				<ul class="nav-list nested">
					{@render navTree(p.id, depth + 1)}
				</ul>
			{/if}
		</li>
	{/each}
{/snippet}

<style>
	*, *::before, *::after { box-sizing: border-box; }
	.manual-shell {
		--manual-sidebar: 272px;
		--manual-gutter: clamp(32px, 3.6vw, 56px);
		--manual-page-pad: clamp(20px, 3.4vw, 48px);
		--manual-topbar: 60px;
		--manual-ink: #171717;
		--manual-muted: #6b6b6b;
		--manual-paper: #fbfaf8;
		--manual-surface: #fff;
		--manual-border: color-mix(in srgb, var(--manual-ink) 9%, transparent);
		--manual-border-strong: color-mix(in srgb, var(--manual-ink) 16%, transparent);
		--manual-hover: color-mix(in srgb, var(--manual-ink) 5%, transparent);
		--manual-radius: 8px;
		/* Controls follow the brand radius but stay concentric: never a pill */
		--manual-control-radius: min(var(--manual-radius), 10px);
		/* Rhythm & stage — the frame around the brand's own material */
		/* Stepped, not fluid: rhythm stays on the 4px grid (DESIGN.md › Rytmus) */
		--manual-section-gap: 64px;
		--manual-section-gap-inner: 32px;
		--manual-flow-gap: 32px;
		--manual-stage: color-mix(in srgb, var(--manual-ink) 3.5%, var(--manual-paper));
		--manual-label-size: .6875rem;
		--manual-label-tracking: .08em;
		--manual-info: #2563eb;
		--manual-success: #16a34a;
		--manual-warning: #d97706;
		--manual-danger: #dc2626;
		--manual-shadow-sm: 0 1px 2px rgba(0,0,0,.04), 0 1px 1px rgba(0,0,0,.03);
		--manual-shadow-lg: 0 24px 64px -12px rgba(0,0,0,.22), 0 4px 12px rgba(0,0,0,.06);
		--manual-ease: cubic-bezier(.2, .7, .2, 1);
		--manual-font: var(--font-sans);
		--manual-mono: var(--font-mono);
		min-height: 100vh;
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		font-family: var(--manual-font);
		font-feature-settings: "ss01";
		font-size: var(--text-lg);
		line-height: 1.5;
		color: var(--manual-ink);
		background: var(--manual-paper);
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
		text-rendering: optimizeLegibility;
	}
	/* .follows-system covers the first paint before JS knows the OS preference */
	.manual-shell.is-dark {
		--manual-info: #60a5fa;
		--manual-success: #4ade80;
		--manual-warning: #fbbf24;
		--manual-danger: #f87171;
		--manual-paper: #101010;
		--manual-surface: #171717;
		--manual-ink: #f4f4f4;
		--manual-muted: #a3a3a3;
		--manual-border: color-mix(in srgb, var(--manual-ink) 11%, transparent);
		--manual-shadow-lg: 0 24px 64px -12px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.06);
		color-scheme: dark;
	}
	@media (min-width: 900px) {
		.manual-shell {
			--manual-section-gap: 96px;
			--manual-section-gap-inner: 48px;
			--manual-flow-gap: 40px;
		}
	}
	@media (prefers-color-scheme: dark) {
		.manual-shell.follows-system {
			--manual-brand: var(--manual-brand-dark);
			--manual-info: #60a5fa;
			--manual-success: #4ade80;
			--manual-warning: #fbbf24;
			--manual-danger: #f87171;
			--manual-paper: #101010;
			--manual-surface: #171717;
			--manual-ink: #f4f4f4;
			--manual-muted: #a3a3a3;
			--manual-border: color-mix(in srgb, var(--manual-ink) 11%, transparent);
			color-scheme: dark;
		}
	}
	.manual-shell :global(::selection) {
		background: color-mix(in srgb, var(--manual-brand) 22%, transparent);
	}
	.manual-shell :global(:focus-visible) {
		outline: 2px solid var(--manual-brand);
		outline-offset: 2px;
		border-radius: var(--radius-sm);
	}
	.manual-shell :global(kbd) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 20px;
		height: 20px;
		padding: 0 4px;
		border: 1px solid var(--manual-border-strong);
		border-bottom-width: 2px;
		border-radius: var(--radius-sm);
		background: var(--manual-surface);
		color: var(--manual-muted);
		font: 600 .68rem/1 var(--manual-font);
	}

	.skip-link {
		position: fixed;
		top: 10px;
		left: 10px;
		z-index: 300;
		padding: 8px 16px;
		border-radius: var(--radius);
		background: var(--manual-ink);
		color: var(--manual-paper);
		font-size: var(--text-base);
		font-weight: 600;
		text-decoration: none;
		transform: translateY(-160%);
		transition: transform .15s var(--manual-ease);
	}
	.skip-link:focus { transform: none; }

	/* ── Topbar ─────────────────────────────────────────────────────────────── */
	.topbar {
		position: sticky;
		top: 0;
		z-index: 60;
		height: var(--manual-topbar);
		background: color-mix(in srgb, var(--manual-paper) 82%, transparent);
		-webkit-backdrop-filter: saturate(180%) blur(14px);
		backdrop-filter: saturate(180%) blur(14px);
		border-bottom: 1px solid transparent;
		transition: border-color .2s ease, background .2s ease;
	}
	.topbar.scrolled { border-bottom-color: var(--manual-border); }
	.topbar-inner {
		height: 100%;
		padding: 0 var(--manual-page-pad);
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.wordmark {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
		margin-right: auto;
		color: inherit;
		text-decoration: none;
		border-radius: var(--radius);
	}
	.logo-img { display: block; width: auto; height: auto; max-width: 140px; max-height: 32px; }
	.logo-fallback {
		width: 30px;
		height: 30px;
		flex: 0 0 auto;
		border-radius: min(9px, max(4px, var(--manual-radius)));
		display: grid;
		place-items: center;
		background: var(--manual-brand);
		color: #fff;
		font-size: var(--text-base);
		font-weight: 600;
	}
	.brand-name {
		font-size: var(--text-md);
		font-weight: 600;
		letter-spacing: -.01em;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.topbar-right { display: flex; align-items: center; gap: 8px; min-width: 0; }
	.icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: 0 0 auto;
		width: 36px;
		height: 36px;
		border: 1px solid transparent;
		border-radius: var(--manual-control-radius);
		background: transparent;
		color: var(--manual-ink);
		cursor: pointer;
		transition: background .15s ease, border-color .15s ease;
	}
	.icon-btn:hover { background: var(--manual-hover); }
	.mobile-menu-btn { display: none; margin-left: -8px; }

	.search-trigger {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		width: clamp(200px, 22vw, 280px);
		height: 36px;
		padding: 0 8px 0 12px;
		border: 1px solid var(--manual-border);
		border-radius: var(--manual-control-radius);
		background: transparent;
		color: var(--manual-muted);
		font: inherit;
		font-size: var(--text-sm);
		text-align: left;
		cursor: pointer;
		transition: border-color .15s ease, background .15s ease, box-shadow .15s ease;
	}
	.search-trigger:hover { border-color: var(--manual-border-strong); color: var(--manual-ink); }
	.search-trigger-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.search-trigger .search-kbd { padding: 0 8px; border: 0; background: var(--manual-hover); }
	.search-trigger :global(svg) { flex: 0 0 auto; }

	.pill-link {
		height: 36px;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 0 12px;
		border: 1px solid var(--manual-border);
		border-radius: var(--manual-control-radius);
		color: var(--manual-ink);
		font-size: var(--text-sm);
		font-weight: 500;
		text-decoration: none;
		white-space: nowrap;
		transition: border-color .15s ease;
	}
	.pill-link:hover { border-color: var(--manual-border-strong); }
	/* Editing is an action for the few who can: filled ink, not brand colour */
	.edit-link { border-color: var(--manual-ink); background: var(--manual-ink); color: var(--manual-paper); }
	.edit-link:hover { border-color: var(--manual-ink); opacity: .85; }

	/* ── Search overlay ─────────────────────────────────────────────────────── */
	.search-overlay {
		position: fixed;
		inset: 0;
		z-index: 200;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding: clamp(16px, 12vh, 120px) 16px 16px;
		background: color-mix(in srgb, #000 32%, transparent);
		-webkit-backdrop-filter: blur(3px);
		backdrop-filter: blur(3px);
		animation: fade-in .14s ease;
	}
	.search-modal {
		display: flex;
		flex-direction: column;
		width: min(620px, 100%);
		max-height: min(560px, calc(100dvh - 32px));
		background: var(--manual-surface);
		border: 1px solid var(--manual-border);
		border-radius: calc(var(--manual-radius) + 4px);
		box-shadow: var(--manual-shadow-lg);
		overflow: hidden;
		animation: pop-in .18s var(--manual-ease);
	}
	.search-header {
		display: flex;
		align-items: center;
		gap: 8px;
		flex: 0 0 auto;
		height: 56px;
		padding: 0 12px 0 16px;
		border-bottom: 1px solid var(--manual-border);
	}
	:global(.search-icon) { color: var(--manual-muted); flex-shrink: 0; }
	.search-input {
		flex: 1;
		min-width: 0;
		border: none;
		background: transparent;
		color: var(--manual-ink);
		font: inherit;
		font-size: var(--text-lg);
		outline: none;
	}
	.search-input:focus-visible { outline: none; }
	.search-input::placeholder { color: var(--manual-muted); }
	.search-input::-webkit-search-cancel-button { display: none; }
	.search-esc {
		height: 24px;
		padding: 0 8px;
		border: 1px solid var(--manual-border-strong);
		border-radius: var(--radius);
		background: transparent;
		color: var(--manual-muted);
		font: 600 .7rem/1 var(--manual-font);
		cursor: pointer;
	}
	.search-results {
		flex: 1 1 auto;
		overflow-y: auto;
		overscroll-behavior: contain;
		list-style: none;
		margin: 0;
		padding: 8px;
	}
	.search-result-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 8px 12px;
		border-radius: var(--manual-control-radius);
		text-decoration: none;
		color: inherit;
	}
	.search-result-item.active { background: var(--manual-hover); }
	.search-result-main { display: flex; flex: 1; min-width: 0; flex-direction: column; gap: 2px; }
	.search-result-crumbs { color: var(--manual-muted); font-size: var(--text-xs); font-weight: 500; }
	.search-result-title { font-size: var(--text-md); font-weight: 500; color: var(--manual-ink); }
	.search-result-title mark { background: color-mix(in srgb, var(--manual-brand) 20%, transparent); color: inherit; border-radius: var(--radius-xs); padding: 0 1px; }
	.search-result-desc { font-size: var(--text-sm); color: var(--manual-muted); line-height: 1.45; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	:global(.search-result-arrow) { flex: 0 0 auto; color: var(--manual-muted); opacity: 0; transition: opacity .12s ease; }
	.search-result-item.active :global(.search-result-arrow) { opacity: 1; color: var(--manual-ink); }
	.search-empty {
		margin: 0;
		padding: 36px 16px;
		color: var(--manual-muted);
		font-size: var(--text-base);
		text-align: center;
	}
	.search-footer {
		display: flex;
		gap: 16px;
		flex: 0 0 auto;
		padding: 8px 16px;
		border-top: 1px solid var(--manual-border);
		background: color-mix(in srgb, var(--manual-ink) 2%, var(--manual-surface));
		color: var(--manual-muted);
		font-size: var(--text-xs);
	}
	.search-footer span { display: inline-flex; align-items: center; gap: 4px; }
	.search-footer :global(kbd) { min-width: 18px; height: 18px; padding: 0 3px; }

	/* ── Layout ─────────────────────────────────────────────────────────────── */
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
		top: var(--manual-topbar);
		height: calc(100dvh - var(--manual-topbar));
		padding: 28px 0 56px;
		overflow-y: auto;
		overscroll-behavior: contain;
		scrollbar-width: thin;
		scrollbar-color: var(--manual-border-strong) transparent;
		border-right: 1px solid var(--manual-border);
	}
	.sidebar-nav { padding-right: 16px; display: flex; flex-direction: column; gap: 2px; }
	.nav-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 1px; }
	.nav-list.nested {
		margin: 2px 0 8px 12px;
		padding-left: 8px;
		border-left: 1px solid var(--manual-border);
	}
	.nav-row { position: relative; display: flex; align-items: center; }
	.nav-item {
		position: relative;
		display: flex;
		align-items: center;
		flex: 1;
		min-width: 0;
		min-height: 34px;
		padding: 8px 32px 8px 12px;
		color: var(--manual-muted);
		text-decoration: none;
		font-size: var(--text-base);
		font-weight: 400;
		line-height: 1.3;
		transition: color .14s ease;
	}
	.nav-item span { overflow-wrap: anywhere; }
	/* Chapter numbers: quiet, tabular, aligned as a column */
	.chapter-num {
		flex: 0 0 auto;
		min-width: 1.9em;
		margin-right: 4px;
		color: var(--manual-muted);
		font-size: var(--text-sm);
		font-variant-numeric: tabular-nums;
		font-weight: 400;
	}
	.nav-item:hover { color: var(--manual-ink); }
	/* Current page: ink text with a short brand rule — located, not highlighted */
	.nav-item.active { color: var(--manual-ink); font-weight: 500; }
	.nav-item.active::before {
		content: '';
		position: absolute;
		left: 0;
		top: 50%;
		width: 2px;
		height: 14px;
		border-radius: 1px;
		background: var(--manual-brand);
		transform: translateY(-50%);
	}
	.nav-item.ancestor { color: var(--manual-ink); font-weight: 500; }
	.root-item { margin-bottom: 8px; padding-right: 12px; color: var(--manual-ink); font-weight: 500; }
	.nav-toggle {
		position: absolute;
		right: 4px;
		display: grid;
		place-items: center;
		width: 26px;
		height: 26px;
		border: 0;
		border-radius: var(--radius);
		background: transparent;
		color: var(--manual-muted);
		cursor: pointer;
		transition: background .14s ease, color .14s ease;
	}
	.nav-toggle:hover { color: var(--manual-ink); }
	.nav-toggle :global(svg) { transition: transform .18s var(--manual-ease); }
	.nav-toggle.open :global(svg) { transform: rotate(90deg); }

	.page-main {
		min-width: 0;
		width: 100%;
		padding: 0 0 112px;
		outline: none;
	}

	/* ── Footer ─────────────────────────────────────────────────────────────── */
	.footer {
		border-top: 1px solid var(--manual-border);
		padding: 28px var(--manual-page-pad) max(28px, env(safe-area-inset-bottom));
		color: var(--manual-muted);
		font-size: var(--text-sm);
	}
	.ai-tools {
		display: flex;
		flex-wrap: wrap;
		align-items: stretch;
		gap: 8px;
		margin-bottom: 24px;
		padding-bottom: 24px;
		border-bottom: 1px solid var(--manual-border);
	}
	.ai-tools-label {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		margin-right: 8px;
		color: var(--manual-ink);
		font-weight: 500;
	}
	.ai-tool {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 0 24px 0 0;
		border: 0;
		background: none;
		color: var(--manual-ink);
		font: inherit;
		text-align: left;
		text-decoration: none;
		cursor: pointer;
	}
	.ai-tool strong { text-decoration: underline; text-decoration-color: var(--manual-border-strong); text-underline-offset: 3px; transition: text-decoration-color .15s ease; }
	.ai-tool:hover strong { text-decoration-color: currentColor; }
	.ai-tool strong { display: inline-flex; align-items: center; gap: 8px; font-size: var(--text-sm); font-weight: 500; }
	.ai-tool small { color: var(--manual-muted); font-size: var(--text-xs); }
	.footer-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
	}
	.footer-left { display: flex; flex-direction: column; gap: 3px; }
	.footer-left strong { color: var(--manual-ink); font-weight: 600; }
	.attr-link { color: var(--manual-ink); text-underline-offset: 3px; }
	.mobile-scrim { display: none; }

	@keyframes fade-in { from { opacity: 0; } }
	@keyframes pop-in { from { opacity: 0; transform: translateY(-6px) scale(.985); } }

	@media (max-width: 1100px) {
		.search-trigger { width: 36px; padding: 0; justify-content: center; border-color: transparent; background: transparent; }
		.search-trigger:hover { background: var(--manual-hover); box-shadow: none; border-color: transparent; }
		.search-trigger .search-trigger-label, .search-trigger .search-kbd { display: none; }
		.admin-link { display: none; }
	}

	@media (max-width: 900px) {
		.manual-shell {
			--manual-page-pad: 16px;
			--manual-gutter: 0px;
			--manual-topbar: 56px;
		}
		.content-area { display: block; padding: 0; }
		.mobile-menu-btn { display: inline-flex; }
		.edit-link span { display: none; }
		.edit-link { width: 36px; padding: 0; justify-content: center; }
		.sidebar {
			position: fixed;
			inset: var(--manual-topbar) auto 0 0;
			z-index: 55;
			width: min(340px, 86vw);
			height: auto;
			padding: 20px 14px max(40px, env(safe-area-inset-bottom));
			background: var(--manual-paper);
			border-right: 1px solid var(--manual-border);
			box-shadow: 24px 0 60px rgba(0,0,0,.14);
			transform: translateX(-104%);
			visibility: hidden;
			transition: transform .24s var(--manual-ease), visibility 0s linear .24s;
		}
		.sidebar.open {
			transform: none;
			visibility: visible;
			transition: transform .24s var(--manual-ease), visibility 0s;
		}
		.sidebar-nav { padding-right: 0; }
		.nav-item { min-height: 42px; font-size: var(--text-md); }
		.nav-toggle { width: 34px; height: 34px; }
		.mobile-scrim {
			display: block;
			position: fixed;
			inset: var(--manual-topbar) 0 0;
			z-index: 54;
			border: 0;
			background: rgba(0,0,0,.28);
			animation: fade-in .2s ease;
		}
		.page-main { padding: 0 0 72px; }
		.footer-inner { align-items: flex-start; flex-direction: column; }
		.ai-tools { flex-direction: column; }
		.ai-tools-label { margin: 0 0 2px; }
		.search-overlay { padding-top: 12px; }
		.search-footer { display: none; }
	}
	@media (max-width: 420px) {
		.brand-name { max-width: 46vw; }
	}
	@media (prefers-reduced-motion: reduce) {
		.manual-shell :global(*), .manual-shell :global(*::before), .manual-shell :global(*::after) {
			animation-duration: .01ms !important;
			transition-duration: .01ms !important;
			scroll-behavior: auto !important;
		}
	}
	@media print {
		.topbar, .sidebar, .footer, .skip-link { display: none !important; }
		.content-area { display: block; padding: 0; }
	}
</style>
