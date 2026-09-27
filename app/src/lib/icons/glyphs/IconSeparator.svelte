<script lang="ts">
	import MaterialIcon from '../MaterialIcon.svelte';
	import svg from '@material-symbols/svg-300/outlined/horizontal_rule.svg?raw';
	let props = $props();
</script>

<MaterialIcon {svg} {...props} />
