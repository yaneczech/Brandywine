<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { ActionData, PageData } from './$types';
	import { IconArrowRight, IconLock } from '$lib/icons';

	const { data, form }: { data: PageData; form: ActionData } = $props();

	function assetSrc(path: string | null | undefined): string | null {
		if (!path) return null;
		if (/^(https?:)?\/\//.test(path) || path.startsWith('/')) return path;
		return `/uploads/${path.replace(/^\/+/, '')}`;
	}

	const logoSrc = $derived(assetSrc(data.brand.logoPath));
	const accent = $derived(data.brand.primaryColor || '#4A1204');
	const locale = $derived(data.language);
</script>

<svelte:head>
	<title>{m.access_page_title({}, { locale })} · {data.brand.name}</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<main class="access-page" style={`--access-accent:${accent}`}>
	<section class="access-card" aria-labelledby="access-title">
		{#if logoSrc}
			<img class="brand-logo" src={logoSrc} alt={data.brand.name} />
		{:else}
			<div class="brand-mark" aria-hidden="true">{data.brand.name.slice(0, 1)}</div>
		{/if}

		<div class="lock-icon"><IconLock size={20} stroke={1.8} /></div>
		<h1 id="access-title">{m.access_title({}, { locale })}</h1>
		<p>{m.access_sub({ name: data.brand.name }, { locale })}</p>

		{#if form?.error}
			<div class="error" role="alert">{form.error}</div>
		{/if}

		<form method="POST">
			<input type="hidden" name="returnTo" value={form?.returnTo ?? data.returnTo} />
			<label for="manual-password">{m.access_password({}, { locale })}</label>
			<input
				id="manual-password"
				name="password"
				type="password"
				required
				autocomplete="current-password"
			/>
			<button type="submit">{m.access_submit({}, { locale })} <IconArrowRight size={16} stroke={2} /></button>
		</form>
	</section>
</main>

<style>
	.access-page {
		min-height: 100vh;
		display: grid;
		place-items: center;
		padding: 24px;
		background: #f5f4f1;
		color: #171717;
	}
	.access-card {
		width: min(100%, 420px);
		padding: 40px;
		border: 1px solid #e5e3de;
		border-radius: var(--radius-xl);
		background: #fff;
		box-shadow: 0 20px 50px rgba(20, 20, 20, .08);
	}
	.brand-logo { display: block; max-width: 160px; max-height: 52px; margin-bottom: 32px; object-fit: contain; object-position: left center; }
	.brand-mark { width: 46px; height: 46px; margin-bottom: 32px; display: grid; place-items: center; border-radius: var(--radius-lg); background: var(--access-accent); color: white; font-weight: 600; }
	.lock-icon { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 50%; background: color-mix(in srgb, var(--access-accent) 10%, white); color: var(--access-accent); }
	h1 { margin: 18px 0 8px; font-size: 1.6rem; line-height: 1.15; letter-spacing: -.03em; }
	p { margin: 0 0 28px; color: #6f6f6f; line-height: 1.55; }
	form { display: grid; gap: 10px; }
	label { font-size: var(--text-sm); font-weight: 600; }
	input { width: 100%; height: 46px; border: 1px solid #d7d4ce; border-radius: var(--radius-lg); padding: 0 13px; font: inherit; outline: none; }
	input:focus { border-color: var(--access-accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--access-accent) 16%, transparent); }
	button { height: 46px; margin-top: 5px; display: flex; align-items: center; justify-content: center; gap: 8px; border: 0; border-radius: var(--radius-lg); background: var(--access-accent); color: white; font: inherit; font-weight: 500; cursor: pointer; }
	button:hover { filter: brightness(.94); }
	.error { margin-bottom: 14px; padding: 10px 12px; border-radius: var(--radius); background: var(--color-danger-subtle); color: var(--color-danger); font-size: var(--text-base); }
	@media (max-width: 520px) { .access-card { padding: 28px 22px; } }
</style>
