<script lang="ts">
	import { getPlugin } from '$lib/plugins';

	const { data } = $props();
	const Page = $derived(getPlugin(data.plugin)?.modules?.find((m) => m.id === data.module)?.pages[data.path]);
</script>

<svelte:head><title>{data.title} · Brandywine</title></svelte:head>

{#if Page}
	<Page data={data.pluginData} />
{/if}
