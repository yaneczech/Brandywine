<script lang="ts">
	import { getPlugin } from '$lib/plugins';

	const { data } = $props();
	const Page = $derived(getPlugin(data.plugin)?.modules?.find((m) => m.id === data.module)?.pages[data.path]);

	// Runtime plugins: a custom element that receives the server data as `data`
	let el = $state<HTMLElement | null>(null);
	$effect(() => {
		if (el) (el as HTMLElement & { data: unknown }).data = data.pluginData;
	});
</script>

<svelte:head><title>{data.title} · Brandywine</title></svelte:head>

{#if Page}
	<Page data={data.pluginData as Record<string, unknown>} />
{:else if data.element}
	<div class="ap">
		<div class="ap-topbar">
			<div><h1 class="ap-title">{data.title}</h1></div>
		</div>
		<div class="ap-content">
			<svelte:element this={data.element} bind:this={el}></svelte:element>
		</div>
	</div>
{/if}
