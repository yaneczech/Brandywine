<script lang="ts">
	import type { PageData } from './$types';
	import * as m from '$lib/paraglide/messages';
	import { languageTag } from '$lib/paraglide/runtime';
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
		accessPassword?: string | null;
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
	let saved = $state(false);
	let error = $state('');
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
	let assetPickerItems = $state<BrandAsset[]>([]);
	let assetPickerLoading = $state(false);
	let assetPickerUploading = $state(false);
	let assetPickerSearch = $state('');
	let assetPickerError = $state('');
	let pickerFileInput = $state<HTMLInputElement | null>(null);

	// svelte-ignore state_referenced_locally
	let originalString = $state(JSON.stringify($state.snapshot(s)));
	// svelte-ignore state_referenced_locally
	let originalWhitelist = $state((s.emailWhitelist ?? []).join('\n'));
	const isDirty = $derived(JSON.stringify(s) !== originalString || accessPassword.trim() !== '' || whitelistText !== originalWhitelist);
	const uiLanguage = $derived(languageTag());
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
	const filteredAssets = $derived(
		assetPickerSearch.trim()
			? assetPickerItems.filter((asset) => asset.filename.toLowerCase().includes(assetPickerSearch.toLowerCase()))
			: assetPickerItems
	);

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

	function assetPickerPath(asset: BrandAsset) {
		return asset.storagePath ?? asset.thumbnailPath ?? '';
	}

	function assetPreviewSrc(asset: BrandAsset) {
		return assetSrc(asset.thumbnailPath ?? asset.storagePath);
	}

	async function openAssetPicker(target: 'logo' | 'logoDark' | 'favicon') {
		assetPickerTarget = target;
		assetPickerError = '';
		assetPickerSearch = '';
		assetPickerLoading = true;
		try {
			const res = await fetch('/api/assets?type=image&limit=100');
			if (!res.ok) throw new Error(await res.text());
			const json = await res.json();
			assetPickerItems = json.data ?? [];
		} catch (e) {
			assetPickerItems = [];
			assetPickerError = e instanceof Error ? e.message : 'Unable to load assets';
		} finally {
			assetPickerLoading = false;
		}
	}

	async function uploadToPicker(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		assetPickerUploading = true;
		assetPickerError = '';
		try {
			const form = new FormData();
			form.append('file', file);
			const res = await fetch('/api/assets', { method: 'POST', body: form });
			if (!res.ok) throw new Error(await res.text());
			const uploaded: BrandAsset = await res.json();
			// prepend to list + auto-select
			assetPickerItems = [uploaded, ...assetPickerItems];
			selectAsset(uploaded);
		} catch (err) {
			assetPickerError = err instanceof Error ? err.message : 'Upload failed';
		} finally {
			assetPickerUploading = false;
			if (pickerFileInput) pickerFileInput.value = '';
		}
	}

	function selectAsset(asset: BrandAsset) {
		const path = assetSrc(assetPickerPath(asset));
		if (!path) return;
		if (assetPickerTarget === 'logo') s.logoPath = path;
		if (assetPickerTarget === 'logoDark') s.logoDarkPath = path;
		if (assetPickerTarget === 'favicon') s.faviconPath = path;
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

	function manualLabel() {
		return uiLanguage === 'cs' ? 'manuál' : 'manual';
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
		const accentLightOptions = readable(
			unique(accentSeeds.flatMap((hex) => [hex, ...generateShades(hex).map((shade) => shade.hex)])),
			[lightBg, lightSurface],
			3,
			s.primaryColor ?? '#4A1204'
		);
		const accentLight = sample(accentLightOptions, s.primaryColor ?? '#4A1204');
		const accentDark = sample(
			readable(awayFrom(accentLightOptions, darkBg, 0.16), [darkBg, darkSurface], 3, accentLight),
			accentLight
		);

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
		error = '';
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
			saved = true;
			setTimeout(() => (saved = false), 2200);
			// Refresh iframe so the preview reflects the saved state
			previewFrame?.contentWindow?.location.reload();
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
	<title>{m.brand_title()} · {s.systemName ?? 'Brandywine'}</title>
</svelte:head>

<div class="page ap">
	<div class="ap-topbar">
		<div>
			<h1 class="ap-title">{m.brand_title()}</h1>
			<p class="ap-sub">{m.brand_sub()}</p>
		</div>
		<div class="ap-actions">
			{#if saved}
				<span class="saved"><IconCheck size={14} stroke={2} /> {m.brand_saved()}</span>
			{/if}
			<button class="btn-primary" onclick={save} disabled={saving || !isDirty}>
				{saving ? m.brand_saving() : m.brand_save()}
			</button>
		</div>
	</div>

	{#if error}
		<div class="error"><IconAlertTriangle size={16} stroke={2} /> {error}</div>
	{/if}

	<section class="overview">
		<div class="brand-card">
			<div class="manual-iframe-wrap">
				<iframe
					bind:this={previewFrame}
					src="/"
					title="Náhled brand manuálu"
					class="manual-iframe"
					scrolling="no"
					tabindex="-1"
					aria-hidden="true"
				></iframe>
			</div>
			<div class="iframe-actions">
				<a href="/" target="_blank" rel="noopener noreferrer" class="btn-secondary btn-sm">
					<IconExternalLink size={13} stroke={1.75} />
					{uiLanguage === 'cs' ? 'Otevřít manuál' : 'Open manual'}
				</a>
				<button type="button" class="btn-secondary btn-sm" onclick={() => previewFrame?.contentWindow?.location.reload()}>
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
							<button type="button" class="btn-secondary path-picker-btn" onclick={() => openAssetPicker('logo')}>
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
							<button type="button" class="btn-secondary path-picker-btn" onclick={() => openAssetPicker('logoDark')}>
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
							<button type="button" class="btn-secondary path-picker-btn" onclick={() => openAssetPicker('favicon')}>
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
					{#each ['light', 'dark', 'system', 'toggle'] as mode}
						<button
							type="button"
							class="theme-mode-card"
							class:active={(s.manualThemeMode ?? 'light') === mode}
							onclick={() => (s = { ...s, manualThemeMode: mode as ManualThemeMode })}
						>
							<span class="mode-icon" aria-hidden="true">
								{#if mode === 'light'}
									<IconSun size={17} stroke={1.9} />
								{:else if mode === 'dark'}
									<IconMoon size={17} stroke={1.9} />
								{:else if mode === 'system'}
									<IconDeviceDesktop size={17} stroke={1.9} />
								{:else}
									<IconArrowsExchange size={17} stroke={1.9} />
								{/if}
							</span>
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
						<button type="button" class="btn-auto" onclick={autoGenerateTheme} disabled={!brandColors.length}
							title={brandColors.length ? (uiLanguage === 'cs' ? 'Vygenerovat theme z barev značky' : 'Auto-generate theme from brand colors') : (uiLanguage === 'cs' ? 'Nejprve přidejte barvy v sekci Barvy' : 'Add colors in the Colors section first')}>
							<IconSparkles size={13} stroke={2} />
							Auto
						</button>
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
			<button class="btn-primary" onclick={save} disabled={saving}>{saving ? m.brand_saving() : m.brand_save()}</button>
		</div>
	{/if}
</div>

{#if assetPickerTarget}
	<div class="modal-backdrop" role="presentation" onclick={() => (assetPickerTarget = null)}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div class="modal asset-picker-modal" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<div>
					<h2>{pickerTitle()}</h2>
					<p>{pickerHint()}</p>
				</div>
				<button type="button" class="btn-ghost" aria-label={uiLanguage === 'cs' ? 'Zavřít' : 'Close'} onclick={() => (assetPickerTarget = null)}>
					<IconX size={18} stroke={1.8} />
				</button>
			</div>
			<div class="picker-toolbar">
				<div class="asset-picker-search">
					<IconSearch size={15} stroke={1.8} />
					<input
						type="search"
						bind:value={assetPickerSearch}
						placeholder={uiLanguage === 'cs' ? 'Hledat asset...' : 'Search assets...'}
					/>
				</div>
				<button
					type="button"
					class="btn-secondary btn-sm picker-upload-btn"
					disabled={assetPickerUploading}
					onclick={() => pickerFileInput?.click()}
				>
					{#if assetPickerUploading}
						<span class="picker-uploading-dot"></span>
						{uiLanguage === 'cs' ? 'Nahrávám…' : 'Uploading…'}
					{:else}
						<IconPhoto size={14} stroke={1.75} />
						{uiLanguage === 'cs' ? 'Nahrát soubor' : 'Upload file'}
					{/if}
				</button>
				<input
					bind:this={pickerFileInput}
					type="file"
					accept="image/*,.svg"
					class="sr-only"
					onchange={uploadToPicker}
				/>
			</div>
			<div class="asset-picker-grid">
				{#if assetPickerLoading}
					<div class="picker-empty">{uiLanguage === 'cs' ? 'Načítám assety...' : 'Loading assets...'}</div>
				{:else if assetPickerError}
					<div class="picker-empty error-state">{assetPickerError}</div>
				{:else if filteredAssets.length === 0}
					<div class="picker-empty">{uiLanguage === 'cs' ? 'Žádné obrázkové assety nenalezeny.' : 'No image assets found.'}</div>
				{:else}
					{#each filteredAssets as asset (asset.id)}
						<button type="button" class="asset-picker-item" title={asset.filename} onclick={() => selectAsset(asset)}>
							<div class="asset-picker-thumb">
								{#if assetPreviewSrc(asset)}
									<img
										src={assetPreviewSrc(asset)}
										alt={asset.filename}
										onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
									/>
								{/if}
							</div>
							<span>{asset.filename}</span>
							<small>{asset.mime}</small>
						</button>
					{/each}
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	:global(:root) {
		--brand-page-border: color-mix(in srgb, var(--color-border) 86%, transparent);
	}
	.page { min-height: 100vh; padding: 2rem; color: var(--color-text); }
	.eyebrow.small { font-size: .68rem; color: var(--color-muted); }
	.btn-primary, .btn-secondary {
		display: inline-flex; align-items: center; justify-content: center; gap: .45rem;
		min-height: 36px; padding: 0 .9rem; border-radius: 8px; font-weight: 650; font-size: .875rem;
		text-decoration: none; cursor: pointer; border: 1px solid transparent;
	}
	.btn-primary { background: var(--brand); color: #fff; }
	.btn-primary:disabled { opacity: .45; cursor: default; }
	.btn-secondary { background: var(--color-surface); color: var(--color-text); border-color: var(--color-border); }
	.btn-ghost {
		display: inline-flex; align-items: center; justify-content: center;
		min-width: 34px; min-height: 34px; border: 0; border-radius: 8px;
		background: transparent; color: var(--color-muted); cursor: pointer;
	}
	.btn-ghost:hover { background: var(--color-bg); color: var(--color-text); }
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
	.brand-card { padding: 1rem; display: flex; flex-direction: column; gap: .6rem; }
	.manual-iframe-wrap {
		position: relative;
		width: 100%;
		aspect-ratio: 4/3;
		overflow: hidden;
		border-radius: 8px;
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
	.btn-sm {
		display: inline-flex; align-items: center; gap: .3rem;
		padding: .3rem .6rem; font-size: .78rem;
	}
	.health-card { padding: 1rem; }
	.health-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: .8rem; }
	.health-head h2 { margin: .15rem 0 0; font-size: 2.2rem; line-height: 1; }
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
	.field span { font-size: .82rem; font-weight: 700; color: var(--color-text); }
	.field small { color: var(--color-muted); font-size: .76rem; line-height: 1.35; }
	.field input, .field select, .field textarea {
		width: 100%; min-height: 38px; padding: .55rem .65rem; border: 1px solid var(--color-border);
		border-radius: 8px; background: var(--color-bg); color: var(--color-text); font: inherit;
	}
	.field textarea { resize: vertical; line-height: 1.45; }
	.path-input-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .5rem; align-items: center; }
	.path-picker-btn { white-space: nowrap; background: var(--color-bg); }
	.asset-path-preview {
		display: flex; align-items: center; gap: .55rem;
		min-height: 38px; padding: .45rem .55rem;
		border: 1px solid var(--color-border); border-radius: 8px;
		background: color-mix(in srgb, var(--color-bg) 70%, var(--color-surface));
	}
	.asset-path-preview-dark { background: #1a1a1a; border-color: #333; }
	.asset-path-preview-dark .asset-path-thumb { background: #111; border-color: #333; }
	.asset-path-preview-dark small { color: #888; }
	.field-hint { margin: .25rem 0 0; font-size: .78rem; color: var(--color-muted); }
	.asset-path-thumb {
		width: 64px; height: 36px; display: grid; place-items: center;
		border: 1px solid var(--color-border); border-radius: 6px;
		background: var(--color-surface); overflow: hidden; flex-shrink: 0;
		padding: 4px;
	}
	.asset-path-thumb.favicon-thumb { width: 36px; height: 36px; }
	.asset-path-thumb img { width: 100%; height: 100%; object-fit: contain; display: block; box-sizing: border-box; }
	.mono { font-family: var(--font-mono); max-width: 140px; }
	.color-input { display: flex; align-items: center; gap: .55rem; flex-wrap: wrap; }
	.color-input input[type="color"] { width: 44px; padding: 3px; }
	.swatch { width: 34px; height: 34px; border-radius: 8px; border: 1px solid var(--color-border); }
	.theme-mode-grid { display: grid; gap: .75rem; }
	.theme-mode-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
	.btn-auto {
		display: inline-flex; align-items: center; gap: 5px;
		padding: .3rem .75rem; height: 30px;
		border: 1px solid var(--color-border); border-radius: 999px;
		background: var(--color-bg); color: var(--color-text);
		font-size: .78rem; font-weight: 650; cursor: pointer;
		transition: background .15s, border-color .15s;
		white-space: nowrap;
	}
	.btn-auto:hover:not(:disabled) { background: var(--color-surface); border-color: var(--brand); color: var(--brand); }
	.btn-auto:disabled { opacity: .45; cursor: default; }
	.theme-mode-card {
		position: relative;
		min-height: 108px;
		padding: .8rem;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		background: var(--color-bg);
		color: var(--color-text);
		text-align: left;
		cursor: pointer;
		display: grid;
		grid-template-columns: auto 1fr;
		gap: .45rem .55rem;
		align-content: start;
		min-width: 0;
	}
	.theme-mode-card.active {
		border-color: var(--brand);
		background: color-mix(in srgb, var(--brand) 7%, var(--color-bg));
		color: var(--brand);
	}
	.theme-mode-card .mode-icon,
	.theme-mode-card strong,
	.theme-mode-card > span:last-child {
		pointer-events: none;
	}
	.mode-icon {
		width: 28px;
		height: 28px;
		display: grid;
		place-items: center;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		background: var(--color-surface);
		color: inherit;
	}
	.theme-mode-grid strong, .theme-mode-grid span { display: block; min-width: 0; }
	.theme-mode-grid strong { font-size: .9rem; align-self: center; }
	.theme-mode-card > span:last-child {
		grid-column: 1 / -1;
		color: var(--color-muted);
		font-size: .78rem;
		line-height: 1.35;
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
		font-size: .98rem;
		font-weight: 760;
		color: var(--color-text);
	}
	.theme-builder-head p {
		margin: .22rem 0 0;
		color: var(--color-muted);
		font-size: .82rem;
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
		border-radius: 12px;
		background: color-mix(in srgb, var(--color-surface) 72%, var(--color-bg));
	}
	.theme-column-head {
		display: flex;
		align-items: flex-start;
		gap: .65rem;
	}
	.theme-column-head h4 {
		margin: 0;
		font-size: .95rem;
		color: var(--color-text);
	}
	.theme-column-head p {
		margin: .14rem 0 0;
		color: var(--color-muted);
		font-size: .76rem;
		line-height: 1.35;
	}
	.theme-column-icon {
		width: 30px;
		height: 30px;
		display: grid;
		place-items: center;
		border-radius: 8px;
		flex: 0 0 auto;
	}
	.theme-column-icon.light {
		background: #fff7ed;
		color: #c2410c;
		border: 1px solid #fed7aa;
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
		border-radius: 999px;
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
		font-size: .86rem;
		color: var(--theme-text);
	}
	.preview-card span {
		color: var(--theme-muted);
		font-size: .72rem;
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
		font-size: .72rem;
		font-weight: 760;
	}
	.theme-token-list {
		display: grid;
		gap: .65rem;
	}
	.radius-field { max-width: 520px; }
	.radius-control { display: grid; grid-template-columns: minmax(160px, 1fr) 78px auto; gap: .55rem; align-items: center; }
	.radius-control input[type="range"] { width: 100%; accent-color: var(--brand); }
	.radius-control input[type="number"] { min-height: 38px; }
	.radius-unit { color: var(--color-muted); font-size: .82rem; font-weight: 700; }
	.access-grid { display: flex; gap: .5rem; flex-wrap: wrap; }
	.access-grid button {
		display: flex; align-items: center; gap: .45rem; border: 1px solid var(--color-border);
		background: var(--color-bg); color: var(--color-text); border-radius: 8px; cursor: pointer;
	}
	.access-grid button.active {
		border-color: var(--brand); background: color-mix(in srgb, var(--brand) 7%, var(--color-bg)); color: var(--brand);
	}
	.switch-row { display: flex; gap: .65rem; align-items: flex-start; padding: .7rem; border: 1px solid var(--color-border); border-radius: 8px; }
	.switch-row input { margin-top: .15rem; }
	.switch-row strong, .switch-row small { display: block; }
	.switch-row small { color: var(--color-muted); margin-top: .15rem; }
	.access-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
	.access-grid button { min-height: 104px; padding: .8rem; flex-direction: column; align-items: flex-start; justify-content: flex-start; text-align: left; }
	.access-grid strong { font-size: .9rem; color: inherit; }
	.access-grid span { color: var(--color-muted); font-size: .78rem; }
	.access-note, .warning-note {
		display: flex; flex-direction: column; gap: .15rem; padding: .75rem .85rem;
		border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-bg);
	}
	.access-note span { color: var(--color-muted); font-size: .85rem; }
	.warning-note { flex-direction: row; align-items: center; color: #92400e; background: #fffbeb; border-color: #fde68a; font-size: .86rem; }
	.modal-backdrop {
		position: fixed; inset: 0; z-index: 80;
		display: flex; align-items: center; justify-content: center;
		padding: 1rem; background: rgba(0,0,0,.42);
	}
	.modal {
		width: min(760px, 100%);
		max-height: min(760px, 88vh);
		display: flex; flex-direction: column;
		background: var(--color-surface); color: var(--color-text);
		border: 1px solid var(--color-border); border-radius: 12px;
		box-shadow: 0 24px 64px rgba(0,0,0,.24);
		overflow: hidden;
	}
	.modal-header {
		display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem;
		padding: 1rem 1rem .85rem; border-bottom: 1px solid var(--color-border);
	}
	.modal-header h2 { margin: 0; font-size: 1rem; line-height: 1.2; }
	.modal-header p { margin: .22rem 0 0; color: var(--color-muted); font-size: .82rem; line-height: 1.4; }
	.picker-toolbar {
		display: flex; align-items: center; gap: .5rem;
		padding: .65rem 1.25rem;
		border-bottom: 1px solid var(--color-border);
	}
	.picker-upload-btn { flex-shrink: 0; }
	.picker-uploading-dot {
		width: 8px; height: 8px; border-radius: 50%;
		background: var(--brand); flex-shrink: 0;
		animation: pulse 1s ease-in-out infinite;
	}
	@keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:1} }
	.sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
	.asset-picker-search {
		display: flex; align-items: center; gap: .5rem; flex: 1;
		padding: .4rem .6rem; border: 1px solid var(--color-border); border-radius: 7px;
		color: var(--color-muted); background: var(--color-bg);
	}
	.asset-picker-search input {
		width: 100%; border: 0; outline: 0; background: transparent;
		color: var(--color-text); font: inherit; font-size: .88rem;
	}
	.asset-picker-grid {
		display: grid; grid-template-columns: repeat(auto-fill, minmax(136px, 1fr)); gap: .75rem;
		padding: 1rem; overflow: auto;
	}
	.picker-empty {
		grid-column: 1 / -1;
		padding: 2.4rem 1rem;
		text-align: center;
		color: var(--color-muted);
		font-size: .88rem;
	}
	.picker-empty.error-state { color: #b91c1c; }
	.asset-picker-item {
		display: flex; flex-direction: column; gap: .35rem; text-align: left;
		min-width: 0; padding: 0; overflow: hidden; cursor: pointer;
		border: 1px solid var(--color-border); border-radius: 8px;
		background: var(--color-bg); color: var(--color-text);
	}
	.asset-picker-item:hover {
		border-color: var(--brand);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand) 10%, transparent);
	}
	.asset-picker-thumb {
		aspect-ratio: 4 / 3;
		display: grid; place-items: center;
		background:
			linear-gradient(45deg, color-mix(in srgb, var(--color-border) 45%, transparent) 25%, transparent 25%),
			linear-gradient(-45deg, color-mix(in srgb, var(--color-border) 45%, transparent) 25%, transparent 25%),
			linear-gradient(45deg, transparent 75%, color-mix(in srgb, var(--color-border) 45%, transparent) 75%),
			linear-gradient(-45deg, transparent 75%, color-mix(in srgb, var(--color-border) 45%, transparent) 75%),
			var(--color-surface);
		background-size: 16px 16px;
		background-position: 0 0, 0 8px, 8px -8px, -8px 0;
		overflow: hidden;
	}
	.asset-picker-thumb img { width: 100%; height: 100%; object-fit: contain; display: block; padding: .5rem; box-sizing: border-box; }
	.asset-picker-item span {
		padding: .05rem .65rem 0;
		font-size: .8rem; font-weight: 700;
		white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
	}
	.asset-picker-item small {
		padding: 0 .65rem .65rem;
		color: var(--color-muted); font-size: .7rem;
		white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
	}
	.save-bar {
		position: sticky; bottom: 1rem; z-index: 20; margin: 1.5rem auto 0; max-width: 680px;
		display: flex; align-items: center; justify-content: space-between; gap: 1rem;
		padding: .7rem .8rem; background: color-mix(in srgb, var(--color-surface) 94%, transparent);
		backdrop-filter: blur(10px); border: 1px solid var(--color-border); border-radius: 10px; box-shadow: 0 12px 32px rgba(0,0,0,.12);
	}
	.save-bar span { display: flex; align-items: center; gap: .45rem; color: var(--color-muted); font-size: .86rem; }
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
