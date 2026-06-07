<script lang="ts">
	import type { PageData } from './$types';
	import { languageTag } from '$lib/paraglide/runtime';
	import { invalidate } from '$app/navigation';
	import * as m from '$lib/paraglide/messages';
	const { data }: { data: PageData } = $props();

	let s = $state({ ...data.settings });
	let saving = $state(false);
	let saved = $state(false);
	let error = $state('');

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
	// Keep radio in sync when ParaglideJS updates languageTag (e.g. after invalidation)
	$effect(() => { currentLang = languageTag(); });

	async function switchLang(lang: 'en' | 'cs') {
		currentLang = lang;
		document.cookie = `paraglide_lang=${lang};path=/;max-age=31536000`;
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
					<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7l3 3 6-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
					{m.settings_saved()}
				</span>
			{/if}
			<button class="btn-save" onclick={save} disabled={saving}>
				{saving ? '…' : m.settings_save()}
			</button>
		</div>
	</div>

	<div class="sections">

		<!-- Identity -->
		<section class="section">
			<div class="section-meta">
				<h2>{m.settings_identity()}</h2>
				<p>{m.settings_identity_sub()}</p>
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
		<section class="section">
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
		<section class="section">
			<div class="section-meta">
				<h2>{m.settings_display()}</h2>
				<p>{m.settings_display_sub()}</p>
			</div>
			<div class="section-fields">
				<div class="field">
					<label>Interface language</label>
					<p class="field-hint">Applied immediately, saved in your browser.</p>
					<div class="radio-group">
						<label class="radio-option">
							<input type="radio" name="lang" value="en" checked={currentLang === 'en'} onchange={() => switchLang('en')} />
							<span class="radio-label"><strong>English</strong></span>
						</label>
						<label class="radio-option">
							<input type="radio" name="lang" value="cs" checked={currentLang === 'cs'} onchange={() => switchLang('cs')} />
							<span class="radio-label"><strong>Čeština</strong></span>
						</label>
					</div>
				</div>
				<div class="field">
					<label>{m.settings_pantone_label()}</label>
					<div class="radio-group">
						<label class="radio-option">
							<input type="radio" name="pantoneLabel" value="PMS" checked={pantoneLabel === 'PMS'} onchange={() => setPantoneLabel('PMS')} />
							<span class="radio-label"><strong>PMS</strong> — Pantone Matching System (industry standard)</span>
						</label>
						<label class="radio-option">
							<input type="radio" name="pantoneLabel" value="Pantone" checked={pantoneLabel === 'Pantone'} onchange={() => setPantoneLabel('Pantone')} />
							<span class="radio-label"><strong>Pantone</strong> — full brand name</span>
						</label>
					</div>
				</div>
			</div>
		</section>

		<section class="section">
			<div class="section-meta">
				<h2>{m.settings_access()}</h2>
				<p>{m.settings_access_sub()}</p>
			</div>
			<div class="section-fields">
				<div class="field">
					<label for="accessMode">{m.settings_access_mode()}</label>
					<select id="accessMode" bind:value={s.accessMode}>
						<option value="public">Public — anyone with the link</option>
						<option value="password">Password protected</option>
						<option value="email_whitelist">Email whitelist</option>
						<option value="token">Secret token link</option>
					</select>
				</div>
			</div>
		</section>

		<!-- License -->
		<section class="section">
			<div class="section-meta">
				<h2>{m.settings_license()}</h2>
				<p>{m.settings_license_sub()}</p>
			</div>
			<div class="section-fields">
				<div class="lic-cards">
					<div class="lic-card">
						<div class="lic-icon">⚖️</div>
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
						<div class="lic-icon">🔒</div>
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

.sections { padding:0 2rem 2.5rem; }

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
.radio-group { display:flex; flex-direction:column; gap:6px; margin-top:2px; }
.radio-option { display:flex; align-items:center; gap:8px; cursor:pointer; padding:8px 10px; border:1.5px solid var(--color-border); border-radius:8px; transition:border-color 0.15s, background 0.15s; }
.radio-option:has(input:checked) { border-color:var(--brand); background:rgba(74,18,4,.04); }
.radio-option input[type="radio"] { accent-color:var(--brand); width:15px; height:15px; flex-shrink:0; }
.radio-label { font-size:0.875rem; color:var(--color-text); }
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

/* License cards */
.lic-cards { display:flex; flex-direction:column; gap:10px; }
.lic-card {
	display:flex; gap:12px; padding:14px 16px;
	background:var(--color-surface-raised); border:1px solid var(--color-border); border-radius:10px;
}
.lic-icon { font-size:1.375rem; flex-shrink:0; }
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
	.section { grid-template-columns:1fr; gap:1rem; padding:1.75rem 0; }
}
</style>
