<script lang="ts">
	import type { SVGAttributes } from 'svelte/elements';

	// Renders one Material Symbols glyph (Outlined, weight 300) from its raw SVG.
	// `stroke` is accepted for call-site compatibility and ignored: the weight is
	// baked into the glyph set, so every icon in the product draws the same.
	type Props = Omit<SVGAttributes<SVGSVGElement>, 'stroke'> & {
		svg: string;
		size?: number | string;
		stroke?: number | string;
	};

	let { svg, size = 24, stroke: _stroke, class: className = '', ...rest }: Props = $props();

	const viewBox = $derived(/viewBox="([^"]+)"/.exec(svg)?.[1] ?? '0 -960 960 960');
	const inner = $derived(svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, ''));
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	width={size}
	height={size}
	{viewBox}
	fill="currentColor"
	aria-hidden="true"
	focusable="false"
	class="icon {className}"
	{...rest}
>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- static glyph markup from the @material-symbols package -->
	{@html inner}
</svg>
