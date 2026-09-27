<script lang="ts">
	import '../styles/global.css';
	import type { Snippet } from 'svelte';

	const { children }: { children: Snippet } = $props();
</script>

{@render children()}
