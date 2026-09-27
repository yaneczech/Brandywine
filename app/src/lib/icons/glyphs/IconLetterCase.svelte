<script lang="ts">
	import MaterialIcon from '../MaterialIcon.svelte';
	import svg from '@material-symbols/svg-300/outlined/match_case.svg?raw';
	let props = $props();
</script>

<MaterialIcon {svg} {...props} />
