<!--
  Public view of a runtime-plugin block: HTML rendered on the server by the
  plugin (server.js render or the manifest template), or the plugin's custom
  element. The plugin is trusted code installed by an admin.
-->
<script lang="ts">
	import type { BlockRenderProps } from '$lib/blocks/types';
	import { elementHtml, renderTemplate, runtimeBlockSpec } from './runtime';

	const { block, html }: BlockRenderProps = $props();
	const spec = $derived(runtimeBlockSpec(block.type));
	const markup = $derived(
		html ?? (spec?.template ? renderTemplate(spec.template, block.config) : spec?.element ? elementHtml(spec.element, block.config) : '')
	);
</script>

<!-- eslint-disable-next-line svelte/no-at-html-tags -- output of an admin-installed plugin; template values are escaped -->
<div class="runtime-block">{@html markup}</div>
