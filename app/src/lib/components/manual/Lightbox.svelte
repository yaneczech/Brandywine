<!--
  Lightbox — full-screen image viewer with keyboard, swipe and download.
-->
<script lang="ts" module>
	export type LightboxImage = { src: string; alt: string; caption?: string; download?: string };
</script>

<script lang="ts">
	import { IconX, IconChevronLeft, IconChevronRight, IconDownload } from '$lib/icons';
	import { focusTrap } from '$lib/actions/focus-trap';
	import { useManualStrings } from '$lib/manual/ui-strings';

	let {
		images,
		index = $bindable<number | null>(null),
	}: { images: LightboxImage[]; index?: number | null } = $props();

	const strings = useManualStrings();
	const t = $derived(strings());
	const current = $derived(index !== null ? images[index] : null);
	let touchX = 0;

	function close() { index = null; }
	function step(dir: 1 | -1) {
		if (index === null || images.length < 2) return;
		index = (index + dir + images.length) % images.length;
	}
	function onKeydown(e: KeyboardEvent) {
		if (index === null) return;
		if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
		if (e.key === 'ArrowLeft')  { e.preventDefault(); step(-1); }
	}

	$effect(() => {
		if (index === null) return;
		const prev = document.documentElement.style.overflow;
		document.documentElement.style.overflow = 'hidden';
		return () => { document.documentElement.style.overflow = prev; };
	});
</script>

<svelte:window onkeydown={onKeydown} />

{#if current}
	<div
		class="lightbox"
		role="dialog"
		aria-modal="true"
		aria-label={current.alt || t.openImage}
		tabindex="-1"
		use:focusTrap={{ onEscape: close }}
		ontouchstart={(e) => { touchX = e.touches[0].clientX; }}
		ontouchend={(e) => {
			const dx = e.changedTouches[0].clientX - touchX;
			if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
		}}
	>
		<button class="lb-backdrop" tabindex="-1" aria-hidden="true" onclick={close}></button>

		<div class="lb-toolbar">
			{#if images.length > 1}
				<span class="lb-count">{t.imageOf((index ?? 0) + 1, images.length)}</span>
			{/if}
			<div class="lb-actions">
				{#if current.download}
					<a class="lb-btn" href={current.download} download aria-label={t.download} title={t.download}>
						<IconDownload size={18} stroke={1.8} />
					</a>
				{/if}
				<button class="lb-btn" onclick={close} aria-label={t.close} title={t.close}>
					<IconX size={20} stroke={1.8} />
				</button>
			</div>
		</div>

		<figure class="lb-figure">
			{#key current.src}
				<img src={current.src} alt={current.alt} />
			{/key}
			{#if current.caption}<figcaption>{current.caption}</figcaption>{/if}
		</figure>

		{#if images.length > 1}
			<button class="lb-nav prev" onclick={() => step(-1)} aria-label={t.previous}><IconChevronLeft size={22} stroke={1.8} /></button>
			<button class="lb-nav next" onclick={() => step(1)} aria-label={t.next}><IconChevronRight size={22} stroke={1.8} /></button>
		{/if}
	</div>
{/if}

<style>
	.lightbox {
		position: fixed;
		inset: 0;
		z-index: 300;
		display: grid;
		place-items: center;
		padding: 64px 72px 40px;
		animation: lb-in .18s ease;
	}
	.lb-backdrop {
		position: absolute;
		inset: 0;
		border: 0;
		background: rgba(10, 10, 10, .92);
		-webkit-backdrop-filter: blur(6px);
		backdrop-filter: blur(6px);
		cursor: zoom-out;
	}
	.lb-toolbar {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		z-index: 2;
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 60px;
		padding: 0 16px 0 20px;
		color: rgba(255,255,255,.8);
		font-size: var(--text-sm);
		font-variant-numeric: tabular-nums;
	}
	.lb-actions { display: flex; gap: 8px; margin-left: auto; }
	.lb-btn, .lb-nav {
		display: grid;
		place-items: center;
		width: 42px;
		height: 42px;
		border: 0;
		border-radius: var(--radius-full);
		background: rgba(255,255,255,.08);
		color: #fff;
		cursor: pointer;
		transition: background .15s ease;
	}
	.lb-btn:hover, .lb-nav:hover { background: rgba(255,255,255,.18); }
	.lb-figure {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		max-width: 100%;
		max-height: 100%;
		margin: 0;
		pointer-events: none;
	}
	.lb-figure img {
		display: block;
		max-width: min(1600px, 100%);
		max-height: calc(100dvh - 150px);
		object-fit: contain;
		border-radius: var(--radius-sm);
		pointer-events: auto;
		animation: lb-img .22s cubic-bezier(.2,.7,.2,1);
	}
	.lb-figure figcaption { color: rgba(255,255,255,.78); font-size: var(--text-base); text-align: center; }
	.lb-nav { position: absolute; top: 50%; z-index: 2; transform: translateY(-50%); }
	.lb-nav.prev { left: 16px; }
	.lb-nav.next { right: 16px; }
	@keyframes lb-in { from { opacity: 0; } }
	@keyframes lb-img { from { opacity: 0; transform: scale(.98); } }
	@media (max-width: 640px) {
		.lightbox { padding: 60px 8px 76px; }
		.lb-nav { top: auto; bottom: 16px; transform: none; }
		.lb-nav.prev { left: calc(50% - 50px); }
		.lb-nav.next { right: calc(50% - 50px); }
	}
</style>
