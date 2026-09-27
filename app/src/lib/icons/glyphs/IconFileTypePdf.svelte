<script lang="ts">
	import MaterialIcon from '../MaterialIcon.svelte';
	import svg from '@material-symbols/svg-300/outlined/picture_as_pdf.svg?raw';
	let props = $props();
</script>

<MaterialIcon {svg} {...props} />
