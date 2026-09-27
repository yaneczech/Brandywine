<script lang="ts">
	import { page } from '$app/state';
	import { useManualStrings } from '$lib/manual/ui-strings';
	import { IconArrowLeft } from '$lib/icons';

	const strings = useManualStrings();
	const t = $derived(strings());
	const notFound = $derived(page.status === 404);
</script>

<svelte:head><title>{notFound ? t.notFoundTitle : t.errorTitle}</title></svelte:head>

<section class="manual-error">
	<span class="status">{page.status}</span>
	<h1>{notFound ? t.notFoundTitle : t.errorTitle}</h1>
	<p>{notFound ? t.notFoundBody : t.errorBody}</p>
	<a href="/" class="home-link"><IconArrowLeft size={16} stroke={1.5} />{t.backHome}</a>
</section>

<style>
	.manual-error {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		max-width: 560px;
		padding: clamp(64px, 14vh, 160px) var(--manual-page-pad, 48px) 96px 0;
	}
	.status {
		font-family: var(--manual-mono);
		font-size: var(--text-xs);
		letter-spacing: var(--tracking-eyebrow);
		color: var(--manual-muted);
		padding-bottom: var(--space-4);
		margin-bottom: var(--space-8);
		border-bottom: 1px solid var(--manual-border-strong);
		min-width: 64px;
	}
	h1 {
		font-size: clamp(2.25rem, 1.6rem + 2.4vw, 3.5rem);
		font-weight: 600;
		letter-spacing: var(--tracking-display);
		line-height: 1.02;
		color: var(--manual-ink);
	}
	p {
		margin-top: var(--space-5);
		font-size: var(--text-lg);
		line-height: var(--leading-relaxed);
		color: var(--manual-muted);
	}
	.home-link {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		margin-top: var(--space-10);
		height: 40px;
		padding: 0 16px 0 12px;
		border: 1px solid var(--manual-border-strong);
		border-radius: var(--manual-radius);
		color: var(--manual-ink);
		font-size: var(--text-sm);
		font-weight: 500;
		text-decoration: none;
		transition: background var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease);
	}
	.home-link:hover { background: var(--manual-hover); }
	.home-link :global(svg) { transition: transform var(--dur) var(--ease); }
	.home-link:hover :global(svg) { transform: translateX(-2px); }
	@media (max-width: 900px) {
		.manual-error { padding: 72px var(--manual-page-pad, 16px) 72px; }
	}
</style>
