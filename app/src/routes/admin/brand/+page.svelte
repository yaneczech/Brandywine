<script lang="ts">
	import type { PageData } from './$types';
	import {
		IconAlertTriangle,
		IconAt,
		IconBook2,
		IconCheck,
		IconExternalLink,
		IconFolder,
		IconGlobe,
		IconKey,
		IconLanguage,
		IconLock,
		IconPalette,
		IconPhoto,
		IconRosette,
		IconTypography
	} from '@tabler/icons-svelte';

	const { data }: { data: PageData } = $props();

	type AccessMode = 'public' | 'password' | 'email_whitelist' | 'token';
	type Settings = typeof data.settings & {
		activeLanguages?: string[] | null;
		emailWhitelist?: string[] | null;
		accessMode: AccessMode;
		accessPassword?: string | null;
	};

	// svelte-ignore state_referenced_locally
	let s = $state<Settings>({ ...data.settings } as Settings);
	let saving = $state(false);
	let saved = $state(false);
	let error = $state('');
	let accessPassword = $state('');
	// svelte-ignore state_referenced_locally
	let whitelistText = $state((s.emailWhitelist ?? []).join('\n'));

	let originalString = $state(JSON.stringify($state.snapshot(s)));
	let originalWhitelist = $state((s.emailWhitelist ?? []).join('\n'));
	const isDirty = $derived(JSON.stringify(s) !== originalString || accessPassword.trim() !== '' || whitelistText !== originalWhitelist);
	const manualUrl = $derived(typeof window !== 'undefined' ? `${window.location.origin}/${s.defaultLanguage ?? 'en'}/` : `/${s.defaultLanguage ?? 'en'}/`);
	const readinessItems = $derived([
		{
			label: 'Brand identity',
			detail: s.name && s.primaryColor ? `${s.name} with primary color ${s.primaryColor}` : 'Add brand name and primary color',
			done: Boolean(s.name && s.primaryColor),
			icon: IconRosette
		},
		{
			label: 'Logo',
			detail: s.logoPath ? 'Logo path configured' : 'Add logo asset or URL',
			done: Boolean(s.logoPath),
			icon: IconPhoto
		},
		{
			label: 'Colors',
			detail: `${data.health.colorCount} color${data.health.colorCount === 1 ? '' : 's'} defined`,
			done: data.health.colorCount > 0,
			icon: IconPalette
		},
		{
			label: 'Typography',
			detail: `${data.health.fontCount} font${data.health.fontCount === 1 ? '' : 's'}, ${data.health.styleCount} style${data.health.styleCount === 1 ? '' : 's'}`,
			done: data.health.fontCount > 0 && data.health.styleCount > 0,
			icon: IconTypography
		},
		{
			label: 'Assets',
			detail: `${data.health.assetCount} approved asset${data.health.assetCount === 1 ? '' : 's'}`,
			done: data.health.assetCount > 0,
			icon: IconFolder
		},
		{
			label: 'Manual pages',
			detail: `${data.health.publishedPageCount}/${data.health.manualPageCount} published`,
			done: data.health.publishedPageCount > 0,
			icon: IconBook2
		}
	]);
	const readinessScore = $derived(Math.round((readinessItems.filter(item => item.done).length / readinessItems.length) * 100));

	function activeLanguages(): string[] {
		return s.activeLanguages?.length ? s.activeLanguages : ['en'];
	}

	function toggleLanguage(lang: 'en' | 'cs') {
		const next = new Set(activeLanguages());
		next.has(lang) ? next.delete(lang) : next.add(lang);
		if (next.size === 0) next.add(lang);
		s.activeLanguages = [...next];
		if (!s.activeLanguages.includes(s.defaultLanguage ?? 'en')) {
			s.defaultLanguage = s.activeLanguages[0];
		}
	}

	function parseWhitelist() {
		return whitelistText
			.split(/\r?\n/)
			.map(line => line.trim())
			.filter(Boolean);
	}

	function modeLabel(mode: AccessMode) {
		if (mode === 'public') return 'Public';
		if (mode === 'password') return 'Password';
		if (mode === 'email_whitelist') return 'Email whitelist';
		return 'Secret link';
	}

	function modeDescription(mode: AccessMode) {
		if (mode === 'public') return 'Anyone with the link can view the manual.';
		if (mode === 'password') return 'Visitors must pass a shared password gate.';
		if (mode === 'email_whitelist') return 'Only signed-in approved emails can view the manual.';
		return 'Restricted access mode reserved for token-based sharing.';
	}

	async function save() {
		saving = true;
		error = '';
		try {
			const payload: Record<string, unknown> = {
				...s,
				emailWhitelist: parseWhitelist()
			};
			if (accessPassword.trim()) payload.accessPassword = accessPassword.trim();
			else delete payload.accessPassword;

			const res = await fetch('/api/settings', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (!res.ok) throw new Error((await res.text()) || 'Unable to save brand settings');
			const updated = await res.json();
			s = { ...updated };
			whitelistText = (s.emailWhitelist ?? []).join('\n');
			originalString = JSON.stringify($state.snapshot(s));
			originalWhitelist = whitelistText;
			accessPassword = '';
			saved = true;
			setTimeout(() => (saved = false), 2200);
			if (s.primaryColor) {
				document.documentElement.style.setProperty('--brand', s.primaryColor);
				document.documentElement.style.setProperty('--brand-light', `${s.primaryColor}cc`);
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Unknown error';
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>Brand Settings · {s.systemName ?? 'Brandywine'}</title>
</svelte:head>

<div class="page">
	<header class="hero">
		<div class="hero-copy">
			<div class="eyebrow"><IconRosette size={16} stroke={1.75} /> Brand system</div>
			<h1>Brand Settings</h1>
			<p>Define how the brand appears, how the manual behaves, and whether the core guidelines are ready to publish.</p>
		</div>
		<div class="hero-actions">
			{#if saved}
				<span class="saved"><IconCheck size={14} stroke={2} /> Saved</span>
			{/if}
			<a class="btn-secondary" href={manualUrl} target="_blank" rel="noreferrer">
				<IconExternalLink size={15} stroke={1.75} /> Preview manual
			</a>
			<button class="btn-primary" onclick={save} disabled={saving || !isDirty}>
				{saving ? 'Saving…' : 'Save changes'}
			</button>
		</div>
	</header>

	{#if error}
		<div class="error"><IconAlertTriangle size={16} stroke={2} /> {error}</div>
	{/if}

	<section class="overview">
		<div class="brand-card" style="--preview-brand:{s.primaryColor ?? '#4A1204'}">
			<div class="manual-preview">
				<div class="manual-top">
					{#if s.logoPath}
						<img src={s.logoPath} alt="" onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')} />
					{:else}
						<div class="logo-mark">{(s.name ?? 'B').slice(0, 1)}</div>
					{/if}
					<strong>{s.name || 'My Brand'}</strong>
				</div>
				<div class="manual-title">Brand Manual</div>
				<div class="manual-sub">Colors, typography, logos and approved assets.</div>
				<div class="manual-nav">
					<span>Overview</span>
					<span>Colors</span>
					<span>Typography</span>
					<span>Assets</span>
				</div>
			</div>
			<div class="brand-meta">
				<span class="status-dot"></span>
				<span>{modeLabel(s.accessMode)} manual</span>
				<span>{activeLanguages().map(l => l.toUpperCase()).join(' / ')}</span>
			</div>
		</div>

		<div class="health-card">
			<div class="health-head">
				<div>
					<span class="eyebrow small">Readiness</span>
					<h2>{readinessScore}%</h2>
				</div>
				<div class="score-ring" style="--score:{readinessScore}%">{readinessScore}</div>
			</div>
			<div class="health-list">
				{#each readinessItems as item}
					{@const ItemIcon = item.icon}
					<div class="health-item" class:done={item.done}>
						<ItemIcon size={17} stroke={1.75} />
						<div>
							<strong>{item.label}</strong>
							<span>{item.detail}</span>
						</div>
						{#if item.done}<IconCheck size={15} stroke={2.2} />{/if}
					</div>
				{/each}
			</div>
		</div>
	</section>

	<div class="sections">
		<section class="section" id="identity">
			<div class="section-meta">
				<h2>Identity</h2>
				<p>The visible identity used by the public manual and by branded admin surfaces.</p>
			</div>
			<div class="panel">
				<div class="grid-two">
					<label class="field">
						<span>Brand name</span>
						<input bind:value={s.name} placeholder="Acme Studio" />
					</label>
					<label class="field">
						<span>Admin/system name</span>
						<input bind:value={s.systemName} placeholder="Brandywine" />
					</label>
				</div>
				<label class="field">
					<span>Primary color</span>
					<div class="color-input">
						<input type="color" bind:value={s.primaryColor} />
						<input bind:value={s.primaryColor} class="mono" placeholder="#4A1204" />
						<span class="swatch" style="background:{s.primaryColor ?? '#4A1204'}"></span>
					</div>
				</label>
				<div class="grid-two">
					<label class="field">
						<span>Logo path or URL</span>
						<input bind:value={s.logoPath} placeholder="/uploads/logo.svg" />
					</label>
					<label class="field">
						<span>Favicon path or URL</span>
						<input bind:value={s.faviconPath} placeholder="/favicon.svg" />
					</label>
				</div>
			</div>
		</section>

		<section class="section" id="manual">
			<div class="section-meta">
				<h2>Manual</h2>
				<p>Publication defaults for language, footer and public manual identity.</p>
			</div>
			<div class="panel">
				<div class="language-row">
					<div>
						<span class="label-text">Active languages</span>
						<p>Choose which localized manuals are expected to be maintained.</p>
					</div>
					<div class="language-toggles">
						<button type="button" class:active={activeLanguages().includes('en')} onclick={() => toggleLanguage('en')}>
							<IconLanguage size={15} stroke={1.75} /> English
						</button>
						<button type="button" class:active={activeLanguages().includes('cs')} onclick={() => toggleLanguage('cs')}>
							<IconLanguage size={15} stroke={1.75} /> Čeština
						</button>
					</div>
				</div>
				<label class="field">
					<span>Default language</span>
					<select bind:value={s.defaultLanguage}>
						{#each activeLanguages() as lang}
							<option value={lang}>{lang === 'cs' ? 'Čeština' : 'English'}</option>
						{/each}
					</select>
				</label>
				<label class="field">
					<span>Custom footer text</span>
					<input bind:value={s.customFooterText} placeholder="Brand team · Updated regularly" />
				</label>
				<label class="switch-row">
					<input type="checkbox" bind:checked={s.showAttribution} />
					<span>
						<strong>Show Brandywine attribution</strong>
						<small>Recommended for public and client-facing deployments.</small>
					</span>
				</label>
			</div>
		</section>

		<section class="section" id="appearance">
			<div class="section-meta">
				<h2>Appearance</h2>
				<p>Practical defaults that make the brand manual feel intentional before detailed pages are edited.</p>
			</div>
			<div class="panel appearance-grid">
				<div class="appearance-tile">
					<IconPalette size={18} stroke={1.75} />
					<strong>Primary action color</strong>
					<span>Used for links, active navigation and calls to action.</span>
				</div>
				<div class="appearance-tile">
					<IconBook2 size={18} stroke={1.75} />
					<strong>Manual chrome</strong>
					<span>Logo, brand name and footer are reflected in the public manual.</span>
				</div>
				<div class="appearance-tile muted">
					<IconPhoto size={18} stroke={1.75} />
					<strong>Cover media</strong>
					<span>Planned: choose a hero image or brand texture for the landing page.</span>
				</div>
			</div>
		</section>

		<section class="section" id="access">
			<div class="section-meta">
				<h2>Access</h2>
				<p>Decide who can see the public-facing brand manual.</p>
			</div>
			<div class="panel">
				<div class="access-grid">
					<button type="button" class:active={s.accessMode === 'public'} onclick={() => (s.accessMode = 'public')}>
						<IconGlobe size={18} stroke={1.75} />
						<strong>Public</strong>
						<span>Anyone with the link</span>
					</button>
					<button type="button" class:active={s.accessMode === 'password'} onclick={() => (s.accessMode = 'password')}>
						<IconLock size={18} stroke={1.75} />
						<strong>Password</strong>
						<span>Shared gate</span>
					</button>
					<button type="button" class:active={s.accessMode === 'email_whitelist'} onclick={() => (s.accessMode = 'email_whitelist')}>
						<IconAt size={18} stroke={1.75} />
						<strong>Email list</strong>
						<span>Approved users</span>
					</button>
					<button type="button" class:active={s.accessMode === 'token'} onclick={() => (s.accessMode = 'token')}>
						<IconKey size={18} stroke={1.75} />
						<strong>Secret link</strong>
						<span>Token workflow</span>
					</button>
				</div>
				<div class="access-note">
					<strong>{modeLabel(s.accessMode)}</strong>
					<span>{modeDescription(s.accessMode)}</span>
				</div>
				{#if s.accessMode === 'password'}
					<label class="field">
						<span>Set new manual password</span>
						<input type="password" bind:value={accessPassword} placeholder="Leave empty to keep current password" autocomplete="new-password" />
					</label>
				{/if}
				{#if s.accessMode === 'email_whitelist'}
					<label class="field">
						<span>Allowed email addresses</span>
						<textarea rows="5" bind:value={whitelistText} placeholder="alice@company.com&#10;*@partner.com"></textarea>
					</label>
				{/if}
				{#if s.accessMode === 'token'}
					<div class="warning-note">
						<IconAlertTriangle size={15} stroke={2} />
						Token sharing is marked in the data model, but a persistent token field is not wired yet. Use this mode only after the token flow is completed.
					</div>
				{/if}
			</div>
		</section>
	</div>

	{#if isDirty}
		<div class="save-bar">
			<span><IconAlertTriangle size={15} stroke={2} /> Unsaved brand changes</span>
			<button class="btn-primary" onclick={save} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
		</div>
	{/if}
</div>

<style>
	:global(:root) {
		--brand-page-border: color-mix(in srgb, var(--color-border) 86%, transparent);
	}
	.page { max-width: 1240px; margin: 0 auto; padding: 2rem; color: var(--color-text); }
	.hero {
		display: flex; justify-content: space-between; align-items: flex-start; gap: 1.5rem;
		padding-bottom: 1.25rem; border-bottom: 1px solid var(--brand-page-border);
	}
	.hero-copy h1 { margin: .35rem 0 .45rem; font-size: clamp(2rem, 4vw, 3.5rem); line-height: .95; letter-spacing: 0; }
	.hero-copy p { max-width: 680px; margin: 0; color: var(--color-muted); font-size: 1.05rem; line-height: 1.55; }
	.eyebrow { display: inline-flex; align-items: center; gap: .45rem; color: var(--brand); font-size: .78rem; font-weight: 760; text-transform: uppercase; letter-spacing: .06em; }
	.eyebrow.small { font-size: .68rem; color: var(--color-muted); }
	.hero-actions { display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; justify-content: flex-end; }
	.btn-primary, .btn-secondary {
		display: inline-flex; align-items: center; justify-content: center; gap: .45rem;
		min-height: 38px; padding: 0 .9rem; border-radius: 8px; font-weight: 650; font-size: .875rem;
		text-decoration: none; cursor: pointer; border: 1px solid transparent;
	}
	.btn-primary { background: var(--brand); color: #fff; }
	.btn-primary:disabled { opacity: .45; cursor: default; }
	.btn-secondary { background: var(--color-surface); color: var(--color-text); border-color: var(--color-border); }
	.saved { display: inline-flex; align-items: center; gap: .35rem; color: #15803d; font-size: .82rem; font-weight: 700; }
	.error {
		display: flex; align-items: center; gap: .5rem; margin: 1rem 0 0; padding: .75rem .9rem;
		border: 1px solid color-mix(in srgb, #ef4444 35%, transparent); border-radius: 8px;
		background: color-mix(in srgb, #ef4444 8%, var(--color-surface)); color: #b91c1c; font-size: .9rem;
	}
	.overview { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(320px, .7fr); gap: 1rem; margin: 1.5rem 0; }
	.brand-card, .health-card, .panel {
		background: var(--color-surface); border: 1px solid var(--brand-page-border); border-radius: 10px;
		box-shadow: 0 1px 2px rgba(0,0,0,.035);
	}
	.brand-card { padding: 1rem; }
	.manual-preview {
		min-height: 280px; border-radius: 8px; padding: 1.2rem;
		background:
			linear-gradient(135deg, color-mix(in srgb, var(--preview-brand) 10%, transparent), transparent 42%),
			var(--color-bg);
		border: 1px solid var(--color-border);
		display: flex; flex-direction: column;
	}
	.manual-top { display: flex; align-items: center; gap: .65rem; }
	.manual-top img { max-width: 120px; max-height: 34px; object-fit: contain; }
	.logo-mark { width: 34px; height: 34px; border-radius: 8px; background: var(--preview-brand); color: #fff; display: grid; place-items: center; font-weight: 800; }
	.manual-title { margin-top: auto; font-size: clamp(2rem, 5vw, 4.6rem); line-height: .9; font-weight: 850; color: var(--preview-brand); letter-spacing: 0; }
	.manual-sub { margin-top: .7rem; color: var(--color-muted); font-size: 1rem; }
	.manual-nav { display: flex; gap: .4rem; flex-wrap: wrap; margin-top: 1.4rem; }
	.manual-nav span { padding: .38rem .58rem; border: 1px solid var(--color-border); border-radius: 7px; font-size: .78rem; background: var(--color-surface); }
	.brand-meta { display: flex; align-items: center; gap: .65rem; flex-wrap: wrap; margin-top: .85rem; color: var(--color-muted); font-size: .82rem; }
	.status-dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; }
	.health-card { padding: 1rem; }
	.health-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: .8rem; }
	.health-head h2 { margin: .15rem 0 0; font-size: 2.2rem; line-height: 1; }
	.score-ring {
		width: 62px; height: 62px; border-radius: 50%; display: grid; place-items: center; font-size: .8rem; font-weight: 800;
		background: conic-gradient(var(--brand) var(--score), var(--color-border) 0);
		color: var(--color-text);
	}
	.health-list { display: flex; flex-direction: column; gap: .45rem; }
	.health-item {
		display: grid; grid-template-columns: 22px minmax(0, 1fr) 18px; align-items: center; gap: .6rem;
		padding: .6rem; border: 1px solid var(--color-border); border-radius: 8px; color: var(--color-muted);
	}
	.health-item.done { color: var(--brand); background: color-mix(in srgb, var(--brand) 4%, transparent); }
	.health-item strong { display: block; color: var(--color-text); font-size: .86rem; }
	.health-item span { display: block; font-size: .76rem; line-height: 1.35; }
	.sections { display: flex; flex-direction: column; gap: 1rem; }
	.section { display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 1rem; padding-top: 1rem; }
	.section-meta h2 { margin: 0 0 .35rem; font-size: 1.1rem; }
	.section-meta p { margin: 0; color: var(--color-muted); line-height: 1.5; font-size: .9rem; }
	.panel { padding: 1rem; display: flex; flex-direction: column; gap: 1rem; }
	.grid-two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .8rem; }
	.field { display: flex; flex-direction: column; gap: .38rem; }
	.field span, .label-text { font-size: .82rem; font-weight: 700; color: var(--color-text); }
	.field input, .field select, .field textarea {
		width: 100%; min-height: 38px; padding: .55rem .65rem; border: 1px solid var(--color-border);
		border-radius: 8px; background: var(--color-bg); color: var(--color-text); font: inherit;
	}
	.field textarea { resize: vertical; line-height: 1.45; }
	.mono { font-family: var(--font-mono); max-width: 140px; }
	.color-input { display: flex; align-items: center; gap: .55rem; flex-wrap: wrap; }
	.color-input input[type="color"] { width: 44px; padding: 3px; }
	.swatch { width: 34px; height: 34px; border-radius: 8px; border: 1px solid var(--color-border); }
	.language-row { display: flex; justify-content: space-between; gap: 1rem; align-items: center; }
	.language-row p { margin: .2rem 0 0; color: var(--color-muted); font-size: .82rem; }
	.language-toggles, .access-grid { display: flex; gap: .5rem; flex-wrap: wrap; }
	.language-toggles button, .access-grid button {
		display: flex; align-items: center; gap: .45rem; border: 1px solid var(--color-border);
		background: var(--color-bg); color: var(--color-text); border-radius: 8px; cursor: pointer;
	}
	.language-toggles button { min-height: 34px; padding: 0 .7rem; font-weight: 650; }
	.language-toggles button.active, .access-grid button.active {
		border-color: var(--brand); background: color-mix(in srgb, var(--brand) 7%, var(--color-bg)); color: var(--brand);
	}
	.switch-row { display: flex; gap: .65rem; align-items: flex-start; padding: .7rem; border: 1px solid var(--color-border); border-radius: 8px; }
	.switch-row input { margin-top: .15rem; }
	.switch-row strong, .switch-row small { display: block; }
	.switch-row small { color: var(--color-muted); margin-top: .15rem; }
	.appearance-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
	.appearance-tile {
		border: 1px solid var(--color-border); border-radius: 8px; padding: .8rem;
		display: flex; flex-direction: column; gap: .35rem; min-height: 120px;
	}
	.appearance-tile strong { font-size: .92rem; }
	.appearance-tile span { color: var(--color-muted); font-size: .8rem; line-height: 1.45; }
	.appearance-tile.muted { opacity: .72; }
	.access-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); }
	.access-grid button { min-height: 104px; padding: .8rem; flex-direction: column; align-items: flex-start; justify-content: flex-start; text-align: left; }
	.access-grid strong { font-size: .9rem; color: inherit; }
	.access-grid span { color: var(--color-muted); font-size: .78rem; }
	.access-note, .warning-note {
		display: flex; flex-direction: column; gap: .15rem; padding: .75rem .85rem;
		border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-bg);
	}
	.access-note span { color: var(--color-muted); font-size: .85rem; }
	.warning-note { flex-direction: row; align-items: center; color: #92400e; background: #fffbeb; border-color: #fde68a; font-size: .86rem; }
	.save-bar {
		position: sticky; bottom: 1rem; z-index: 20; margin: 1.5rem auto 0; max-width: 680px;
		display: flex; align-items: center; justify-content: space-between; gap: 1rem;
		padding: .7rem .8rem; background: color-mix(in srgb, var(--color-surface) 94%, transparent);
		backdrop-filter: blur(10px); border: 1px solid var(--color-border); border-radius: 10px; box-shadow: 0 12px 32px rgba(0,0,0,.12);
	}
	.save-bar span { display: flex; align-items: center; gap: .45rem; color: var(--color-muted); font-size: .86rem; }
	@media (max-width: 960px) {
		.page { padding: 1rem; }
		.hero, .language-row { flex-direction: column; align-items: stretch; }
		.hero-actions { justify-content: flex-start; }
		.overview, .section { grid-template-columns: 1fr; }
		.section-meta { max-width: 680px; }
		.appearance-grid, .access-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
	}
	@media (max-width: 560px) {
		.grid-two, .appearance-grid, .access-grid { grid-template-columns: 1fr; }
		.manual-preview { min-height: 230px; }
		.save-bar { left: 1rem; right: 1rem; flex-direction: column; align-items: stretch; }
	}
</style>
