<script lang="ts">
	import MaterialIcon from '../MaterialIcon.svelte';
	import svg from '@material-symbols/svg-400/outlined/keyboard_arrow_down.svg?raw';
	let props = $props();
</script>

<MaterialIcon {svg} {...props} />
