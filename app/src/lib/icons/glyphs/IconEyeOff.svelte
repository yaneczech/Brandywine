<script lang="ts">
	import MaterialIcon from '../MaterialIcon.svelte';
	import svg from '@material-symbols/svg-300/outlined/visibility_off.svg?raw';
	let props = $props();
</script>

<MaterialIcon {svg} {...props} />
