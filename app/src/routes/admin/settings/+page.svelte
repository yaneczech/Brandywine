<script lang="ts">
	import type { PageData } from './$types';
	import { languageTag, setLanguageTag } from '$lib/paraglide/runtime';
	import { invalidate } from '$app/navigation';
	import * as m from '$lib/paraglide/messages';
	import {
		IconCheck, IconAlertTriangle,
		IconScale, IconLock, IconPlus, IconTrash
	} from '@tabler/icons-svelte';
	import type { LocaleLangRules, LocaleRules, UnitDigital, UnitPrint, UnitType } from '$lib/db/schema/brand';

	const { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
	let s = $state({ ...data.settings });
	let saving = $state(false);
	let saved = $state(false);
	let error = $state('');

	// Track unsaved changes
	// svelte-ignore state_referenced_locally
	let original = JSON.stringify(data.settings);
	let isDirty = $derived(JSON.stringify(s) !== original);

	// ── Locale rules helpers ──────────────────────────────────────────────────────
	const LANG_DEFAULTS: Record<string, Omit<LocaleLangRules, 'customRules'>> = {
		cs: { quoteOpen: '„', quoteClose: '“', dashStyle: 'en', decimalSep: ',', thousandsSep: ' ', dateFormat: 'D. M. YYYY',  timeFormat: '24h', listSep: ';', ordinalStyle: 'dot'    },
		en: { quoteOpen: '“', quoteClose: '”', dashStyle: 'en', decimalSep: '.', thousandsSep: ',',   dateFormat: 'MM/DD/YYYY',   timeFormat: '12h', listSep: ',', ordinalStyle: 'suffix' },
		de: { quoteOpen: '„', quoteClose: '“', dashStyle: 'en', decimalSep: ',', thousandsSep: '.',   dateFormat: 'DD.MM.YYYY',   timeFormat: '24h', listSep: ';', ordinalStyle: 'dot'    },
		fr: { quoteOpen: '« ', quoteClose: ' »', dashStyle: 'em', decimalSep: ',', thousandsSep: ' ', dateFormat: 'DD/MM/YYYY', timeFormat: '24h', listSep: ';', ordinalStyle: 'dot' },
		pl: { quoteOpen: '„', quoteClose: '”', dashStyle: 'en', decimalSep: ',', thousandsSep: ' ', dateFormat: 'DD.MM.YYYY',  timeFormat: '24h', listSep: ';', ordinalStyle: 'dot'    },
		sk: { quoteOpen: '„', quoteClose: '“', dashStyle: 'en', decimalSep: ',', thousandsSep: ' ', dateFormat: 'D. M. YYYY',  timeFormat: '24h', listSep: ';', ordinalStyle: 'dot'    },
	};

	const LANG_LABELS: Record<string, string> = {
		cs: 'Čeština', en: 'English', de: 'Deutsch', fr: 'Français', pl: 'Polski', sk: 'Slovenčina'
	};

	const activeLangs = $derived<string[]>(Array.isArray(s.activeLanguages) ? s.activeLanguages : ['en', 'cs']);

	function getLangRules(lang: string): LocaleLangRules {
		const stored = (s.localeRules as LocaleRules)?.[lang];
		const def = LANG_DEFAULTS[lang] ?? { quoteOpen: '"', quoteClose: '"', dashStyle: 'en', decimalSep: '.', thousandsSep: ',', dateFormat: 'MM/DD/YYYY', timeFormat: '24h', listSep: ',', ordinalStyle: 'suffix' };
		return stored ?? { ...def, customRules: [] };
	}

	function setLangRules(lang: string, rules: LocaleLangRules) {
		const next: LocaleRules = { ...((s.localeRules as LocaleRules) ?? {}) };
		next[lang] = rules;
		s = { ...s, localeRules: next };
	}

	function addCustomRule(lang: string) {
		const rules = getLangRules(lang);
		setLangRules(lang, { ...rules, customRules: [...rules.customRules, { rule: '', correct: '', wrong: '' }] });
	}

	function updateCustomRule(lang: string, idx: number, patch: Partial<{ rule: string; correct: string; wrong: string }>) {
		const rules = getLangRules(lang);
		const updated = rules.customRules.map((r, i) => i === idx ? { ...r, ...patch } : r);
		setLangRules(lang, { ...rules, customRules: updated });
	}

	function removeCustomRule(lang: string, idx: number) {
		const rules = getLangRules(lang);
		setLangRules(lang, { ...rules, customRules: rules.customRules.filter((_, i) => i !== idx) });
	}

	let localeLangTab = $state('cs');

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
		<a href="#display" class="anav-item">{m.settings_display()}</a>
		<a href="#locale" class="anav-item">Lokalizace & jednotky</a>
		<a href="#license" class="anav-item">{m.settings_license()}</a>
	</nav>

	<div class="sections">

		<!-- Display preferences -->
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

		<!-- Locale & units -->
		<section id="locale" class="section">
			<div class="section-meta">
				<h2>Lokalizace & jednotky</h2>
				<p>Výchozí měrná jednotka pro typografii a layout. Typografická pravidla se používají v bloku Typografická pravidla a při exportu design tokenů.</p>
			</div>
			<div class="section-fields">

				<!-- Units -->
				<div class="units-grid">
					<div class="field">
						<label for="unitType">Typografie</label>
						<p class="field-hint">Velikost písma, řádkování, tracking.</p>
						<select id="unitType" value={s.unitType ?? 'px'} onchange={e => (s = { ...s, unitType: (e.currentTarget as HTMLSelectElement).value as UnitType })}>
							<option value="px">px — pixely</option>
							<option value="pt">pt — body</option>
							<option value="rem">rem — relativní k root</option>
							<option value="em">em — relativní k fontu</option>
						</select>
					</div>
					<div class="field">
						<label for="unitDigital">Digitál / obrazovka</label>
						<p class="field-hint">Spacing, layout, komponenty.</p>
						<select id="unitDigital" value={s.unitDigital ?? 'px'} onchange={e => (s = { ...s, unitDigital: (e.currentTarget as HTMLSelectElement).value as UnitDigital })}>
							<option value="px">px — pixely</option>
							<option value="rem">rem — relativní k root</option>
							<option value="em">em — relativní k fontu</option>
							<option value="vw">vw — % šířky viewportu</option>
						</select>
					</div>
					<div class="field">
						<label for="unitPrint">Tisk / fyzické výstupy</label>
						<p class="field-hint">Formáty, okraje, velikosti v tisku.</p>
						<select id="unitPrint" value={s.unitPrint ?? 'mm'} onchange={e => (s = { ...s, unitPrint: (e.currentTarget as HTMLSelectElement).value as UnitPrint })}>
							<option value="mm">mm — milimetry</option>
							<option value="cm">cm — centimetry</option>
							<option value="pt">pt — body (1/72 palce)</option>
							<option value="in">in — palce (1in = 25,4mm)</option>
							<option value="pc">pc — pica (1pc = 12pt)</option>
						</select>
					</div>
				</div>

				<!-- Typographic rules per language -->
				<div class="locale-rules-wrap">
					<span class="field-label">Typografická pravidla per jazyk</span>
					<p class="field-hint" style="margin-bottom:.75rem">Uvozovky, pomlčky, formát čísel. Slouží jako výchozí hodnoty pro blok Typografická pravidla a pro export.</p>

					<!-- Language tabs -->
					<div class="lang-tabs">
						{#each activeLangs as lang}
							<button
								type="button"
								class="lang-tab"
								class:active={localeLangTab === lang}
								onclick={() => (localeLangTab = lang)}
							>{LANG_LABELS[lang] ?? lang.toUpperCase()}</button>
						{/each}
					</div>

					{#each activeLangs as lang}
						{#if localeLangTab === lang}
							{@const lr = getLangRules(lang)}
							<div class="locale-panel">
								<!-- Quotes -->
								<div class="locale-row">
									<span class="locale-group-label">Uvozovky</span>
									<div class="locale-fields">
										<div class="field">
											<label>Otevírací</label>
											<input type="text" maxlength="4" value={lr.quoteOpen}
												oninput={e => setLangRules(lang, { ...lr, quoteOpen: (e.target as HTMLInputElement).value })}
												class="narrow-input" />
										</div>
										<div class="field">
											<label>Zavírací</label>
											<input type="text" maxlength="4" value={lr.quoteClose}
												oninput={e => setLangRules(lang, { ...lr, quoteClose: (e.target as HTMLInputElement).value })}
												class="narrow-input" />
										</div>
										<div class="locale-preview">
											{lr.quoteOpen}Ukázka textu{lr.quoteClose}
										</div>
									</div>
								</div>

								<!-- Dash -->
								<div class="locale-row">
									<span class="locale-group-label">Pomlčka</span>
									<div class="locale-fields">
										<div class="field">
											<label>Styl</label>
											<select value={lr.dashStyle} onchange={e => setLangRules(lang, { ...lr, dashStyle: (e.target as HTMLSelectElement).value as 'en' | 'em' })}>
												<option value="en">En-dash – (U+2013)</option>
												<option value="em">Em-dash — (U+2014)</option>
											</select>
										</div>
										<div class="locale-preview">
											1990{lr.dashStyle === 'em' ? '—' : '–'}2025
										</div>
									</div>
								</div>

								<!-- Numbers -->
								<div class="locale-row">
									<span class="locale-group-label">Formát čísel</span>
									<div class="locale-fields">
										<div class="field">
											<label>Desetinný oddělovač</label>
											<select value={lr.decimalSep} onchange={e => setLangRules(lang, { ...lr, decimalSep: (e.target as HTMLSelectElement).value as ',' | '.' })}>
												<option value=",">Čárka ,</option>
												<option value=".">Tečka .</option>
											</select>
										</div>
										<div class="field">
											<label>Oddělovač tisíců</label>
											<select value={lr.thousandsSep} onchange={e => setLangRules(lang, { ...lr, thousandsSep: (e.target as HTMLSelectElement).value })}>
												<option value=" ">Mezera (1 000)</option>
												<option value=",">Čárka (1,000)</option>
												<option value=".">Tečka (1.000)</option>
												<option value="">Žádný</option>
											</select>
										</div>
										<div class="locale-preview">
											1{lr.thousandsSep}000{lr.decimalSep}50
										</div>
									</div>
								</div>

								<!-- Date & time -->
								<div class="locale-row">
									<span class="locale-group-label">Datum & čas</span>
									<div class="locale-fields">
										<div class="field">
											<label>Formát data</label>
											<select value={lr.dateFormat} onchange={e => setLangRules(lang, { ...lr, dateFormat: (e.target as HTMLSelectElement).value })}>
												<option value="D. M. YYYY">D. M. YYYY &nbsp;— cs/sk (1. 6. 2025)</option>
												<option value="DD.MM.YYYY">DD.MM.YYYY — de/pl (01.06.2025)</option>
												<option value="DD/MM/YYYY">DD/MM/YYYY — fr/uk (01/06/2025)</option>
												<option value="MM/DD/YYYY">MM/DD/YYYY — us/en (06/01/2025)</option>
												<option value="YYYY-MM-DD">YYYY-MM-DD — ISO 8601</option>
												<option value="D MMMM YYYY">D MMMM YYYY — long (1 June 2025)</option>
											</select>
										</div>
										<div class="field">
											<label>Formát času</label>
											<select value={lr.timeFormat} onchange={e => setLangRules(lang, { ...lr, timeFormat: (e.target as HTMLSelectElement).value as '24h'|'12h' })}>
												<option value="24h">24h — 14:30</option>
												<option value="12h">12h — 2:30 PM</option>
											</select>
										</div>
										<div class="locale-preview">
											{lr.dateFormat.replace('YYYY','2025').replace('MM','06').replace('DD','01').replace('D.','1.').replace('M.','6.').replace('D ','1 ').replace('MMMM','June')}
										</div>
									</div>
								</div>

								<!-- List separator & ordinals -->
								<div class="locale-row">
									<span class="locale-group-label">Seznamy & ordinály</span>
									<div class="locale-fields">
										<div class="field">
											<label>Oddělovač v seznamech</label>
											<select value={lr.listSep} onchange={e => setLangRules(lang, { ...lr, listSep: (e.target as HTMLSelectElement).value as ','|';'|' |' })}>
												<option value=",">Čárka , &nbsp;(en, fr)</option>
												<option value=";">Středník ; (cs, de — kvůli desetinné čárce)</option>
												<option value=" |">Svislítko |</option>
											</select>
										</div>
										<div class="field">
											<label>Řadové číslovky</label>
											<select value={lr.ordinalStyle} onchange={e => setLangRules(lang, { ...lr, ordinalStyle: (e.target as HTMLSelectElement).value as 'dot'|'suffix' })}>
												<option value="dot">Tečka — 1. 2. 3. (cs, de, sk)</option>
												<option value="suffix">Suffix — 1st 2nd 3rd (en)</option>
											</select>
										</div>
										<div class="locale-preview">
											{lr.ordinalStyle === 'dot' ? '1. 2. 3.' : '1st 2nd 3rd'}
											&nbsp;·&nbsp;
											A{lr.listSep} B{lr.listSep} C
										</div>
									</div>
								</div>

								<!-- Custom rules -->
								<div class="locale-row locale-row-col">
									<span class="locale-group-label">Vlastní pravidla</span>
									{#if lr.customRules.length}
										<div class="custom-rules-list">
											{#each lr.customRules as rule, i}
												<div class="custom-rule-row">
													<input type="text" value={rule.rule} placeholder="Popis pravidla…"
														oninput={e => updateCustomRule(lang, i, { rule: (e.target as HTMLInputElement).value })}
														class="rule-input" />
													<input type="text" value={rule.correct ?? ''} placeholder="✓ Správně"
														oninput={e => updateCustomRule(lang, i, { correct: (e.target as HTMLInputElement).value })}
														class="example-input" />
													<input type="text" value={rule.wrong ?? ''} placeholder="✗ Špatně"
														oninput={e => updateCustomRule(lang, i, { wrong: (e.target as HTMLInputElement).value })}
														class="example-input" />
													<button type="button" class="btn-remove-rule" onclick={() => removeCustomRule(lang, i)} title="Smazat pravidlo">
														<IconTrash size={13} />
													</button>
												</div>
											{/each}
										</div>
									{/if}
									<button type="button" class="btn-add-rule" onclick={() => addCustomRule(lang)}>
										<IconPlus size={13} /> Přidat pravidlo
									</button>
								</div>
							</div>
						{/if}
					{/each}
				</div>

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
								<a href="https://github.com/yaneczech/Brandywine/blob/main/LICENSE" target="_blank">LICENSE ↗</a>
								<a href="https://github.com/yaneczech/Brandywine/blob/main/NOTICE" target="_blank">NOTICE ↗</a>
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
				<div class="dizen-credit">
					<span>Designed &amp; produced by</span>
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

	<!-- Sticky unsaved changes bar -->
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

.topbar {
	display:flex; align-items:flex-start; justify-content:space-between;
	padding:2rem 2rem 0; margin-bottom:1.5rem; gap:1rem; flex-wrap:wrap;
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

/* ── Sections ────────────────────────────────────────────────────────────── */
.sections { padding:0 2rem 3rem; }

.section {
	display:grid; grid-template-columns:260px 1fr; gap:3rem;
	padding:2.5rem 0; border-bottom:1px solid var(--color-border);
}
.section:last-child { border-bottom:none; }
.section-meta h2 { font-size:0.9375rem; font-weight:600; margin-bottom:8px; }
.section-meta p { font-size:0.8125rem; color:var(--color-muted); line-height:1.6; }

.section-fields { display:flex; flex-direction:column; gap:1.25rem; }

.field { display:flex; flex-direction:column; gap:5px; }
.field label { font-size:0.8125rem; font-weight:500; }
.field-hint { font-size:0.8rem; color:var(--color-muted); line-height:1.5; }
.field-hint a { color:var(--brand); }

input[type="text"], select {
	height:38px; padding:0 12px;
	border:1.5px solid var(--color-border); border-radius:8px;
	font-size:0.875rem; background:var(--color-surface); color:var(--color-text);
	width:100%; outline:none;
	transition:border-color 0.15s, box-shadow 0.15s;
}
input:focus, select:focus { border-color:var(--brand); box-shadow:0 0 0 3px rgba(74,18,4,.10); }
.brand-link-hint { margin-top:6px; }
.brand-link-hint a { color:var(--brand); font-weight:500; }

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
.dizen-credit { display:flex; align-items:center; gap:7px; margin-top:14px; padding-top:14px; border-top:1px solid var(--color-border); font-size:0.75rem; color:var(--color-muted); }
.dizen-link { display:inline-flex; align-items:center; color:var(--color-muted); text-decoration:none; opacity:.6; transition:opacity .15s, color .15s; }
.dizen-link:hover { opacity:1; color:var(--color-text); }
.dizen-logo { height:22px; width:auto; display:block; }

/* ── Units grid ──────────────────────────────────────────────────────────── */
.units-grid {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 1rem;
}
@media (max-width: 768px) { .units-grid { grid-template-columns: 1fr; } }

/* ── Locale rules ────────────────────────────────────────────────────────── */
.field-label { font-size:0.8125rem; font-weight:500; }
.locale-rules-wrap { display:flex; flex-direction:column; }

.lang-tabs { display:flex; gap:2px; margin-bottom:.75rem; border-bottom:1px solid var(--color-border); }
.lang-tab {
	padding:6px 14px; font-size:0.8125rem; font-weight:500; border:none;
	background:transparent; color:var(--color-muted); cursor:pointer;
	border-bottom:2px solid transparent; margin-bottom:-1px;
	border-radius:0; transition:color .15s, border-color .15s;
}
.lang-tab:hover { color:var(--color-text); }
.lang-tab.active { color:var(--brand); border-bottom-color:var(--brand); }

.locale-panel { display:flex; flex-direction:column; gap:.8rem; }
.locale-row { display:grid; grid-template-columns:120px 1fr; gap:.6rem 1rem; align-items:start; }
.locale-row-col { grid-template-columns:1fr; }
.locale-group-label { font-size:.75rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--color-muted); padding-top:.55rem; }
.locale-fields { display:flex; gap:.65rem; align-items:center; flex-wrap:wrap; }
.locale-fields .field { min-width:140px; flex:1; }
.locale-fields select { width:100%; }

.narrow-input { width:72px !important; text-align:center; letter-spacing:.04em; }

.locale-preview {
	padding:6px 12px; border-radius:6px;
	background:var(--color-surface-raised); border:1px solid var(--color-border);
	font-size:.875rem; color:var(--color-muted); white-space:nowrap; flex-shrink:0;
	align-self:flex-end; margin-bottom:0;
}

.custom-rules-list { display:flex; flex-direction:column; gap:.45rem; margin-bottom:.45rem; }
.custom-rule-row { display:grid; grid-template-columns:1fr .9fr .9fr 28px; gap:.45rem; align-items:center; }
.custom-rule-row input { width:100%; }
.rule-input { font-size:.8rem !important; }
.example-input { font-size:.8rem !important; font-family:monospace; }
.btn-remove-rule {
	width:28px; height:28px; border:none; border-radius:6px; background:transparent;
	color:var(--color-muted); cursor:pointer; display:flex; align-items:center; justify-content:center;
	transition:background .15s, color .15s;
}
.btn-remove-rule:hover { background:color-mix(in srgb, #ef4444 12%, transparent); color:#dc2626; }
.btn-add-rule {
	display:inline-flex; align-items:center; gap:5px; padding:5px 10px;
	border:1.5px dashed var(--color-border); border-radius:7px;
	background:transparent; color:var(--color-muted); font-size:.8125rem; cursor:pointer;
	transition:border-color .15s, color .15s;
	align-self:flex-start;
}
.btn-add-rule:hover { border-color:var(--brand); color:var(--brand); }

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
}
</style>
