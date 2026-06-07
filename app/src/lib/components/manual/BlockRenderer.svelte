<script lang="ts">
	import * as m from '$lib/paraglide/messages';

	type Block = {
		id: string; type: string;
		config: Record<string, unknown>;
		anchor: string | null;
		enabled: boolean;
	};

	const { block }: { block: Block } = $props();

	function slugify(s: string): string {
		return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
	}

	function assetSrc(path: unknown): string {
		const value = String(path ?? '');
		if (!value) return '';
		if (/^(https?:)?\/\//.test(value) || value.startsWith('/')) return value;
		return `/uploads/${value.replace(/^\/+/, '')}`;
	}

	const anchorId = $derived(block.anchor ?? (block.config.heading ? slugify(String(block.config.heading)) : undefined));
</script>

{#if !block.enabled}
	<!-- hidden block, skip render -->
{:else if block.type === 'divider'}
	<hr class="divider" id={anchorId} style="margin: {block.config.spacing ?? 4}rem 0" />

{:else if block.type === 'rich_text'}
	<section class="block" id={anchorId}>
		{#if block.config.heading}
			<h2 class="block-heading">{block.config.heading}</h2>
		{/if}
		{#if block.config.markdown}
			<!-- Markdown rendered as plain text for now; wire up a md parser later -->
			<div class="prose">{block.config.markdown}</div>
		{/if}
	</section>

{:else if block.type === 'image'}
	<section class="block" id={anchorId}>
		{#if block.config.heading}<h2 class="block-heading">{block.config.heading}</h2>{/if}
		{#if block.config.url}
			<figure class="img-figure" class:full-width={block.config.fullWidth}>
				<img src={assetSrc(block.config.url)} alt={String(block.config.alt ?? '')} class="block-img" />
				{#if block.config.caption}
					<figcaption class="img-caption">{block.config.caption}</figcaption>
				{/if}
			</figure>
		{/if}
	</section>

{:else if block.type === 'colors'}
	<section class="block" id={anchorId}>
		{#if block.config.heading}<h2 class="block-heading">{block.config.heading}</h2>{/if}
		<div class="colors-placeholder muted-block">
			<span class="placeholder-copy">{m.manual_color_system_placeholder()}</span>
		</div>
	</section>

{:else if block.type === 'typography'}
	<section class="block" id={anchorId}>
		{#if block.config.heading}<h2 class="block-heading">{block.config.heading}</h2>{/if}
		<div class="muted-block">
			<span class="placeholder-copy">{m.manual_typography_placeholder()}</span>
		</div>
	</section>

{:else if block.type === 'grid'}
	<section class="block" id={anchorId}>
		{#if block.config.heading}<h2 class="block-heading">{block.config.heading}</h2>{/if}
		<div class="grid-spec">
			<div class="grid-visual" style="
				--cols: {block.config.columns ?? 12};
				--gutter: {block.config.gutter ?? 24}px;
				--margin: {block.config.margin ?? 40}px;
			">
				{#each Array(Number(block.config.columns ?? 12)) as _}
					<div class="grid-col"></div>
				{/each}
			</div>
			<dl class="grid-meta">
				<div><dt>Sloupce</dt><dd>{block.config.columns ?? 12}</dd></div>
				<div><dt>Gutter</dt><dd>{block.config.gutter ?? 24}px</dd></div>
				<div><dt>Margin</dt><dd>{block.config.margin ?? 40}px</dd></div>
				<div><dt>Max šířka</dt><dd>{block.config.maxWidth ?? 1280}px</dd></div>
				{#if block.config.medium}<div><dt>Médium</dt><dd>{block.config.medium}</dd></div>{/if}
			</dl>
			{#if block.config.description}
				<p class="block-text">{block.config.description}</p>
			{/if}
		</div>
	</section>

{:else if block.type === 'do_dont'}
	<section class="block" id={anchorId}>
		{#if block.config.heading}<h2 class="block-heading">{block.config.heading}</h2>{/if}
		{#if Array.isArray(block.config.items)}
			<div class="do-dont-grid">
				{#each block.config.items as item}
					<div class="do-dont-item" class:is-do={item.type === 'do'} class:is-dont={item.type === 'dont'}>
						<span class="do-dont-badge">{item.type === 'do' ? 'Do' : 'Don\'t'}</span>
						<p>{item.text}</p>
					</div>
				{/each}
			</div>
		{/if}
	</section>

{:else if block.type === 'process'}
	<section class="block" id={anchorId}>
		{#if block.config.heading}<h2 class="block-heading">{block.config.heading}</h2>{/if}
		{#if Array.isArray(block.config.steps)}
			<ol class="process-list">
				{#each block.config.steps as step, i}
					<li class="process-step">
						<div class="step-num">{i + 1}</div>
						<div>
							<div class="step-title">{step.title}</div>
							{#if step.description}<p class="step-desc">{step.description}</p>{/if}
						</div>
					</li>
				{/each}
			</ol>
		{/if}
	</section>

{:else if block.type === 'accordion'}
	<section class="block" id={anchorId}>
		{#if block.config.heading}<h2 class="block-heading">{block.config.heading}</h2>{/if}
		{#if Array.isArray(block.config.items)}
			<div class="accordion">
				{#each block.config.items as item}
					<details class="accordion-item">
						<summary class="accordion-q">{item.question}</summary>
						<div class="accordion-a">{item.answer}</div>
					</details>
				{/each}
			</div>
		{/if}
	</section>

{:else if block.type === 'table'}
	<section class="block" id={anchorId}>
		{#if block.config.heading}<h2 class="block-heading">{block.config.heading}</h2>{/if}
		{#if Array.isArray(block.config.headers)}
			<div class="table-wrap">
				<table class="block-table">
					<thead><tr>{#each block.config.headers as h}<th>{h}</th>{/each}</tr></thead>
					<tbody>
						{#if Array.isArray(block.config.rows)}
							{#each block.config.rows as row}
								<tr>{#each row as cell}<td>{cell}</td>{/each}</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		{/if}
	</section>

{:else if block.type === 'html'}
	<section class="block" id={anchorId}>
		{#if block.config.heading}<h2 class="block-heading">{block.config.heading}</h2>{/if}
		{#if block.config.html}
			{#if block.config.showPreview !== false}
				<div class="html-preview">{@html block.config.html}</div>
			{/if}
			<pre class="code-block"><code>{block.config.html}</code></pre>
		{/if}
	</section>

{:else if block.type === 'code'}
	<section class="block" id={anchorId}>
		<pre class="code-block"><code>{block.config.code ?? ''}</code></pre>
	</section>

{:else}
	<!-- Generic fallback for unimplemented block types -->
	<section class="block muted-block" id={anchorId}>
		<span class="block-type-label">{block.type}</span>
		{#if block.config.heading}<h2 class="block-heading">{block.config.heading}</h2>{/if}
	</section>
{/if}

<style>
	.block {
		scroll-margin-top: 92px;
	}
	.block-heading {
		margin: 0 0 1rem;
		color: #171717;
		font-size: clamp(1.35rem, 2vw, 1.75rem);
		font-weight: 820;
		letter-spacing: 0;
		line-height: 1.18;
	}
	.block-text { color: #525252; line-height: 1.72; }

	hr.divider {
		border: none;
		border-top: 1px solid rgba(23,23,23,.1);
	}

	.prose {
		max-width: 760px;
		color: #3f3f3f;
		line-height: 1.8;
		font-size: 1rem;
		white-space: pre-wrap;
	}

	.img-figure { margin: 0; }
	.img-figure.full-width { width: 100%; }
	.block-img {
		display: block;
		max-width: 100%;
		border: 1px solid rgba(23,23,23,.08);
		border-radius: 10px;
		background: #f2f1ee;
	}
	.img-caption {
		margin-top: .7rem;
		color: #737373;
		font-size: .84rem;
		line-height: 1.5;
	}

	.grid-spec { display: flex; flex-direction: column; gap: 1.25rem; }
	.grid-visual {
		height: 72px;
		display: grid;
		grid-template-columns: repeat(var(--cols), 1fr);
		gap: var(--gutter);
		padding: 0 var(--margin);
		overflow: hidden;
		border: 1px solid rgba(23,23,23,.08);
		border-radius: 10px;
		background: #fff;
	}
	.grid-col {
		background: color-mix(in srgb, var(--manual-brand) 14%, transparent);
		border-radius: 2px;
	}
	.grid-meta {
		display: flex;
		flex-wrap: wrap;
		gap: .65rem 1.35rem;
	}
	.grid-meta div { display: flex; align-items: baseline; gap: .4rem; }
	.grid-meta dt {
		color: #8a8a8a;
		font-size: .75rem;
		font-weight: 650;
	}
	.grid-meta dd {
		margin: 0;
		color: #171717;
		font-size: .9rem;
		font-weight: 760;
	}

	.do-dont-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 12px;
	}
	.do-dont-item {
		padding: 18px;
		border-radius: 10px;
		font-size: .92rem;
		line-height: 1.6;
	}
	.do-dont-item p { margin: 0; }
	.is-do {
		background: #f4fbf5;
		border: 1px solid #cdebd2;
	}
	.is-dont {
		background: #fff5f3;
		border: 1px solid #f2d0c8;
	}
	.do-dont-badge {
		display: inline-flex;
		margin-bottom: .55rem;
		padding: 4px 8px;
		border-radius: 999px;
		background: rgba(255,255,255,.72);
		color: #171717;
		font-size: .7rem;
		font-weight: 820;
		text-transform: uppercase;
		letter-spacing: .06em;
	}

	.process-list {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: .9rem;
		margin: 0;
		padding: 0;
	}
	.process-step {
		display: flex;
		gap: 1rem;
		align-items: flex-start;
		padding: 16px 0;
		border-bottom: 1px solid rgba(23,23,23,.08);
	}
	.process-step:last-child { border-bottom: 0; }
	.step-num {
		width: 30px;
		height: 30px;
		border-radius: 50%;
		background: var(--manual-brand);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: .8rem;
		font-weight: 800;
		flex-shrink: 0;
	}
	.step-title {
		margin-bottom: .2rem;
		color: #171717;
		font-weight: 760;
		font-size: .96rem;
	}
	.step-desc {
		margin: 0;
		color: #686868;
		font-size: .9rem;
		line-height: 1.65;
	}

	.accordion { display: flex; flex-direction: column; gap: .6rem; }
	.accordion-item {
		overflow: hidden;
		border: 1px solid rgba(23,23,23,.09);
		border-radius: 10px;
		background: #fff;
	}
	.accordion-q {
		padding: .95rem 1rem;
		color: #171717;
		font-weight: 720;
		font-size: .94rem;
		cursor: pointer;
		list-style: none;
	}
	.accordion-q::-webkit-details-marker { display: none; }
	.accordion-a {
		padding: 0 1rem 1rem;
		color: #525252;
		font-size: .9rem;
		line-height: 1.72;
	}

	.table-wrap {
		overflow-x: auto;
		border: 1px solid rgba(23,23,23,.08);
		border-radius: 10px;
		background: #fff;
	}
	.block-table {
		width: 100%;
		border-collapse: collapse;
		font-size: .9rem;
	}
	.block-table th {
		text-align: left;
		padding: .75rem .9rem;
		background: #f3f2ef;
		border-bottom: 1px solid rgba(23,23,23,.1);
		color: #171717;
		font-weight: 760;
	}
	.block-table td {
		padding: .75rem .9rem;
		border-bottom: 1px solid rgba(23,23,23,.07);
		color: #3f3f3f;
	}
	.block-table tr:last-child td { border-bottom: none; }

	.html-preview {
		margin-bottom: .85rem;
		padding: 1.5rem;
		border: 1px solid rgba(23,23,23,.08);
		border-radius: 10px;
		background: #fff;
	}
	.code-block {
		overflow-x: auto;
		margin: 0;
		padding: 1rem 1.15rem;
		border-radius: 10px;
		background: #171717;
		color: #f7f7f7;
		font-family: "Fira Code", "SFMono-Regular", Consolas, monospace;
		font-size: .84rem;
		line-height: 1.65;
		white-space: pre;
	}

	.muted-block {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 1.35rem;
		border: 1px dashed rgba(23,23,23,.16);
		border-radius: 10px;
		background: rgba(255,255,255,.62);
		color: #737373;
	}
	.placeholder-copy {
		font-size: .88rem;
		line-height: 1.55;
	}
	.block-type-label {
		display: block;
		margin-bottom: .4rem;
		color: var(--manual-brand);
		font-size: .7rem;
		text-transform: uppercase;
		letter-spacing: .06em;
		font-weight: 780;
	}
</style>
