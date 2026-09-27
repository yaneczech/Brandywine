<script module lang="ts">
	export type FolderPickerItem = {
		id: string;
		parentId: string | null;
		name: string;
		path: string;
		color: string | null;
		assetCount?: number;
	};
</script>

<script lang="ts">
	import { IconFolder, IconSearch, IconX } from '$lib/icons';

	let {
		folders,
		selectedId = null,
		includeRoot = true,
		rootLabel = 'Root',
		showCounts = false,
		onPick
	}: {
		folders: FolderPickerItem[];
		selectedId?: string | null;
		includeRoot?: boolean;
		rootLabel?: string;
		showCounts?: boolean;
		onPick: (id: string | null) => void;
	} = $props();

	let query = $state('');

	function depth(path: string) {
		return Math.max(0, path.split('/').filter(Boolean).length - 1);
	}

	function visibleFolders() {
		const q = query.trim().toLowerCase();
		if (!q) return folders;
		return folders.filter(f =>
			f.name.toLowerCase().includes(q) ||
			f.path.toLowerCase().includes(q)
		);
	}
</script>

<div class="folder-picker">
	<div class="folder-search">
		<IconSearch size={13} stroke={2} />
		<input bind:value={query} placeholder="Search folders..." />
		{#if query}
			<button type="button" aria-label="Clear search" onclick={() => (query = '')}>
				<IconX size={12} stroke={2} />
			</button>
		{/if}
	</div>

	<div class="folder-list">
		{#if includeRoot}
			<button type="button" class="folder-row" class:active={selectedId === null} onclick={() => onPick(null)}>
				<IconFolder size={16} stroke={1.5} />
				<span class="folder-name">{rootLabel}</span>
			</button>
		{/if}

		{#each visibleFolders() as folder (folder.id)}
			<button
				type="button"
				class="folder-row"
				class:active={selectedId === folder.id}
				style="--depth:{depth(folder.path)}"
				title={folder.path}
				onclick={() => onPick(folder.id)}
			>
				<span class="folder-dot" style="background:{folder.color ?? '#a9a8a3'}"></span>
				<span class="folder-name">{folder.name}</span>
				{#if showCounts && typeof folder.assetCount === 'number'}
					<span class="folder-count">{folder.assetCount}</span>
				{/if}
			</button>
		{/each}

		{#if visibleFolders().length === 0}
			<p class="empty">No matching folders</p>
		{/if}
	</div>
</div>

<style>
	.folder-picker {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.folder-search {
		position: relative;
		display: flex;
		align-items: center;
		margin: 0 1rem;
	}
	.folder-search :global(svg) {
		position: absolute;
		left: 10px;
		color: var(--color-muted);
		pointer-events: none;
	}
	.folder-search input {
		width: 100%;
		height: 34px;
		padding: 0 34px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius);
		background: var(--color-surface);
		color: var(--color-text);
		font-size: var(--text-sm);
		outline: none;
	}
	.folder-search input:focus {
		border-color: var(--color-border-focus); box-shadow: var(--focus-ring); }
	.folder-search button {
		position: absolute;
		right: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		border: 0;
		background: none;
		color: var(--color-muted);
		cursor: pointer;
	}
	.folder-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
		max-height: 320px;
		overflow-y: auto;
		padding: 0 0.5rem 0.25rem;
	}
	.folder-row {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		min-height: 34px;
		padding: 7px 10px 7px calc(10px + var(--depth, 0) * 16px);
		border: 0;
		border-radius: var(--radius);
		background: none;
		color: var(--color-text);
		font-size: var(--text-base);
		text-align: left;
		cursor: pointer;
	}
	.folder-row:hover {
		background: var(--color-hover);
	}
	.folder-row.active {
		background: color-mix(in srgb, var(--color-accent) 9%, transparent);
		color: var(--color-accent);
		font-weight: 600;
	}
	.folder-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex: 0 0 auto;
	}
	.folder-name {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.folder-count {
		flex: 0 0 auto;
		min-width: 20px;
		padding: 0 6px;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-surface-raised);
		color: var(--color-muted);
		font-size: var(--text-2xs);
		line-height: 18px;
		text-align: center;
	}
	.empty {
		margin: 0;
		padding: 1rem;
		color: var(--color-muted);
		font-size: var(--text-sm);
		text-align: center;
	}
</style>
