<script lang="ts">
	import MaterialIcon from '../MaterialIcon.svelte';
	import svg from '@material-symbols/svg-300/outlined/arrow_forward.svg?raw';
	let props = $props();
</script>

<MaterialIcon {svg} {...props} />
