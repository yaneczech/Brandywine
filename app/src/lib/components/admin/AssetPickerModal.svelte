<!--
  AssetPickerModal — inline modal for picking a single asset from the asset library.
  Props:
    open       — whether the modal is visible
    mimeFilter — 'image' | 'all' (default 'image')
    onPick     — called with asset URL when user selects an asset
    onClose    — called when user closes without selecting
-->
<script lang="ts">
	import { IconSearch, IconX, IconPhoto, IconFileText, IconVideo, IconFile, IconCheck } from '@tabler/icons-svelte';

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
		onPick,
		onClose
	}: {
		open?: boolean;
		mimeFilter?: 'image' | 'all';
		onPick: (url: string, asset: Asset) => void;
		onClose: () => void;
	} = $props();

	let assets      = $state<Asset[]>([]);
	let loading     = $state(false);
	let search      = $state('');
	let typeFilter  = $state<string>(mimeFilter === 'all' ? 'all' : 'image');
	let hoveredId   = $state<string | null>(null);

	// Fetch assets when modal opens
	$effect(() => {
		if (open) {
			loadAssets();
		}
	});

	async function loadAssets() {
		loading = true;
		try {
			const params = new URLSearchParams({ limit: '200' });
			if (typeFilter !== 'all') params.set('type', typeFilter);
			const res = await fetch(`/api/assets?${params}`);
			if (res.ok) {
				const body = await res.json();
				assets = body.data ?? [];
			}
		} finally {
			loading = false;
		}
	}

	// Re-fetch when type filter changes
	$effect(() => {
		typeFilter;
		if (open) loadAssets();
	});

	function thumbUrl(a: Asset): string | null {
		if (a.thumbnailPath) return `/uploads/${a.thumbnailPath.replace(/\\/g, '/')}`;
		if (a.mime.startsWith('image/')) return `/api/assets/${a.id}/download`;
		return null;
	}

	function assetUrl(a: Asset): string {
		return `/api/assets/${a.id}/download`;
	}

	function mimeCategory(mime: string) {
		if (mime.startsWith('image/')) return 'image';
		if (mime.startsWith('video/')) return 'video';
		if (mime.startsWith('font/'))  return 'font';
		if (mime.includes('pdf') || mime === 'application/postscript') return 'document';
		return 'other';
	}

	const filtered = $derived(assets.filter(a => {
		if (search) {
			const q = search.toLowerCase();
			if (!a.filename.toLowerCase().includes(q) && !(a.tags ?? []).some(t => t.includes(q))) return false;
		}
		return true;
	}));

	const TYPE_TABS = mimeFilter === 'image'
		? [{ key: 'image', label: 'Obrázky' }]
		: [
			{ key: 'all',      label: 'Vše' },
			{ key: 'image',    label: 'Obrázky' },
			{ key: 'document', label: 'Dokumenty' },
			{ key: 'video',    label: 'Video' },
			{ key: 'other',    label: 'Ostatní' },
		];

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}

	function handleBackdrop(e: MouseEvent) {
		if ((e.target as HTMLElement).classList.contains('picker-backdrop')) onClose();
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div class="picker-backdrop" role="dialog" aria-modal="true" onkeydown={handleKeydown} onclick={handleBackdrop}>
		<div class="picker-modal">
			<div class="picker-header">
				<span class="picker-title">Vybrat asset</span>
				<button type="button" class="picker-close" onclick={onClose} aria-label="Zavřít">
					<IconX size={16} />
				</button>
			</div>

			<div class="picker-toolbar">
				<div class="picker-search">
					<IconSearch size={13} />
					<input
						type="text"
						bind:value={search}
						placeholder="Hledat…"
						autofocus
					/>
					{#if search}
						<button type="button" onclick={() => (search = '')} aria-label="Vymazat"><IconX size={12} /></button>
					{/if}
				</div>

				{#if TYPE_TABS.length > 1}
					<div class="type-tabs">
						{#each TYPE_TABS as tab}
							<button
								type="button"
								class="type-tab"
								class:active={typeFilter === tab.key}
								onclick={() => (typeFilter = tab.key)}
							>{tab.label}</button>
						{/each}
					</div>
				{/if}
			</div>

			<div class="picker-grid-wrap">
				{#if loading}
					<div class="picker-empty">Načítám…</div>
				{:else if filtered.length === 0}
					<div class="picker-empty">Žádné assetyy nenalezeny</div>
				{:else}
					<div class="picker-grid">
						{#each filtered as asset (asset.id)}
							{@const thumb = thumbUrl(asset)}
							{@const cat   = mimeCategory(asset.mime)}
							<button
								type="button"
								class="asset-tile"
								class:hovered={hoveredId === asset.id}
								title={asset.filename}
								onmouseenter={() => (hoveredId = asset.id)}
								onmouseleave={() => (hoveredId = null)}
								onclick={() => onPick(assetUrl(asset), asset)}
							>
								<div class="asset-thumb">
									{#if thumb}
										<img src={thumb} alt={asset.filename} loading="lazy" />
									{:else if cat === 'video'}
										<IconVideo size={28} stroke={1.3} />
									{:else if cat === 'document'}
										<IconFileText size={28} stroke={1.3} />
									{:else}
										<IconFile size={28} stroke={1.3} />
									{/if}
								</div>
								<div class="asset-name">{asset.filename}</div>
								<div class="asset-check"><IconCheck size={14} /></div>
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<div class="picker-footer">
				<span class="picker-count">{filtered.length} {filtered.length === 1 ? 'asset' : 'assetů'}</span>
				<button type="button" class="btn-cancel" onclick={onClose}>Zrušit</button>
			</div>
		</div>
	</div>
{/if}

<style>
.picker-backdrop {
	position: fixed;
	inset: 0;
	z-index: 1000;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(0,0,0,.45);
	backdrop-filter: blur(2px);
}
.picker-modal {
	display: flex;
	flex-direction: column;
	width: min(780px, 96vw);
	max-height: min(640px, 90vh);
	border-radius: 14px;
	border: 1px solid var(--color-border);
	background: var(--color-surface);
	box-shadow: 0 24px 64px rgba(0,0,0,.22);
	overflow: hidden;
}
.picker-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: .9rem 1rem .7rem;
	border-bottom: 1px solid var(--color-border);
	flex-shrink: 0;
}
.picker-title {
	font-size: .95rem;
	font-weight: 650;
	color: var(--color-text);
}
.picker-close {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	border: 0;
	border-radius: 7px;
	background: transparent;
	color: var(--color-muted);
	cursor: pointer;
}
.picker-close:hover {
	background: var(--color-surface-raised);
	color: var(--color-text);
}
.picker-toolbar {
	display: flex;
	align-items: center;
	gap: .75rem;
	padding: .65rem 1rem;
	border-bottom: 1px solid var(--color-border);
	flex-shrink: 0;
	flex-wrap: wrap;
}
.picker-search {
	position: relative;
	display: flex;
	align-items: center;
	flex: 1;
	min-width: 160px;
}
.picker-search :global(svg:first-child) {
	position: absolute;
	left: 9px;
	color: var(--color-muted);
	pointer-events: none;
}
.picker-search input {
	width: 100%;
	height: 32px;
	padding: 0 30px 0 30px;
	border: 1.5px solid var(--color-border);
	border-radius: 7px;
	background: var(--color-surface-raised);
	color: var(--color-text);
	font-size: .84rem;
	outline: none;
	font-family: inherit;
}
.picker-search input:focus { border-color: var(--brand); }
.picker-search button {
	position: absolute;
	right: 7px;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 18px;
	height: 18px;
	border: 0;
	background: none;
	color: var(--color-muted);
	cursor: pointer;
}
.type-tabs {
	display: flex;
	gap: .2rem;
}
.type-tab {
	padding: .3rem .7rem;
	border: 1px solid transparent;
	border-radius: 6px;
	background: transparent;
	color: var(--color-muted);
	font-size: .78rem;
	font-family: inherit;
	cursor: pointer;
}
.type-tab:hover { background: var(--color-surface-raised); color: var(--color-text); }
.type-tab.active {
	background: color-mix(in srgb, var(--brand) 10%, transparent);
	border-color: color-mix(in srgb, var(--brand) 30%, transparent);
	color: var(--brand);
	font-weight: 600;
}
.picker-grid-wrap {
	flex: 1;
	overflow-y: auto;
	padding: .75rem 1rem;
}
.picker-empty {
	padding: 3rem;
	text-align: center;
	color: var(--color-muted);
	font-size: .875rem;
}
.picker-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
	gap: .5rem;
}
.asset-tile {
	position: relative;
	display: flex;
	flex-direction: column;
	gap: .35rem;
	padding: .45rem;
	border: 1.5px solid var(--color-border);
	border-radius: 8px;
	background: var(--color-surface-raised);
	cursor: pointer;
	text-align: left;
	transition: border-color .12s, box-shadow .12s;
}
.asset-tile:hover,
.asset-tile.hovered {
	border-color: var(--brand);
	box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand) 12%, transparent);
}
.asset-thumb {
	width: 100%;
	aspect-ratio: 1;
	border-radius: 5px;
	overflow: hidden;
	background: color-mix(in srgb, var(--color-border) 40%, transparent);
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--color-muted);
}
.asset-thumb img {
	width: 100%;
	height: 100%;
	object-fit: cover;
	display: block;
}
.asset-name {
	font-size: .7rem;
	color: var(--color-muted);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	line-height: 1.3;
}
.asset-check {
	position: absolute;
	top: 5px;
	right: 5px;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 20px;
	height: 20px;
	border-radius: 50%;
	background: var(--brand);
	color: #fff;
	opacity: 0;
	transition: opacity .12s;
}
.asset-tile:hover .asset-check,
.asset-tile.hovered .asset-check {
	opacity: 1;
}
.picker-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: .65rem 1rem;
	border-top: 1px solid var(--color-border);
	flex-shrink: 0;
}
.picker-count {
	font-size: .8rem;
	color: var(--color-muted);
}
.btn-cancel {
	padding: .4rem .9rem;
	border: 1px solid var(--color-border);
	border-radius: 7px;
	background: transparent;
	color: var(--color-text);
	font-size: .84rem;
	font-family: inherit;
	cursor: pointer;
}
.btn-cancel:hover { background: var(--color-surface-raised); }
</style>
