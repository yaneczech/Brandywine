<!--
  ManualHero — page header shared by the landing page and every manual page.
  Handles plain, colour and image backgrounds and keeps text readable on each.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { contrastRatio } from '$lib/utils/colors';

	const {
		title,
		description = null,
		featureImage = null,
		heroBgSize = null,
		bgColor = null,
		textColor = null,
		size = 'page',
		number = null,
		eyebrow,
		children,
	}: {
		title: string;
		description?: string | null;
		featureImage?: string | null;
		heroBgSize?: string | null;
		bgColor?: string | null;
		textColor?: string | null;
		size?: 'page' | 'landing';
		number?: string | null;
		eyebrow?: Snippet;
		children?: Snippet;
	} = $props();

	function assetSrc(path: string | null | undefined): string | null {
		if (!path) return null;
		if (/^(https?:)?\/\//.test(path) || path.startsWith('/')) return path;
		return `/uploads/${path.replace(/^\/+/, '')}`;
	}

	function readableTextColor(bg: string | null | undefined, preferred?: string | null): string | null {
		if (preferred) return preferred;
		if (!bg) return null;
		try {
			return contrastRatio('#FFFFFF', bg) >= contrastRatio('#171717', bg) ? '#FFFFFF' : '#171717';
		} catch {
			return null;
		}
	}

	const image = $derived(assetSrc(featureImage));
	const style = $derived.by(() => {
		const parts: string[] = [];
		if (bgColor) parts.push(`--hero-bg:${bgColor}`);
		// Custom text colour only makes sense on a custom background
		const txt = bgColor ? readableTextColor(bgColor, textColor) : image ? '#FFFFFF' : null;
		if (txt) parts.push(`--hero-text:${txt}`);
		if (image) {
			const mode = heroBgSize ?? 'cover';
			parts.push(`--hero-image:url("${image.replace(/"/g, '%22')}")`);
			parts.push(`--hero-size:${mode === 'tile' ? 'auto' : mode}`);
			parts.push(`--hero-repeat:${mode === 'tile' ? 'repeat' : 'no-repeat'}`);
		}
		return parts.join(';');
	});
</script>

<section
	class="hero"
	class:landing={size === 'landing'}
	class:has-bg={!!bgColor}
	class:has-img={!!image}
	{style}
>
	<div class="hero-copy">
		{#if eyebrow}<div class="hero-eyebrow">{@render eyebrow()}</div>{/if}
		<h1>{#if number}<span class="hero-num">{number}</span>{/if}{title}</h1>
		{#if description}
			<p class="hero-desc">{description}</p>
		{/if}
		{#if children}<div class="hero-extra">{@render children()}</div>{/if}
	</div>
</section>

<style>
	.hero {
		--hero-text: var(--manual-ink);
		--hero-muted: var(--manual-muted);
		position: relative;
		isolation: isolate;
		display: flex;
		align-items: flex-end;
		width: calc(100% + var(--manual-gutter));
		margin: 0 0 48px calc(-1 * var(--manual-gutter));
		padding: 56px var(--manual-page-pad) 40px;
		border-bottom: 1px solid var(--manual-border);
		overflow: hidden;
	}
	/* Height only where there is a picture or a colour field to show; a plain
	   header is as tall as its words, so the content starts above the fold */
	.hero.has-bg, .hero.has-img { min-height: 240px; }
	.hero.landing.has-bg, .hero.landing.has-img { min-height: 360px; }
	.hero.landing { padding-top: 72px; padding-bottom: 48px; }
	.hero.has-bg {
		--hero-muted: color-mix(in srgb, var(--hero-text) 76%, transparent);
		background: var(--hero-bg);
		border-bottom-color: transparent;
	}
	.hero.has-img {
		--hero-muted: color-mix(in srgb, var(--hero-text) 82%, transparent);
		border-bottom-color: transparent;
	}
	.hero.has-img::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -2;
		background-image: var(--hero-image);
		background-size: var(--hero-size, cover);
		background-repeat: var(--hero-repeat, no-repeat);
		background-position: center;
	}
	/* Scrim: darker towards the text so headlines stay legible on busy photos */
	.hero.has-img::after {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -1;
		background: linear-gradient(180deg, rgba(0,0,0,.08) 0%, rgba(0,0,0,.52) 100%);
	}
	.hero.has-img.has-bg::after {
		background: linear-gradient(180deg, color-mix(in srgb, var(--hero-bg) 40%, transparent), color-mix(in srgb, var(--hero-bg) 88%, transparent));
	}
	.hero-copy {
		display: flex;
		flex-direction: column;
		width: 100%;
		max-width: 880px;
	}
	.hero-eyebrow {
		margin-bottom: 16px;
		color: var(--hero-muted);
		font-size: var(--text-sm);
		font-weight: 500;
	}
	.hero:not(.has-bg):not(.has-img) .hero-eyebrow { color: var(--manual-muted); }
	.hero h1 {
		margin: 0;
		max-width: 20ch;
		color: var(--hero-text);
		font-size: clamp(2rem, 3.2vw, 3rem);
		font-weight: 500;
		line-height: 1.05;
		letter-spacing: var(--tracking-display);
		text-wrap: balance;
	}
	.hero-num {
		/* Superior figure scaled to the title: its cap line meets the title's
		   (raise = cap height × (1 − .32) ÷ .32 ≈ 1.49em), whatever the size */
		position: relative;
		top: -1.49em;
		margin-right: .35em;
		color: var(--hero-muted);
		font-size: .32em;
		font-weight: 400;
		letter-spacing: 0;
		font-variant-numeric: tabular-nums;
	}
	.hero.landing h1 { font-size: clamp(2.5rem, 4.4vw, 4rem); max-width: 16ch; }
	.hero-desc {
		max-width: 62ch;
		margin: 16px 0 0;
		color: var(--hero-muted);
		font-size: var(--text-xl);
		line-height: 1.55;
		text-wrap: pretty;
	}
	.hero-extra { margin-top: 24px; }

	@media (max-width: 900px) {
		.hero {
			width: 100%;
			min-height: 0;
			margin: 0 0 32px;
			padding: 40px 16px 28px;
		}
		.hero.landing { padding-top: 48px; }
	}
</style>
