<script lang="ts">
	import { toast } from '$lib/ui/toast.svelte';
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';
	import * as m from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import {
		IconAlertTriangle,
		IconAt,
		IconBook2,
		IconCheck,
		IconExternalLink,
		IconFolder,
		IconGlobe,
		IconLock,
		IconPalette,
		IconPhoto,
		IconRefresh,
		IconRosette,
		IconSearch,
		IconSparkles,
		IconSun,
		IconMoon,
		IconDeviceDesktop,
		IconArrowsExchange,
		IconX,
		IconTypography
	} from '@tabler/icons-svelte';
	import ManualThemeColorField from '$lib/components/admin/ManualThemeColorField.svelte';
	import AssetThumb from '$lib/components/admin/AssetThumb.svelte';
	import AssetPickerModal from '$lib/components/admin/AssetPickerModal.svelte';
	import { generateShades, contrastRatio } from '$lib/utils/colors';

	const { data }: { data: PageData } = $props();

	type AccessMode = 'public' | 'password' | 'email_whitelist' | 'token';
	type ManualThemeMode = 'light' | 'dark' | 'system' | 'toggle';
	type BrandColor  = { id: string; name: string; hex: string; paletteId: string | null };
	type BrandPalette = { id: string; name: string };
	const brandColors   = $derived((data.brandColors   ?? []) as BrandColor[]);
	const brandPalettes = $derived((data.brandPalettes ?? []) as BrandPalette[]);

	type Settings = typeof data.settings & {
		activeLanguages?: string[] | null;
		emailWhitelist?: string[] | null;
		accessMode: AccessMode;
		accessPasswordConfigured?: boolean;
		manualThemeMode?: ManualThemeMode | null;
		manualBackgroundColor?: string | null;
		manualBackgroundColorDark?: string | null;
		manualSurfaceColor?: string | null;
		manualSurfaceColorDark?: string | null;
		manualTextColor?: string | null;
		manualTextColorDark?: string | null;
		manualMutedColor?: string | null;
		manualMutedColorDark?: string | null;
		manualAccentColor?: string | null;
		manualAccentColorDark?: string | null;
		manualBorderRadius?: number | null;
		logoDarkPath?: string | null;
	};

	// svelte-ignore state_referenced_locally
	let s = $state<Settings>({ ...data.settings } as Settings);
	let saving = $state(false);
	let accessPassword = $state('');
	// svelte-ignore state_referenced_locally
	let whitelistText = $state((s.emailWhitelist ?? []).join('\n'));
	type BrandAsset = {
		id: string;
		filename: string;
		mime: string;
		storagePath: string | null;
		thumbnailPath: string | null;
	};
	let assetPickerTarget = $state<'logo' | 'logoDark' | 'favicon' | null>(null);

	// svelte-ignore state_referenced_locally
	let originalString = $state(JSON.stringify($state.snapshot(s)));
	// svelte-ignore state_referenced_locally
	let originalWhitelist = $state((s.emailWhitelist ?? []).join('\n'));
	const isDirty = $derived(JSON.stringify(s) !== originalString || accessPassword.trim() !== '' || whitelistText !== originalWhitelist);
	const uiLanguage = $derived(getLocale());
	const manualLanguage = $derived((s.defaultLanguage === 'cs' ? 'cs' : 'en') as 'cs' | 'en');
	const themeDefaults = {
		light: { bg: '#FBFAF8', surface: '#FFFFFF', text: '#171717', muted: '#737373' },
		dark: { bg: '#101010', surface: '#171717', text: '#F4F4F4', muted: '#A3A3A3' }
	};
	let previewFrame = $state<HTMLIFrameElement | null>(null);

	const manualTheme = $derived.by(() => {
		const mode = (s.manualThemeMode ?? 'light') as ManualThemeMode;
		const accentLight = s.manualAccentColor || s.primaryColor || '#4A1204';
		const accentDark = s.manualAccentColorDark || accentLight;
		const light = {
			bg:      s.manualBackgroundColor     || themeDefaults.light.bg,
			surface: s.manualSurfaceColor        || themeDefaults.light.surface,
			text:    s.manualTextColor           || themeDefaults.light.text,
			muted:   s.manualMutedColor          || themeDefaults.light.muted,
		};
		const dark = {
			bg:      s.manualBackgroundColorDark || themeDefaults.dark.bg,
			surface: s.manualSurfaceColorDark    || themeDefaults.dark.surface,
			text:    s.manualTextColorDark       || themeDefaults.dark.text,
			muted:   s.manualMutedColorDark      || themeDefaults.dark.muted,
		};
		return { mode, accentLight, accentDark, light, dark, radius: radiusValue(s.manualBorderRadius) };
	});
	const primaryColorInputValue = $derived(
		/^#[0-9a-fA-F]{6}$/.test(String(s.primaryColor ?? '')) ? String(s.primaryColor) : '#4A1204'
	);
	const readinessItems = $derived([
		{
			label: m.brand_identity_item(),
			detail: s.name && s.primaryColor ? `${s.name} · ${s.primaryColor}` : m.brand_identity_item(),
			done: Boolean(s.name && s.primaryColor),
			icon: IconRosette
		},
		{
			label: m.brand_logo_item(),
			detail: s.logoPath ?? '—',
			done: Boolean(s.logoPath),
			icon: IconPhoto
		},
		{
			label: m.brand_colors_item(),
			detail: countLabel(data.health.colorCount, uiLanguage === 'cs' ? 'barva' : 'color', uiLanguage === 'cs' ? 'barvy' : 'colors'),
			done: data.health.colorCount > 0,
			icon: IconPalette
		},
		{
			label: m.brand_typography_item(),
			detail: `${countLabel(data.health.fontCount, uiLanguage === 'cs' ? 'font' : 'font', uiLanguage === 'cs' ? 'fonty' : 'fonts')} · ${countLabel(data.health.styleCount, uiLanguage === 'cs' ? 'styl' : 'style', uiLanguage === 'cs' ? 'styly' : 'styles')}`,
			done: data.health.fontCount > 0 && data.health.styleCount > 0,
			icon: IconTypography
		},
		{
			label: m.brand_assets_item(),
			detail: countLabel(data.health.assetCount, uiLanguage === 'cs' ? 'asset' : 'asset', uiLanguage === 'cs' ? 'assety' : 'assets'),
			done: data.health.assetCount > 0,
			icon: IconFolder
		},
		{
			label: m.brand_pages_item(),
			detail: `${data.health.publishedPageCount}/${data.health.manualPageCount}`,
			done: data.health.publishedPageCount > 0,
			icon: IconBook2
		}
	]);
	const readinessScore = $derived(Math.round((readinessItems.filter(item => item.done).length / readinessItems.length) * 100));

	function parseWhitelist() {
		return whitelistText
			.split(/\r?\n/)
			.map(line => line.trim())
			.filter(Boolean);
	}

	function countLabel(count: number, one: string, many: string) {
		return `${count} ${count === 1 ? one : many}`;
	}

	function assetSrc(path: string | null | undefined): string {
		if (!path) return '';
		if (/^(https?:)?\/\//.test(path) || path.startsWith('/')) return path;
		return `/uploads/${path.replace(/^\/+/, '')}`;
	}

	function pickerTitle() {
		if (assetPickerTarget === 'favicon') return uiLanguage === 'cs' ? 'Vybrat favicon' : 'Choose favicon';
		if (assetPickerTarget === 'logoDark') return uiLanguage === 'cs' ? 'Vybrat logo (tmavý režim)' : 'Choose logo (dark mode)';
		return uiLanguage === 'cs' ? 'Vybrat logo' : 'Choose logo';
	}

	function pickerHint() {
		if (uiLanguage === 'cs') {
			return assetPickerTarget === 'favicon'
				? 'Nejlépe SVG nebo PNG ve čtvercovém formátu.'
				: 'Použijte schválený obrázek z knihovny assetů.';
		}
		return assetPickerTarget === 'favicon'
			? 'SVG or a square PNG works best.'
			: 'Use an approved image from the asset library.';
	}

	function openAssetPicker(target: 'logo' | 'logoDark' | 'favicon') {
		assetPickerTarget = target;
	}

	function selectAssetUrl(url: string) {
		if (assetPickerTarget === 'logo') s.logoPath = url;
		if (assetPickerTarget === 'logoDark') s.logoDarkPath = url;
		if (assetPickerTarget === 'favicon') s.faviconPath = url;
		assetPickerTarget = null;
	}

	function manualPreviewText(key: 'title' | 'sub' | 'overview' | 'colors' | 'typography' | 'assets' | 'content') {
		const cs = {
			title: 'Brand manuál',
			sub: 'Barvy, typografie, loga a schválené assety.',
			overview: 'Přehled',
			colors: 'Barvy',
			typography: 'Typografie',
			assets: 'Assety',
			content: 'obsah'
		};
		const en = {
			title: 'Brand Manual',
			sub: 'Colors, typography, logos and approved assets.',
			overview: 'Overview',
			colors: 'Colors',
			typography: 'Typography',
			assets: 'Assets',
			content: 'content'
		};
		return (manualLanguage === 'cs' ? cs : en)[key];
	}

	function themeModeLabel(mode: ManualThemeMode) {
		if (uiLanguage === 'cs') {
			if (mode === 'light') return 'Světlý';
			if (mode === 'dark') return 'Tmavý';
			if (mode === 'toggle') return 'Přepínač';
			return 'Podle systému';
		}
		if (mode === 'light') return 'Light';
		if (mode === 'dark') return 'Dark';
		if (mode === 'toggle') return 'Toggle';
		return 'System';
	}

	function themeModeDescription(mode: ManualThemeMode) {
		if (uiLanguage === 'cs') {
			if (mode === 'light') return 'Veřejný manuál drží světlou sadu barev.';
			if (mode === 'dark') return 'Veřejný manuál drží tmavou sadu barev.';
			if (mode === 'toggle') return 'Návštěvník si může přepnout světlý i tmavý režim.';
			return 'Manuál použije preferenci zařízení návštěvníka.';
		}
		if (mode === 'light') return 'The public manual always uses the light palette.';
		if (mode === 'dark') return 'The public manual always uses the dark palette.';
		if (mode === 'toggle') return 'Visitors can switch between light and dark.';
		return 'The manual follows the visitor device preference.';
	}

	function autoGenerateTheme() {
		if (!brandColors.length) return;

		function lum(hex: string) {
			const r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255;
			const toLinear = (x: number) => x <= 0.03928 ? x/12.92 : ((x+0.055)/1.055)**2.4;
			return 0.2126*toLinear(r) + 0.7152*toLinear(g) + 0.0722*toLinear(b);
		}

		function unique(values: string[]) {
			return [...new Set(values.map((hex) => hex.toLowerCase()))].map((hex) => hex.toUpperCase());
		}

		function sample<T>(values: T[], fallback: T): T {
			if (!values.length) return fallback;
			return values[Math.floor(Math.random() * values.length)] ?? fallback;
		}

		function candidates(min: number, max: number, fallback: string) {
			const matches = allHexes.filter((hex) => {
				const value = lum(hex);
				return value >= min && value <= max;
			});
			return matches.length ? matches : [fallback];
		}

		function readable(candidates: string[], backgrounds: string[], minRatio: number, fallback: string) {
			return candidates.filter((hex) => backgrounds.every((bg) => contrastRatio(hex, bg) >= minRatio)).length
				? candidates.filter((hex) => backgrounds.every((bg) => contrastRatio(hex, bg) >= minRatio))
				: [fallback];
		}

		function awayFrom(hexes: string[], compare: string, minLumDelta: number) {
			const filtered = hexes.filter((hex) => Math.abs(lum(hex) - lum(compare)) >= minLumDelta);
			return filtered.length ? filtered : hexes;
		}

		const allHexes = unique(brandColors.flatMap((color) => [
			color.hex,
			...generateShades(color.hex).map((shade) => shade.hex)
		]));
		const lightest = [...allHexes].sort((a,b) => lum(b) - lum(a))[0] ?? '#FBFAF8';
		const darkest = [...allHexes].sort((a,b) => lum(a) - lum(b))[0] ?? '#101010';

		const lightBg = sample(candidates(0.82, 1, lightest), '#FBFAF8');
		const lightSurface = sample(awayFrom(candidates(Math.min(0.86, lum(lightBg)), 1, '#FFFFFF'), lightBg, 0.015), '#FFFFFF');
		const lightText = sample(readable(candidates(0, 0.22, '#171717'), [lightBg, lightSurface], 4.5, '#171717'), '#171717');
		const lightMuted = sample(readable(candidates(0.18, 0.42, '#737373'), [lightBg, lightSurface], 3, '#737373'), '#737373');

		const darkBg = sample(candidates(0, 0.08, darkest), '#101010');
		const darkSurface = sample(awayFrom(candidates(0.02, 0.16, '#171717'), darkBg, 0.012), '#171717');
		const darkText = sample(readable(candidates(0.72, 1, '#F4F4F4'), [darkBg, darkSurface], 4.5, '#F4F4F4'), '#F4F4F4');
		const darkMuted = sample(readable(candidates(0.42, 0.82, '#A3A3A3'), [darkBg, darkSurface], 3, '#A3A3A3'), '#A3A3A3');

		const accentSeeds = unique(brandColors.map((color) => color.hex));
		const allAccentShades = unique(accentSeeds.flatMap((hex) => [hex, ...generateShades(hex).map((shade) => shade.hex)]));

		// Light accent: readable on light backgrounds (contrast ≥ 3)
		const accentLightOptions = readable(allAccentShades, [lightBg, lightSurface], 3, s.primaryColor ?? '#4A1204');
		const accentLight = sample(accentLightOptions, s.primaryColor ?? '#4A1204');

		// Dark accent: use ALL brand shades, filter for contrast ≥ 3 on dark backgrounds
		// Prefer brighter shades (lum > 0.18) — more visible on dark backgrounds
		const accentDarkReadable = readable(allAccentShades, [darkBg, darkSurface], 3, accentLight);
		const accentDarkBright = accentDarkReadable.filter(h => lum(h) > 0.18);
		const accentDark = sample(accentDarkBright.length ? accentDarkBright : accentDarkReadable, accentLight);

		s = {
			...s,
			manualBackgroundColor: lightBg,
			manualSurfaceColor: lightSurface,
			manualTextColor: lightText,
			manualMutedColor: lightMuted,
			manualBackgroundColorDark: darkBg,
			manualSurfaceColorDark: darkSurface,
			manualTextColorDark: darkText,
			manualMutedColorDark: darkMuted,
			manualAccentColor: accentLight,
			manualAccentColorDark: accentDark
		}
	}

	function resetThemeColors() {
		s = {
			...s,
			manualBackgroundColor:     null,
			manualSurfaceColor:        null,
			manualTextColor:           null,
			manualMutedColor:          null,
			manualBackgroundColorDark: null,
			manualSurfaceColorDark:    null,
			manualTextColorDark:       null,
			manualMutedColorDark:      null,
			manualAccentColor:         null,
			manualAccentColorDark:     null,
		};
	}

	function radiusValue(value: number | null | undefined) {
		const radius = Number(value ?? 8);
		if (!Number.isFinite(radius)) return 8;
		return Math.min(32, Math.max(0, Math.round(radius)));
	}

	function modeLabel(mode: AccessMode) {
		if (uiLanguage === 'cs') {
			if (mode === 'public') return 'Veřejný';
			if (mode === 'password') return 'Heslo';
			if (mode === 'email_whitelist') return 'Seznam e-mailů';
			return 'Tajný odkaz';
		}
		if (mode === 'public') return 'Public';
		if (mode === 'password') return 'Password';
		if (mode === 'email_whitelist') return 'Email list';
		return 'Secret link';
	}

	function modeDescription(mode: AccessMode) {
		if (uiLanguage === 'cs') {
			if (mode === 'public') return 'Kdokoliv s odkazem může manuál zobrazit.';
			if (mode === 'password') return 'Návštěvník musí zadat sdílené heslo.';
			if (mode === 'email_whitelist') return 'Manuál uvidí jen přihlášení uživatelé ze schválených e-mailů.';
			return 'Tento režim zatím není ve veřejném manuálu napojený.';
		}
		if (mode === 'public') return 'Anyone with the link can view the manual.';
		if (mode === 'password') return 'Visitors must pass a shared password gate.';
		if (mode === 'email_whitelist') return 'Only signed-in approved emails can view the manual.';
			return 'This mode is not wired in the public manual yet.';
	}

	async function save() {
		saving = true;
		try {
			const payload: Record<string, unknown> = {
				...s,
				activeLanguages: [s.defaultLanguage ?? 'en'],
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
			toast.success(m.brand_saved());
			// Refresh iframe so the preview reflects the saved state
			previewFrame?.contentWindow?.location.reload();
			// Re-run the admin layout load so the shell picks up the new accent
			void invalidateAll();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : m.common_error());
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>{m.brand_title()} · {s.systemName ?? 'Brandywine'}</title>
</svelte:head>

<div class="page ap">
	<div class="ap-topbar">
		<div>
			<h1 class="ap-title">{m.brand_title()}</h1>
			<p class="ap-sub">{m.brand_sub()}</p>
		</div>
		<div class="ap-actions">
			<button class="btn btn-primary" onclick={save} disabled={saving || !isDirty}>
				{saving ? m.brand_saving() : m.brand_save()}
			</button>
		</div>
	</div>


	<section class="overview">
		<div class="brand-card">
			<div class="manual-iframe-wrap">
				<iframe
					bind:this={previewFrame}
					src="/"
					title={uiLanguage === 'cs' ? 'Náhled brand manuálu' : 'Brand manual preview'}
					class="manual-iframe"
					scrolling="no"
					tabindex="-1"
					aria-hidden="true"
				></iframe>
			</div>
			<div class="iframe-actions">
				<a href="/" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">
					<IconExternalLink size={13} stroke={1.75} />
					{uiLanguage === 'cs' ? 'Otevřít manuál' : 'Open manual'}
				</a>
				<button type="button" class="btn btn-secondary btn-sm" onclick={() => previewFrame?.contentWindow?.location.reload()}>
					<IconRefresh size={13} stroke={1.75} />
					{uiLanguage === 'cs' ? 'Obnovit' : 'Refresh'}
				</button>
			</div>
		</div>

		<div class="health-card">
			<div class="health-head">
				<div>
					<span class="eyebrow small">{m.brand_readiness()}</span>
					<h2>{readinessScore}%</h2>
				</div>
			</div>
			<div class="health-list">
				{#each readinessItems as item (item.label)}
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
				<h2>{m.brand_identity()}</h2>
				<p>{m.brand_identity_sub()}</p>
			</div>
			<div class="panel">
				<label class="field">
					<span>{m.brand_name_label()}</span>
					<input bind:value={s.name} placeholder="Acme Studio" />
				</label>
				<label class="field">
					<span>{m.brand_primary_color()}</span>
					<div class="color-input">
						<input type="color" value={primaryColorInputValue} oninput={(e) => (s.primaryColor = (e.currentTarget as HTMLInputElement).value)} />
						<input bind:value={s.primaryColor} class="mono" placeholder="#4A1204" />
						<span class="swatch" style="background:{s.primaryColor ?? '#4A1204'}"></span>
					</div>
				</label>
				<div class="grid-two">
					<label class="field">
						<span>{m.brand_logo()}</span>
						<div class="path-input-row">
							<input bind:value={s.logoPath} placeholder="/uploads/logo.svg" />
							<button type="button" class="btn btn-secondary path-picker-btn" onclick={() => openAssetPicker('logo')}>
								<IconPhoto size={15} stroke={1.75} />
								{uiLanguage === 'cs' ? 'Vybrat asset' : 'Choose asset'}
							</button>
						</div>
						{#if s.logoPath}
							<div class="asset-path-preview">
								<div class="asset-path-thumb">
									<img src={assetSrc(s.logoPath)} alt="" onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')} />
								</div>
								<small>{uiLanguage === 'cs' ? 'Logo z cesty nebo assetu' : 'Logo from path or asset'}</small>
							</div>
						{/if}
					</label>
					<label class="field">
						<span>{uiLanguage === 'cs' ? 'Logo (tmavý režim)' : 'Logo (dark mode)'}</span>
						<div class="path-input-row">
							<input bind:value={s.logoDarkPath} placeholder={uiLanguage === 'cs' ? 'Volitelné, jinak se použije světlé' : 'Optional, falls back to light logo'} />
							<button type="button" class="btn btn-secondary path-picker-btn" onclick={() => openAssetPicker('logoDark')}>
								<IconPhoto size={15} stroke={1.75} />
								{uiLanguage === 'cs' ? 'Vybrat asset' : 'Choose asset'}
							</button>
						</div>
						{#if s.logoDarkPath}
							<div class="asset-path-preview asset-path-preview-dark">
								<div class="asset-path-thumb">
									<img src={assetSrc(s.logoDarkPath)} alt="" onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')} />
								</div>
								<small>{uiLanguage === 'cs' ? 'Logo pro tmavý režim' : 'Logo for dark mode'}</small>
							</div>
						{:else}
							<p class="field-hint">{uiLanguage === 'cs' ? 'Pokud nevyplněno, použije se světlé logo' : 'If empty, light logo is used'}</p>
						{/if}
					</label>
					<label class="field">
						<span>{m.brand_favicon()}</span>
						<div class="path-input-row">
							<input bind:value={s.faviconPath} placeholder="/favicon.svg" />
							<button type="button" class="btn btn-secondary path-picker-btn" onclick={() => openAssetPicker('favicon')}>
								<IconPhoto size={15} stroke={1.75} />
								{uiLanguage === 'cs' ? 'Vybrat asset' : 'Choose asset'}
							</button>
						</div>
						{#if s.faviconPath}
							<div class="asset-path-preview">
								<div class="asset-path-thumb favicon-thumb">
									<img src={assetSrc(s.faviconPath)} alt="" onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')} />
								</div>
								<small>{uiLanguage === 'cs' ? 'Favicon z cesty nebo assetu' : 'Favicon from path or asset'}</small>
							</div>
						{/if}
					</label>
				</div>
			</div>
		</section>

		<section class="section" id="manual">
			<div class="section-meta">
				<h2>{m.brand_manual_section()}</h2>
				<p>{m.brand_manual_sub()}</p>
			</div>
			<div class="panel">
				<label class="field">
					<span>{m.brand_lang_label()}</span>
					<select bind:value={s.defaultLanguage}>
						<option value="en">English</option>
						<option value="cs">Čeština</option>
					</select>
					<small>{m.brand_lang_hint()}</small>
				</label>
				<label class="field">
					<span>{m.brand_footer_label()}</span>
					<input bind:value={s.customFooterText} placeholder="Brand team · Updated regularly" />
				</label>
				<label class="switch-row">
					<input type="checkbox" bind:checked={s.showAttribution} />
					<span>
						<strong>{m.brand_attribution_label()}</strong>
						<small>{m.brand_attribution_hint()}</small>
					</span>
				</label>
			</div>
		</section>

		<section class="section" id="appearance">
			<div class="section-meta">
				<h2>{uiLanguage === 'cs' ? 'Vzhled manuálu' : 'Manual appearance'}</h2>
				<p>{uiLanguage === 'cs'
					? 'Globální barevnost veřejného manuálu. Barvy konkrétních hero sekcí se nastavují u jednotlivých stránek.'
					: 'Global color treatment for the public manual. Individual page hero colors are still controlled per page.'}</p>
			</div>
			<div class="panel">
				<div class="theme-mode-grid">
					{#each ['light', 'dark', 'system', 'toggle'] as mode (mode)}
						<button
							type="button"
							class="theme-mode-card"
							class:active={(s.manualThemeMode ?? 'light') === mode}
							onclick={() => (s = { ...s, manualThemeMode: mode as ManualThemeMode })}
						>
							{#if mode === 'light'}<IconSun size={18} stroke={1.75} />
						{:else if mode === 'dark'}<IconMoon size={18} stroke={1.75} />
						{:else if mode === 'system'}<IconDeviceDesktop size={18} stroke={1.75} />
						{:else}<IconArrowsExchange size={18} stroke={1.75} />
						{/if}
						<strong>{themeModeLabel(mode as ManualThemeMode)}</strong>
						<span>{themeModeDescription(mode as ManualThemeMode)}</span>
						</button>
					{/each}
				</div>

				<div class="theme-builder">
					<div class="theme-builder-head">
						<div>
							<h3>{uiLanguage === 'cs' ? 'Barevné tokeny manuálu' : 'Manual color tokens'}</h3>
							<p>{uiLanguage === 'cs'
								? 'Nastavte zvlášť světlý a tmavý režim. Kontrast se kontroluje proti pozadí a kartám.'
								: 'Tune light and dark mode separately. Contrast is checked against page and card backgrounds.'}</p>
						</div>
						<div class="theme-builder-actions">
							<button type="button" class="btn-reset" onclick={resetThemeColors}
								title={uiLanguage === 'cs' ? 'Resetovat barvy na výchozí hodnoty' : 'Reset colors to defaults'}>
								<IconRefresh size={13} stroke={2} />
								{uiLanguage === 'cs' ? 'Výchozí' : 'Default'}
							</button>
							<button type="button" class="btn-auto" onclick={autoGenerateTheme} disabled={!brandColors.length}
								title={brandColors.length ? (uiLanguage === 'cs' ? 'Vygenerovat theme z barev značky' : 'Auto-generate theme from brand colors') : (uiLanguage === 'cs' ? 'Nejprve přidejte barvy v sekci Barvy' : 'Add colors in the Colors section first')}>
								<IconSparkles size={13} stroke={2} />
								Auto
							</button>
						</div>
					</div>

					<div class="theme-columns">
						<section class="theme-column">
							<div class="theme-column-head">
								<span class="theme-column-icon light" aria-hidden="true"><IconSun size={17} stroke={1.9} /></span>
								<div>
									<h4>{uiLanguage === 'cs' ? 'Světlý režim' : 'Light mode'}</h4>
									<p>{uiLanguage === 'cs' ? 'Výchozí pro běžné klientské manuály.' : 'Default for standard client manuals.'}</p>
								</div>
							</div>
							<div
								class="theme-mini-preview"
								style="--theme-bg:{manualTheme.light.bg}; --theme-surface:{manualTheme.light.surface}; --theme-text:{manualTheme.light.text}; --theme-muted:{manualTheme.light.muted}; --theme-accent:{manualTheme.accentLight}; --theme-radius:{manualTheme.radius}px;"
							>
								<div class="preview-line strong"></div>
								<div class="preview-card">
									<strong>{manualPreviewText('colors')}</strong>
									<span>{manualPreviewText('sub')}</span>
									<button type="button">{uiLanguage === 'cs' ? 'Akce' : 'Action'}</button>
								</div>
							</div>
							<div class="theme-token-list">
								<ManualThemeColorField
									bind:value={s.manualBackgroundColor}
									label={uiLanguage === 'cs' ? 'Pozadí stránky' : 'Page background'}
									hint={uiLanguage === 'cs' ? 'Základní plocha kolem obsahu.' : 'The base canvas around content.'}
									placeholder="#FBFAF8"
									previewText="Bg"
									checks={[{ label: uiLanguage === 'cs' ? 'Text' : 'Text', against: manualTheme.light.text, min: 4.5 }, { label: uiLanguage === 'cs' ? 'Vedlejší' : 'Muted', against: manualTheme.light.muted, min: 3 }]}
									{brandColors}
									{brandPalettes}
								/>
								<ManualThemeColorField
									bind:value={s.manualSurfaceColor}
									label={uiLanguage === 'cs' ? 'Karty a plochy' : 'Cards and surfaces'}
									hint={uiLanguage === 'cs' ? 'Navigace, karty a obsahové bloky.' : 'Navigation, cards, and content blocks.'}
									placeholder="#FFFFFF"
									previewText="Ui"
									checks={[{ label: uiLanguage === 'cs' ? 'Text' : 'Text', against: manualTheme.light.text, min: 4.5 }, { label: uiLanguage === 'cs' ? 'Akcent' : 'Accent', against: manualTheme.accentLight, min: 3 }]}
									{brandColors}
									{brandPalettes}
								/>
								<ManualThemeColorField
									bind:value={s.manualTextColor}
									label={uiLanguage === 'cs' ? 'Primární text' : 'Primary text'}
									hint={uiLanguage === 'cs' ? 'Nadpisy a hlavní text.' : 'Headlines and main body text.'}
									placeholder="#171717"
									previewText="Aa"
									checks={[{ label: uiLanguage === 'cs' ? 'Pozadí' : 'Canvas', against: manualTheme.light.bg, min: 4.5 }, { label: uiLanguage === 'cs' ? 'Karty' : 'Cards', against: manualTheme.light.surface, min: 4.5 }]}
									{brandColors}
									{brandPalettes}
								/>
								<ManualThemeColorField
									bind:value={s.manualMutedColor}
									label={uiLanguage === 'cs' ? 'Vedlejší text' : 'Muted text'}
									hint={uiLanguage === 'cs' ? 'Popisky, metadata a méně důležitý text.' : 'Captions, metadata, and secondary copy.'}
									placeholder="#737373"
									previewText="Aa"
									checks={[{ label: uiLanguage === 'cs' ? 'Pozadí' : 'Canvas', against: manualTheme.light.bg, min: 3 }, { label: uiLanguage === 'cs' ? 'Karty' : 'Cards', against: manualTheme.light.surface, min: 3 }]}
									{brandColors}
									{brandPalettes}
								/>
								<ManualThemeColorField
									bind:value={s.manualAccentColor}
									label={uiLanguage === 'cs' ? 'Akcent' : 'Accent'}
									hint={uiLanguage === 'cs' ? 'Aktivní odkazy, šipky a vybrané prvky.' : 'Active links, arrows, and selected states.'}
									placeholder={s.primaryColor ?? '#4A1204'}
									previewText="Aa"
									checks={[{ label: uiLanguage === 'cs' ? 'Pozadí' : 'Canvas', against: manualTheme.light.bg, min: 3 }, { label: uiLanguage === 'cs' ? 'Karty' : 'Cards', against: manualTheme.light.surface, min: 3 }]}
									{brandColors}
									{brandPalettes}
								/>
							</div>
						</section>

						<section class="theme-column">
							<div class="theme-column-head">
								<span class="theme-column-icon dark" aria-hidden="true"><IconMoon size={17} stroke={1.9} /></span>
								<div>
									<h4>{uiLanguage === 'cs' ? 'Tmavý režim' : 'Dark mode'}</h4>
									<p>{uiLanguage === 'cs' ? 'Použije se pro dark/system/toggle režim.' : 'Used for dark, system, and toggle modes.'}</p>
								</div>
							</div>
							<div
								class="theme-mini-preview"
								style="--theme-bg:{manualTheme.dark.bg}; --theme-surface:{manualTheme.dark.surface}; --theme-text:{manualTheme.dark.text}; --theme-muted:{manualTheme.dark.muted}; --theme-accent:{manualTheme.accentDark}; --theme-radius:{manualTheme.radius}px;"
							>
								<div class="preview-line strong"></div>
								<div class="preview-card">
									<strong>{manualPreviewText('colors')}</strong>
									<span>{manualPreviewText('sub')}</span>
									<button type="button">{uiLanguage === 'cs' ? 'Akce' : 'Action'}</button>
								</div>
							</div>
							<div class="theme-token-list">
								<ManualThemeColorField
									bind:value={s.manualBackgroundColorDark}
									label={uiLanguage === 'cs' ? 'Pozadí stránky' : 'Page background'}
									hint={uiLanguage === 'cs' ? 'Základní tmavá plocha.' : 'The base dark canvas.'}
									placeholder="#101010"
									previewText="Bg"
									checks={[{ label: uiLanguage === 'cs' ? 'Text' : 'Text', against: manualTheme.dark.text, min: 4.5 }, { label: uiLanguage === 'cs' ? 'Vedlejší' : 'Muted', against: manualTheme.dark.muted, min: 3 }]}
									{brandColors}
									{brandPalettes}
								/>
								<ManualThemeColorField
									bind:value={s.manualSurfaceColorDark}
									label={uiLanguage === 'cs' ? 'Karty a plochy' : 'Cards and surfaces'}
									hint={uiLanguage === 'cs' ? 'Navigace, karty a obsahové bloky.' : 'Navigation, cards, and content blocks.'}
									placeholder="#171717"
									previewText="Ui"
									checks={[{ label: uiLanguage === 'cs' ? 'Text' : 'Text', against: manualTheme.dark.text, min: 4.5 }, { label: uiLanguage === 'cs' ? 'Akcent' : 'Accent', against: manualTheme.accentDark, min: 3 }]}
									{brandColors}
									{brandPalettes}
								/>
								<ManualThemeColorField
									bind:value={s.manualTextColorDark}
									label={uiLanguage === 'cs' ? 'Primární text' : 'Primary text'}
									hint={uiLanguage === 'cs' ? 'Nadpisy a hlavní text.' : 'Headlines and main body text.'}
									placeholder="#F4F4F4"
									previewText="Aa"
									checks={[{ label: uiLanguage === 'cs' ? 'Pozadí' : 'Canvas', against: manualTheme.dark.bg, min: 4.5 }, { label: uiLanguage === 'cs' ? 'Karty' : 'Cards', against: manualTheme.dark.surface, min: 4.5 }]}
									{brandColors}
									{brandPalettes}
								/>
								<ManualThemeColorField
									bind:value={s.manualMutedColorDark}
									label={uiLanguage === 'cs' ? 'Vedlejší text' : 'Muted text'}
									hint={uiLanguage === 'cs' ? 'Popisky, metadata a méně důležitý text.' : 'Captions, metadata, and secondary copy.'}
									placeholder="#A3A3A3"
									previewText="Aa"
									checks={[{ label: uiLanguage === 'cs' ? 'Pozadí' : 'Canvas', against: manualTheme.dark.bg, min: 3 }, { label: uiLanguage === 'cs' ? 'Karty' : 'Cards', against: manualTheme.dark.surface, min: 3 }]}
									{brandColors}
									{brandPalettes}
								/>
								<ManualThemeColorField
									bind:value={s.manualAccentColorDark}
									label={uiLanguage === 'cs' ? 'Akcent' : 'Accent'}
									hint={uiLanguage === 'cs' ? 'Aktivní odkazy, šipky a vybrané prvky.' : 'Active links, arrows, and selected states.'}
									placeholder={manualTheme.accentLight}
									previewText="Aa"
									checks={[{ label: uiLanguage === 'cs' ? 'Pozadí' : 'Canvas', against: manualTheme.dark.bg, min: 3 }, { label: uiLanguage === 'cs' ? 'Karty' : 'Cards', against: manualTheme.dark.surface, min: 3 }]}
									{brandColors}
									{brandPalettes}
								/>
							</div>
						</section>
					</div>
				</div>

				<label class="field radius-field">
					<span>{uiLanguage === 'cs' ? 'Zaoblení rohů' : 'Corner radius'}</span>
					<div class="radius-control">
						<input
							type="range"
							min="0"
							max="32"
							step="1"
							value={manualTheme.radius}
							oninput={(e) => (s.manualBorderRadius = Number((e.currentTarget as HTMLInputElement).value))}
						/>
						<input
							type="number"
							min="0"
							max="32"
							step="1"
							value={manualTheme.radius}
							oninput={(e) => (s.manualBorderRadius = Number((e.currentTarget as HTMLInputElement).value))}
						/>
						<span class="radius-unit">px</span>
					</div>
					<small>{uiLanguage === 'cs'
						? 'Ovlivní karty, tlačítka, navigaci, boxy a obsahové bloky veřejného manuálu.'
						: 'Affects cards, buttons, navigation, boxes, and content blocks in the public manual.'}</small>
				</label>
			</div>
		</section>

		<section class="section" id="access">
			<div class="section-meta">
				<h2>{m.brand_access()}</h2>
				<p>{m.brand_access_sub()}</p>
			</div>
			<div class="panel">
				<div class="access-grid">
					<button type="button" class:active={s.accessMode === 'public'} onclick={() => (s.accessMode = 'public')}>
						<IconGlobe size={18} stroke={1.75} />
						<strong>{modeLabel('public')}</strong>
						<span>{uiLanguage === 'cs' ? 'Kdokoliv s odkazem' : 'Anyone with the link'}</span>
					</button>
					<button type="button" class:active={s.accessMode === 'password'} onclick={() => (s.accessMode = 'password')}>
						<IconLock size={18} stroke={1.75} />
						<strong>{modeLabel('password')}</strong>
						<span>{uiLanguage === 'cs' ? 'Sdílený přístup' : 'Shared gate'}</span>
					</button>
					<button type="button" class:active={s.accessMode === 'email_whitelist'} onclick={() => (s.accessMode = 'email_whitelist')}>
						<IconAt size={18} stroke={1.75} />
						<strong>{modeLabel('email_whitelist')}</strong>
						<span>{uiLanguage === 'cs' ? 'Schválení uživatelé' : 'Approved users'}</span>
					</button>
				</div>
				<div class="access-note">
					<strong>{modeLabel(s.accessMode)}</strong>
					<span>{modeDescription(s.accessMode)}</span>
				</div>
				{#if s.accessMode === 'password'}
					<label class="field">
						<span>{uiLanguage === 'cs' ? 'Nastavit nové heslo manuálu' : 'Set new manual password'}</span>
						<input
							type="password"
							bind:value={accessPassword}
							placeholder={uiLanguage === 'cs' ? 'Prázdné pole ponechá aktuální heslo' : 'Leave empty to keep current password'}
							autocomplete="new-password"
						/>
					</label>
				{/if}
				{#if s.accessMode === 'email_whitelist'}
					<label class="field">
						<span>{uiLanguage === 'cs' ? 'Povolené e-mailové adresy' : 'Allowed email addresses'}</span>
						<textarea rows="5" bind:value={whitelistText} placeholder="alice@company.com&#10;*@partner.com"></textarea>
					</label>
				{/if}
				{#if s.accessMode === 'token'}
					<div class="warning-note">
						<IconAlertTriangle size={15} stroke={2} />
						{uiLanguage === 'cs'
							? 'Tajný odkaz zatím není ve veřejném manuálu napojený. Přepněte přístup na veřejný, heslo nebo seznam e-mailů.'
							: 'Secret-link access is not wired in the public manual yet. Switch access to public, password, or email list.'}
					</div>
				{/if}
			</div>
		</section>
	</div>

	{#if isDirty}
		<div class="save-bar">
			<span><IconAlertTriangle size={15} stroke={2} /> {m.brand_unsaved()}</span>
			<button class="btn btn-primary" onclick={save} disabled={saving}>{saving ? m.brand_saving() : m.brand_save()}</button>
		</div>
	{/if}
</div>

<AssetPickerModal
	open={!!assetPickerTarget}
	mimeFilter="image"
	title={pickerTitle()}
	description={pickerHint()}
	onPick={(url) => selectAssetUrl(url)}
	onClose={() => (assetPickerTarget = null)}
/>

<style>
	:global(:root) {
		--brand-page-border: color-mix(in srgb, var(--color-border) 86%, transparent);
	}
	.page { min-height: 100vh; padding: 2rem; color: var(--color-text); }
	.eyebrow.small { font-size: var(--text-2xs); color: var(--color-muted); }




	.overview { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(320px, .7fr); gap: 1rem; margin: 1.5rem 0; }
	.brand-card, .health-card, .panel {
		background: var(--color-surface); border: 1px solid var(--brand-page-border); border-radius: var(--radius-lg);
		box-shadow: var(--shadow-xs);
	}
	.brand-card { padding: 1rem; display: flex; flex-direction: column; gap: .6rem; }
	.manual-iframe-wrap {
		position: relative;
		width: 100%;
		aspect-ratio: 4/3;
		overflow: hidden;
		border-radius: var(--radius);
		border: 1px solid var(--color-border);
		background: #fff;
	}
	.manual-iframe {
		position: absolute;
		top: 0; left: 0;
		width: 200%; height: 200%;
		border: none;
		transform: scale(0.5);
		transform-origin: top left;
		pointer-events: none;
	}
	.iframe-actions { display: flex; gap: .4rem; }

	.health-card { padding: var(--space-5); }
	.health-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-5); }
	.health-head h2 { margin: var(--space-2) 0 0; font-size: var(--text-4xl); font-weight: 400; letter-spacing: var(--tracking-display); line-height: 1; font-variant-numeric: tabular-nums; }
	.health-list { display: flex; flex-direction: column; gap: 0; border-top: 1px solid var(--color-border); }
	.health-item {
		display: grid; grid-template-columns: 22px minmax(0, 1fr) 18px; align-items: center; gap: .6rem;
		padding: var(--space-3) 0; border-bottom: 1px solid var(--color-border); color: var(--color-placeholder);
	}
	.health-item.done { color: var(--color-accent); }
	.health-item:last-child { border-bottom: 0; padding-bottom: 0; }
	.health-item strong { display: block; color: var(--color-text); font-size: var(--text-sm); font-weight: 500; }
	.health-item span { display: block; font-size: var(--text-xs); line-height: 1.35; color: var(--color-muted); overflow-wrap: anywhere; }
	.sections { display: flex; flex-direction: column; gap: 1rem; }
	.section { display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 1rem; padding-top: 1rem; }
	.section-meta h2 { margin: 0 0 var(--space-2); font-size: var(--text-lg); font-weight: 500; letter-spacing: var(--tracking-snug); }
	.section-meta p { margin: 0; color: var(--color-muted); line-height: 1.5; font-size: var(--text-base); }
	.panel { padding: 1rem; display: flex; flex-direction: column; gap: 1rem; }
	.grid-two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .8rem; }
	.field { display: flex; flex-direction: column; gap: .38rem; }
	.field span { font-size: var(--text-sm); font-weight: 600; color: var(--color-text); }
	.field small { color: var(--color-muted); font-size: var(--text-xs); line-height: 1.35; }
	.field input, .field select, .field textarea {
		width: 100%; min-height: 38px; padding: .55rem .65rem; border: 1px solid var(--color-border);
		border-radius: var(--radius); background: var(--color-surface); color: var(--color-text); font: inherit;
	}
	.field textarea { resize: vertical; line-height: 1.45; }
	.path-input-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .5rem; align-items: center; }
	.path-picker-btn { white-space: nowrap; background: var(--color-bg); }
	.asset-path-preview {
		display: flex; align-items: center; gap: .55rem;
		min-height: 38px; padding: .45rem .55rem;
		border: 1px solid var(--color-border); border-radius: var(--radius);
		background: color-mix(in srgb, var(--color-bg) 70%, var(--color-surface));
	}
	.asset-path-preview-dark { background: #1a1a1a; border-color: #333; }
	.asset-path-preview-dark .asset-path-thumb { background: #111; border-color: #333; }
	/* Neutral mid-gray for both light/dark logo previews — both colors visible */
	.asset-path-thumb { background: #8a8a8a; border-color: #6a6a6a; }
	.asset-path-preview-dark small { color: #888; }
	.field-hint { margin: .25rem 0 0; font-size: var(--text-xs); color: var(--color-muted); }
	.asset-path-thumb {
		width: 64px; height: 56px;
		display: flex; align-items: center; justify-content: center;
		border: 1px solid var(--color-border); border-radius: var(--radius);
		background: var(--color-surface); overflow: hidden; flex-shrink: 0;
		padding: 4px;
	}
	.asset-path-thumb.favicon-thumb { width: 40px; height: 40px; }
	.asset-path-thumb img {
		width: 100%; height: 100%;
		object-fit: contain; display: block;
		box-sizing: border-box;
	}
	.mono { font-family: var(--font-mono); max-width: 140px; }
	.color-input { display: flex; align-items: center; gap: .55rem; flex-wrap: wrap; }
	.color-input input[type="color"] { width: 44px; padding: 3px; }
	.swatch { width: 34px; height: 34px; border-radius: var(--radius); border: 1px solid var(--color-border); }
	.theme-mode-grid { display: grid; gap: .75rem; }
	.theme-mode-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
	.theme-builder-actions { display: flex; gap: .45rem; align-items: center; flex-shrink: 0; }
	.btn-auto, .btn-reset {
		display: inline-flex; align-items: center; gap: 5px;
		padding: .3rem .75rem; height: 30px;
		border: 1px solid var(--color-border); border-radius: var(--radius-full);
		background: var(--color-bg); color: var(--color-text);
		font-size: var(--text-xs); font-weight: 500; cursor: pointer;
		transition: background .15s, border-color .15s;
		white-space: nowrap;
	}
	.btn-auto:hover:not(:disabled) { background: var(--color-surface); border-color: var(--color-border-strong); color: var(--color-text); }
	.btn-auto:disabled { opacity: .45; cursor: default; }
	.btn-reset:hover { background: var(--color-surface); border-color: var(--color-muted); }
	.theme-mode-card {
		position: relative;
		min-height: 104px;
		padding: .8rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		background: var(--color-bg);
		color: var(--color-text);
		text-align: left;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		justify-content: flex-start;
		gap: .3rem;
		min-width: 0;
	}
	.theme-mode-card.active {
		border-color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 7%, var(--color-bg));
		color: var(--color-accent);
	}
	.theme-mode-card strong,
	.theme-mode-card > span:last-child {
		pointer-events: none;
	}
	.theme-mode-card strong { font-size: var(--text-base); display: block; }
	.theme-mode-card > span:last-child {
		color: var(--color-muted);
		font-size: var(--text-xs);
		line-height: 1.35;
		display: block;
	}
	.theme-builder {
		display: grid;
		gap: .9rem;
		margin-top: .95rem;
	}
	.theme-builder-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: .9rem;
		padding-top: .15rem;
	}
	.theme-builder-head h3 {
		margin: 0;
		font-size: var(--text-lg);
		font-weight: 600;
		color: var(--color-text);
	}
	.theme-builder-head p {
		margin: .22rem 0 0;
		color: var(--color-muted);
		font-size: var(--text-sm);
		line-height: 1.45;
	}
	.theme-columns {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: .9rem;
		align-items: start;
	}
	.theme-column {
		display: grid;
		gap: .75rem;
		min-width: 0;
		padding: .85rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: color-mix(in srgb, var(--color-surface) 72%, var(--color-bg));
	}
	.theme-column-head {
		display: flex;
		align-items: flex-start;
		gap: .65rem;
	}
	.theme-column-head h4 {
		margin: 0;
		font-size: var(--text-md);
		color: var(--color-text);
	}
	.theme-column-head p {
		margin: .14rem 0 0;
		color: var(--color-muted);
		font-size: var(--text-xs);
		line-height: 1.35;
	}
	.theme-column-icon {
		width: 30px;
		height: 30px;
		display: grid;
		place-items: center;
		border-radius: var(--radius);
		flex: 0 0 auto;
	}
	.theme-column-icon.light {
		background: var(--color-warning-subtle);
		color: var(--color-warning);
		border: 1px solid var(--color-warning-border);
	}
	.theme-column-icon.dark {
		background: #18181b;
		color: #e4e4e7;
		border: 1px solid #3f3f46;
	}
	.theme-mini-preview {
		display: grid;
		gap: .7rem;
		padding: .85rem;
		border: 1px solid color-mix(in srgb, var(--theme-text) 12%, transparent);
		border-radius: calc(var(--theme-radius) + 4px);
		background: var(--theme-bg);
		color: var(--theme-text);
		min-width: 0;
	}
	.preview-line {
		width: 42%;
		height: 8px;
		border-radius: var(--radius-full);
		background: var(--theme-accent);
	}
	.preview-card {
		display: grid;
		gap: .35rem;
		padding: .75rem;
		border: 1px solid color-mix(in srgb, var(--theme-text) 10%, transparent);
		border-radius: var(--theme-radius);
		background: var(--theme-surface);
	}
	.preview-card strong {
		font-size: var(--text-base);
		color: var(--theme-text);
	}
	.preview-card span {
		color: var(--theme-muted);
		font-size: var(--text-xs);
		line-height: 1.35;
	}
	.preview-card button {
		justify-self: start;
		margin-top: .2rem;
		height: 28px;
		padding: 0 .7rem;
		border: 0;
		border-radius: max(5px, calc(var(--theme-radius) - 2px));
		background: var(--theme-accent);
		color: var(--theme-bg);
		font-size: var(--text-xs);
		font-weight: 500;
	}
	.theme-token-list {
		display: grid;
		gap: .65rem;
	}
	.radius-field { max-width: 520px; }
	.radius-control { display: grid; grid-template-columns: minmax(160px, 1fr) 78px auto; gap: .55rem; align-items: center; }
	.radius-control input[type="range"] { width: 100%; accent-color: var(--color-accent); }
	.radius-control input[type="number"] { min-height: 38px; }
	.radius-unit { color: var(--color-muted); font-size: var(--text-sm); font-weight: 600; }
	.access-grid { display: flex; gap: .5rem; flex-wrap: wrap; }
	.access-grid button {
		display: flex; align-items: center; gap: .45rem; border: 1px solid var(--color-border);
		background: var(--color-bg); color: var(--color-text); border-radius: var(--radius); cursor: pointer;
	}
	.access-grid button.active {
		border-color: var(--color-accent); background: color-mix(in srgb, var(--color-accent) 7%, var(--color-bg)); color: var(--color-accent);
	}
	.switch-row { display: flex; gap: .65rem; align-items: flex-start; padding: .7rem; border: 1px solid var(--color-border); border-radius: var(--radius); }
	.switch-row input { margin-top: .15rem; }
	.switch-row strong, .switch-row small { display: block; }
	.switch-row small { color: var(--color-muted); margin-top: .15rem; }
	.access-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
	.access-grid button { min-height: 104px; padding: .8rem; flex-direction: column; align-items: flex-start; justify-content: flex-start; text-align: left; }
	.access-grid strong { font-size: var(--text-base); color: inherit; }
	.access-grid span { color: var(--color-muted); font-size: var(--text-xs); }
	.access-note, .warning-note {
		display: flex; flex-direction: column; gap: .15rem; padding: .75rem .85rem;
		border: 1px solid var(--color-border); border-radius: var(--radius); background: var(--color-bg);
	}
	.access-note span { color: var(--color-muted); font-size: var(--text-base); }
	.warning-note { flex-direction: row; align-items: center; color: var(--color-warning); background: var(--color-warning-subtle); border-color: var(--color-warning-border); font-size: var(--text-base); }
	.save-bar {
		position: sticky; bottom: 1rem; z-index: 20; margin: 1.5rem auto 0; max-width: 680px;
		display: flex; align-items: center; justify-content: space-between; gap: 1rem;
		padding: .7rem .8rem; background: color-mix(in srgb, var(--color-surface) 94%, transparent);
		backdrop-filter: blur(10px); border: 1px solid var(--color-border); border-radius: var(--radius-lg); box-shadow: 0 12px 32px rgba(0,0,0,.12);
	}
	.save-bar span { display: flex; align-items: center; gap: .45rem; color: var(--color-muted); font-size: var(--text-base); }
	@media (max-width: 960px) {
		.page { padding: 1rem; }
		.overview, .section { grid-template-columns: 1fr; }
		.section-meta { max-width: 680px; }
		.access-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
		.theme-mode-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
		.theme-columns { grid-template-columns: 1fr; }
	}
	@media (max-width: 560px) {
		.grid-two, .access-grid, .theme-mode-grid { grid-template-columns: 1fr; }
		.path-input-row { grid-template-columns: 1fr; }
		.path-picker-btn { width: 100%; }
		.theme-builder-head { flex-direction: column; }
		.theme-builder-head .btn-auto { width: 100%; justify-content: center; }
		.theme-column { padding: .7rem; }
		.radius-control { grid-template-columns: 1fr 72px auto; }
		.save-bar { left: 1rem; right: 1rem; flex-direction: column; align-items: stretch; }
	}
</style>
