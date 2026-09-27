<!--
  AssetPickerModal — pick a single asset from the library (or upload one).
  Props:
    open        — whether the modal is visible
    mimeFilter  — 'image' | 'all' (default 'image')
    title       — optional heading (defaults to "Choose an asset")
    description — optional helper line under the heading
    onPick      — called with the asset URL (and the asset) when chosen
    onClose     — called when closed without choosing
-->
<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { IconSearch, IconX, IconUpload, IconPhoto } from '$lib/icons';
	import AssetThumb from '$lib/components/admin/AssetThumb.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { toast } from '$lib/ui/toast.svelte';

	type Asset = {
		id: string;
		filename: string;
		mime: string;
		size: number;
		storagePath: string;
		thumbnailPath: string | null;
		folderId: string | null;
		tags: string[] | null;
		createdAt: string | Date;
	};

	const {
		open = false,
		mimeFilter = 'image',
		title,
		description,
		onPick,
		onClose
	}: {
		open?: boolean;
		mimeFilter?: 'image' | 'all';
		title?: string;
		description?: string;
		onPick: (...args: [string, Asset]) => void;
		onClose: () => void;
	} = $props();

	type TypeKey = 'all' | 'image' | 'document' | 'video' | 'other';

	let assets = $state<Asset[]>([]);
	let loading = $state(false);
	let uploading = $state(false);
	let search = $state('');
	// svelte-ignore state_referenced_locally
	let typeFilter = $state<TypeKey>(mimeFilter === 'all' ? 'all' : 'image');
	let fileInputEl = $state<HTMLInputElement | null>(null);

	$effect(() => {
		void typeFilter;
		if (open) loadAssets();
	});

	async function loadAssets() {
		loading = true;
		try {
			const query = typeFilter === 'all' ? 'limit=200' : `limit=200&type=${encodeURIComponent(typeFilter)}`;
			const res = await fetch(`/api/assets?${query}`);
			if (res.ok) assets = (await res.json()).data ?? [];
		} finally {
			loading = false;
		}
	}

	function assetUrl(a: Asset): string {
		return `/uploads/${a.storagePath.replace(/\\/g, '/')}`;
	}


	const filtered = $derived(assets.filter((a) => {
		if (!search) return true;
		const q = search.toLowerCase();
		return a.filename.toLowerCase().includes(q) || (a.tags ?? []).some((t) => t.includes(q));
	}));

	const typeTabs = $derived<{ id: TypeKey; label: string }[]>([
		{ id: 'all', label: m.common_all() },
		{ id: 'image', label: m.picker_images() },
		{ id: 'document', label: m.picker_documents() },
		{ id: 'video', label: m.picker_video() },
		{ id: 'other', label: m.common_other() },
	]);

	async function handleUpload(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		input.value = '';
		uploading = true;
		try {
			const fd = new FormData();
			fd.append('file', file);
			const res = await fetch('/api/assets', { method: 'POST', body: fd });
			if (!res.ok) { toast.error(m.typo_upload_failed()); return; }
			const uploaded = (await res.json()) as Asset;
			// An upload from inside the picker is an explicit choice
			onPick(assetUrl(uploaded), uploaded);
		} finally {
			uploading = false;
		}
	}
</script>

<Modal {open} title={title ?? m.picker_title()} {description} size="xl" {onClose} initialFocus=".picker-search input">
	<div class="picker-toolbar">
		<label class="picker-search">
			<IconSearch size={15} stroke={1.5} />
			<input type="text" bind:value={search} placeholder={m.assets_search()} />
			{#if search}
				<button type="button" onclick={() => (search = '')} aria-label={m.common_close()}><IconX size={13} stroke={1.75} /></button>
			{/if}
		</label>
		{#if mimeFilter === 'all'}
			<Tabs size="sm" label={m.picker_title()} items={typeTabs} bind:value={typeFilter} />
		{/if}
	</div>

	{#if loading}
		<div class="picker-grid" aria-busy="true">
			{#each Array(8) as _, i (i)}
				<div class="asset-tile skeleton"><div class="tile-thumb ui-skeleton"></div><div class="ui-skeleton sk-line"></div></div>
			{/each}
		</div>
	{:else if filtered.length === 0}
		<EmptyState compact icon={search ? IconSearch : IconPhoto} title={m.picker_empty()} />
	{:else}
		<div class="picker-grid">
			{#each filtered as asset (asset.id)}
				<button type="button" class="asset-tile" title={asset.filename} onclick={() => onPick(assetUrl(asset), asset)}>
					<div class="tile-thumb">
						<AssetThumb mime={asset.mime} thumbnailPath={asset.thumbnailPath} assetId={asset.id} filename={asset.filename} />
					</div>
					<span class="asset-name">{asset.filename}</span>
				</button>
			{/each}
		</div>
	{/if}

	{#snippet footer()}
		<span class="picker-count ui-modal-foot-start">
			{filtered.length === 1 ? m.picker_count_one() : m.picker_count({ count: String(filtered.length) })}
		</span>
		<label class="btn btn-secondary" class:disabled={uploading}>
			<input bind:this={fileInputEl} type="file" accept={mimeFilter === 'image' ? 'image/*,.svg' : undefined} onchange={handleUpload} hidden />
			{#if uploading}<span class="ui-spinner" aria-hidden="true"></span>{m.common_uploading()}{:else}<IconUpload size={15} stroke={1.5} /> {m.picker_upload()}{/if}
		</label>
		<button type="button" class="btn btn-secondary" onclick={onClose}>{m.common_cancel()}</button>
	{/snippet}
</Modal>

<style>
	.picker-toolbar {
		position: sticky;
		top: calc(-1 * var(--space-5));
		z-index: 1;
		display: flex;
		align-items: center;
		gap: var(--space-3);
		margin: calc(-1 * var(--space-5)) calc(-1 * var(--space-6)) var(--space-5);
		padding: var(--space-5) var(--space-6) var(--space-4);
		background: var(--color-surface);
	}
	.picker-search {
		display: flex;
		align-items: center;
		gap: 8px;
		flex: 1;
		height: var(--control-h);
		padding: 0 8px 0 12px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		background: var(--color-surface);
		color: var(--color-muted);
		box-shadow: var(--shadow-xs);
		transition: border-color var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease);
	}
	.picker-search:focus-within { border-color: var(--color-border-focus); box-shadow: var(--focus-ring); }
	.picker-search input { flex: 1; min-width: 0; border: 0; outline: none; background: transparent; color: var(--color-text); font-size: var(--text-base); }
	.picker-search button { display: grid; place-items: center; width: 22px; height: 22px; border: 0; border-radius: var(--radius-sm); background: none; color: var(--color-muted); }
	.picker-search button:hover { background: var(--color-hover); color: var(--color-text); }

	.picker-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: var(--space-4) var(--space-3);
	}
	.asset-tile {
		display: flex;
		flex-direction: column;
		gap: 8px;
		min-width: 0;
		padding: 0;
		border: 0;
		background: none;
		text-align: left;
	}
	.tile-thumb {
		position: relative;
		aspect-ratio: 4 / 3;
		overflow: hidden;
		border-radius: var(--radius);
		background: var(--color-surface-raised);
		box-shadow: 0 0 0 1px var(--color-border);
		transition: box-shadow var(--dur-fast) var(--ease);
	}
	.asset-tile:hover .tile-thumb,
	.asset-tile:focus-visible .tile-thumb { box-shadow: 0 0 0 2px var(--color-accent); }
	.asset-tile:focus-visible { outline: none; }
	.asset-name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: var(--text-xs);
		color: var(--color-text-secondary);
	}
	.skeleton .tile-thumb { box-shadow: none; }
	.sk-line { height: 10px; width: 70%; }
	.picker-count { font-size: var(--text-xs); color: var(--color-muted); font-variant-numeric: tabular-nums; }
	label.btn { cursor: pointer; }
	label.btn.disabled { opacity: 0.5; pointer-events: none; }
</style>
