<script lang="ts">
	import '../styles/global.css';
	import type { Snippet } from 'svelte';
	import { browser } from '$app/environment';
	import { setRuntimeBlocks } from '$lib/blocks';
	import { runtimeBlockDefinitions } from '$lib/plugins/runtime';
	import type { RuntimePluginInfo } from '$lib/plugins/runtime';

	const { children, data }: { children: Snippet; data: { runtimePlugins?: RuntimePluginInfo[] } } = $props();

	// Blocks of runtime plugins join the block registry in the browser — before
	// the pages render, and again when plugins change. The server registers
	// them itself (with the plugins' server-side extras).
	const register = (list: RuntimePluginInfo[] | undefined) => {
		if (browser) setRuntimeBlocks(runtimeBlockDefinitions((list ?? []).map((p) => p.manifest)));
	};
	// svelte-ignore state_referenced_locally
	register(data.runtimePlugins);
	$effect.pre(() => register(data.runtimePlugins));
</script>

<svelte:head>
	<!-- Custom elements of runtime plugins -->
	{#each data.runtimePlugins ?? [] as plugin (plugin.id)}
		{#if plugin.clientUrl}<script type="module" src={plugin.clientUrl}></script>{/if}
	{/each}
</svelte:head>

{@render children()}
