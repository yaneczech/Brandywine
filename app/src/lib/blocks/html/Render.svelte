<script lang="ts">
	import type { BlockRenderProps } from '../types';
	import { sandboxedHtmlPreview } from '../_shared/content';
	import { useManualStrings } from '$lib/manual/ui-strings';

	const { block }: BlockRenderProps = $props();
	const strings = useManualStrings();
	const t = $derived(strings());
</script>

{#if block.config.html}
	{#if block.config.showPreview !== false}
		<iframe class="html-preview" title={t.htmlPreview} sandbox="" srcdoc={sandboxedHtmlPreview(block.config.html)}></iframe>
	{/if}
	<pre class="code-block"><code>{block.config.html}</code></pre>
{/if}

<style>
	.html-preview { display: block; width: 100%; min-height: 220px; box-sizing: border-box; margin-bottom: 12px; border: 0; border-radius: var(--manual-radius); background: #fff; box-shadow: inset 0 0 0 1px color-mix(in srgb, #000 7%, transparent); }
</style>
