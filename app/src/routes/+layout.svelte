<script lang="ts">
	import '../styles/global.css';
	import { ParaglideJS } from '@inlang/paraglide-sveltekit';
	import { i18n } from '$lib/i18n';
	import type { LayoutData } from './$types';

	const { children, data }: { children: any; data: LayoutData } = $props();

	// data.lang is resolved server-side by i18n.handle() from the paraglide_lang cookie.
	// Passing it as a prop ensures ParaglideJS uses the correct language even for excluded
	// routes like /admin/* where the URL carries no language prefix.
	const lang = $derived(data.lang as 'en' | 'cs');
</script>

<ParaglideJS {i18n} languageTag={lang}>
	{@render children()}
</ParaglideJS>
