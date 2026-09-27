<!--
  PageCards — navigation cards for a set of manual pages (landing index and
  "pages in this section" lists).
-->
<script lang="ts">
	import { IconArrowUpRight } from '$lib/icons';

	type CardPage = {
		id: string;
		title: string;
		slug: string;
		description: string | null;
		featureImage?: string | null;
		bgColor?: string | null;
		textColor?: string | null;
	};

	type Preview =
		| { kind: 'colors'; swatches: string[] }
		| { kind: 'type'; fontName: string | null }
		| { kind: 'image'; src: string; contain: boolean }
		| null;

	const {
		pages,
		baseHref = '',
		previews = {},
		numbers = new Map<string, string>(),
	}: { pages: CardPage[]; baseHref?: string; previews?: Record<string, Preview>; numbers?: Map<string, string> } = $props();

	function assetSrc(path: string | null | undefined): string | null {
		if (!path) return null;
		if (/^(https?:)?\/\//.test(path) || path.startsWith('/')) return path;
		return `/uploads/${path.replace(/^\/+/, '')}`;
	}
</script>

<ul class="page-cards">
	{#each pages as p, i (p.id)}
		{@const img = assetSrc(p.featureImage)}
		{@const preview = img ? null : previews[p.id] ?? null}
		<li>
			<a href="{baseHref.replace(/\/$/, '')}/{p.slug}" class="page-card">
				<div
					class="card-visual"
					class:has-img={!!img}
					class:has-preview={!!preview}
					class:has-color={!!p.bgColor}
					style={p.bgColor ? `--card-bg:${p.bgColor};--card-fg:${p.textColor ?? '#fff'}` : ''}
				>
					{#if img}
						<img src={img} alt="" loading="lazy" decoding="async" />
					{:else if preview?.kind === 'colors'}
						<span class="pv-colors" aria-hidden="true">
							{#each preview.swatches as hex, si (si)}<span style="background:{hex}"></span>{/each}
						</span>
					{:else if preview?.kind === 'type'}
						<span class="pv-type" aria-hidden="true" style={preview.fontName ? `font-family:'${preview.fontName.replace(/'/g, '')}', var(--manual-font)` : ''}>Aa</span>
					{:else if preview?.kind === 'image'}
						<span class="pv-image" class:contain={preview.contain} aria-hidden="true">
							<img src={assetSrc(preview.src)} alt="" loading="lazy" decoding="async" />
						</span>
					{:else}
						{#if !numbers.size}<span class="card-index" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>{/if}
					{/if}
				</div>
				<div class="card-body">
					<span class="card-title">{#if numbers.get(p.id)}<span class="card-num">{numbers.get(p.id)}</span>{/if}{p.title}</span>
					{#if p.description}
						<span class="card-desc">{p.description}</span>
					{/if}
				</div>
				<span class="card-arrow" aria-hidden="true"><IconArrowUpRight size={18} stroke={1.8} /></span>
			</a>
		</li>
	{/each}
</ul>

<style>
	.page-cards {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
		gap: 36px 20px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.page-cards li { display: flex; }
	.page-card {
		position: relative;
		display: flex;
		flex: 1;
		flex-direction: column;
		min-width: 0;
		color: var(--manual-ink);
		text-decoration: none;
	}
	.card-visual {
		--card-bg: var(--manual-stage);
		--card-fg: var(--manual-brand);
		position: relative;
		display: flex;
		align-items: flex-end;
		aspect-ratio: 4 / 3;
		padding: 16px;
		overflow: hidden;
		border-radius: var(--manual-radius);
		background: var(--card-bg);
		color: var(--card-fg);
	}
	.card-visual img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform .5s var(--manual-ease);
	}
	.page-card:hover .card-visual img { transform: scale(1.035); }
	/* Auto previews (no feature image) */
	.card-visual.has-preview:not(.has-color) { --card-bg: var(--manual-stage); }
	.pv-colors { position: absolute; inset: 0; display: flex; flex-direction: column; }
	.pv-colors span { flex: 1; }
	.pv-type {
		position: absolute; inset: 0; display: grid; place-items: center;
		color: var(--card-fg); font-size: clamp(3.5rem, 7vw, 5.5rem); font-weight: 500; letter-spacing: -.04em; line-height: 1;
	}
	.card-visual.has-preview:not(.has-color) .pv-type { color: var(--manual-ink); }
	.pv-image { position: absolute; inset: 0; }
	.pv-image img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
	.pv-image.contain { background: #fff; }
	.card-visual.has-color .pv-image.contain { background: var(--card-bg); }
	.pv-image.contain img { inset: 18% 22%; width: 56%; height: 64%; object-fit: contain; }
	.page-card:hover .pv-image.contain img { transform: scale(1.06); }
	.card-index {
		font-size: 2.4rem;
		font-weight: 300;
		letter-spacing: var(--tracking-display);
		line-height: 1;
		opacity: .85;
		font-variant-numeric: tabular-nums;
	}
	.card-body {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 8px;
		padding: 16px 32px 0 0;
	}
	.card-title {
		font-size: var(--text-lg);
		font-weight: 500;
		line-height: 1.3;
		letter-spacing: -.012em;
	}
	.card-desc {
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
		color: var(--manual-muted);
		font-size: var(--text-base);
		line-height: 1.5;
	}
	.card-arrow {
		position: absolute;
		right: 0;
		bottom: auto;
		top: calc(100% - 3.1rem);
		color: var(--manual-muted);
		transition: color .2s ease, transform .2s var(--manual-ease);
	}
	.page-card:hover .card-arrow { color: var(--manual-ink); transform: translate(2px, -2px); }
	.card-num { margin-right: .5em; color: var(--manual-muted); font-weight: 400; font-variant-numeric: tabular-nums; }
	.page-card:hover .card-title { text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 4px; }
</style>
