<script lang="ts">
	import { page } from '$app/state';
	import * as m from '$lib/paraglide/messages';
	import { IconArrowLeft } from '@tabler/icons-svelte';

	const notFound = $derived(page.status === 404);
	const inAdmin = $derived(page.url.pathname.startsWith('/admin'));
</script>

<svelte:head><title>{notFound ? m.error_not_found_title() : m.error_generic_title()} · Brandywine</title></svelte:head>

<main class="error-page">
	<span class="status">{page.status}</span>
	<h1>{notFound ? m.error_not_found_title() : m.error_generic_title()}</h1>
	<p>{notFound ? m.error_not_found_body() : m.error_generic_body()}</p>
	<a href={inAdmin ? '/admin' : '/'} class="btn btn-secondary"><IconArrowLeft size={16} stroke={1.5} />{m.error_back()}</a>
</main>

<style>
	.error-page {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		justify-content: center;
		max-width: 560px;
		margin: 0 auto;
		padding: var(--space-16) var(--space-6);
	}
	.status {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--color-muted);
		padding-bottom: var(--space-4);
		margin-bottom: var(--space-8);
		border-bottom: 1px solid var(--color-border-strong);
		min-width: 64px;
	}
	h1 {
		font-size: var(--text-4xl);
		font-weight: 600;
		letter-spacing: var(--tracking-display);
		line-height: 1.05;
	}
	p {
		margin: var(--space-4) 0 var(--space-8);
		font-size: var(--text-md);
		color: var(--color-muted);
		line-height: var(--leading-relaxed);
	}
</style>
