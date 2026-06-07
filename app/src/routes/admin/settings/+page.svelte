<script lang="ts">
	import type { PageData } from './$types';
	import { languageTag, setLanguageTag } from '$lib/paraglide/runtime';
	import { invalidate } from '$app/navigation';
	import * as m from '$lib/paraglide/messages';
	import {
		IconCheck, IconAlertTriangle,
		IconScale, IconLock, IconGlobe, IconKey, IconAt, IconCopy, IconRefresh,
		IconEye, IconEyeOff
	} from '@tabler/icons-svelte';
	const { data }: { data: PageData } = $props();

	let s = $state({ ...data.settings });
	let saving = $state(false);
	let saved = $state(false);
	let error = $state('');

	// Track unsaved changes
	let original = JSON.stringify(data.settings);
	let isDirty = $derived(JSON.stringify(s) !== original);

	// Access section
	let accessPassword = $state('');
	let showPassword = $state(false);
	let tokenCopied = $state(false);
	const manualUrl = $derived(typeof window !== 'undefined'
		? `${window.location.origin}/manual`
		: '/manual');
	const tokenUrl = $derived(s.accessMode === 'token' && (s as Record<string, unknown>).accessToken
		? `${manualUrl}?token=${(s as Record<string, unknown>).accessToken}`
		: '');

	async function copyUrl(url: string) {
		await navigator.clipboard.writeText(url);
		tokenCopied = true;
		setTimeout(() => (tokenCopied = false), 2000);
	}

	function generateToken() {
		const arr = new Uint8Array(24);
		crypto.getRandomValues(arr);
		(s as Record<string, unknown>).accessToken = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
	}

	// Display preferences (localStorage / cookie — no DB needed)
	let pantoneLabel = $state<'PMS' | 'Pantone'>(
		typeof localStorage !== 'undefined'
			? (localStorage.getItem('bw_pantoneLabel') as 'PMS' | 'Pantone' ?? 'PMS')
			: 'PMS'
	);
	function setPantoneLabel(val: 'PMS' | 'Pantone') {
		pantoneLabel = val;
		localStorage.setItem('bw_pantoneLabel', val);
	}

	let currentLang = $state(languageTag());
	// Keep select in sync when ParaglideJS updates languageTag (e.g. after invalidation)
	$effect(() => { currentLang = languageTag(); });

	async function switchLang(lang: 'en' | 'cs') {
		currentLang = lang;
		setLanguageTag(lang);
		document.cookie = `paraglide_lang=${lang};path=/;max-age=31536000;SameSite=Lax`;
		// Trigger layout.server.ts re-run → data.lang updates → ParaglideJS prop changes
		// → ParaglideJS calls setLanguageTag() and re-renders with {#key lang}
		await invalidate('paraglide:lang');
	}

	async function save() {
		saving = true; error = '';
		try {
			const res = await fetch('/api/settings', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(s)
			});
			if (!res.ok) throw new Error((await res.json()).message ?? 'Error saving');
			original = JSON.stringify(s);
			saved = true;
			setTimeout(() => (saved = false), 2500);
			if (s.primaryColor) {
				document.documentElement.style.setProperty('--brand', s.primaryColor);
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Unknown error';
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head><title>{m.settings_title()} · {s.systemName ?? 'Brandywine'}</title></svelte:head>

<div class="page">
	<div class="topbar">
		<div>
			<h1 class="page-title">{m.settings_title()}</h1>
			<p class="page-sub">White-labeling, brand identity & access control.</p>
		</div>
		<div class="topbar-actions">
			{#if saved}
				<span class="saved-badge">
					<IconCheck size={14} stroke={2} />
					{m.settings_saved()}
				</span>
			{/if}
			<button class="btn-save" onclick={save} disabled={saving || !isDirty}>
				{saving ? '…' : m.settings_save()}
			</button>
		</div>
	</div>

	<!-- Anchor nav -->
	<nav class="anchor-nav" aria-label="Sections">
		<a href="#identity" class="anav-item">Identity</a>
		<a href="#attribution" class="anav-item">Attribution</a>
		<a href="#display" class="anav-item">Display</a>
		<a href="#access" class="anav-item">Access</a>
		<a href="#license" class="anav-item">License</a>
	</nav>

	<div class="sections">

		<!-- Identity -->
		<section id="identity" class="section">
			<div class="section-meta">
				<h2>{m.settings_identity()}</h2>
				<p>{m.settings_identity_sub()}</p>

				<!-- Live preview — sits below the description in the left column -->
				<div class="live-preview">
					<p class="preview-label">Live preview</p>
					<div class="preview-sidebar">
						<div class="preview-logo">
							{#if s.logoPath}
								<img src={s.logoPath} alt="logo" class="preview-logo-img" onerror={(e) => (e.currentTarget as HTMLImageElement).style.display = 'none'} />
							{/if}
							<span class="preview-logo-text" style="color:{s.primaryColor ?? 'var(--brand)'}">
								{s.systemName || 'Brandywine'}
							</span>
						</div>
						<div class="preview-nav">
							<div class="preview-nav-item active" style="background:{s.primaryColor ? s.primaryColor + '14' : 'rgba(74,18,4,.08)'}; color:{s.primaryColor ?? 'var(--brand)'}">
								Dashboard
							</div>
							<div class="preview-nav-item">Colors</div>
							<div class="preview-nav-item">Typography</div>
						</div>
						<div class="preview-btn" style="background:{s.primaryColor ?? 'var(--brand)'}">Save</div>
					</div>
				</div>
			</div>
			<div class="section-fields">
				<div class="field">
					<label for="systemName">{m.settings_system_name()}</label>
					<p class="field-hint">Replaces "Brandywine" in browser title, sidebar, and auth pages.</p>
					<input id="systemName" type="text" bind:value={s.systemName} placeholder="Brandywine" />
				</div>
				<div class="field">
					<label for="brandName">{m.settings_brand_name()}</label>
					<p class="field-hint">Your company or project name shown in the public brand manual.</p>
					<input id="brandName" type="text" bind:value={s.name} placeholder="My Company" />
				</div>
				<div class="field">
					<label for="primaryColor">{m.settings_primary_color()}</label>
					<p class="field-hint">Used for buttons, active states, and links in the admin UI. Applied live on save.</p>
					<div class="color-row">
						<input id="primaryColor" type="color" bind:value={s.primaryColor} />
						<input type="text" bind:value={s.primaryColor} style="font-family:monospace;width:110px" />
						<div class="color-preview" style="background:{s.primaryColor}"></div>
					</div>
				</div>
				<div class="field">
					<label for="logoPath">{m.settings_logo()}</label>
					<p class="field-hint">SVG path or URL to your logo. Leave empty to use the Brandywine bottle mark.</p>
					<input id="logoPath" type="text" bind:value={s.logoPath} placeholder="/your-logo.svg" />
				</div>
				<div class="field">
					<label for="faviconPath">{m.settings_favicon()}</label>
					<input id="faviconPath" type="text" bind:value={s.faviconPath} placeholder="/favicon.svg" />
				</div>
			</div>
		</section>

		<!-- Attribution -->
		<section id="attribution" class="section">
			<div class="section-meta">
				<h2>{m.settings_attribution()}</h2>
				<p>{m.settings_attribution_sub()}</p>
			</div>
			<div class="section-fields">
				<div class="field">
					<label class="toggle-label">
						<span class="toggle-wrap">
							<input type="checkbox" bind:checked={s.showAttribution} role="switch" />
							<span class="toggle-track"></span>
						</span>
						<span>
							{m.settings_show_attribution()}
							<span class="req-badge">Required for distribution</span>
						</span>
					</label>
					<p class="field-hint mt">
						Disable only for strictly internal / air-gapped deployments. Public hosting requires this notice per the
						<a href="https://github.com/brandywine/brandywine/blob/main/NOTICE" target="_blank">NOTICE file</a>.
					</p>
				</div>
				<div class="field">
					<label for="footerText">{m.settings_footer_text()}</label>
					<p class="field-hint">Shown alongside the Brandywine attribution.</p>
					<input id="footerText" type="text" bind:value={s.customFooterText} placeholder={m.settings_footer_placeholder()} />
				</div>
			</div>
		</section>

		<!-- Display preferences -->
		<section id="display" class="section">
			<div class="section-meta">
				<h2>{m.settings_display()}</h2>
				<p>{m.settings_display_sub()}</p>
			</div>
				<div class="section-fields">
					<div class="field">
						<label for="interfaceLanguage">Interface language</label>
						<p class="field-hint">Applied immediately, saved in your browser.</p>
						<select
							id="interfaceLanguage"
							value={currentLang}
							onchange={(e) => switchLang((e.currentTarget as HTMLSelectElement).value as 'en' | 'cs')}
						>
							<option value="en">English</option>
							<option value="cs">Čeština</option>
						</select>
					</div>
					<div class="field">
						<label for="pantoneLabel">{m.settings_pantone_label()}</label>
						<select
							id="pantoneLabel"
							value={pantoneLabel}
							onchange={(e) => setPantoneLabel((e.currentTarget as HTMLSelectElement).value as 'PMS' | 'Pantone')}
						>
							<option value="PMS">PMS — Pantone Matching System</option>
							<option value="Pantone">Pantone — full brand name</option>
						</select>
					</div>
				</div>
		</section>

		<section id="access" class="section">
			<div class="section-meta">
				<h2>{m.settings_access()}</h2>
				<p>{m.settings_access_sub()}</p>
			</div>
			<div class="section-fields">
				<!-- Mode cards -->
				<div class="field">
					<label>{m.settings_access_mode()}</label>
					<div class="access-mode-cards">
						<label class="access-card" class:selected={s.accessMode === 'public'}>
							<input type="radio" name="accessMode" value="public" bind:group={s.accessMode} />
							<span class="access-card-icon"><IconGlobe size={18} stroke={1.5} /></span>
							<span class="access-card-body">
								<strong>Public</strong>
								<span>Anyone with the link can view the brand manual</span>
							</span>
						</label>
						<label class="access-card" class:selected={s.accessMode === 'password'}>
							<input type="radio" name="accessMode" value="password" bind:group={s.accessMode} />
							<span class="access-card-icon"><IconLock size={18} stroke={1.5} /></span>
							<span class="access-card-body">
								<strong>Password</strong>
								<span>Visitors must enter a shared password</span>
							</span>
						</label>
						<label class="access-card" class:selected={s.accessMode === 'token'}>
							<input type="radio" name="accessMode" value="token" bind:group={s.accessMode} />
							<span class="access-card-icon"><IconKey size={18} stroke={1.5} /></span>
							<span class="access-card-body">
								<strong>Secret link</strong>
								<span>Access via a unique token URL, no login needed</span>
							</span>
						</label>
						<label class="access-card" class:selected={s.accessMode === 'email_whitelist'}>
							<input type="radio" name="accessMode" value="email_whitelist" bind:group={s.accessMode} />
							<span class="access-card-icon"><IconAt size={18} stroke={1.5} /></span>
							<span class="access-card-body">
								<strong>Email whitelist</strong>
								<span>Only approved email addresses can log in</span>
							</span>
						</label>
					</div>
				</div>

				<!-- Contextual fields -->
				{#if s.accessMode === 'public'}
					<div class="access-info">
						<span class="access-info-icon"><IconGlobe size={14} stroke={1.5} /></span>
						Brand manual is publicly accessible at
						<a href={manualUrl} target="_blank" class="access-url">{manualUrl}</a>
					</div>
				{/if}

				{#if s.accessMode === 'password'}
					<div class="field">
						<label for="accessPassword">Set new password</label>
						<p class="field-hint">Leave empty to keep the current password.</p>
						<div class="pw-wrap">
							<span class="pw-icon"><IconLock size={15} stroke={1.75} /></span>
							<input
								id="accessPassword"
								type={showPassword ? 'text' : 'password'}
								bind:value={accessPassword}
								placeholder="New password…"
								autocomplete="new-password"
								class="pw-input"
							/>
							{#if accessPassword}
								<button
									type="button"
									class="pw-toggle"
									onclick={() => (showPassword = !showPassword)}
									aria-label={showPassword ? 'Hide password' : 'Show password'}
								>
									{#if showPassword}
										<IconEyeOff size={15} stroke={1.75} />
									{:else}
										<IconEye size={15} stroke={1.75} />
									{/if}
								</button>
							{/if}
						</div>
						{#if accessPassword}
							{@const score = [/.{8,}/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter(r => r.test(accessPassword)).length}
							{@const scoreColor = score <= 1 ? '#ef4444' : score === 2 ? '#f97316' : score === 3 ? '#eab308' : '#22c55e'}
							{@const scoreLabel = score <= 1 ? 'Weak' : score === 2 ? 'Fair' : score === 3 ? 'Good' : 'Strong'}
							<div class="pw-strength">
								<div class="pw-bars">
									{#each [1,2,3,4] as n}
										<div class="pw-bar" style="background:{score >= n ? scoreColor : ''}"></div>
									{/each}
								</div>
								<span class="pw-label" style="color:{scoreColor}">{scoreLabel}</span>
							</div>
						{/if}
					</div>
				{/if}

				{#if s.accessMode === 'token'}
					<div class="field">
						<label>Secret token link</label>
						<p class="field-hint">Share this URL — no account required. Regenerate to revoke access.</p>
						{#if tokenUrl}
							<div class="token-row">
								<input type="text" readonly value={tokenUrl} class="token-input" />
								<button class="btn-icon-sm" onclick={() => copyUrl(tokenUrl)} title="Copy">
									{#if tokenCopied}<IconCheck size={14} stroke={2} />{:else}<IconCopy size={14} stroke={1.75} />{/if}
								</button>
								<button class="btn-icon-sm" onclick={generateToken} title="Regenerate token">
									<IconRefresh size={14} stroke={1.75} />
								</button>
							</div>
						{:else}
							<button class="btn-generate" onclick={generateToken}>
								<IconKey size={14} stroke={1.75} /> Generate token
							</button>
						{/if}
					</div>
				{/if}

				{#if s.accessMode === 'email_whitelist'}
					<div class="field">
						<label for="emailWhitelist">Allowed email addresses</label>
						<p class="field-hint">One email per line. Wildcards like <code>*@company.com</code> are supported.</p>
						<textarea id="emailWhitelist" rows="5"
							value={(s as Record<string,unknown>).emailWhitelist as string ?? ''}
							oninput={(e) => (s as Record<string,unknown>).emailWhitelist = (e.target as HTMLTextAreaElement).value}
							placeholder="alice@company.com&#10;*@partner.com"
							class="whitelist-textarea"></textarea>
					</div>
				{/if}
			</div>
		</section>

		<!-- License -->
		<section id="license" class="section">
			<div class="section-meta">
				<h2>{m.settings_license()}</h2>
				<p>{m.settings_license_sub()}</p>
			</div>
			<div class="section-fields">
				<div class="lic-cards">
					<div class="lic-card">
						<div class="lic-icon"><IconScale size={22} stroke={1.5} /></div>
						<div>
							<strong>Apache License 2.0</strong>
							<p>Free to use, modify, and distribute commercially. Attribution required in distributions. No warranty implied.</p>
							<div class="lic-links">
								<a href="https://github.com/brandywine/brandywine/blob/main/LICENSE" target="_blank">LICENSE ↗</a>
								<a href="https://github.com/brandywine/brandywine/blob/main/NOTICE" target="_blank">NOTICE ↗</a>
							</div>
						</div>
					</div>
					<div class="lic-card">
						<div class="lic-icon"><IconLock size={22} stroke={1.5} /></div>
						<div>
							<strong>Data privacy</strong>
							<p>Self-hosted only. Brand assets, colors, typography, and user data never leave your infrastructure. You control everything.</p>
						</div>
					</div>
				</div>
			</div>
		</section>

	</div>

	{#if error}
		<div class="error-toast">{error}</div>
	{/if}

	<!-- Sticky unsaved changes bar -->
	{#if isDirty && !saving}
		<div class="unsaved-bar">
			<span class="unsaved-msg">
				<IconAlertTriangle size={14} stroke={2} />
				Unsaved changes
			</span>
			<div class="unsaved-actions">
				<button class="btn-discard" onclick={() => { s = { ...data.settings }; }}>Discard</button>
				<button class="btn-save-bar" onclick={save} disabled={saving}>
					{saving ? '…' : m.settings_save()}
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
.page { max-width:900px; min-height:100vh; }

.topbar {
	display:flex; align-items:flex-start; justify-content:space-between;
	padding:2rem 2rem 0; margin-bottom:2.5rem; gap:1rem; flex-wrap:wrap;
}
.page-title { font-size:1.5rem; font-weight:650; letter-spacing:-0.025em; }
.page-sub { margin-top:4px; font-size:0.875rem; color:var(--color-muted); }
.topbar-actions { display:flex; align-items:center; gap:10px; flex-shrink:0; }

.btn-save {
	display:inline-flex; align-items:center; height:36px; padding:0 16px;
	background:var(--brand); color:#fff; border:none; border-radius:8px;
	font-size:0.875rem; font-weight:600; cursor:pointer; white-space:nowrap;
	transition:background 0.15s;
}
.btn-save:hover { background:var(--brand-light); }
.btn-save:disabled { opacity:0.6; pointer-events:none; }

.saved-badge { display:inline-flex; align-items:center; gap:5px; font-size:0.8125rem; color:var(--color-success); font-weight:500; }

/* ── Anchor nav ──────────────────────────────────────────────────────────── */
.anchor-nav {
	display:flex; gap:2px; padding:0 2rem;
	border-bottom:1px solid var(--color-border);
	overflow-x:auto; scrollbar-width:none;
}
.anchor-nav::-webkit-scrollbar { display:none; }
.anav-item {
	padding:8px 12px; font-size:0.8125rem; font-weight:500;
	color:var(--color-muted); white-space:nowrap;
	border-bottom:2px solid transparent; margin-bottom:-1px;
	transition:color 0.15s, border-color 0.15s;
}
.anav-item:hover { color:var(--color-text); }

/* ── Unsaved bar ─────────────────────────────────────────────────────────── */
.unsaved-bar {
	position:fixed; bottom:0; left:var(--sidebar-width); right:0;
	display:flex; align-items:center; justify-content:space-between;
	padding:12px 2rem;
	background:var(--color-surface);
	border-top:1px solid var(--color-border);
	box-shadow:0 -4px 16px rgba(0,0,0,.06);
	z-index:50;
	animation:slide-up 0.2s ease;
}
@keyframes slide-up {
	from { transform:translateY(100%); opacity:0; }
	to   { transform:translateY(0);    opacity:1; }
}
.unsaved-msg {
	display:flex; align-items:center; gap:6px;
	font-size:0.8125rem; color:var(--color-muted); font-weight:500;
}
.unsaved-actions { display:flex; align-items:center; gap:8px; }
.btn-discard {
	height:34px; padding:0 14px; border-radius:7px;
	border:1.5px solid var(--color-border); background:none;
	font-size:0.8125rem; font-weight:500; color:var(--color-text);
	cursor:pointer; transition:background 0.1s;
}
.btn-discard:hover { background:var(--color-surface-raised); }
.btn-save-bar {
	height:34px; padding:0 16px; border-radius:7px;
	background:var(--brand); color:#fff; border:none;
	font-size:0.8125rem; font-weight:600; cursor:pointer;
	transition:background 0.15s;
}
.btn-save-bar:hover { background:var(--brand-light); }
.btn-save-bar:disabled { opacity:0.6; pointer-events:none; }

/* ── Live preview ────────────────────────────────────────────────────────── */
.live-preview {
	margin-top:1.25rem;
}
.preview-label {
	font-size:0.6875rem; font-weight:600; text-transform:uppercase;
	letter-spacing:0.07em; color:var(--color-muted); margin-bottom:10px;
}
.preview-sidebar {
	display:flex; flex-direction:column; gap:6px;
	background:var(--color-surface); border:1px solid var(--color-border);
	border-radius:10px; padding:12px; width:180px;
}
.preview-logo { display:flex; align-items:center; gap:8px; padding-bottom:8px; border-bottom:1px solid var(--color-border); margin-bottom:4px; }
.preview-logo-img { height:20px; width:auto; }
.preview-logo-text { font-size:0.8125rem; font-weight:700; letter-spacing:-0.02em; }
.preview-nav { display:flex; flex-direction:column; gap:2px; }
.preview-nav-item {
	font-size:0.75rem; font-weight:500; padding:5px 8px; border-radius:6px;
	color:var(--color-muted); transition:background 0.1s;
}
.preview-nav-item.active { font-weight:600; }
.preview-btn {
	margin-top:6px; height:28px; border-radius:6px;
	font-size:0.75rem; font-weight:600; color:#fff;
	display:flex; align-items:center; justify-content:center;
}

/* ── Sections ────────────────────────────────────────────────────────────── */
.sections { padding:0 2rem 5rem; }

.section {
	display:grid; grid-template-columns:260px 1fr; gap:3rem;
	padding:2.5rem 0; border-bottom:1px solid var(--color-border);
}
.section:last-child { border-bottom:none; }
.section-meta h2 { font-size:0.9375rem; font-weight:600; margin-bottom:8px; }
.section-meta p { font-size:0.8125rem; color:var(--color-muted); line-height:1.6; }
.section-meta strong { color:var(--color-text); }
.section-meta a { color:var(--brand); text-decoration:underline; text-underline-offset:2px; }

.section-fields { display:flex; flex-direction:column; gap:1.25rem; }

.field { display:flex; flex-direction:column; gap:5px; }
.field label { font-size:0.8125rem; font-weight:500; }
.field-hint { font-size:0.8rem; color:var(--color-muted); line-height:1.5; }
.field-hint a { color:var(--brand); }
	.mt { margin-top:4px; }

input[type="text"], select {
	height:38px; padding:0 12px;
	border:1.5px solid var(--color-border); border-radius:8px;
	font-size:0.875rem; background:var(--color-surface); color:var(--color-text);
	width:100%; outline:none;
	transition:border-color 0.15s, box-shadow 0.15s;
}
input:focus, select:focus { border-color:var(--brand); box-shadow:0 0 0 3px rgba(74,18,4,.10); }

.color-row { display:flex; align-items:center; gap:10px; }
input[type="color"] { width:44px; height:38px; border:1.5px solid var(--color-border); border-radius:8px; padding:3px; cursor:pointer; flex-shrink:0; }
.color-preview { width:38px; height:38px; border-radius:8px; border:1px solid var(--color-border); flex-shrink:0; }

/* Toggle */
.toggle-label { display:flex; align-items:flex-start; gap:12px; cursor:pointer; font-size:0.875rem; font-weight:500; }
.toggle-wrap { position:relative; display:inline-flex; align-items:center; flex-shrink:0; margin-top:1px; }
.toggle-wrap input[type="checkbox"] { opacity:0; width:0; height:0; position:absolute; }
.toggle-track {
	width:40px; height:22px; border-radius:11px; background:var(--color-border);
	transition:background 0.2s; display:block; cursor:pointer; flex-shrink:0;
}
.toggle-track::after {
	content:''; position:absolute; top:3px; left:3px;
	width:16px; height:16px; border-radius:50%; background:#fff;
	transition:transform 0.2s; box-shadow:0 1px 3px rgba(0,0,0,.2);
}
.toggle-wrap input:checked ~ .toggle-track { background:var(--brand); }
.toggle-wrap input:checked ~ .toggle-track::after { transform:translateX(18px); }

.req-badge {
	display:inline-block; font-size:0.625rem; font-weight:600; text-transform:uppercase;
	letter-spacing:0.04em; background:#fef9c3; color:#854d0e; border:1px solid #fde68a;
	padding:1px 6px; border-radius:4px; margin-left:6px; vertical-align:middle;
}

/* ── Access mode cards ───────────────────────────────────────────────────── */
.access-mode-cards { display:flex; flex-direction:column; gap:6px; margin-top:4px; }
.access-card {
	display:flex; align-items:center; gap:12px;
	padding:10px 14px; border:1.5px solid var(--color-border); border-radius:10px;
	cursor:pointer; transition:border-color 0.15s, background 0.15s;
}
.access-card input[type="radio"] { display:none; }
.access-card:hover { background:var(--color-surface-raised); }
.access-card.selected { border-color:var(--brand); background:color-mix(in srgb, var(--brand) 5%, transparent); }
.access-card-icon {
	width:34px; height:34px; border-radius:8px; flex-shrink:0;
	display:flex; align-items:center; justify-content:center;
	background:var(--color-surface-raised); color:var(--color-muted);
	transition:background 0.15s, color 0.15s;
}
.access-card.selected .access-card-icon { background:color-mix(in srgb, var(--brand) 12%, transparent); color:var(--brand); }
.access-card-body { display:flex; flex-direction:column; gap:1px; }
.access-card-body strong { font-size:0.875rem; font-weight:600; color:var(--color-text); }
.access-card-body span { font-size:0.8rem; color:var(--color-muted); line-height:1.4; }

.access-info {
	display:flex; align-items:center; gap:6px; flex-wrap:wrap;
	font-size:0.8125rem; color:var(--color-muted);
	background:var(--color-surface-raised); border:1px solid var(--color-border);
	border-radius:8px; padding:10px 12px;
}
.access-info-icon { display:flex; align-items:center; color:var(--color-muted); flex-shrink:0; }
.access-url { color:var(--brand); font-weight:500; word-break:break-all; }

/* ── Password input ──────────────────────────────────────────────────────── */
.pw-wrap {
	position:relative; display:flex; align-items:center;
}
.pw-icon {
	position:absolute; left:12px; display:flex; align-items:center;
	color:var(--color-muted); pointer-events:none;
}
.pw-input {
	width:100%; height:38px; padding:0 40px 0 36px;
	border:1.5px solid var(--color-border); border-radius:8px;
	font-size:0.875rem; background:var(--color-surface); color:var(--color-text);
	outline:none; transition:border-color 0.15s, box-shadow 0.15s;
}
.pw-input:focus { border-color:var(--brand); box-shadow:0 0 0 3px color-mix(in srgb, var(--brand) 10%, transparent); }
.pw-toggle {
	position:absolute; right:10px; display:flex; align-items:center;
	padding:4px; border:none; background:none; cursor:pointer;
	color:var(--color-muted); border-radius:5px;
	transition:color 0.1s, background 0.1s;
}
.pw-toggle:hover { color:var(--color-text); background:var(--color-surface-raised); }

.pw-strength {
	display:flex; align-items:center; gap:8px; margin-top:6px;
}
.pw-bars { display:flex; gap:3px; }
.pw-bar {
	width:32px; height:3px; border-radius:99px;
	background:var(--color-border);
	transition:background 0.2s;
}
.pw-label { font-size:0.75rem; font-weight:600; }

.token-row { display:flex; align-items:center; gap:6px; }
.token-input {
	flex:1; font-family:var(--font-mono); font-size:0.75rem;
	color:var(--color-muted); background:var(--color-surface-raised);
	border:1.5px solid var(--color-border); border-radius:8px;
	height:38px; padding:0 10px; outline:none; cursor:text;
}
.btn-icon-sm {
	display:flex; align-items:center; justify-content:center;
	width:36px; height:36px; border-radius:8px; flex-shrink:0;
	border:1.5px solid var(--color-border); background:var(--color-surface);
	color:var(--color-muted); cursor:pointer; transition:background 0.1s, color 0.1s;
}
.btn-icon-sm:hover { background:var(--color-surface-raised); color:var(--color-text); }
.btn-generate {
	display:inline-flex; align-items:center; gap:6px;
	height:36px; padding:0 14px; border-radius:8px;
	border:1.5px solid var(--color-border); background:none;
	font-size:0.875rem; font-weight:500; color:var(--color-text);
	cursor:pointer; transition:background 0.1s;
}
.btn-generate:hover { background:var(--color-surface-raised); }
.whitelist-textarea {
	width:100%; padding:10px 12px; resize:vertical;
	border:1.5px solid var(--color-border); border-radius:8px;
	font-size:0.875rem; background:var(--color-surface); color:var(--color-text);
	font-family:var(--font-mono); line-height:1.6; outline:none;
	transition:border-color 0.15s, box-shadow 0.15s;
}
.whitelist-textarea:focus { border-color:var(--brand); box-shadow:0 0 0 3px color-mix(in srgb, var(--brand) 10%, transparent); }
.whitelist-textarea::placeholder { color:var(--color-muted); font-family:var(--font-mono); }
.field-hint code { font-family:var(--font-mono); font-size:0.8rem; background:var(--color-surface-raised); padding:1px 5px; border-radius:4px; }

/* ── License cards ───────────────────────────────────────────────────────── */
.lic-cards { display:flex; flex-direction:column; gap:10px; }
.lic-card {
	display:flex; gap:12px; padding:14px 16px;
	background:var(--color-surface-raised); border:1px solid var(--color-border); border-radius:10px;
}
.lic-icon { display:flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:8px; background:var(--color-surface); color:var(--color-muted); flex-shrink:0; }
.lic-card strong { font-size:0.875rem; font-weight:600; display:block; margin-bottom:4px; }
.lic-card p { font-size:0.8125rem; color:var(--color-muted); margin:0; line-height:1.5; }
.lic-links { display:flex; gap:12px; margin-top:8px; }
.lic-links a { font-size:0.8125rem; color:var(--brand); text-decoration:underline; text-underline-offset:2px; }

.error-toast {
	position:fixed; bottom:1.5rem; left:50%; transform:translateX(-50%);
	background:#fff5f5; color:var(--color-danger); border:1px solid #fecaca;
	padding:10px 16px; border-radius:8px; font-size:0.875rem; z-index:200;
	box-shadow:var(--shadow-lg);
}

@media (max-width: 768px) {
	.topbar, .sections { padding-left:1rem; padding-right:1rem; }
	.anchor-nav { padding:0 1rem; }
	.unsaved-bar { left:0; padding:10px 1rem; }
	.section { grid-template-columns:1fr; gap:1rem; padding:1.75rem 0; }
	.preview-sidebar { width:100%; }
}
</style>
