<script lang="ts">
	import MaterialIcon from '../MaterialIcon.svelte';
	import svg from '@material-symbols/svg-400/outlined/light_mode.svg?raw';
	let props = $props();
</script>

<MaterialIcon {svg} {...props} />
