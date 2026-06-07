<script lang="ts">
	import type { PageData } from './$types';
	import type { FolderWithCount } from './+page.server';
	import { invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import Breadcrumbs, { type BreadcrumbItem } from '$lib/components/admin/Breadcrumbs.svelte';
	import FolderPicker from '$lib/components/admin/FolderPicker.svelte';
	import {
		IconUpload, IconSearch, IconTrash, IconDownload, IconFolder, IconFolderOpen,
		IconFolderPlus, IconFile, IconFileText, IconVideo, IconX, IconPlus, IconCheck,
		IconAlertTriangle, IconChevronRight, IconTag, IconDotsVertical, IconEdit,
		IconArrowRight, IconRefresh, IconLayoutGrid, IconLayoutList, IconSortAscending,
		IconPhoto, IconFileTypePdf, IconBrandAdobe, IconFileTypeDoc, IconFileZip,
		IconLetterA, IconTypography, IconPackage, IconEye, IconArrowsDiff
	} from '@tabler/icons-svelte';

	const { data }: { data: PageData } = $props();
	type Asset = (typeof data.assets)[0];

	// ── State ─────────────────────────────────────────────────────────────────
	let assets       = $state(data.assets);
	let folderTree   = $state(data.folderTree);
	let folderList   = $state(data.folderList);
	let allTags      = $state(data.tags);

	// Sync with server data after invalidateAll() re-runs the load function.
	// Without this, manual `assets = data.assets` ran before props updated.
	$effect(() => {
		assets    = data.assets;
		// If the detail drawer is open, refresh it from the updated list
		const currentDetail = untrack(() => detailAsset);
		if (currentDetail) {
			const fresh = data.assets.find(a => a.id === currentDetail.id);
			if (fresh && fresh !== currentDetail) detailAsset = fresh;
		}
	});
	$effect(() => { folderTree = data.folderTree; });
	$effect(() => { folderList = data.folderList; });
	$effect(() => { allTags   = data.tags; });

	let activeFolderId = $state<string | null>(null); // null = all
	let activeTag      = $state<string | null>(null);
	let search         = $state('');
	let typeFilter     = $state('all');
	let sortKey        = $state<'date' | 'name' | 'size'>('date');
	let viewMode       = $state<'grid' | 'list'>('grid');
	let expandedFolders = $state<Set<string>>(new Set());

	let selected      = $state<Set<string>>(new Set());
	let dragOver      = $state(false);
	let detailAsset   = $state<Asset | null>(null);
	let confirmDel    = $state<Asset | 'bulk' | null>(null);
	let newFolderParent = $state<string | null>(null);
	let newFolderName   = $state('');
	let newFolderColor  = $state('#6366f1');
	let showNewFolder   = $state(false);
	let editTagsAsset   = $state<Asset | null>(null);
	let tagInput        = $state('');
	let moveFolderAsset = $state<Asset | 'bulk' | null>(null);
	let convertAsset    = $state<Asset | null>(null);
	let convertStatus   = $state<Record<string, 'queued' | 'exists' | 'error'>>({});
	let showMobileSidebar = $state(false);

	// Folder rename / delete
	let renamingFolderId    = $state<string | null>(null);
	let renamingFolderValue = $state('');
	let confirmDelFolder    = $state<string | null>(null);
	let folderActionError   = $state<string | null>(null);
	let activeFolderMenu    = $state<string | null>(null);
	let sidebarWidth        = $state(240);
	let resizingSidebar     = $state(false);
	let sidebarEl           = $state<HTMLElement | null>(null);

	let uploadProgress = $state<{ name: string; done: boolean; err?: string }[]>([]);

	const TYPE_TABS = [
		{ key: 'all',      label: 'All' },
		{ key: 'image',    label: 'Images' },
		{ key: 'video',    label: 'Video' },
		{ key: 'document', label: 'Documents' },
		{ key: 'font',     label: 'Fonts' },
		{ key: 'other',    label: 'Other' },
	];

	const FOLDER_COLORS = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#64748b'];
	const SIDEBAR_MIN_WIDTH = 220;
	const SIDEBAR_MAX_WIDTH = 420;

	$effect(() => {
		const savedWidth = Number(localStorage.getItem('assetsSidebarWidth'));
		if (Number.isFinite(savedWidth) && savedWidth > 0) {
			sidebarWidth = clampSidebarWidth(savedWidth);
		}
	});

	// Active page in the multi-page PDF preview drawer
	let activeDrawerPage = $state(0);
	$effect(() => { if (detailAsset) activeDrawerPage = 0; });

	// ── Derived ───────────────────────────────────────────────────────────────
	function mimeCategory(mime: string) {
		if (mime.startsWith('image/'))  return 'image';
		if (mime.startsWith('video/'))  return 'video';
		if (mime.startsWith('font/'))   return 'font';
		if (mime.includes('pdf') || mime === 'application/postscript') return 'document';
		if (mime.startsWith('application/')) return 'document';
		return 'other';
	}

	function visibleAssets() {
		let list = [...assets];
		if (activeFolderId !== null) list = list.filter(a => a.folderId === activeFolderId);
		if (activeTag)               list = list.filter(a => (a.tags ?? []).includes(activeTag!));
		if (search) {
			const q = search.toLowerCase();
			list = list.filter(a =>
				a.filename.toLowerCase().includes(q) ||
				(a.tags ?? []).some(t => t.toLowerCase().includes(q)) ||
				(getFolderById(a.folderId ?? null)?.name ?? '').toLowerCase().includes(q) ||
				mimeLabel(a.mime).toLowerCase().includes(q)
			);
		}
		if (typeFilter !== 'all')    list = list.filter(a => mimeCategory(a.mime) === typeFilter);
		list.sort((a, b) => {
			if (sortKey === 'name') return a.filename.localeCompare(b.filename);
			if (sortKey === 'size') return Number(b.size) - Number(a.size);
			return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
		});
		return list;
	}

	function typeCounts() {
		const source = activeFolderId !== null ? assets.filter(a => a.folderId === activeFolderId) : assets;
		const c: Record<string, number> = { all: source.length };
		for (const a of source) { const k = mimeCategory(a.mime); c[k] = (c[k] ?? 0) + 1; }
		return c;
	}

	// ── Thumbnails ────────────────────────────────────────────────────────────
	function thumbUrl(a: Asset): string | null {
		if (a.thumbnailPath) return `/uploads/${a.thumbnailPath.replace(/\\/g, '/')}`;
		if (a.mime.startsWith('image/') && a.mime !== 'image/svg+xml')
			return `/api/assets/${a.id}/download`;
		if (a.mime === 'image/svg+xml') return `/api/assets/${a.id}/download`;
		return null;
	}

	// ── Helpers ───────────────────────────────────────────────────────────────
	function fmtSize(b: number) {
		if (b < 1024)       return `${b} B`;
		if (b < 1024 ** 2)  return `${(b / 1024).toFixed(1)} KB`;
		return `${(b / 1024 ** 2).toFixed(1)} MB`;
	}

	function fmtDate(d: Date | string) {
		return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
	}

	function mimeIcon(mime: string) {
		if (mime.startsWith('image/'))                      return IconPhoto;
		if (mime === 'application/pdf')                     return IconFileTypePdf;
		if (mime === 'application/postscript')              return IconBrandAdobe;
		if (mime.startsWith('video/'))                      return IconVideo;
		if (mime.startsWith('font/'))                       return IconTypography;
		if (mime.startsWith('application/zip') || mime.includes('zip')) return IconFileZip;
		if (mime.startsWith('application/'))                return IconFileText;
		return IconFile;
	}

	function mimeLabel(mime: string): string {
		const map: Record<string, string> = {
			'image/png': 'PNG', 'image/jpeg': 'JPG', 'image/webp': 'WebP', 'image/avif': 'AVIF',
			'image/svg+xml': 'SVG', 'image/gif': 'GIF',
			'application/pdf': 'PDF', 'application/postscript': 'AI/EPS',
			'video/mp4': 'MP4', 'video/webm': 'WebM', 'video/quicktime': 'MOV',
			'font/woff2': 'WOFF2', 'font/woff': 'WOFF', 'font/ttf': 'TTF', 'font/otf': 'OTF',
			'application/zip': 'ZIP',
		};
		return map[mime] ?? mime.split('/')[1]?.toUpperCase() ?? 'FILE';
	}

	function fontFaceStyles(list: Asset[]) {
		const rules = list
			.filter(a => a.mime.startsWith('font/'))
			.map(a => `@font-face{font-family:'card-font-${a.id}';src:url('/uploads/${a.storagePath.replace(/\\/g, '/')}');font-display:swap}`);

		return rules.length ? `<style>${rules.join('')}</style>` : '';
	}

	function toggleFolder(id: string) {
		const n = new Set(expandedFolders);
		n.has(id) ? n.delete(id) : n.add(id);
		expandedFolders = n;
	}

	function toggleSelect(id: string) {
		const n = new Set(selected);
		n.has(id) ? n.delete(id) : n.add(id);
		selected = n;
	}

	function getFolderById(id: string | null): FolderWithCount | null {
		if (!id) return null;
		return folderList.find(f => f.id === id) ?? null;
	}

	function folderTrail(id: string | null): BreadcrumbItem[] {
		const trail: BreadcrumbItem[] = [{ label: 'Assets', value: null }];
		if (!id) return trail;

		const byId = new Map(folderList.map(f => [f.id, f]));
		const stack: BreadcrumbItem[] = [];
		const seen = new Set<string>();
		let current = byId.get(id);

		while (current && !seen.has(current.id)) {
			seen.add(current.id);
			stack.unshift({ label: current.name, value: current.id, title: current.path });
			current = current.parentId ? byId.get(current.parentId) : undefined;
		}

		return [...trail, ...stack];
	}

	function activeBreadcrumbs(): BreadcrumbItem[] {
		if (activeTag) return [{ label: 'Assets', value: null }, { label: `#${activeTag}` }];
		return folderTrail(activeFolderId);
	}

	function selectBreadcrumb(item: BreadcrumbItem) {
		activeFolderId = item.value ?? null;
		activeTag = null;
	}

	function moveDialogSelectedFolder() {
		if (moveFolderAsset && typeof moveFolderAsset === 'object') return moveFolderAsset.folderId ?? null;
		return null;
	}

	function closeDetailDrawer() {
		detailAsset = null;
		activeDrawerPage = 0;
	}

	function clampSidebarWidth(width: number) {
		return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(width)));
	}

	function startSidebarResize(e: PointerEvent) {
		e.preventDefault();
		activeFolderMenu = null;
		resizingSidebar = true;
		resizeSidebar(e);
	}

	function resizeSidebar(e: PointerEvent) {
		if (!resizingSidebar) return;
		const left = sidebarEl?.getBoundingClientRect().left ?? 0;
		sidebarWidth = clampSidebarWidth(e.clientX - left);
	}

	function stopSidebarResize() {
		if (!resizingSidebar) return;
		resizingSidebar = false;
		localStorage.setItem('assetsSidebarWidth', String(sidebarWidth));
	}

	function nudgeSidebarWidth(delta: number) {
		sidebarWidth = clampSidebarWidth(sidebarWidth + delta);
		localStorage.setItem('assetsSidebarWidth', String(sidebarWidth));
	}

	function directChildCount(id: string) {
		return folderList.filter(f => f.parentId === id).length;
	}

	function beginRenameFolder(folder: FolderWithCount) {
		folderActionError = null;
		activeFolderMenu = null;
		renamingFolderId = folder.id;
		renamingFolderValue = folder.name;
	}

	function beginDeleteFolder(folder: FolderWithCount) {
		folderActionError = null;
		activeFolderMenu = null;
		confirmDelFolder = folder.id;
	}

	// ── Upload ────────────────────────────────────────────────────────────────
	async function uploadFiles(files: FileList | File[]) {
		const list = Array.from(files);
		if (!list.length) return;
		uploadProgress = list.map(f => ({ name: f.name, done: false }));
		for (let i = 0; i < list.length; i++) {
			const form = new FormData();
			form.append('file', list[i]);
			if (activeFolderId) form.append('folderId', activeFolderId);
			try {
				const res = await fetch('/api/assets', { method: 'POST', body: form });
				if (!res.ok) {
					const msg = (await res.json().catch(() => ({}))).message ?? res.statusText;
					uploadProgress[i] = { name: list[i].name, done: true, err: msg };
				} else {
					uploadProgress[i] = { name: list[i].name, done: true };
				}
			} catch {
				uploadProgress[i] = { name: list[i].name, done: true, err: 'Network error' };
			}
		}
		await invalidateAll();
		setTimeout(() => (uploadProgress = []), 3500);
	}

	// ── Delete ────────────────────────────────────────────────────────────────
	async function deleteAsset(id: string) {
		await fetch(`/api/assets/${id}`, { method: 'DELETE' });
		assets = assets.filter(a => a.id !== id);
		selected.delete(id); selected = new Set(selected);
		if (detailAsset?.id === id) detailAsset = null;
		confirmDel = null;
	}

	async function deleteSelected() {
		const ids = [...selected];
		await Promise.all(ids.map(id => fetch(`/api/assets/${id}`, { method: 'DELETE' })));
		assets = assets.filter(a => !ids.includes(a.id));
		selected = new Set(); confirmDel = null;
	}

	// ── Tags ──────────────────────────────────────────────────────────────────
	async function saveTags(a: Asset, tags: string[]) {
		const res = await fetch(`/api/assets/${a.id}`, {
			method: 'PATCH', headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ tags }),
		});
		if (res.ok) {
			const updated = await res.json();
			const idx = assets.findIndex(x => x.id === a.id);
			if (idx >= 0) assets[idx] = updated;
			if (detailAsset?.id === a.id) detailAsset = updated;
			// Refresh tag counts
			await invalidateAll();
		}
		editTagsAsset = null;
	}

	function addTag(a: Asset, tag: string) {
		const t = tag.trim().toLowerCase();
		if (!t || (a.tags ?? []).includes(t)) return;
		saveTags(a, [...(a.tags ?? []), t]);
		tagInput = '';
	}

	function removeTag(a: Asset, tag: string) {
		saveTags(a, (a.tags ?? []).filter(t => t !== tag));
	}

	// ── Move to folder ────────────────────────────────────────────────────────
	async function moveToFolder(targetFolderId: string | null) {
		if (moveFolderAsset === 'bulk') {
			const ids = [...selected];
			await Promise.all(ids.map(id =>
				fetch(`/api/assets/${id}`, {
					method: 'PATCH', headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ folderId: targetFolderId }),
				})
			));
			await invalidateAll();
		} else if (moveFolderAsset && typeof moveFolderAsset === 'object') {
			const target = moveFolderAsset as Asset;
			const res = await fetch(`/api/assets/${target.id}`, {
				method: 'PATCH', headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ folderId: targetFolderId }),
			});
			if (res.ok) {
				const updated = await res.json();
				const idx = assets.findIndex(x => x.id === target.id);
				if (idx >= 0) assets[idx] = updated;
				if (detailAsset?.id === target.id) detailAsset = updated;
			}
		}
		moveFolderAsset = null;
	}

	// ── Convert ───────────────────────────────────────────────────────────────
	async function requestConvert(a: Asset, format: 'webp' | 'avif') {
		const res = await fetch(`/api/assets/${a.id}/convert`, {
			method: 'POST', headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ format }),
		});
		const data2 = await res.json().catch(() => ({}));
		convertStatus = { ...convertStatus, [`${a.id}-${format}`]: data2.status ?? 'error' };
	}

	// ── Download ──────────────────────────────────────────────────────────────
	function download(a: Asset) {
		Object.assign(document.createElement('a'), {
			href: `/api/assets/${a.id}/download`, download: a.filename
		}).click();
	}

	// ── Folders ───────────────────────────────────────────────────────────────
	async function createFolder() {
		if (!newFolderName.trim()) return;
		const res = await fetch('/api/folders', {
			method: 'POST', headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: newFolderName.trim(), parentId: newFolderParent, color: newFolderColor }),
		});
		if (res.ok) {
			await invalidateAll();
			newFolderName = ''; showNewFolder = false;
		}
	}

	async function deleteFolder(id: string) {
		folderActionError = null;
		const res = await fetch(`/api/folders/${id}`, {
			method: 'DELETE', headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ moveAssetsTo: null }),
		});
		if (!res.ok) {
			const body = await res.json().catch(() => ({}));
			folderActionError = body.message ?? 'Folder could not be deleted.';
			return;
		}
		await invalidateAll();
		if (activeFolderId === id) activeFolderId = null;
		confirmDelFolder = null;
	}

	async function renameFolder(id: string, name: string) {
		const trimmed = name.trim();
		if (!trimmed) { renamingFolderId = null; return; }
		folderActionError = null;
		const res = await fetch(`/api/folders/${id}`, {
			method: 'PATCH', headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: trimmed }),
		});
		if (!res.ok) {
			const body = await res.json().catch(() => ({}));
			folderActionError = body.message ?? 'Folder could not be renamed.';
			return;
		}
		await invalidateAll();
		renamingFolderId = null;
	}

</script>

<svelte:head><title>Assets · Brandywine</title></svelte:head>
<svelte:window onpointermove={resizeSidebar} onpointerup={stopSidebarResize} onkeydown={(e) => {
	if (e.key === 'Escape') {
		if (showMobileSidebar) { showMobileSidebar = false; return; }
		if (activeFolderMenu) { activeFolderMenu = null; return; }
		if (renamingFolderId) { renamingFolderId = null; return; }
		if (confirmDelFolder) { confirmDelFolder = null; return; }
		confirmDel = null; detailAsset = null; moveFolderAsset = null;
		convertAsset = null; editTagsAsset = null; showNewFolder = false;
		selected = new Set();
	}
}} />

<!-- Drop overlay -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="shell" class:resizing-sidebar={resizingSidebar}
	ondragover={(e) => { e.preventDefault(); dragOver = true; }}
	ondragleave={(e) => { if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) dragOver = false; }}
	ondrop={(e) => { e.preventDefault(); dragOver = false; if (e.dataTransfer?.files) uploadFiles(e.dataTransfer.files); }}
>
{#if dragOver}
	<div class="drop-overlay">
		<IconUpload size={44} stroke={1.25} />
		<span>Drop files to upload{activeFolderId ? ` into "${getFolderById(activeFolderId)?.name}"` : ''}</span>
	</div>
{/if}

<!-- ── Layout ────────────────────────────────────────────────────────────── -->
<div class="layout">

	<!-- Sidebar -->
	<aside bind:this={sidebarEl} class="asset-sidebar" style="--assets-sidebar-width:{sidebarWidth}px">
		<div class="sidebar-head">
			<span class="sidebar-title">Folders</span>
			<button class="icon-btn" title="New folder" onclick={() => { newFolderParent = null; showNewFolder = true; }}>
				<IconFolderPlus size={16} stroke={1.75} />
			</button>
		</div>

		<!-- All assets -->
		<button class="folder-row root-row" class:active={activeFolderId === null}
			onclick={() => { activeFolderId = null; activeTag = null; }}>
			<IconFolder size={15} stroke={1.75} />
			<span>All assets</span>
			<span class="folder-count">{data.total}</span>
		</button>

		<!-- Folder tree -->
		{#snippet folderNode(nodes: FolderWithCount[], depth: number)}
			{#each nodes as f}
				<div class="folder-item" style="--depth:{depth}">
					{#if renamingFolderId === f.id}
						<!-- Inline rename input -->
						<div class="folder-row rename-row">
							<span class="chevron-spacer"></span>
							<span class="folder-dot" style="background:{f.color ?? '#94a3b8'}"></span>
							<!-- svelte-ignore a11y_autofocus -->
							<input class="rename-input" autofocus bind:value={renamingFolderValue}
								onkeydown={(e) => {
									if (e.key === 'Enter') renameFolder(f.id, renamingFolderValue);
									if (e.key === 'Escape') renamingFolderId = null;
								}} />
							<button class="icon-btn xs" title="Save" onclick={() => renameFolder(f.id, renamingFolderValue)}>
								<IconCheck size={12} stroke={2.5} />
							</button>
							<button class="icon-btn xs" title="Cancel" onclick={() => (renamingFolderId = null)}>
								<IconX size={12} stroke={2.5} />
							</button>
						</div>
					{:else}
						<div class="folder-row folder-row-actionable" class:active={activeFolderId === f.id}>
							{#if f.children && f.children.length > 0}
								<button type="button" class="chevron-btn" aria-label={expandedFolders.has(f.id) ? 'Collapse folder' : 'Expand folder'}
									onclick={(e) => { e.stopPropagation(); toggleFolder(f.id); }}>
									<IconChevronRight size={12} stroke={2}
										style="transform:rotate({expandedFolders.has(f.id) ? 90 : 0}deg);transition:transform 0.15s" />
								</button>
							{:else}
								<span class="chevron-spacer"></span>
							{/if}
							<button type="button" class="folder-main"
								onclick={() => { activeFolderId = f.id; activeTag = null; }}>
								<span class="folder-dot" style="background:{f.color ?? '#94a3b8'}"></span>
								<span class="folder-name">{f.name}</span>
								<span class="folder-count">{f.assetCount}</span>
							</button>
							<div class="folder-actions" role="group" aria-label="Folder actions">
								<button type="button" class="icon-btn xs folder-menu-trigger"
									title="Folder actions" aria-label="Actions for {f.name}"
									aria-expanded={activeFolderMenu === f.id}
									onclick={(e) => { e.stopPropagation(); activeFolderMenu = activeFolderMenu === f.id ? null : f.id; }}>
									<IconDotsVertical size={12} stroke={2} />
								</button>
								{#if activeFolderMenu === f.id}
									<div class="folder-menu" role="menu">
										<button type="button" role="menuitem" onclick={(e) => { e.stopPropagation(); beginRenameFolder(f); }}>
											<IconEdit size={12} stroke={2} /> Rename
										</button>
										<button type="button" role="menuitem" class="danger" onclick={(e) => { e.stopPropagation(); beginDeleteFolder(f); }}>
											<IconTrash size={12} stroke={2} /> Delete
										</button>
									</div>
								{/if}
							</div>
						</div>
					{/if}
				</div>
				{#if f.children && f.children.length > 0 && expandedFolders.has(f.id)}
					{@render folderNode(f.children, depth + 1)}
				{/if}
			{/each}
		{/snippet}
		{@render folderNode(folderTree, 0)}
		{#if folderActionError}
			<div class="folder-action-error">{folderActionError}</div>
		{/if}

		<button
			type="button"
			class="sidebar-resizer"
			aria-label="Resize folders column"
			title="Resize folders column"
			onpointerdown={startSidebarResize}
			onkeydown={(e) => {
				if (e.key === 'ArrowLeft') { e.preventDefault(); nudgeSidebarWidth(-20); }
				if (e.key === 'ArrowRight') { e.preventDefault(); nudgeSidebarWidth(20); }
			}}
		></button>

		<!-- Tags section -->
		{#if allTags.length > 0}
			<div class="sidebar-section-title">Tags</div>
			<div class="tag-list">
				{#each allTags as t}
					<button class="tag-chip" class:active={activeTag === t.tag}
						onclick={() => { activeTag = activeTag === t.tag ? null : t.tag; activeFolderId = null; }}>
						<IconTag size={10} stroke={2} />
						{t.tag}
						<span class="tag-count">{t.count}</span>
					</button>
				{/each}
			</div>
		{/if}
	</aside>

	<!-- Main -->
	<main class="main">
		<!-- Topbar -->
		<div class="topbar">
			<div class="topbar-left">
				<button class="icon-btn mobile-nav-btn" title="Browse folders & tags"
					onclick={() => (showMobileSidebar = true)}>
					<IconFolder size={16} stroke={1.75} />
				</button>
				<div class="page-context">
					<h1 class="sr-only">Assets</h1>
					<Breadcrumbs items={activeBreadcrumbs()} onSelect={selectBreadcrumb} />
					{#if activeFolderId}
						{@const folder = getFolderById(activeFolderId)}
						<span class="context-meta">
							<span class="folder-dot lg" style="background:{folder?.color ?? '#94a3b8'}"></span>
							{folder?.path ?? folder?.name ?? 'Folder'}
						</span>
					{:else if activeTag}
						<span class="context-meta"><IconTag size={13} stroke={1.75} /> Filtered by tag</span>
					{/if}
				</div>
				<span class="page-count">
					{visibleAssets().length} file{visibleAssets().length !== 1 ? 's' : ''}
					{#if data.total > assets.length}
						<span class="page-count-warn" title="Showing {assets.length} of {data.total} total">· showing first {assets.length}</span>
					{/if}
				</span>
			</div>
			<div class="topbar-right">
				{#if selected.size > 0}
					<button class="btn-sm ghost" onclick={() => { moveFolderAsset = 'bulk'; }}>
						<IconArrowRight size={13} stroke={2} /> Move
					</button>
					<button class="btn-sm danger" onclick={() => (confirmDel = 'bulk')}>
						<IconTrash size={13} stroke={2} /> Delete {selected.size}
					</button>
					<button class="btn-sm ghost" onclick={() => (selected = new Set())}>
						<IconX size={13} stroke={2} /> Clear
					</button>
				{/if}
				<button class="icon-btn" class:active={viewMode === 'grid'} title="Grid view" onclick={() => (viewMode = 'grid')}>
					<IconLayoutGrid size={16} stroke={1.75} />
				</button>
				<button class="icon-btn" class:active={viewMode === 'list'} title="List view" onclick={() => (viewMode = 'list')}>
					<IconLayoutList size={16} stroke={1.75} />
				</button>
				<label class="btn-primary">
					<IconUpload size={14} stroke={2} /> Upload
					<input type="file" multiple
						onchange={(e) => { const t = e.target as HTMLInputElement; if (t.files) uploadFiles(t.files); }}
						style="display:none" />
				</label>
			</div>
		</div>

		<!-- Filter bar -->
		<div class="filter-bar">
			<div class="type-tabs">
				{#each TYPE_TABS as tab}
					{@const c = typeCounts()}
					<button class="type-tab" class:active={typeFilter === tab.key}
						onclick={() => (typeFilter = tab.key)}>
						{tab.label}
						{#if c[tab.key]}<span class="tab-count">{c[tab.key]}</span>{/if}
					</button>
				{/each}
			</div>
			<div class="filter-right">
				<select class="sort-select" bind:value={sortKey}>
					<option value="date">Newest first</option>
					<option value="name">Name A–Z</option>
					<option value="size">Largest first</option>
				</select>
				<div class="search-wrap">
					<IconSearch size={13} stroke={2} />
					<input class="search-input" placeholder="Search…" bind:value={search} />
					{#if search}<button class="search-clear" onclick={() => (search = '')}><IconX size={11} stroke={2} /></button>{/if}
				</div>
			</div>
		</div>

		<!-- Active tag indicator -->
		{#if activeTag}
			<div class="active-filter-bar">
				<span>Filtered by tag: <strong>#{activeTag}</strong></span>
				<button onclick={() => (activeTag = null)}><IconX size={12} stroke={2} /></button>
			</div>
		{/if}

		<!-- Upload toasts -->
		{#if uploadProgress.length}
			<div class="upload-toasts">
				{#each uploadProgress as p}
					<div class="upload-toast" class:ok={p.done && !p.err} class:err={!!p.err}>
						{#if p.err}<IconAlertTriangle size={13} stroke={2} />
						{:else if p.done}<IconCheck size={13} stroke={2} />
						{:else}<span class="spinner"></span>{/if}
						<span class="toast-name">{p.name}</span>
						{#if p.err}<span class="toast-err">{p.err}</span>{/if}
					</div>
				{/each}
			</div>
		{/if}

		<!-- Grid / List -->
		<div class="content-area">
			{#if visibleAssets().length === 0}
				<div class="empty-state">
					<div class="empty-icon"><IconFolder size={48} stroke={1.1} /></div>
					<p class="empty-title">{search || typeFilter !== 'all' || activeTag ? 'No matching assets' : 'No assets yet'}</p>
					<p class="empty-sub">
						{search || typeFilter !== 'all' || activeTag
							? 'Try adjusting filters or search.'
							: 'Drag & drop files here or click Upload.'}
					</p>
					{#if !search && typeFilter === 'all' && !activeTag}
						<label class="btn-primary mt">
							<IconPlus size={14} stroke={2} /> Add first asset
							<input type="file" multiple
								onchange={(e) => { const t = e.target as HTMLInputElement; if (t.files) uploadFiles(t.files); }}
								style="display:none" />
						</label>
					{/if}
				</div>

				{:else if viewMode === 'grid'}
					<!-- Inject @font-face for all visible font assets so card previews render the actual typeface -->
					{@html fontFaceStyles(visibleAssets())}
					<div class="asset-grid">
					{#each visibleAssets() as a (a.id)}
						{@const thumb = thumbUrl(a)}
						{@const MimeIcon = mimeIcon(a.mime)}
						<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
						<div class="asset-card"
							class:sel={selected.has(a.id)}
							onclick={() => { if (selected.size > 0) { toggleSelect(a.id); } else { detailAsset = a; } }}>

							<!-- Checkbox -->
							<button class="card-check" class:visible={selected.has(a.id)}
								onclick={(e) => { e.stopPropagation(); toggleSelect(a.id); }}>
								{#if selected.has(a.id)}<IconCheck size={10} stroke={3} />{/if}
							</button>

							<!-- Thumbnail -->
							<div class="card-thumb">
								{#if thumb}
									<img src={thumb} alt={a.filename} class="thumb-img" loading="lazy" />
								{:else}
									<div class="thumb-icon">
										{#if a.mime.startsWith('font/')}
											<span class="font-preview" style="font-family:'card-font-{a.id}',serif">Aa</span>
										{:else}
											<MimeIcon size={30} stroke={1.1} />
										{/if}
									</div>
								{/if}
								<!-- Format badge + page count -->
								<span class="format-badge">{mimeLabel(a.mime)}</span>
								{#if (a.mime === 'application/pdf' || a.mime === 'application/postscript')}
									{@const pc = (a.metadata as Record<string,unknown>)?.pageCount as number | undefined}
									{#if pc && pc > 1}
										<span class="page-count-badge">{pc}p</span>
									{/if}
								{/if}
								<!-- Hover actions -->
								<div class="card-actions">
									<button class="card-action" title="Preview" onclick={(e) => { e.stopPropagation(); detailAsset = a; }}>
										<IconEye size={13} stroke={2} />
									</button>
									<button class="card-action" title="Download" onclick={(e) => { e.stopPropagation(); download(a); }}>
										<IconDownload size={13} stroke={2} />
									</button>
									<button class="card-action del" title="Delete" onclick={(e) => { e.stopPropagation(); confirmDel = a; }}>
										<IconTrash size={13} stroke={2} />
									</button>
								</div>
							</div>

							<!-- Meta -->
							<div class="card-meta">
								<p class="card-name" title={a.filename}>{a.filename}</p>
								<p class="card-info">{fmtSize(Number(a.size))}</p>
								{#if (a.tags ?? []).length > 0}
									<div class="card-tags">
										{#each (a.tags ?? []).slice(0, 3) as tag}
											<span class="mini-tag">#{tag}</span>
										{/each}
										{#if (a.tags ?? []).length > 3}
											<span class="mini-tag">+{(a.tags ?? []).length - 3}</span>
										{/if}
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>

			{:else}
				<!-- List view -->
				<div class="asset-list">
					<div class="list-head">
						<span class="lh-check"></span>
						<span class="lh-name">Name</span>
						<span class="lh-type">Type</span>
						<span class="lh-size">Size</span>
						<span class="lh-folder">Folder</span>
						<span class="lh-date">Date</span>
						<span class="lh-tags">Tags</span>
						<span class="lh-actions"></span>
					</div>
					{#each visibleAssets() as a (a.id)}
						{@const thumb = thumbUrl(a)}
						{@const MimeIcon = mimeIcon(a.mime)}
						<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
						<div class="list-row" class:sel={selected.has(a.id)} onclick={() => detailAsset = a}>
							<span class="lr-check">
								<button class="card-check sm" class:visible={selected.has(a.id)}
									onclick={(e) => { e.stopPropagation(); toggleSelect(a.id); }}>
									{#if selected.has(a.id)}<IconCheck size={9} stroke={3} />{/if}
								</button>
							</span>
							<span class="lr-name">
								<span class="lr-thumb">
									{#if thumb}
										<img src={thumb} alt="" class="lr-img" loading="lazy" />
									{:else}
										<MimeIcon size={16} stroke={1.5} />
									{/if}
								</span>
								{a.filename}
							</span>
							<span class="lr-type"><span class="format-badge sm">{mimeLabel(a.mime)}</span></span>
							<span class="lr-size">{fmtSize(Number(a.size))}</span>
							<span class="lr-folder">{getFolderById(a.folderId ?? null)?.name ?? '—'}</span>
							<span class="lr-date">{fmtDate(a.createdAt)}</span>
							<span class="lr-tags">
								{#each (a.tags ?? []).slice(0, 2) as tag}
									<span class="mini-tag">#{tag}</span>
								{/each}
							</span>
							<span class="lr-actions" onclick={(e) => e.stopPropagation()}>
								<button class="icon-btn xs" title="Download" onclick={() => download(a)}><IconDownload size={13} stroke={1.75} /></button>
								<button class="icon-btn xs" title="Delete" onclick={() => { confirmDel = a; }}><IconTrash size={13} stroke={1.75} /></button>
							</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</main>

	<!-- Detail drawer -->
	{#if detailAsset}
		{@const a          = detailAsset}
		{@const thumb      = thumbUrl(a)}
		{@const MimeIcon   = mimeIcon(a.mime)}
		{@const meta       = (a.metadata ?? {}) as Record<string, unknown>}
		{@const pageCount  = typeof meta.pageCount === 'number' ? (meta.pageCount as number) : 1}
		{@const pageThumbs = Array.isArray(meta.pageThumbs) ? (meta.pageThumbs as string[]) : []}
		{@const previewSrc = pageThumbs.length > 0
			? `/uploads/${pageThumbs[activeDrawerPage] ?? pageThumbs[0]}`
			: (a.mime.startsWith('image/') ? `/api/assets/${a.id}/download` : thumb)}
		{@const isFontAsset = a.mime.startsWith('font/')}
		{@const fontFamily  = isFontAsset ? `card-font-${a.id}` : null}
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="drawer-backdrop" onclick={closeDetailDrawer}></div>
		<aside class="drawer">
			<div class="drawer-head">
				<span class="drawer-title">Details</span>
				<button type="button" class="icon-btn" aria-label="Close details" onclick={closeDetailDrawer}>
					<IconX size={16} stroke={1.75} />
				</button>
			</div>

			<!-- Preview -->
			{#if isFontAsset && fontFamily}
				<!-- Inject @font-face synchronously so there's no icon flash -->
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html `<style>@font-face{font-family:'${fontFamily}';src:url('/uploads/${a.storagePath.replace(/\\/g, '/')}');font-display:swap}</style>`}
			{/if}
			<div class="drawer-preview">
				{#if previewSrc}
					<img src={previewSrc} alt={a.filename} class="drawer-img" />
				{:else if isFontAsset && fontFamily}
					<div class="drawer-font-preview" style="font-family:'{fontFamily}',serif">
						<div class="dfp-hero">Aa</div>
						<div class="dfp-alpha">A B C D E F G H I J K L M N O P Q R S T U V W X Y Z</div>
						<div class="dfp-alpha">a b c d e f g h i j k l m n o p q r s t u v w x y z</div>
						<div class="dfp-nums">0 1 2 3 4 5 6 7 8 9</div>
						<div class="dfp-sample">The quick brown fox jumps over the lazy dog.</div>
					</div>
				{:else}
					<div class="drawer-icon-preview">
						<MimeIcon size={52} stroke={1.0} />
						<span>{mimeLabel(a.mime)}</span>
					</div>
				{/if}
			</div>

			<!-- Multi-page strip -->
			{#if pageThumbs.length > 1}
				<div class="page-strip">
					{#each pageThumbs as pt, i}
						<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
						<div class="page-thumb" class:active={activeDrawerPage === i}
							onclick={() => (activeDrawerPage = i)}>
							<img src={`/uploads/${pt}`} alt="Page {i+1}" loading="lazy" />
							<span class="page-num">{i + 1}</span>
						</div>
					{/each}
				</div>
			{/if}

			<!-- Info -->
			<div class="drawer-body">
				<p class="drawer-filename">{a.filename}</p>
				<div class="drawer-meta-grid">
					<span class="dmg-label">Type</span>   <span>{mimeLabel(a.mime)}</span>
					<span class="dmg-label">Size</span>   <span>{fmtSize(Number(a.size))}</span>
					{#if pageCount > 1}
					<span class="dmg-label">Pages</span>  <span>{pageCount}</span>
					{/if}
					<span class="dmg-label">Uploaded</span><span>{fmtDate(a.createdAt)}</span>
					<span class="dmg-label">Folder</span>
					<span>{getFolderById(a.folderId ?? null)?.name ?? 'No folder'}</span>
					{#if meta.source === 'typography'}
					<span class="dmg-label">Source</span>
					<a class="link-btn" href="/admin/typography">Typography</a>
					{/if}
				</div>

				<!-- Tags -->
				<div class="drawer-section">
					<div class="drawer-section-head">
						<span>Tags</span>
						<button class="link-btn" onclick={() => { editTagsAsset = a; tagInput = ''; }}>
							<IconEdit size={12} stroke={2} /> Edit
						</button>
					</div>
					{#if (a.tags ?? []).length > 0}
						<div class="drawer-tags">
							{#each (a.tags ?? []) as tag}
								<span class="mini-tag"># {tag}</span>
							{/each}
						</div>
					{:else}
						<p class="drawer-empty-note">No tags yet</p>
					{/if}
				</div>

				<!-- Folder -->
				<div class="drawer-section">
					<div class="drawer-section-head">
						<span>Location</span>
						<button class="link-btn" onclick={() => (moveFolderAsset = a)}>
							<IconArrowRight size={12} stroke={2} /> Move
						</button>
					</div>
					<div class="drawer-location">
						<IconFolder size={13} stroke={1.75} />
						<Breadcrumbs items={folderTrail(a.folderId ?? null)} onSelect={(item) => { selectBreadcrumb(item); closeDetailDrawer(); }} />
					</div>
				</div>

				<!-- Convert -->
				{#if a.mime.startsWith('image/') && !['image/webp','image/avif','image/svg+xml'].includes(a.mime)}
					<div class="drawer-section">
						<div class="drawer-section-head"><span>Convert</span></div>
						<div class="convert-row">
							{#each ['webp', 'avif'] as fmt}
								{@const key = `${a.id}-${fmt}`}
								{@const existing = (a.convertedPaths ?? {})[fmt as 'webp' | 'avif']}
								{@const status = convertStatus[key]}
								{#if existing}
									<a class="convert-btn done" href={`/uploads/${existing}`} download>
										<IconCheck size={12} stroke={2.5} /> {fmt.toUpperCase()} ready
									</a>
								{:else if status === 'queued'}
									<button class="convert-btn queued" disabled>
										<span class="spinner xs"></span> Converting…
									</button>
								{:else}
									<button class="convert-btn" onclick={() => requestConvert(a, fmt as 'webp' | 'avif')}>
										<IconArrowsDiff size={12} stroke={2} /> To {fmt.toUpperCase()}
									</button>
								{/if}
							{/each}
						</div>
					</div>
				{/if}

				<!-- Actions -->
				<div class="drawer-actions">
					<button class="btn-full secondary" onclick={() => download(a)}>
						<IconDownload size={14} stroke={1.75} /> Download
					</button>
					<button class="btn-full danger" onclick={() => { confirmDel = a; closeDetailDrawer(); }}>
						<IconTrash size={14} stroke={1.75} /> Delete
					</button>
				</div>
			</div>
		</aside>
	{/if}

	<!-- Mobile sidebar sheet -->
	{#if showMobileSidebar}
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="mobile-sidebar-backdrop" onclick={() => (showMobileSidebar = false)}></div>
		<aside class="mobile-sidebar-sheet">
			<div class="mobile-sheet-head">
				<span>Browse</span>
				<button class="icon-btn" aria-label="Close" onclick={() => (showMobileSidebar = false)}>
					<IconX size={16} stroke={1.75} />
				</button>
			</div>
			<div class="mobile-sheet-body">
				<button class="folder-row root-row" class:active={activeFolderId === null}
					onclick={() => { activeFolderId = null; activeTag = null; showMobileSidebar = false; }}>
					<IconFolder size={15} stroke={1.75} />
					<span>All assets</span>
					<span class="folder-count">{data.total}</span>
				</button>
				{#each folderList as f}
					<button class="folder-row" class:active={activeFolderId === f.id}
						style="padding-left:{16 + f.path.split('/').length * 12}px"
						onclick={() => { activeFolderId = f.id; activeTag = null; showMobileSidebar = false; }}>
						<span class="folder-dot" style="background:{f.color ?? '#94a3b8'}"></span>
						<span class="folder-name">{f.name}</span>
						<span class="folder-count">{f.assetCount}</span>
					</button>
				{/each}
				{#if allTags.length > 0}
					<div class="sidebar-section-title" style="margin-top:8px">Tags</div>
					<div class="tag-list">
						{#each allTags as t}
							<button class="tag-chip" class:active={activeTag === t.tag}
								onclick={() => { activeTag = activeTag === t.tag ? null : t.tag; activeFolderId = null; showMobileSidebar = false; }}>
								<IconTag size={10} stroke={2} />{t.tag}
								<span class="tag-count">{t.count}</span>
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</aside>
	{/if}

</div><!-- .layout -->
</div><!-- .shell -->

<!-- ── Modals ─────────────────────────────────────────────────────────────── -->

<!-- Delete confirm -->
{#if confirmDel}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={() => (confirmDel = null)}>
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
			<div class="modal-head">
				<h2>Delete {confirmDel === 'bulk' ? `${selected.size} assets` : 'asset'}?</h2>
				<button class="icon-btn" aria-label="Close" onclick={() => (confirmDel = null)}><IconX size={16} stroke={1.75} /></button>
			</div>
			<div class="modal-body">
				{#if confirmDel === 'bulk'}
					<p>Permanently delete <strong>{selected.size} file{selected.size !== 1 ? 's' : ''}</strong>? This cannot be undone.</p>
				{:else}
					<p><strong>{confirmDel.filename}</strong> will be permanently deleted.</p>
				{/if}
			</div>
			<div class="modal-foot">
				<button class="btn-cancel" onclick={() => (confirmDel = null)}>Cancel</button>
				<button class="btn-delete" onclick={() => { if (confirmDel === 'bulk') deleteSelected(); else if (confirmDel) deleteAsset(confirmDel.id); }}>
					<IconTrash size={13} stroke={2} /> Delete
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Move to folder -->
{#if moveFolderAsset}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={() => (moveFolderAsset = null)}>
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
			<div class="modal-head">
				<h2>Move to folder</h2>
				<button class="icon-btn" aria-label="Close" onclick={() => (moveFolderAsset = null)}><IconX size={16} stroke={1.75} /></button>
			</div>
			<div class="modal-body folder-picker">
				<FolderPicker
					folders={folderList}
					selectedId={moveDialogSelectedFolder()}
					rootLabel="Root (no folder)"
					showCounts={true}
					onPick={moveToFolder}
				/>
			</div>
		</div>
	</div>
{/if}

<!-- Edit tags modal -->
{#if editTagsAsset}
	{@const a = editTagsAsset}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={() => (editTagsAsset = null)}>
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
			<div class="modal-head">
				<h2>Edit tags — {a.filename}</h2>
				<button class="icon-btn" aria-label="Close" onclick={() => (editTagsAsset = null)}><IconX size={16} stroke={1.75} /></button>
			</div>
			<div class="modal-body">
				<div class="tag-editor">
					{#each (a.tags ?? []) as tag}
						<span class="tag-pill">
							#{tag}
							<button onclick={() => removeTag(a, tag)}><IconX size={10} stroke={2.5} /></button>
						</span>
					{/each}
				</div>
				<div class="tag-input-row">
					<IconTag size={14} stroke={1.75} />
					<input class="tag-text-input" placeholder="Add tag…" bind:value={tagInput}
						onkeydown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(a, tagInput); } }} />
					<button class="btn-sm primary" onclick={() => addTag(a, tagInput)}>Add</button>
				</div>
				<p class="tag-hint">Press Enter or comma to add · Click × to remove</p>
			</div>
		</div>
	</div>
{/if}

<!-- Folder delete confirm -->
{#if confirmDelFolder}
	{@const fol = folderList.find(f => f.id === confirmDelFolder)}
	{@const childCount = directChildCount(confirmDelFolder)}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={() => (confirmDelFolder = null)}>
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="modal sm" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
			<div class="modal-head">
				<h2>Delete folder?</h2>
				<button class="icon-btn" aria-label="Close" onclick={() => (confirmDelFolder = null)}><IconX size={16} stroke={1.75} /></button>
			</div>
			<div class="modal-body">
				<p>Delete <strong>{fol?.name ?? 'this folder'}</strong>?</p>
				<div class="delete-impact">
					<div>
						<strong>{fol?.assetCount ?? 0}</strong>
						<span>asset{(fol?.assetCount ?? 0) === 1 ? '' : 's'} will move to root</span>
					</div>
					<div>
						<strong>{childCount}</strong>
						<span>subfolder{childCount === 1 ? '' : 's'} will move to root</span>
					</div>
				</div>
				<p class="modal-warning">This cannot be undone.</p>
				{#if folderActionError}
					<p class="modal-error">{folderActionError}</p>
				{/if}
			</div>
			<div class="modal-foot">
				<button class="btn-cancel" onclick={() => (confirmDelFolder = null)}>Cancel</button>
				<button class="btn-delete" onclick={() => confirmDelFolder && deleteFolder(confirmDelFolder)}>
					<IconTrash size={13} stroke={2} /> Delete
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- New folder modal -->
{#if showNewFolder}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={() => (showNewFolder = false)}>
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="modal sm" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
			<div class="modal-head">
				<h2>New folder</h2>
				<button class="icon-btn" aria-label="Close" onclick={() => (showNewFolder = false)}><IconX size={16} stroke={1.75} /></button>
			</div>
			<div class="modal-body">
				<label class="field-label" for="nf-name">Name</label>
				<input id="nf-name" class="field-input" placeholder="e.g. Logos" bind:value={newFolderName}
					onkeydown={(e) => e.key === 'Enter' && createFolder()} />
				<label class="field-label mt" for="nf-parent">Parent folder</label>
				<select id="nf-parent" class="field-input" bind:value={newFolderParent}>
					<option value={null}>Root</option>
					{#each folderList as f}
						<option value={f.id}>{f.path}</option>
					{/each}
				</select>
				<label class="field-label mt" for="nf-color">Color</label>
				<div id="nf-color" class="color-swatches">
					{#each FOLDER_COLORS as c}
						<button class="swatch" class:active={newFolderColor === c}
							style="background:{c}" aria-label={c} onclick={() => (newFolderColor = c)}></button>
					{/each}
				</div>
			</div>
			<div class="modal-foot">
				<button class="btn-cancel" onclick={() => (showNewFolder = false)}>Cancel</button>
				<button class="btn-primary" onclick={createFolder} disabled={!newFolderName.trim()}>
					<IconFolderPlus size={14} stroke={2} /> Create
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
/* ── Shell & Layout ──────────────────────────────────────────────────────── */
.shell  { min-height:100vh; position:relative; display:flex; flex-direction:column; }
.shell.resizing-sidebar { cursor:col-resize; user-select:none; }
.layout { display:flex; flex:1; min-height:0; overflow:hidden; position:relative; }

/* Drop overlay */
.drop-overlay {
	position:fixed; inset:0; z-index:200;
	background:color-mix(in srgb,var(--brand) 6%,transparent);
	border:3px dashed var(--brand); pointer-events:none;
	display:flex; flex-direction:column; align-items:center; justify-content:center;
	gap:14px; font-size:1.25rem; font-weight:650; color:var(--brand);
}

/* ── Sidebar ─────────────────────────────────────────────────────────────── */
.asset-sidebar {
	width:var(--assets-sidebar-width, 240px); flex-shrink:0; border-right:1px solid var(--color-border);
	background:var(--color-surface); overflow-y:auto; padding:1rem 0 2rem;
	display:flex; flex-direction:column; gap:2px; position:relative;
}
.sidebar-resizer {
	position:absolute; top:0; right:0; bottom:0; z-index:12;
	width:8px; padding:0; border:0; border-radius:0; background:transparent;
	cursor:col-resize;
}
.sidebar-resizer::after {
	content:''; position:absolute; top:0; right:0; bottom:0; width:1px;
	background:transparent; transition:background 0.12s, width 0.12s;
}
.sidebar-resizer:hover::after,
.sidebar-resizer:focus-visible::after {
	width:3px; background:color-mix(in srgb,var(--brand) 55%,transparent);
}
.sidebar-head {
	display:flex; align-items:center; justify-content:space-between;
	padding:0 12px 8px; font-size:0.6875rem; font-weight:700;
	text-transform:uppercase; letter-spacing:0.08em; color:var(--color-muted);
}
.sidebar-section-title {
	padding:12px 12px 4px;
	font-size:0.6875rem; font-weight:700; text-transform:uppercase;
	letter-spacing:0.08em; color:var(--color-muted);
}
.root-row { padding-left:12px !important; }
.folder-row {
	display:flex; align-items:center; gap:6px; width:100%;
	padding:5px 12px 5px calc(12px + var(--depth, 0) * 14px);
	font-size:0.8125rem; color:var(--color-text); background:none; border:none;
	cursor:pointer; border-radius:0; text-align:left; transition:background 0.1s;
}
.folder-row:hover  { background:var(--color-surface-raised); }
.folder-row.active { background:color-mix(in srgb,var(--brand) 8%,transparent); color:var(--brand); font-weight:600; }
.folder-row-actionable {
	padding:0 8px 0 calc(8px + min(var(--depth, 0), 6) * 14px);
	gap:2px;
	cursor:default;
}
.folder-row-actionable:hover { background:var(--color-surface-raised); }
.folder-main {
	display:flex; align-items:center; gap:6px; flex:1; min-width:0;
	height:30px; padding:0 4px; border:0; background:none;
	color:inherit; font:inherit; font-weight:inherit; text-align:left; cursor:pointer;
}
.folder-main:focus-visible,
.chevron-btn:focus-visible,
.folder-actions .icon-btn:focus-visible {
	outline:2px solid color-mix(in srgb,var(--brand) 45%,transparent);
	outline-offset:1px;
	border-radius:6px;
}
.folder-item { display:block; position:relative; }
.chevron-btn {
	display:flex; align-items:center; justify-content:center;
	width:20px; height:30px; border:none; background:none; padding:0; cursor:pointer; flex-shrink:0;
	color:inherit;
}
.chevron-spacer { width:20px; flex-shrink:0; }
.folder-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.folder-dot.lg { width:11px; height:11px; }
.folder-name { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.folder-count {
	font-size:0.6875rem; background:var(--color-surface-raised); border:1px solid var(--color-border);
	border-radius:20px; padding:0 5px; line-height:17px; color:var(--color-muted); flex-shrink:0;
}

/* Folder actions (rename / delete) */
.folder-actions {
	position:relative;
	display:flex; align-items:center; gap:2px; flex-shrink:0; margin-left:2px;
	opacity:0.45; transition:opacity 0.12s;
}
.folder-row:hover .folder-actions,
.folder-row:focus-within .folder-actions { opacity:1; }
@media (pointer:coarse) { .folder-actions { opacity:1; } }
.folder-menu-trigger { background:var(--color-surface); }
.folder-menu {
	position:absolute; top:28px; right:0; z-index:30;
	min-width:132px; padding:5px;
	border:1px solid var(--color-border); border-radius:8px;
	background:var(--color-surface); box-shadow:var(--shadow-lg);
	display:flex; flex-direction:column; gap:2px;
}
.folder-menu button {
	display:flex; align-items:center; gap:8px; width:100%;
	height:30px; padding:0 9px; border:0; border-radius:6px;
	background:none; color:var(--color-text); font-size:0.8125rem;
	text-align:left; cursor:pointer;
}
.folder-menu button:hover { background:var(--color-surface-raised); }
.folder-menu button.danger { color:var(--color-danger); }
.folder-action-error {
	margin:8px 12px 2px; padding:7px 9px; border-radius:7px;
	background:#fef2f2; border:1px solid #fecaca; color:var(--color-danger);
	font-size:0.75rem; line-height:1.35;
}

/* xs icon button variant */
.icon-btn.xs { width:20px; height:20px; padding:0; }
.icon-btn.xs.danger { color:var(--color-danger, #ef4444); }
.icon-btn.xs.danger:hover { background:color-mix(in srgb,#ef4444 10%,transparent); }

/* Inline rename row */
.rename-row {
	display:flex; align-items:center; gap:6px; width:100%;
	padding:4px 8px 4px calc(12px + var(--depth, 0) * 14px);
	background:var(--color-surface-raised);
}
.rename-input {
	flex:1; min-width:0; font-size:0.8125rem; padding:2px 6px;
	border:1px solid var(--brand); border-radius:5px;
	background:var(--color-surface); color:var(--color-text); outline:none;
}

/* Tags in sidebar */
.tag-list { display:flex; flex-wrap:wrap; gap:4px; padding:4px 12px; }
.tag-chip {
	display:inline-flex; align-items:center; gap:4px; padding:3px 8px;
	font-size:0.75rem; border-radius:20px; background:var(--color-surface-raised);
	border:1px solid var(--color-border); cursor:pointer; color:var(--color-muted);
	transition:all 0.1s;
}
.tag-chip:hover { border-color:var(--brand); color:var(--brand); }
.tag-chip.active { background:color-mix(in srgb,var(--brand) 10%,transparent); border-color:var(--brand); color:var(--brand); font-weight:600; }
.tag-count { font-size:0.6875rem; }

/* ── Main area ───────────────────────────────────────────────────────────── */
.main { flex:1; min-width:0; display:flex; flex-direction:column; overflow:hidden; }

.topbar {
	display:flex; align-items:center; justify-content:space-between;
	padding:1.25rem 1.5rem 0; gap:1rem; flex-wrap:wrap; flex-shrink:0;
}
.topbar-left  { display:flex; align-items:center; gap:10px; min-width:0; }
.topbar-right { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
.page-context { display:flex; flex-direction:column; gap:2px; min-width:0; }
.page-title {
	font-size:1.25rem; font-weight:650; letter-spacing:-0.025em;
	display:flex; align-items:center; gap:7px;
}
.context-meta {
	display:flex; align-items:center; gap:6px; min-width:0;
	font-size:0.75rem; color:var(--color-muted);
	overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
.page-count { font-size:0.8125rem; color:var(--color-muted); }
.sr-only {
	position:absolute; width:1px; height:1px; padding:0; margin:-1px;
	overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0;
}

/* Buttons */
.btn-primary {
	display:inline-flex; align-items:center; gap:6px; height:34px; padding:0 14px;
	border-radius:8px; background:var(--brand); color:#fff; border:none;
	font-size:0.8125rem; font-weight:600; cursor:pointer; transition:background 0.15s;
}
.btn-primary:hover { background:color-mix(in srgb,var(--brand) 85%,black); }
.btn-primary:disabled { opacity:0.45; cursor:not-allowed; }
.btn-sm {
	display:inline-flex; align-items:center; gap:5px; height:32px; padding:0 11px;
	border-radius:7px; font-size:0.8125rem; font-weight:500; cursor:pointer; border:1.5px solid var(--color-border); background:none; color:var(--color-text);
}
.btn-sm.ghost  { }
.btn-sm.ghost:hover { background:var(--color-surface-raised); }
.btn-sm.danger { color:var(--color-danger); border-color:#fecaca; background:#fef2f2; }
.btn-sm.danger:hover { background:#fee2e2; }
.btn-sm.primary { background:var(--brand); color:#fff; border-color:var(--brand); }
.btn-sm.primary:hover { background:color-mix(in srgb,var(--brand) 85%,black); }
.icon-btn {
	display:flex; align-items:center; justify-content:center; width:32px; height:32px;
	border-radius:7px; border:1.5px solid var(--color-border); background:none;
	color:var(--color-muted); cursor:pointer; transition:all 0.1s;
}
.icon-btn:hover, .icon-btn.active { background:var(--color-surface-raised); color:var(--color-text); border-color:var(--color-text); }
.icon-btn.xs { width:26px; height:26px; border-radius:6px; }

/* Filter bar */
.filter-bar {
	display:flex; align-items:center; justify-content:space-between; flex-shrink:0;
	padding:0 1.5rem; border-bottom:1px solid var(--color-border); margin-top:1rem; gap:1rem;
}
.type-tabs { display:flex; gap:0; overflow-x:auto; scrollbar-width:none; }
.type-tabs::-webkit-scrollbar { display:none; }
.type-tab {
	display:inline-flex; align-items:center; gap:5px; padding:8px 11px;
	font-size:0.8125rem; font-weight:500; color:var(--color-muted); white-space:nowrap;
	border:none; background:none; border-bottom:2px solid transparent; margin-bottom:-1px;
	cursor:pointer; transition:color 0.15s, border-color 0.15s;
}
.type-tab:hover { color:var(--color-text); }
.type-tab.active { color:var(--brand); border-bottom-color:var(--brand); font-weight:600; }
.tab-count {
	font-size:0.6875rem; background:var(--color-surface-raised); border:1px solid var(--color-border);
	border-radius:20px; padding:0 5px; line-height:17px;
}
.type-tab.active .tab-count { background:color-mix(in srgb,var(--brand) 10%,transparent); border-color:color-mix(in srgb,var(--brand) 25%,transparent); color:var(--brand); }

.filter-right { display:flex; align-items:center; gap:8px; flex-shrink:0; }
.sort-select {
	height:30px; padding:0 8px; border-radius:7px; border:1.5px solid var(--color-border);
	background:var(--color-surface); font-size:0.8125rem; color:var(--color-text); cursor:pointer; outline:none;
}
.search-wrap { position:relative; display:flex; align-items:center; }
.search-wrap :global(svg) { position:absolute; left:8px; color:var(--color-muted); pointer-events:none; }
.search-input {
	height:30px; padding:0 28px; border:1.5px solid var(--color-border); border-radius:7px;
	font-size:0.8125rem; background:var(--color-surface); color:var(--color-text); width:180px; outline:none;
}
.search-input:focus { border-color:var(--brand); }
.search-clear { position:absolute; right:6px; display:flex; border:none; background:none; cursor:pointer; color:var(--color-muted); }

.active-filter-bar {
	display:flex; align-items:center; justify-content:space-between; flex-shrink:0;
	padding:6px 1.5rem; background:color-mix(in srgb,var(--brand) 6%,transparent);
	border-bottom:1px solid color-mix(in srgb,var(--brand) 15%,transparent);
	font-size:0.8125rem; color:var(--color-muted);
}
.active-filter-bar button { display:flex; align-items:center; border:none; background:none; cursor:pointer; color:var(--color-muted); }

/* Upload toasts */
.upload-toasts {
	position:fixed; bottom:1.25rem; right:1.25rem; z-index:90;
	display:flex; flex-direction:column; gap:5px; max-width:300px;
}
.upload-toast {
	display:flex; align-items:center; gap:8px; padding:8px 12px; border-radius:8px;
	font-size:0.8125rem; background:var(--color-surface); border:1px solid var(--color-border);
	box-shadow:var(--shadow-lg); color:var(--color-muted);
}
.upload-toast.ok  { color:var(--color-success); border-color:#bbf7d0; background:#f0fdf4; }
.upload-toast.err { color:var(--color-danger);  border-color:#fecaca; background:#fef2f2; }
.toast-name { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:500; }
.toast-err  { font-size:0.725rem; opacity:0.8; }

/* ── Content ─────────────────────────────────────────────────────────────── */
.content-area { flex:1; overflow-y:auto; padding:1.25rem 1.5rem 2rem; }

/* Empty state */
.empty-state { display:flex; flex-direction:column; align-items:center; text-align:center; gap:8px; padding:5rem 2rem; }
.empty-icon  { margin-bottom:8px; opacity:0.3; color:var(--color-muted); }
.empty-title { font-size:1rem; font-weight:600; }
.empty-sub   { font-size:0.875rem; color:var(--color-muted); max-width:260px; line-height:1.5; }
.mt { margin-top:8px; }

/* Grid */
.asset-grid {
	display:grid; grid-template-columns:repeat(auto-fill,minmax(155px,1fr)); gap:12px;
}
.asset-card {
	border:1.5px solid var(--color-border); border-radius:12px; overflow:hidden;
	background:var(--color-surface); cursor:pointer; position:relative;
	transition:border-color 0.15s, box-shadow 0.15s, transform 0.12s;
}
.asset-card:hover { border-color:var(--brand); box-shadow:0 0 0 3px color-mix(in srgb,var(--brand) 7%,transparent); transform:translateY(-1px); }
.asset-card.sel  { border-color:var(--brand); box-shadow:0 0 0 3px color-mix(in srgb,var(--brand) 12%,transparent); }

.card-check {
	position:absolute; top:8px; left:8px; z-index:5; width:20px; height:20px;
	border-radius:6px; border:2px solid rgba(255,255,255,.65); background:rgba(255,255,255,.15);
	backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center;
	opacity:0; transition:opacity 0.1s; color:var(--brand); cursor:pointer;
}
.card-check.sm { width:17px; height:17px; border-radius:5px; position:static; opacity:1; }
.card-check.visible, .asset-card:hover .card-check { opacity:1; }
.asset-card.sel .card-check { background:var(--brand); border-color:var(--brand); color:#fff; }

.card-thumb {
	width:100%; aspect-ratio:4/3; overflow:hidden; background:var(--color-surface-raised);
	position:relative; display:flex; align-items:center; justify-content:center;
}
.thumb-img { width:100%; height:100%; object-fit:cover; display:block; }
.thumb-icon { display:flex; align-items:center; justify-content:center; color:var(--color-muted); }
.font-preview { font-size:2rem; font-weight:700; color:var(--color-muted); letter-spacing:-0.04em; line-height:1; }

.format-badge {
	position:absolute; bottom:6px; left:6px; font-size:0.625rem; font-weight:700;
	text-transform:uppercase; letter-spacing:0.06em;
	background:rgba(0,0,0,.55); color:#fff; border-radius:4px; padding:2px 5px;
	backdrop-filter:blur(4px);
}
.format-badge.sm { position:static; font-size:0.6875rem; background:var(--color-surface-raised); color:var(--color-muted); border:1px solid var(--color-border); }

.card-actions {
	position:absolute; bottom:0; left:0; right:0; display:flex; justify-content:flex-end;
	gap:4px; padding:5px;
	background:linear-gradient(to top,rgba(0,0,0,.5) 0%,transparent 100%);
	opacity:0; transition:opacity 0.15s;
}
.asset-card:hover .card-actions { opacity:1; }
.card-action {
	display:flex; align-items:center; justify-content:center; width:26px; height:26px;
	border-radius:6px; background:rgba(255,255,255,.88); backdrop-filter:blur(4px);
	color:#111; cursor:pointer; border:none; transition:background 0.1s;
}
.card-action:hover { background:#fff; }
.card-action.del:hover { color:var(--color-danger); }

.card-meta { padding:7px 9px 9px; }
.card-name  { font-size:0.8rem; font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-bottom:2px; }
.card-info  { font-size:0.725rem; color:var(--color-muted); }
.card-tags  { display:flex; flex-wrap:wrap; gap:3px; margin-top:5px; }

/* List view */
.asset-list { display:flex; flex-direction:column; gap:0; }
.list-head {
	display:grid; grid-template-columns:28px 1fr 80px 70px 100px 90px 120px 60px;
	gap:0; padding:6px 8px; font-size:0.725rem; font-weight:600; color:var(--color-muted);
	text-transform:uppercase; letter-spacing:0.06em; border-bottom:1px solid var(--color-border);
}
.list-row {
	display:grid; grid-template-columns:28px 1fr 80px 70px 100px 90px 120px 60px;
	gap:0; padding:8px 8px; font-size:0.8125rem; cursor:pointer;
	border-bottom:1px solid var(--color-border); align-items:center;
	transition:background 0.1s;
}
.list-row:hover { background:var(--color-surface-raised); }
.list-row.sel { background:color-mix(in srgb,var(--brand) 5%,transparent); }
.lr-check { display:flex; align-items:center; }
.lr-name  { display:flex; align-items:center; gap:8px; overflow:hidden; }
.lr-thumb { width:28px; height:28px; border-radius:5px; overflow:hidden; background:var(--color-surface-raised); display:flex; align-items:center; justify-content:center; flex-shrink:0; color:var(--color-muted); }
.lr-img   { width:100%; height:100%; object-fit:cover; }
.lr-type, .lr-size, .lr-folder, .lr-date { color:var(--color-muted); font-size:0.8rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.lr-tags  { display:flex; flex-wrap:wrap; gap:3px; }
.lr-actions { display:flex; align-items:center; gap:4px; justify-content:flex-end; }
.lh-check,.lh-actions { }

/* Tags */
.mini-tag {
	display:inline-block; font-size:0.6875rem; padding:1px 6px; border-radius:20px;
	background:color-mix(in srgb,var(--brand) 8%,transparent);
	border:1px solid color-mix(in srgb,var(--brand) 20%,transparent);
	color:var(--brand); white-space:nowrap;
}

/* Spinner */
.spinner {
	width:12px; height:12px; border:2px solid var(--color-border);
	border-top-color:var(--brand); border-radius:50%;
	animation:spin 0.6s linear infinite; flex-shrink:0;
}
.spinner.xs { width:10px; height:10px; }
@keyframes spin { to { transform:rotate(360deg); } }

/* ── Detail Drawer ────────────────────────────────────────────────────────── */
.drawer-backdrop {
	position:fixed; inset:0; z-index:50; background:transparent; /* click to close */
}
.drawer {
	position:fixed; top:0; right:0; bottom:0; width:320px; z-index:60;
	background:var(--color-surface); border-left:1px solid var(--color-border);
	display:flex; flex-direction:column; box-shadow:-8px 0 32px rgba(0,0,0,.08);
	overflow:hidden;
}
.drawer-head {
	display:flex; align-items:center; justify-content:space-between; padding:1rem 1.25rem;
	border-bottom:1px solid var(--color-border); flex-shrink:0;
}
.drawer-title { font-size:0.875rem; font-weight:650; }
.drawer-preview {
	background:var(--color-surface-raised); border-bottom:1px solid var(--color-border);
	display:flex; align-items:center; justify-content:center; flex-shrink:0;
	min-height:180px; max-height:240px; overflow:hidden;
}
.drawer-img { max-width:100%; max-height:240px; object-fit:contain; display:block; }
.drawer-icon-preview { display:flex; flex-direction:column; align-items:center; gap:8px; color:var(--color-muted); font-size:0.8125rem; font-weight:500; padding:2rem; }

/* Font file preview */
.drawer-font-preview {
	width:100%; padding:1.25rem 1rem 1rem;
	display:flex; flex-direction:column; gap:6px; overflow:hidden;
}
.dfp-hero { font-size:4rem; line-height:1; letter-spacing:-0.02em; }
.dfp-alpha { font-size:0.75rem; color:var(--color-muted); letter-spacing:0.05em; word-break:break-all; line-height:1.6; }
.dfp-nums  { font-size:0.875rem; color:var(--color-muted); letter-spacing:0.1em; }
.dfp-sample { font-size:0.9375rem; line-height:1.5; color:var(--color-text); margin-top:4px; }
.drawer-body { flex:1; overflow-y:auto; padding:1rem 1.25rem; display:flex; flex-direction:column; gap:1rem; }
.drawer-filename { font-size:0.875rem; font-weight:600; word-break:break-all; }
.drawer-meta-grid { display:grid; grid-template-columns:80px 1fr; gap:4px 8px; font-size:0.8125rem; }
.dmg-label { color:var(--color-muted); font-weight:500; }
.drawer-section { display:flex; flex-direction:column; gap:6px; }
.drawer-section-head { display:flex; align-items:center; justify-content:space-between; font-size:0.8125rem; font-weight:600; }
.drawer-tags { display:flex; flex-wrap:wrap; gap:4px; }
.drawer-empty-note { font-size:0.8rem; color:var(--color-muted); font-style:italic; }
.drawer-location { display:flex; align-items:center; gap:5px; min-width:0; font-size:0.8125rem; color:var(--color-muted); }
.drawer-location :global(.breadcrumbs) { flex:1; min-width:0; }
.link-btn {
	display:inline-flex; align-items:center; gap:4px; font-size:0.75rem; font-weight:500;
	color:var(--brand); background:none; border:none; cursor:pointer; padding:2px 4px; border-radius:4px;
}
.link-btn:hover { background:color-mix(in srgb,var(--brand) 8%,transparent); }

/* Convert */
.convert-row { display:flex; gap:6px; flex-wrap:wrap; }
.convert-btn {
	display:inline-flex; align-items:center; gap:5px; height:30px; padding:0 12px;
	border-radius:7px; font-size:0.8125rem; font-weight:500; cursor:pointer;
	border:1.5px solid var(--color-border); background:none; color:var(--color-text);
	transition:all 0.15s; text-decoration:none;
}
.convert-btn:hover { border-color:var(--brand); color:var(--brand); }
.convert-btn.done { background:#f0fdf4; border-color:#bbf7d0; color:var(--color-success); }
.convert-btn.queued { opacity:0.6; cursor:default; }

.drawer-actions { display:flex; gap:8px; flex-direction:column; margin-top:auto; }
.btn-full {
	display:flex; align-items:center; justify-content:center; gap:7px;
	height:38px; border-radius:9px; font-size:0.875rem; font-weight:600; cursor:pointer; border:none;
}
.btn-full.secondary { background:var(--color-surface-raised); color:var(--color-text); border:1.5px solid var(--color-border); }
.btn-full.secondary:hover { border-color:var(--color-text); }
.btn-full.danger { background:#fef2f2; color:var(--color-danger); border:1.5px solid #fecaca; }
.btn-full.danger:hover { background:#fee2e2; }

/* ── Modals ──────────────────────────────────────────────────────────────── */
.modal-backdrop {
	position:fixed; inset:0; background:rgba(0,0,0,.4); display:flex;
	align-items:center; justify-content:center; z-index:100; backdrop-filter:blur(3px);
}
.modal {
	background:var(--color-surface); border-radius:14px; width:100%; max-width:480px;
	box-shadow:var(--shadow-lg); border:1px solid var(--color-border); overflow:hidden;
}
.modal.sm { max-width:360px; }
.modal-head {
	display:flex; align-items:center; justify-content:space-between;
	padding:1.125rem 1.5rem; border-bottom:1px solid var(--color-border);
}
.modal-head h2 { font-size:0.9375rem; font-weight:650; letter-spacing:-0.02em; }
.modal-body { padding:1.5rem; font-size:0.9rem; color:var(--color-muted); line-height:1.5; }
.modal-error {
	margin:10px 0 0; padding:8px 10px; border-radius:7px;
	background:#fef2f2; border:1px solid #fecaca; color:var(--color-danger);
	font-size:0.8125rem;
}
.modal-warning { margin-top:10px; font-size:0.8125rem; color:var(--color-danger); }
.delete-impact {
	display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:12px;
}
.delete-impact div {
	display:flex; flex-direction:column; gap:2px; padding:10px;
	border:1px solid var(--color-border); border-radius:9px;
	background:var(--color-surface-raised);
}
.delete-impact strong { font-size:1.125rem; color:var(--color-text); line-height:1; }
.delete-impact span { font-size:0.75rem; color:var(--color-muted); line-height:1.3; }
.modal-foot {
	display:flex; justify-content:flex-end; gap:8px;
	padding:1rem 1.5rem; border-top:1px solid var(--color-border);
}
.btn-cancel { height:36px; padding:0 16px; border-radius:8px; border:1.5px solid var(--color-border); background:none; font-size:0.875rem; font-weight:500; cursor:pointer; }
.btn-cancel:hover { background:var(--color-surface-raised); }
.btn-delete { display:inline-flex; align-items:center; gap:6px; height:36px; padding:0 16px; border-radius:8px; border:none; background:var(--color-danger); color:#fff; font-size:0.875rem; font-weight:600; cursor:pointer; }
.btn-delete:hover { opacity:0.88; }

/* Folder picker modal */
.modal-body.folder-picker { padding:1rem 0; }

/* Tag editor */
.tag-editor { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px; min-height:32px; }
.tag-pill {
	display:inline-flex; align-items:center; gap:4px; padding:3px 8px;
	background:color-mix(in srgb,var(--brand) 8%,transparent);
	border:1px solid color-mix(in srgb,var(--brand) 20%,transparent);
	border-radius:20px; font-size:0.8rem; color:var(--brand);
}
.tag-pill button { display:flex; align-items:center; background:none; border:none; cursor:pointer; color:inherit; padding:0; }
.tag-input-row {
	display:flex; align-items:center; gap:8px; padding:8px 10px;
	border:1.5px solid var(--color-border); border-radius:8px; margin-bottom:8px;
}
.tag-input-row :global(svg) { flex-shrink:0; color:var(--color-muted); }
.tag-text-input { flex:1; border:none; background:none; outline:none; font-size:0.875rem; color:var(--color-text); }
.tag-hint { font-size:0.75rem; color:var(--color-muted); }

/* Form fields */
.field-label { display:block; font-size:0.8125rem; font-weight:500; margin-bottom:4px; color:var(--color-text); }
.field-label.mt { margin-top:12px; }
.field-input {
	width:100%; height:36px; padding:0 10px; border:1.5px solid var(--color-border);
	border-radius:8px; font-size:0.875rem; background:var(--color-surface); color:var(--color-text); outline:none;
}
.field-input:focus { border-color:var(--brand); }

.color-swatches { display:flex; gap:6px; flex-wrap:wrap; margin-top:4px; }
.swatch {
	width:24px; height:24px; border-radius:50%; border:2px solid transparent; cursor:pointer;
	transition:transform 0.1s, border-color 0.1s;
}
.swatch:hover { transform:scale(1.15); }
.swatch.active { border-color:var(--color-text); }

/* ── Responsive ──────────────────────────────────────────────────────────── */
/* Mobile nav button — hidden on desktop */
.mobile-nav-btn { display:none; }

/* Page count warn */
.page-count-warn { font-size:0.75rem; color:var(--color-muted); opacity:0.7; }

/* Mobile sidebar sheet */
.mobile-sidebar-backdrop {
	position:fixed; inset:0; background:rgba(0,0,0,.35); z-index:70;
	backdrop-filter:blur(2px);
}
.mobile-sidebar-sheet {
	position:fixed; left:0; top:0; bottom:0; width:min(80vw, 300px); z-index:80;
	background:var(--color-surface); border-right:1px solid var(--color-border);
	display:flex; flex-direction:column; box-shadow:4px 0 24px rgba(0,0,0,.12);
}
.mobile-sheet-head {
	display:flex; align-items:center; justify-content:space-between;
	padding:1rem 1rem 0.75rem; border-bottom:1px solid var(--color-border);
	font-size:0.875rem; font-weight:650;
}
.mobile-sheet-body { flex:1; overflow-y:auto; padding:0.5rem 0 2rem; }

@media (max-width:768px) {
	.asset-sidebar { display:none; }
	.mobile-nav-btn { display:flex; }
	.topbar, .content-area { padding-left:1rem; padding-right:1rem; }
	.filter-bar { padding:0 1rem; }
	.asset-grid { grid-template-columns:repeat(auto-fill,minmax(130px,1fr)); gap:8px; }
	.list-head, .list-row { grid-template-columns:28px 1fr 70px 60px 60px; }
	.lh-folder,.lr-folder,.lh-date,.lr-date,.lh-tags,.lr-tags { display:none; }
	.drawer { width:100%; }
	/* Touch-friendly cards: always show check + actions (no hover required) */
	.card-check { opacity:0.6; }
	.card-actions { opacity:1; background:none; padding:4px; }
	.card-action { background:rgba(255,255,255,.75); }
}

/* ── Multi-page PDF ──────────────────────────────────────────────────────── */
.page-count-badge {
	position:absolute; bottom:6px; right:6px; font-size:0.625rem; font-weight:700;
	background:rgba(0,0,0,.55); color:#fff; border-radius:4px; padding:2px 5px;
	backdrop-filter:blur(4px); letter-spacing:0.04em;
}

.page-strip {
	display:flex; gap:4px; padding:8px 12px; overflow-x:auto; scrollbar-width:thin;
	border-bottom:1px solid var(--color-border); background:var(--color-surface-raised);
	flex-shrink:0;
}
.page-strip::-webkit-scrollbar { height:4px; }
.page-strip::-webkit-scrollbar-thumb { background:var(--color-border); border-radius:2px; }

.page-thumb {
	position:relative; flex-shrink:0; width:52px; border-radius:5px; overflow:hidden;
	border:2px solid transparent; cursor:pointer; transition:border-color 0.12s;
	background:var(--color-surface);
}
.page-thumb img { width:100%; display:block; aspect-ratio:3/4; object-fit:cover; }
.page-thumb.active { border-color:var(--brand); }
.page-thumb:hover:not(.active) { border-color:color-mix(in srgb,var(--brand) 50%,transparent); }
.page-num {
	position:absolute; bottom:0; left:0; right:0; text-align:center;
	font-size:0.5625rem; font-weight:700; background:rgba(0,0,0,.45); color:#fff;
	padding:1px 0;
}
</style>
