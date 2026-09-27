<script lang="ts">
	import type { BlockRenderProps } from '../types';
	import LogoDownload from '$lib/components/manual/LogoDownload.svelte';

	const { block }: BlockRenderProps = $props();
</script>

<LogoDownload blockId={block.id} config={block.config} />
