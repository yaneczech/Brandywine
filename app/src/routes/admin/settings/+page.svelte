<script lang="ts">
	import type { PageData } from './$types';
	import { languageTag, setLanguageTag } from '$lib/paraglide/runtime';
	import { invalidate } from '$app/navigation';
	import * as m from '$lib/paraglide/messages';
	import {
		IconCheck, IconAlertTriangle, IconScale, IconLock, IconInfoCircle, IconRefresh
	} from '@tabler/icons-svelte';
	import type { UnitDigital, UnitPrint, UnitType } from '$lib/db/schema/brand';

	const { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
	let s = $state({ ...data.settings });
	let saving = $state(false);
	let saved  = $state(false);
	let error  = $state('');

	// svelte-ignore state_referenced_locally
	let original = JSON.stringify(data.settings);
	let isDirty = $derived(JSON.stringify(s) !== original);

	// ── Quote character constants (explicit Unicode to avoid copy-paste confusion) ─
	const Q = {
		low9:  '„',  // „  LOW-9 DOUBLE QUOTATION MARK
		lHigh: '“',  // “  LEFT DOUBLE QUOTATION MARK  (66-style)
		rHigh: '”',  // ”  RIGHT DOUBLE QUOTATION MARK (99-style)
		lAng:  '«',  // «  LEFT-POINTING DOUBLE ANGLE QUOTATION MARK
		rAng:  '»',  // »  RIGHT-POINTING DOUBLE ANGLE QUOTATION MARK
		lCorn: '「',  // 「 LEFT CORNER BRACKET
		rCorn: '」',  // 」RIGHT CORNER BRACKET
		rRev:  '»',  // »  (Danish opening — reversed guillemet)
		lRev:  '«',  // «  (Danish closing — reversed guillemet)
	};

	// ── Language catalog ──────────────────────────────────────────────────────
	type LangEntry = {
		code: string; name: string; native: string; rtl: boolean;
		quoteOpen: string; quoteClose: string;
		dashStyle: 'en' | 'em';
		decimalSep: string; thousandsSep: string;
		dateFormat: string;
		unitSpace:    'nbsp' | 'nnbsp' | 'none';
		percentSpace: 'nbsp' | 'nnbsp' | 'none';
	};

	const LANGUAGES: LangEntry[] = [
		//           code      name                        native            rtl    qOpen      qClose     dash  dec  thou  date
		{ code: 'ar',    name: 'Arabic',                native: 'العربية',       rtl: true,  quoteOpen: Q.lAng,  quoteClose: Q.rAng,  dashStyle: 'em', decimalSep: '.', thousandsSep: ',',  dateFormat: 'DD/MM/YYYY', unitSpace: 'nbsp', percentSpace: 'nbsp' },
		{ code: 'cs',    name: 'Czech',                 native: 'Čeština',       rtl: false, quoteOpen: Q.low9,  quoteClose: Q.lHigh, dashStyle: 'en', decimalSep: ',', thousandsSep: ' ',  dateFormat: 'D. M. YYYY', unitSpace: 'nbsp', percentSpace: 'nbsp' },
		{ code: 'da',    name: 'Danish',                native: 'Dansk',         rtl: false, quoteOpen: Q.rRev,  quoteClose: Q.lRev,  dashStyle: 'en', decimalSep: ',', thousandsSep: '.',  dateFormat: 'DD.MM.YYYY', unitSpace: 'nbsp', percentSpace: 'nbsp' },
		{ code: 'de',    name: 'German',                native: 'Deutsch',       rtl: false, quoteOpen: Q.low9,  quoteClose: Q.lHigh, dashStyle: 'en', decimalSep: ',', thousandsSep: '.',  dateFormat: 'DD.MM.YYYY', unitSpace: 'nbsp', percentSpace: 'nbsp' },
		{ code: 'en',    name: 'English',               native: 'English',       rtl: false, quoteOpen: Q.lHigh, quoteClose: Q.rHigh, dashStyle: 'en', decimalSep: '.', thousandsSep: ',',  dateFormat: 'MM/DD/YYYY', unitSpace: 'nbsp', percentSpace: 'none' },
		{ code: 'es',    name: 'Spanish',               native: 'Español',       rtl: false, quoteOpen: Q.lAng,  quoteClose: Q.rAng,  dashStyle: 'em', decimalSep: ',', thousandsSep: '.',  dateFormat: 'DD/MM/YYYY', unitSpace: 'nbsp', percentSpace: 'none' },
		{ code: 'fa',    name: 'Persian',               native: 'فارسی',         rtl: true,  quoteOpen: Q.lAng,  quoteClose: Q.rAng,  dashStyle: 'em', decimalSep: '٫', thousandsSep: '٬', dateFormat: 'YYYY/MM/DD', unitSpace: 'nnbsp', percentSpace: 'nnbsp' },
		{ code: 'fi',    name: 'Finnish',               native: 'Suomi',         rtl: false, quoteOpen: Q.lHigh, quoteClose: Q.rHigh, dashStyle: 'en', decimalSep: ',', thousandsSep: ' ',  dateFormat: 'D.M.YYYY', unitSpace: 'nbsp', percentSpace: 'nbsp' },
		{ code: 'fr',    name: 'French',                native: 'Français',      rtl: false, quoteOpen: Q.lAng + ' ', quoteClose: ' ' + Q.rAng, dashStyle: 'em', decimalSep: ',', thousandsSep: ' ', dateFormat: 'DD/MM/YYYY', unitSpace: 'nnbsp', percentSpace: 'nnbsp' },
		{ code: 'he',    name: 'Hebrew',                native: 'עברית',          rtl: true,  quoteOpen: Q.lHigh, quoteClose: Q.rHigh, dashStyle: 'en', decimalSep: '.', thousandsSep: ',',  dateFormat: 'DD/MM/YYYY', unitSpace: 'nbsp', percentSpace: 'none' },
		{ code: 'hu',    name: 'Hungarian',             native: 'Magyar',        rtl: false, quoteOpen: Q.low9,  quoteClose: Q.rHigh, dashStyle: 'en', decimalSep: ',', thousandsSep: ' ',  dateFormat: 'YYYY. MM. DD.', unitSpace: 'nbsp', percentSpace: 'nbsp' },
		{ code: 'it',    name: 'Italian',               native: 'Italiano',      rtl: false, quoteOpen: Q.lAng,  quoteClose: Q.rAng,  dashStyle: 'em', decimalSep: ',', thousandsSep: '.',  dateFormat: 'DD/MM/YYYY', unitSpace: 'nbsp', percentSpace: 'none' },
		{ code: 'ja',    name: 'Japanese',              native: '日本語',          rtl: false, quoteOpen: Q.lCorn, quoteClose: Q.rCorn, dashStyle: 'em', decimalSep: '.', thousandsSep: ',',  dateFormat: 'YYYY/MM/DD', unitSpace: 'none', percentSpace: 'none' },
		{ code: 'ko',    name: 'Korean',                native: '한국어',          rtl: false, quoteOpen: Q.lHigh, quoteClose: Q.rHigh, dashStyle: 'en', decimalSep: '.', thousandsSep: ',',  dateFormat: 'YYYY.MM.DD', unitSpace: 'none', percentSpace: 'none' },
		{ code: 'nl',    name: 'Dutch',                 native: 'Nederlands',    rtl: false, quoteOpen: Q.lHigh, quoteClose: Q.rHigh, dashStyle: 'en', decimalSep: ',', thousandsSep: '.',  dateFormat: 'DD-MM-YYYY', unitSpace: 'nbsp', percentSpace: 'nbsp' },
		{ code: 'pl',    name: 'Polish',                native: 'Polski',        rtl: false, quoteOpen: Q.low9,  quoteClose: Q.lHigh, dashStyle: 'en', decimalSep: ',', thousandsSep: ' ',  dateFormat: 'DD.MM.YYYY', unitSpace: 'nbsp', percentSpace: 'nbsp' },
		{ code: 'pt',    name: 'Portuguese',            native: 'Português',     rtl: false, quoteOpen: Q.lAng,  quoteClose: Q.rAng,  dashStyle: 'en', decimalSep: ',', thousandsSep: '.',  dateFormat: 'DD/MM/YYYY', unitSpace: 'nbsp', percentSpace: 'none' },
		{ code: 'ro',    name: 'Romanian',              native: 'Română',        rtl: false, quoteOpen: Q.low9,  quoteClose: Q.rHigh, dashStyle: 'en', decimalSep: ',', thousandsSep: '.',  dateFormat: 'DD.MM.YYYY', unitSpace: 'nbsp', percentSpace: 'none' },
		{ code: 'ru',    name: 'Russian',               native: 'Русский',       rtl: false, quoteOpen: Q.lAng,  quoteClose: Q.rAng,  dashStyle: 'em', decimalSep: ',', thousandsSep: ' ',  dateFormat: 'DD.MM.YYYY', unitSpace: 'nbsp', percentSpace: 'nbsp' },
		{ code: 'sk',    name: 'Slovak',                native: 'Slovenčina',    rtl: false, quoteOpen: Q.low9,  quoteClose: Q.lHigh, dashStyle: 'en', decimalSep: ',', thousandsSep: ' ',  dateFormat: 'D. M. YYYY', unitSpace: 'nbsp', percentSpace: 'nbsp' },
		{ code: 'sv',    name: 'Swedish',               native: 'Svenska',       rtl: false, quoteOpen: Q.lHigh, quoteClose: Q.rHigh, dashStyle: 'en', decimalSep: ',', thousandsSep: ' ',  dateFormat: 'YYYY-MM-DD', unitSpace: 'nbsp', percentSpace: 'nbsp' },
		{ code: 'tr',    name: 'Turkish',               native: 'Türkçe',        rtl: false, quoteOpen: Q.lHigh, quoteClose: Q.rHigh, dashStyle: 'en', decimalSep: ',', thousandsSep: '.',  dateFormat: 'DD.MM.YYYY', unitSpace: 'nbsp', percentSpace: 'none' },
		{ code: 'uk',    name: 'Ukrainian',             native: 'Українська',    rtl: false, quoteOpen: Q.lAng,  quoteClose: Q.rAng,  dashStyle: 'em', decimalSep: ',', thousandsSep: ' ',  dateFormat: 'DD.MM.YYYY', unitSpace: 'nbsp', percentSpace: 'nbsp' },
		{ code: 'zh',    name: 'Chinese (Simplified)',  native: '中文（简体）',     rtl: false, quoteOpen: Q.lHigh, quoteClose: Q.rHigh, dashStyle: 'em', decimalSep: '.', thousandsSep: ',',  dateFormat: 'YYYY/MM/DD', unitSpace: 'none', percentSpace: 'none' },
		{ code: 'zh-TW', name: 'Chinese (Traditional)', native: '中文（繁體）',    rtl: false, quoteOpen: Q.lCorn, quoteClose: Q.rCorn, dashStyle: 'em', decimalSep: '.', thousandsSep: ',',  dateFormat: 'YYYY/MM/DD', unitSpace: 'none', percentSpace: 'none' },
	];

	const primaryCode    = $derived(s.defaultLanguage ?? 'en');
	const langDefaults   = $derived(LANGUAGES.find(l => l.code === primaryCode) ?? LANGUAGES.find(l => l.code === 'en')!);

	// Effective rules = stored overrides merged onto catalog defaults
	const rules = $derived({
		quoteOpen:    (s.localeRules as any)?.[primaryCode]?.quoteOpen    ?? langDefaults.quoteOpen,
		quoteClose:   (s.localeRules as any)?.[primaryCode]?.quoteClose   ?? langDefaults.quoteClose,
		dashStyle:    (s.localeRules as any)?.[primaryCode]?.dashStyle    ?? langDefaults.dashStyle,
		decimalSep:   (s.localeRules as any)?.[primaryCode]?.decimalSep   ?? langDefaults.decimalSep,
		thousandsSep: (s.localeRules as any)?.[primaryCode]?.thousandsSep ?? langDefaults.thousandsSep,
		dateFormat:   (s.localeRules as any)?.[primaryCode]?.dateFormat   ?? langDefaults.dateFormat,
		unitSpace:    (s.localeRules as any)?.[primaryCode]?.unitSpace    ?? langDefaults.unitSpace,
		percentSpace: (s.localeRules as any)?.[primaryCode]?.percentSpace ?? langDefaults.percentSpace,
	});

	const hasOverrides = $derived(
		Object.keys((s.localeRules as any)?.[primaryCode] ?? {}).length > 0
	);

	function setRule(key: string, value: string) {
		const lr  = (s.localeRules as Record<string, any>) ?? {};
		const cur = lr[primaryCode] ?? {};
		s = { ...s, localeRules: { ...lr, [primaryCode]: { ...cur, [key]: value } } as any };
	}

	function resetRules() {
		const lr = { ...(s.localeRules as Record<string, any>) ?? {} };
		delete lr[primaryCode];
		s = { ...s, localeRules: lr as any };
	}

	// ── Interface language (ParaglideJS) ──────────────────────────────────────
	let currentLang = $state(languageTag());
	$effect(() => { currentLang = languageTag(); });

	async function switchLang(lang: 'en' | 'cs') {
		currentLang = lang;
		setLanguageTag(lang);
		document.cookie = `paraglide_lang=${lang};path=/;max-age=31536000;SameSite=Lax`;
		await invalidate('paraglide:lang');
	}

	// ── Save ──────────────────────────────────────────────────────────────────
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
			<p class="page-sub">{m.settings_sub()}</p>
		</div>
		<div class="topbar-actions">
			{#if saved}
				<span class="saved-badge"><IconCheck size={14} stroke={2} />{m.settings_saved()}</span>
			{/if}
			<button class="btn-save" onclick={save} disabled={saving || !isDirty}>
				{saving ? '…' : m.settings_save()}
			</button>
		</div>
	</div>

	<nav class="anchor-nav" aria-label="Sections">
		<a href="#display" class="anav-item">{m.settings_display()}</a>
		<a href="#locale"  class="anav-item">{m.settings_locale()}</a>
		<a href="#units"   class="anav-item">{m.settings_units_section()}</a>
		<a href="#license" class="anav-item">{m.settings_license()}</a>
	</nav>

	<div class="sections">

		<!-- ── Display ────────────────────────────────────────────────────────── -->
		<section id="display" class="section">
			<div class="section-meta">
				<h2>{m.settings_display()}</h2>
				<p>{m.settings_display_sub()}</p>
			</div>
			<div class="section-fields">
				<div class="field">
					<label for="interfaceLanguage">{m.settings_interface_language()}</label>
					<p class="field-hint">{m.settings_interface_language_hint()}</p>
					<select
						id="interfaceLanguage"
						value={currentLang}
						onchange={(e) => switchLang((e.currentTarget as HTMLSelectElement).value as 'en' | 'cs')}
					>
						<option value="en">English</option>
						<option value="cs">Čeština</option>
					</select>
				</div>
				<div class="dev-hint">
					<IconInfoCircle size={13} stroke={1.75} />
					<span>{m.settings_dev_hint_prefix()} <code>src/messages/[lang].json</code> {m.settings_dev_hint_suffix()} <code>project.inlang/settings.json</code>.</span>
				</div>
			</div>
		</section>

		<!-- ── Locale ─────────────────────────────────────────────────────────── -->
		<section id="locale" class="section">
			<div class="section-meta">
				<h2>{m.settings_locale()}</h2>
				<p>{m.settings_locale_sub()}</p>
			</div>
			<div class="section-fields">

				<!-- Primary language select -->
				<div class="field">
					<label for="primaryLang">{m.settings_primary_lang()}</label>
					<div class="primary-lang-row">
						<select
							id="primaryLang"
							value={s.defaultLanguage ?? 'en'}
							onchange={e => (s = { ...s, defaultLanguage: (e.currentTarget as HTMLSelectElement).value })}
						>
							{#each LANGUAGES as lang}
								<option value={lang.code}>{lang.name} — {lang.native}{lang.rtl ? ' (RTL)' : ''}</option>
							{/each}
						</select>
						{#if langDefaults.rtl}
							<span class="rtl-badge">RTL</span>
						{/if}
					</div>
				</div>

				<!-- Editable typography conventions -->
				<div class="rules-block">
					<div class="rules-header">
						<span class="rules-title">{m.settings_conventions()}</span>
						{#if hasOverrides}
							<button type="button" class="btn-reset-rules" onclick={resetRules}>
								<IconRefresh size={11} stroke={2} />
								{m.settings_reset_rules()}
							</button>
						{/if}
					</div>

					<!-- Quotes -->
					<div class="rule-row">
						<span class="rule-label">{m.settings_quotes()}</span>
						<div class="rule-inputs">
							<input
								type="text" class="quote-inp"
								value={rules.quoteOpen}
								oninput={e => setRule('quoteOpen', (e.target as HTMLInputElement).value)}
							/>
							<span class="rule-sep">{m.settings_quote_text()}</span>
							<input
								type="text" class="quote-inp"
								value={rules.quoteClose}
								oninput={e => setRule('quoteClose', (e.target as HTMLInputElement).value)}
							/>
							<span class="rule-preview">{rules.quoteOpen}Ukázka textu{rules.quoteClose}</span>
						</div>
					</div>

					<!-- Dash -->
					<div class="rule-row">
						<span class="rule-label">{m.settings_dash()}</span>
						<div class="rule-inputs">
							<select
								value={rules.dashStyle}
								onchange={e => setRule('dashStyle', (e.currentTarget as HTMLSelectElement).value)}
							>
								<option value="en">{m.settings_dash_en()}</option>
								<option value="em">{m.settings_dash_em()}</option>
							</select>
							<span class="rule-preview">1990{rules.dashStyle === 'em' ? '—' : '–'}2025</span>
						</div>
					</div>

					<!-- Numbers -->
					<div class="rule-row">
						<span class="rule-label">{m.settings_numbers()}</span>
						<div class="rule-inputs">
							<select
								value={rules.decimalSep}
								onchange={e => setRule('decimalSep', (e.currentTarget as HTMLSelectElement).value)}
							>
								<option value=",">{m.settings_decimal_comma()}</option>
								<option value=".">{m.settings_decimal_dot()}</option>
							</select>
							<select
								value={rules.thousandsSep}
								onchange={e => setRule('thousandsSep', (e.currentTarget as HTMLSelectElement).value)}
							>
								<option value=" ">{m.settings_thousands_space()}</option>
								<option value=",">{m.settings_thousands_comma()}</option>
								<option value=".">{m.settings_thousands_dot()}</option>
								<option value="">{m.settings_thousands_none()}</option>
							</select>
							<span class="rule-preview">1{rules.thousandsSep}234{rules.decimalSep}50</span>
						</div>
					</div>

					<!-- Date -->
					<div class="rule-row">
						<span class="rule-label">{m.settings_date()}</span>
						<div class="rule-inputs">
							<select
								value={rules.dateFormat}
								onchange={e => setRule('dateFormat', (e.currentTarget as HTMLSelectElement).value)}
							>
								<option value="D. M. YYYY">D. M. YYYY &nbsp;— cs/sk &nbsp;(1. 6. 2025)</option>
								<option value="DD.MM.YYYY">DD.MM.YYYY — de/pl &nbsp;(01.06.2025)</option>
								<option value="DD/MM/YYYY">DD/MM/YYYY — fr/uk &nbsp;(01/06/2025)</option>
								<option value="MM/DD/YYYY">MM/DD/YYYY — en-US (06/01/2025)</option>
								<option value="YYYY-MM-DD">YYYY-MM-DD — ISO 8601</option>
								<option value="YYYY/MM/DD">YYYY/MM/DD — ja/zh &nbsp;(2025/06/01)</option>
								<option value="YYYY. MM. DD.">YYYY. MM. DD. — hu</option>
								<option value="D.M.YYYY">D.M.YYYY &nbsp;&nbsp;&nbsp;— fi &nbsp;&nbsp;&nbsp;(1.6.2025)</option>
							</select>
						</div>
					</div>

					<!-- Unit space -->
					<div class="rule-row">
						<span class="rule-label">{m.settings_unit_space()}</span>
						<div class="rule-inputs">
							<select
								value={rules.unitSpace}
								onchange={e => setRule('unitSpace', (e.currentTarget as HTMLSelectElement).value)}
							>
								<option value="nbsp">{m.settings_nbsp_unit()}</option>
								<option value="nnbsp">{m.settings_nnbsp_unit()}</option>
								<option value="none">{m.settings_no_space_unit()}</option>
							</select>
							<span class="rule-preview">
								{#if rules.unitSpace === 'none'}10kg
								{:else if rules.unitSpace === 'nnbsp'}10&#x202F;kg
								{:else}10&nbsp;kg{/if}
							</span>
						</div>
					</div>

					<!-- Percent space -->
					<div class="rule-row">
						<span class="rule-label">{m.settings_percent()}</span>
						<div class="rule-inputs">
							<select
								value={rules.percentSpace}
								onchange={e => setRule('percentSpace', (e.currentTarget as HTMLSelectElement).value)}
							>
								<option value="nbsp">{m.settings_nbsp_percent()}</option>
								<option value="nnbsp">{m.settings_nnbsp_percent()}</option>
								<option value="none">{m.settings_no_space_percent()}</option>
							</select>
							<span class="rule-preview">
								{#if rules.percentSpace === 'none'}10%
								{:else if rules.percentSpace === 'nnbsp'}10&#x202F;%
								{:else}10&nbsp;%{/if}
							</span>
						</div>
					</div>

				</div>
			</div>
		</section>

		<!-- ── Units ──────────────────────────────────────────────────────────── -->
		<section id="units" class="section">
			<div class="section-meta">
				<h2>{m.settings_units_section()}</h2>
				<p>{m.settings_units_sub()}</p>
			</div>
			<div class="section-fields">
				<div class="units-grid">
					<div class="field">
						<label for="unitType">{m.settings_unit_typography()}</label>
						<p class="field-hint">{m.settings_unit_typography_hint()}</p>
						<select
							id="unitType"
							value={s.unitType ?? 'px'}
							onchange={e => (s = { ...s, unitType: (e.currentTarget as HTMLSelectElement).value as UnitType })}
						>
							<option value="px">{m.settings_unit_px()}</option>
							<option value="pt">{m.settings_unit_pt()}</option>
							<option value="rem">{m.settings_unit_rem()}</option>
							<option value="em">{m.settings_unit_em_option()}</option>
						</select>
					</div>
					<div class="field">
						<label for="unitDigital">{m.settings_unit_digital()}</label>
						<p class="field-hint">{m.settings_unit_digital_hint()}</p>
						<select
							id="unitDigital"
							value={s.unitDigital ?? 'px'}
							onchange={e => (s = { ...s, unitDigital: (e.currentTarget as HTMLSelectElement).value as UnitDigital })}
						>
							<option value="px">{m.settings_unit_px()}</option>
							<option value="rem">{m.settings_unit_rem()}</option>
							<option value="em">{m.settings_unit_em_option()}</option>
							<option value="vw">{m.settings_unit_vw()}</option>
						</select>
					</div>
					<div class="field">
						<label for="unitPrint">{m.settings_unit_print()}</label>
						<p class="field-hint">{m.settings_unit_print_hint()}</p>
						<select
							id="unitPrint"
							value={s.unitPrint ?? 'mm'}
							onchange={e => (s = { ...s, unitPrint: (e.currentTarget as HTMLSelectElement).value as UnitPrint })}
						>
							<option value="mm">{m.settings_unit_mm()}</option>
							<option value="cm">{m.settings_unit_cm()}</option>
							<option value="pt">{m.settings_unit_pt_print()}</option>
							<option value="in">{m.settings_unit_in()}</option>
							<option value="pc">{m.settings_unit_pc()}</option>
						</select>
					</div>
				</div>
			</div>
		</section>

		<!-- ── License ────────────────────────────────────────────────────────── -->
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
							<p>{m.settings_lic_apache_desc()}</p>
							<div class="lic-links">
								<a href="https://github.com/yaneczech/Brandywine/blob/main/LICENSE" target="_blank">LICENSE ↗</a>
								<a href="https://github.com/yaneczech/Brandywine/blob/main/NOTICE" target="_blank">NOTICE ↗</a>
							</div>
						</div>
					</div>
					<div class="lic-card">
						<div class="lic-icon"><IconLock size={22} stroke={1.5} /></div>
						<div>
							<strong>{m.settings_lic_privacy_title()}</strong>
							<p>{m.settings_lic_privacy_desc()}</p>
						</div>
					</div>
				</div>
				<div class="dizen-credit">
					<span>{m.settings_lic_designed_by()}</span>
					<a href="https://dizen.cz" target="_blank" rel="noopener" class="dizen-link" aria-label="Dizen">
						<svg class="dizen-logo" viewBox="0 0 164 130" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
							<path fill="currentColor" d="M85.6,57c0.8-2,2.9-9.4,5.9-9.4c0.9,0,1.4,0.8,1.4,2.1c0,1.8-2.1,2.6-5.9,5.1c-8.6,5.4-17.4,10.6-26,16.7c-14.3,10.4-27.1,22-27.1,36c0,7.6,3.3,10.4,9,10.4s10.4-2.4,14.4-7.2c5.7-6.7,12.4-28.3,12.4-43.4c0-4.2-2.2-6.6-5.9-6.6c-3.7,0-7.5,3.1-7.5,7.2c0,2.2,1.1,3.2,2.9,3.2c3,0,5.9-1.8,9.4-5.7c3.1-3.6,6.5-10.2,7.6-16.3c0.2-1.1-0.3-1.3-1.1-1.4c-1.5-0.1-4.2,0.2-6.5,0.2c-1.1,0-2.2-0.1-3.1-0.3c0.1-1.4,0.1-3.1-1.3-3.1c-2.2,0.4-2.9,3.5-2,5.2C58.5,57.2,49.4,67,46.9,65.7c-0.4-0.2-0.7-0.8-0.7-1.5c0-3,3-9.6,4.1-15.3c0.1-0.7-1.5-1-2.6-1c-0.4,0-0.8,0-0.9,0.1C40.5,54.2,32,65.5,27,65.5c-0.8,0-1-0.4-1-1.3c0-0.3,0.1-1.2,0.4-2.4C29.3,50.3,41.6,40,50,29.1c0.8,2.3,1.8,4.6,2.1,7.9c-0.3-0.1-0.7-0.1-0.9-0.1c-2.2,0-3.4,2.1-3.4,4c0,2.6,2,3.6,4.1,3.6c2.6,0,4.4-2.1,4.4-5.2c0-4-2.1-9.9-3.7-12.1c1.1-2.8,2.9-5.6,2.9-7.4c0-1.3-1-2-1.9-2c-0.9,0-1.8,0.8-2.8,2.1c-0.7,1-0.7,2.3-1.3,3.2c-1,1.3-2.2,1.8-3.4,3.4c-7.4,10-9.9,12.8-16.4,20.5c-2.9,3.6-11,14.5-16.2,14.5c-1.2,0-1.4-1.1-1.4-2.1c0-5.8,8.7-14.2,13.1-14.2c1.1,0,1.8,0.7,1.8,2.5c0,2.3-2.8,7.4-3.2,7.7l6.5-8.3c0.1-0.7,0.2-1.3,0.2-1.8c0-2.3-1.3-3.3-4.1-3.3c-9.6,0-19.1,11-19.1,20c0,2.4,0.9,4.2,3.1,4.2c5,0,11-5.2,13.1-7.8c-0.7,2.2-1.2,4.3-1.2,6.1c0,2.8,1.2,4.6,4.5,4.6c7.2,0,15.5-10.4,18.5-15.1c-1.5,3.4-3,7.6-3,10.7c0,2.9,1.1,4.8,4.2,4.8c3.7,0,7.7-3.3,10.2-6.2c3.5-4,5.7-8.8,7.7-12c1.2,1,2.6,1.5,4.6,1.5c0.8,0,1.7-0.1,2.5-0.3c-1.1,4.2-3.6,8.6-7.5,12.4c-1.1,1.1-2.5,2-3.5,2c-0.4,0-0.7-0.1-0.7-0.4c0-1.2,1.4-2.4,2.9-2.4c2.4,0,3.2,1.8,3.2,4.7c0,9.9-4.3,23.3-6.5,28.5c-5.4,12.4-11.1,17-14.3,17c-3.7,0-5.6-2.4-5.6-7.3c0-5.2,2.5-14.3,11.6-23.1C59,76.4,74.4,65.7,85,59.5c8.4-4.8,12.1-7,12.1-10.9c0-3-3.1-5.7-5.7-5.7c-7.2,0-11.2,19.3-11.2,23c0,2.2,1.1,3.5,3.3,3.5c5.1,0,11-5.6,17.6-10.6c3.9-2.9,8.4-6.9,10.2-6.9c0.3,0,0.4,0.1,0.4,0.2c0,1.9-9.1,13.8-9.1,15.2c0,0.4,0.3,0.7,1.2,0.7c3.7,0,5.4-5.3,10.1-10c1.4-1.4,4-3.3,5.5-3.3c1.3,0,0.7,4,0.7,5.9c0,8.6,2.6,12.3,9.1,12.3c2.2,0,4.7-0.7,7.2-1.7c9.4-4.1,16-14.4,17.8-22c0.2-1.1,0.4-2.2,0.4-3.2c0-4.3-1.3-8.9-4.2-8.9c-0.7,0-1.7,0.3-1.7,2c0,2,1.4,3.2,1.4,6.8c0,10.1-8.7,18.9-13.8,21.6c-2.2,1.2-4.1,2-6.5,2c-10,0-2.2-18.7-8.6-18.7c-2.4,0-6.2,2.4-7.5,3.3c0.7-1.3,1.3-2.8,1.3-4.2c0-1.5-0.8-2.5-2.3-2.5c-1.2,0-2.8,0.6-4,1.4c-7.8,5.6-21.4,16.9-24.6,16.9c-0.6,0-0.8-0.6-0.8-1.4C83.7,62.2,84.9,58.7,85.6,57z"/>
						</svg>
					</a>
				</div>
			</div>
		</section>

	</div>

	{#if error}
		<div class="error-toast">{error}</div>
	{/if}

	{#if isDirty && !saving}
		<div class="unsaved-bar">
			<span class="unsaved-msg">
				<IconAlertTriangle size={14} stroke={2} />
				{m.settings_unsaved()}
			</span>
			<div class="unsaved-actions">
				<button class="btn-discard" onclick={() => { s = { ...data.settings }; }}>{m.settings_discard()}</button>
				<button class="btn-save-bar" onclick={save} disabled={saving}>
					{saving ? '…' : m.settings_save()}
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
.page { min-height:100vh; }

/* ── Topbar ──────────────────────────────────────────────────────────────── */
.topbar {
	display:flex; align-items:flex-start; justify-content:space-between;
	padding:2rem 2rem 0; margin-bottom:1.5rem; gap:1rem; flex-wrap:wrap;
}
.page-title { font-size:1.5rem; font-weight:650; letter-spacing:-0.025em; }
.page-sub   { margin-top:4px; font-size:0.875rem; color:var(--color-muted); }
.topbar-actions { display:flex; align-items:center; gap:10px; flex-shrink:0; }

.btn-save {
	display:inline-flex; align-items:center; height:36px; padding:0 16px;
	background:var(--brand); color:#fff; border:none; border-radius:8px;
	font-size:0.875rem; font-weight:600; cursor:pointer;
	transition:background 0.15s;
}
.btn-save:hover    { background:var(--brand-light); }
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
	background:var(--color-surface); border-top:1px solid var(--color-border);
	box-shadow:0 -4px 16px rgba(0,0,0,.06); z-index:50;
	animation:slide-up 0.2s ease;
}
@keyframes slide-up {
	from { transform:translateY(100%); opacity:0; }
	to   { transform:translateY(0);    opacity:1; }
}
.unsaved-msg { display:flex; align-items:center; gap:6px; font-size:0.8125rem; color:var(--color-muted); font-weight:500; }
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
.btn-save-bar:hover    { background:var(--brand-light); }
.btn-save-bar:disabled { opacity:0.6; pointer-events:none; }

/* ── Sections ────────────────────────────────────────────────────────────── */
.sections { padding:0 2rem 3rem; }

.section {
	display:grid; grid-template-columns:260px 1fr; gap:3rem;
	padding:2.5rem 0; border-bottom:1px solid var(--color-border);
}
.section:last-child { border-bottom:none; }
.section-meta h2 { font-size:0.9375rem; font-weight:600; margin-bottom:8px; }
.section-meta p  { font-size:0.8125rem; color:var(--color-muted); line-height:1.6; }

.section-fields { display:flex; flex-direction:column; gap:1.25rem; }

.field { display:flex; flex-direction:column; gap:5px; }
.field label { font-size:0.8125rem; font-weight:500; }
.field-hint  { font-size:0.8rem; color:var(--color-muted); line-height:1.5; }

input[type="text"], select {
	height:38px; padding:0 12px;
	border:1.5px solid var(--color-border); border-radius:8px;
	font-size:0.875rem; background:var(--color-surface); color:var(--color-text);
	width:100%; outline:none;
	transition:border-color 0.15s, box-shadow 0.15s;
}
input:focus, select:focus { border-color:var(--brand); box-shadow:0 0 0 3px rgba(74,18,4,.10); }

/* ── Dev hint ────────────────────────────────────────────────────────────── */
.dev-hint {
	display:flex; align-items:flex-start; gap:7px;
	font-size:.8rem; color:var(--color-muted); line-height:1.55;
}
.dev-hint :global(svg) { flex-shrink:0; margin-top:1px; opacity:.65; }
.dev-hint code {
	font-family:monospace; font-size:.78rem;
	background:var(--color-surface-raised); border:1px solid var(--color-border);
	border-radius:4px; padding:0 4px; color:var(--color-text);
}

/* ── Primary language row ────────────────────────────────────────────────── */
.primary-lang-row { display:flex; align-items:center; gap:8px; }
.primary-lang-row select { flex:1; }

.rtl-badge {
	font-size:.6875rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase;
	color:#0369a1; background:#e0f2fe; border:1px solid #bae6fd;
	border-radius:4px; padding:2px 7px; flex-shrink:0;
}

/* ── Rules block ─────────────────────────────────────────────────────────── */
.rules-block {
	background:var(--color-surface-raised);
	border:1px solid var(--color-border);
	border-radius:10px;
	overflow:hidden;
}

.rules-header {
	display:flex; align-items:center; justify-content:space-between;
	padding:9px 14px;
	border-bottom:1px solid var(--color-border);
	background:var(--color-surface);
}
.rules-title { font-size:.8125rem; font-weight:600; }

.btn-reset-rules {
	display:inline-flex; align-items:center; gap:4px;
	font-size:.75rem; color:var(--color-muted); background:none;
	border:none; cursor:pointer; padding:2px 0;
	transition:color .15s;
}
.btn-reset-rules:hover { color:var(--brand); }

.rule-row {
	display:grid; grid-template-columns:90px 1fr;
	gap:.4rem 1rem; align-items:center;
	padding:10px 14px;
	border-bottom:1px solid var(--color-border);
}
.rule-row:last-child { border-bottom:none; }

.rule-label {
	font-size:.8rem; font-weight:500;
	color:var(--color-muted); line-height:1.3;
}
.rule-inputs {
	display:flex; align-items:center; gap:.5rem; flex-wrap:wrap;
}
.rule-inputs select {
	width:auto; height:32px; font-size:.8125rem; flex-shrink:0;
}
.quote-inp {
	width:52px !important; height:32px !important;
	text-align:center; font-size:1.0625rem !important;
	padding:0 8px; letter-spacing:.01em;
}
.rule-sep {
	font-size:.8rem; color:var(--color-muted);
}
.rule-preview {
	padding:4px 10px;
	background:var(--color-surface); border:1px solid var(--color-border);
	border-radius:6px; font-size:.9rem; font-family:Georgia, serif;
	color:var(--color-text); white-space:nowrap; flex-shrink:0;
}

/* ── Units grid ──────────────────────────────────────────────────────────── */
.units-grid { display:grid; grid-template-columns:repeat(3, 1fr); gap:1rem; }

/* ── License ─────────────────────────────────────────────────────────────── */
.lic-cards { display:flex; flex-direction:column; gap:10px; }
.lic-card {
	display:flex; gap:12px; padding:14px 16px;
	background:var(--color-surface-raised); border:1px solid var(--color-border); border-radius:10px;
}
.lic-icon { display:flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:8px; background:var(--color-surface); color:var(--color-muted); flex-shrink:0; }
.lic-card strong { font-size:0.875rem; font-weight:600; display:block; margin-bottom:4px; }
.lic-card p      { font-size:0.8125rem; color:var(--color-muted); margin:0; line-height:1.5; }
.lic-links { display:flex; gap:12px; margin-top:8px; }
.lic-links a { font-size:0.8125rem; color:var(--brand); text-decoration:underline; text-underline-offset:2px; }

.dizen-credit { display:flex; align-items:center; gap:7px; margin-top:14px; padding-top:14px; border-top:1px solid var(--color-border); font-size:0.75rem; color:var(--color-muted); }
.dizen-link { display:inline-flex; align-items:center; color:var(--color-muted); text-decoration:none; opacity:.6; transition:opacity .15s, color .15s; }
.dizen-link:hover { opacity:1; color:var(--color-text); }
.dizen-logo { height:32px; width:auto; display:block; }

/* ── Error toast ─────────────────────────────────────────────────────────── */
.error-toast {
	position:fixed; bottom:1.5rem; left:50%; transform:translateX(-50%);
	background:#fff5f5; color:var(--color-danger); border:1px solid #fecaca;
	padding:10px 16px; border-radius:8px; font-size:0.875rem; z-index:200;
	box-shadow:var(--shadow-lg);
}

/* ── Responsive ──────────────────────────────────────────────────────────── */
@media (max-width: 900px) {
	.units-grid { grid-template-columns:1fr; }
}
@media (max-width: 768px) {
	.topbar, .sections { padding-left:1rem; padding-right:1rem; }
	.anchor-nav { padding:0 1rem; }
	.unsaved-bar { left:0; padding:10px 1rem; }
	.section { grid-template-columns:1fr; gap:1rem; padding:1.75rem 0; }
	.rule-row { grid-template-columns:1fr; }
	.rule-inputs select { flex:1; }
}
</style>
