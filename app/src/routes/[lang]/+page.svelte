<script lang="ts">
	const { data } = $props();
</script>

<h1>Brandywine</h1>
<p>Language: {data.lang}</p>
<a href="/{data.lang}/manual">Brand Manual</a>
