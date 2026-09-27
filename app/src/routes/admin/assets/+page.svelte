<script lang="ts">
	import { toast } from '$lib/ui/toast.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import type { PageData } from './$types';
	import type { FolderWithCount } from './+page.server';
	import { invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { focusTrap } from '$lib/actions/focus-trap';
	import * as m from '$lib/paraglide/messages';
	import Breadcrumbs, { type BreadcrumbItem } from '$lib/components/admin/Breadcrumbs.svelte';
	import FolderPicker from '$lib/components/admin/FolderPicker.svelte';
	import AssetThumb from '$lib/components/admin/AssetThumb.svelte';
	import {
		IconUpload, IconSearch, IconTrash, IconDownload, IconFolder,
		IconFolderPlus, IconFile, IconFileText, IconVideo, IconX, IconPlus, IconCheck,
		IconAlertTriangle, IconChevronRight, IconTag, IconDotsVertical, IconEdit,
		IconArrowRight, IconLayoutGrid, IconLayoutList,
		IconPhoto, IconFileTypePdf, IconBrandAdobe, IconFileZip,
		IconTypography, IconEye, IconArrowsDiff, IconGripVertical
	} from '$lib/icons';

	const { data }: { data: PageData } = $props();
	type Asset = (typeof data.assets)[0];

	// ── State ─────────────────────────────────────────────────────────────────
	let assets       = $derived(data.assets);
	let folderTree   = $derived(data.folderTree);
	let folderList   = $derived(data.folderList);
	let allTags      = $derived(data.tags);

	// Sync with server data after invalidateAll() re-runs the load function.
	// Without this, manual `assets = data.assets` ran before props updated.
	$effect(() => {
		// If the detail drawer is open, refresh it from the updated list
		const currentDetail = untrack(() => detailAsset);
		if (currentDetail) {
			const fresh = data.assets.find(a => a.id === currentDetail.id);
			if (fresh && fresh !== currentDetail) detailAsset = fresh;
		}
	});
	let activeFolderId = $state<string | null>(null); // null = all
	let activeTag      = $state<string | null>(null);
	let search         = $state('');
	let typeFilter     = $state('all');
	let sortKey        = $state<'date' | 'name' | 'size'>('date');
	let viewMode       = $state<'grid' | 'list'>('grid');
	const expandedFolders = new SvelteSet<string>();

	const selected      = new SvelteSet<string>();
	let dragOver      = $state(false);
	let detailAsset   = $state<Asset | null>(null);
	let confirmDel    = $state<Asset | 'bulk' | null>(null);
	let newFolderParent = $state<string | null>(null);
	let newFolderName   = $state('');
	let newFolderColor  = $state('#6f6a62');
	let showNewFolder   = $state(false);
	let editTagsAsset   = $state<Asset | null>(null);
	let tagInput        = $state('');
	let moveFolderAsset = $state<Asset | 'bulk' | null>(null);
	let convertStatus   = $state<Record<string, 'queued' | 'exists' | 'error'>>({});
	let showMobileSidebar = $state(false);

	// ── Folder DnD ───────────────────────────────────────────────────────────────
	let draggingFolderId = $state<string | null>(null);
	let dropTarget = $state<{ id: string; position: 'before' | 'after' | 'inside' } | null>(null);
	// Non-reactive — only used to gate dragstart to the handle element
	let folderDragReady = false;

	function startFolderDrag(e: DragEvent, f: FolderWithCount) {
		if (!folderDragReady) { e.preventDefault(); return; }
		draggingFolderId = f.id;
		e.dataTransfer!.effectAllowed = 'move';
		e.dataTransfer!.setData('text/plain', f.id);
	}

	function onFolderDragOver(e: DragEvent, f: FolderWithCount) {
		if (!draggingFolderId || draggingFolderId === f.id) return;
		e.preventDefault();
		e.dataTransfer!.dropEffect = 'move';
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const ratio = (e.clientY - rect.top) / rect.height;
		const position: 'before' | 'after' | 'inside' =
			ratio < 0.28 ? 'before' : ratio > 0.72 ? 'after' : 'inside';
		dropTarget = { id: f.id, position };
	}

	async function onFolderDrop(e: DragEvent, f: FolderWithCount) {
		e.preventDefault();
		const draggedId = draggingFolderId;
		clearFolderDrag();
		if (!draggedId || draggedId === f.id) return;

		const pos = dropTarget?.position ?? 'after';
		let payload: { parentId: string | null; beforeId?: string; afterId?: string };

		if (pos === 'inside') {
			payload = { parentId: f.id };
		} else {
			payload = {
				parentId: f.parentId,
				...(pos === 'before' ? { beforeId: f.id } : { afterId: f.id }),
			};
		}

		const res = await fetch(`/api/folders/${draggedId}/move`, {
			method: 'PATCH', headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});
		if (res.ok) await invalidateAll();
		else {
			const body = await res.json().catch(() => ({}));
			folderActionError = body.message ?? m.assets_err_move();
		}
	}

	function clearFolderDrag() {
		draggingFolderId = null;
		dropTarget = null;
		folderDragReady = false;
	}

	// Folder rename / delete
	let renamingFolderId    = $state<string | null>(null);
	let renamingFolderValue = $state('');
	let confirmDelFolder    = $state<string | null>(null);
	let folderActionError   = $state<string | null>(null);
	let assetActionError    = $state<string | null>(null);
	// Action errors surface as toasts, not inline bars
	$effect(() => { if (assetActionError) { toast.error(assetActionError); assetActionError = null; } });
	$effect(() => { if (folderActionError) { toast.error(folderActionError); folderActionError = null; } });
	let activeFolderMenu    = $state<string | null>(null);
	let sidebarWidth        = $state(240);
	let resizingSidebar     = $state(false);
	let sidebarEl           = $state<HTMLElement | null>(null);

	let uploadProgress = $state<{ name: string; done: boolean; err?: string }[]>([]);

	// ── Upload confirmation modal ─────────────────────────────────────────────
	let pendingFiles       = $state<File[]>([]);
	let showUploadModal    = $state(false);
	let uploadFolderId     = $state<string | null>(null);
	let uploadTagsInput    = $state('');
	let uploadFolderOpen   = $state(false);

	function openUploadModal(files: FileList | File[]) {
		const list = Array.from(files);
		if (!list.length) return;
		pendingFiles    = list;
		uploadFolderId  = activeFolderId;
		uploadTagsInput = '';
		uploadFolderOpen = false;
		showUploadModal = true;
	}

	function cancelUpload() {
		showUploadModal = false;
		pendingFiles = [];
	}

	const TYPE_TABS = $derived([
		{ key: 'all',      label: m.users_filter_all() },
		{ key: 'image',    label: m.assets_type_images() },
		{ key: 'video',    label: m.assets_type_video() },
		{ key: 'document', label: m.assets_type_docs() },
		{ key: 'font',     label: m.assets_type_fonts() },
		{ key: 'other',    label: m.assets_type_other() },
	]);

	const FOLDER_COLORS = ['#141414','#6f6a62','#8a6f55','#9a5b4b','#5f6f5a','#4f6470','#6b5f7a','#a08a5c'];
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
			.map((a) => {
				const family = a.id.replace(/[^a-zA-Z0-9_-]/g, '');
				const path = a.storagePath
					.replace(/\\/g, '/')
					.split('/')
					.map(encodeURIComponent)
					.join('/');
				return `@font-face{font-family:'card-font-${family}';src:url('/uploads/${path}');font-display:swap}`;
			});

		return rules.length ? `<style>${rules.join('')}</style>` : '';
	}

	function toggleFolder(id: string) {
		expandedFolders.has(id) ? expandedFolders.delete(id) : expandedFolders.add(id);
	}

	function toggleSelect(id: string) {
		selected.has(id) ? selected.delete(id) : selected.add(id);
	}

	function replaceSelection(ids: Iterable<string>) {
		selected.clear();
		for (const id of ids) selected.add(id);
	}

	function getFolderById(id: string | null): FolderWithCount | null {
		if (!id) return null;
		return folderList.find(f => f.id === id) ?? null;
	}

	function folderTrail(id: string | null): BreadcrumbItem[] {
		const trail: BreadcrumbItem[] = [{ label: m.admin_assets(), value: null }];
		if (!id) return trail;

		const byId = new Map(folderList.map(f => [f.id, f]));
		const stack: BreadcrumbItem[] = [];
		const seen = new SvelteSet<string>();
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
	async function uploadFiles(files: File[], folderId: string | null, tags: string[]) {
		if (!files.length) return;
		showUploadModal = false;
		uploadProgress = files.map(f => ({ name: f.name, done: false }));
		for (let i = 0; i < files.length; i++) {
			const form = new FormData();
			form.append('file', files[i]);
			if (folderId) form.append('folderId', folderId);
			if (tags.length) form.append('tags', JSON.stringify(tags));
			try {
				const res = await fetch('/api/assets', { method: 'POST', body: form });
				if (!res.ok) {
					const msg = (await res.json().catch(() => ({}))).message ?? res.statusText;
					uploadProgress[i] = { name: files[i].name, done: true, err: msg };
				} else {
					uploadProgress[i] = { name: files[i].name, done: true };
				}
			} catch {
				uploadProgress[i] = { name: files[i].name, done: true, err: 'Network error' };
			}
		}
		await invalidateAll();
		setTimeout(() => (uploadProgress = []), 3500);
	}

	function confirmUpload() {
		const tags = uploadTagsInput
			.split(',')
			.map(t => t.trim().toLowerCase())
			.filter(Boolean);
		uploadFiles(pendingFiles, uploadFolderId, tags);
		pendingFiles = [];
	}

	// ── Delete ────────────────────────────────────────────────────────────────
	async function deleteAsset(id: string) {
		assetActionError = null;
		const response = await fetch(`/api/assets/${id}`, { method: 'DELETE' });
		if (!response.ok) {
			const body = await response.json().catch(() => ({}));
			assetActionError = body.message ?? m.assets_err_delete();
			return;
		}
		assets = assets.filter(a => a.id !== id);
		selected.delete(id);
		if (detailAsset?.id === id) detailAsset = null;
		confirmDel = null;
	}

	async function deleteSelected() {
		assetActionError = null;
		const ids = [...selected];
		const results = await Promise.all(ids.map(async (id) => ({ id, response: await fetch(`/api/assets/${id}`, { method: 'DELETE' }) })));
		const deletedIds = results.filter(({ response }) => response.ok).map(({ id }) => id);
		const failedIds = results.filter(({ response }) => !response.ok).map(({ id }) => id);
		assets = assets.filter(a => !deletedIds.includes(a.id));
		replaceSelection(failedIds);
		confirmDel = null;
		if (failedIds.length) assetActionError = m.assets_err_delete_many({ count: String(failedIds.length) });
	}

	// ── Tags ──────────────────────────────────────────────────────────────────
	async function saveTags(a: Asset, tags: string[]) {
		assetActionError = null;
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
			editTagsAsset = null;
		} else {
			const body = await res.json().catch(() => ({}));
			assetActionError = body.message ?? m.assets_err_tags();
		}
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
		assetActionError = null;
		if (moveFolderAsset === 'bulk') {
			const ids = [...selected];
			const results = await Promise.all(ids.map(async (id) => ({ id, response: await fetch(`/api/assets/${id}`, {
					method: 'PATCH', headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ folderId: targetFolderId }),
				}) })));
			const failedIds = results.filter(({ response }) => !response.ok).map(({ id }) => id);
			replaceSelection(failedIds);
			if (failedIds.length) assetActionError = m.assets_err_move_many({ count: String(failedIds.length) });
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
			} else {
				const body = await res.json().catch(() => ({}));
				assetActionError = body.message ?? m.assets_err_move();
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
			folderActionError = body.message ?? m.assets_err_folder_delete();
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
			folderActionError = body.message ?? m.assets_err_folder_rename();
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
		if (confirmDelFolder) return;
		// Dialogs close themselves; Escape here only unwinds page state
		if (confirmDel || moveFolderAsset || editTagsAsset || showNewFolder || showUploadModal) return;
		if (detailAsset) { detailAsset = null; return; }
		selected.clear();
	}
}} />

<!-- Drop overlay -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="shell" class:resizing-sidebar={resizingSidebar}
	ondragover={(e) => { e.preventDefault(); dragOver = true; }}
	ondragleave={(e) => { if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) dragOver = false; }}
	ondrop={(e) => { e.preventDefault(); dragOver = false; if (e.dataTransfer?.files) openUploadModal(e.dataTransfer.files); }}
>
{#if dragOver}
	<div class="drop-overlay">
		<IconUpload size={44} stroke={1.25} />
		<span>{m.assets_drop_to_upload()}{activeFolderId ? ` — "${getFolderById(activeFolderId)?.name}"` : ''}</span>
	</div>
{/if}

<!-- ── Layout ────────────────────────────────────────────────────────────── -->
<div class="layout">

	<!-- Sidebar -->
	<aside bind:this={sidebarEl} class="asset-sidebar" style="--assets-sidebar-width:{sidebarWidth}px">
		<div class="sidebar-head">
			<span class="sidebar-title">{m.assets_folders()}</span>
			<button class="icon-btn" title={m.assets_new_folder_title()} onclick={() => { newFolderParent = null; showNewFolder = true; }}>
				<IconFolderPlus size={16} stroke={1.75} />
			</button>
		</div>

		<!-- All assets -->
		<button class="folder-row root-row" class:active={activeFolderId === null}
			onclick={() => { activeFolderId = null; activeTag = null; }}>
			<IconFolder size={15} stroke={1.75} />
			<span>{m.assets_all_assets()}</span>
			<span class="folder-count">{data.total}</span>
		</button>

		<!-- Folder tree -->
		{#snippet folderNode(nodes: FolderWithCount[], depth: number)}
			{#each nodes as f (f.id)}
				<div class="folder-item" style="--depth:{depth}"
					draggable={renamingFolderId !== f.id}
					ondragstart={(e) => startFolderDrag(e, f)}
					ondragover={(e) => onFolderDragOver(e, f)}
					ondragleave={(e) => { if (!(e.currentTarget as Element).contains(e.relatedTarget as Node)) { if (dropTarget?.id === f.id) dropTarget = null; } }}
					ondrop={(e) => onFolderDrop(e, f)}
					ondragend={clearFolderDrag}
					class:dnd-dragging={draggingFolderId === f.id}
					class:dnd-over-before={dropTarget?.id === f.id && dropTarget.position === 'before'}
					class:dnd-over-after={dropTarget?.id === f.id && dropTarget.position === 'after'}
					class:dnd-over-inside={dropTarget?.id === f.id && dropTarget.position === 'inside'}>
					{#if renamingFolderId === f.id}
						<!-- Inline rename input -->
						<div class="folder-row rename-row">
							<span class="chevron-spacer"></span>
							<span class="folder-dot" style="background:{f.color ?? '#a9a8a3'}"></span>
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
							<!-- Drag handle — mouse pointer triggers draggable on the whole row -->
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<span class="drag-handle"
								onpointerenter={() => (folderDragReady = true)}
								onpointerleave={() => (folderDragReady = false)}>
								<IconGripVertical size={12} stroke={1.75} />
							</span>
							{#if f.children && f.children.length > 0}
								<button type="button" class="chevron-btn" aria-label={expandedFolders.has(f.id) ? m.typo_collapse() : m.typo_expand()}
									onclick={(e) => { e.stopPropagation(); toggleFolder(f.id); }}>
									<IconChevronRight size={12} stroke={2}
										style="transform:rotate({expandedFolders.has(f.id) ? 90 : 0}deg);transition:transform 0.15s" />
								</button>
							{:else}
								<span class="chevron-spacer"></span>
							{/if}
							<button type="button" class="folder-main"
								onclick={() => { activeFolderId = f.id; activeTag = null; }}>
								<span class="folder-dot" style="background:{f.color ?? '#a9a8a3'}"></span>
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
											<IconEdit size={12} stroke={2} /> {m.assets_rename()}
										</button>
										<button type="button" role="menuitem" class="danger" onclick={(e) => { e.stopPropagation(); beginDeleteFolder(f); }}>
											<IconTrash size={12} stroke={2} /> {m.assets_detail_delete()}
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
			<div class="sidebar-section-title">{m.assets_tags_title()}</div>
			<div class="tag-list">
				{#each allTags as t (t.tag)}
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
				<button class="icon-btn mobile-nav-btn" title={m.assets_browse()}
					onclick={() => (showMobileSidebar = true)}>
					<IconFolder size={16} stroke={1.75} />
				</button>
				<div class="page-context">
					{#if activeFolderId || activeTag}
						<h1 class="sr-only">{m.admin_assets()}</h1>
						<Breadcrumbs items={activeBreadcrumbs()} onSelect={selectBreadcrumb} />
					{:else}
						<h1 class="page-title">{m.admin_assets()}</h1>
					{/if}
					{#if activeFolderId}
						{@const folder = getFolderById(activeFolderId)}
						<span class="context-meta">
							<span class="folder-dot lg" style="background:{folder?.color ?? '#a9a8a3'}"></span>
							{folder?.path ?? folder?.name ?? 'Folder'}
						</span>
					{:else if activeTag}
						<span class="context-meta"><IconTag size={13} stroke={1.75} /> {m.assets_filter_tag()}</span>
					{/if}
				</div>
				<span class="page-count">
					{visibleAssets().length} {visibleAssets().length === 1 ? m.assets_stat_one() : m.assets_stat_many()}
					{#if data.total > assets.length}
						<span class="page-count-warn" title="Showing {assets.length} of {data.total} total">· showing first {assets.length}</span>
					{/if}
				</span>
			</div>
			<div class="topbar-right">
				{#if selected.size > 0}
					<button class="btn-sm ghost" onclick={() => { moveFolderAsset = 'bulk'; }}>
						<IconArrowRight size={13} stroke={2} /> {m.assets_move_selected()}
					</button>
					<button class="btn-sm danger" onclick={() => (confirmDel = 'bulk')}>
						<IconTrash size={13} stroke={2} /> {m.assets_detail_delete()} {selected.size}
					</button>
					<button class="btn-sm ghost" onclick={() => selected.clear()}>
						<IconX size={13} stroke={2} /> {m.assets_clear_selection()}
					</button>
				{/if}
				<button class="icon-btn" class:active={viewMode === 'grid'} title={m.assets_grid_view()} onclick={() => (viewMode = 'grid')}>
					<IconLayoutGrid size={16} stroke={1.75} />
				</button>
				<button class="icon-btn" class:active={viewMode === 'list'} title={m.assets_list_view()} onclick={() => (viewMode = 'list')}>
					<IconLayoutList size={16} stroke={1.75} />
				</button>
				<label class="btn btn-primary">
					<IconUpload size={14} stroke={2} /> {m.assets_upload()}
					<input type="file" multiple
						onchange={(e) => { const t = e.target as HTMLInputElement; if (t.files) { openUploadModal(t.files); t.value = ''; } }}
						style="display:none" />
				</label>
			</div>
		</div>

		<!-- Filter bar -->
		<div class="filter-bar">
			<div class="type-tabs">
				{#each TYPE_TABS as tab (tab.key)}
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
					<option value="date">{m.assets_sort_newest()}</option>
					<option value="name">{m.assets_sort_name()}</option>
					<option value="size">{m.assets_sort_largest()}</option>
				</select>
				<div class="search-wrap">
					<IconSearch size={13} stroke={2} />
					<input class="search-input" placeholder={m.assets_search()} bind:value={search} />
					{#if search}<button class="search-clear" onclick={() => (search = '')}><IconX size={11} stroke={2} /></button>{/if}
				</div>
			</div>
		</div>

		<!-- Active tag indicator -->
		{#if activeTag}
			<div class="active-filter-bar">
				<span>{m.assets_filter_tag()} <strong>#{activeTag}</strong></span>
				<button onclick={() => (activeTag = null)}><IconX size={12} stroke={2} /></button>
			</div>
		{/if}

		<!-- Upload toasts -->

		{#if uploadProgress.length}
			<div class="upload-toasts">
				{#each uploadProgress as p, i (`${p.name}-${i}`)}
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
					<p class="empty-title">{search || typeFilter !== 'all' || activeTag ? m.assets_no_match_title() : m.assets_no_assets_title()}</p>
					<p class="empty-sub">
						{search || typeFilter !== 'all' || activeTag
							? m.assets_no_match_sub()
							: m.assets_no_assets_sub()}
					</p>
					{#if !search && typeFilter === 'all' && !activeTag}
						<label class="btn btn-primary mt">
							<IconPlus size={14} stroke={2} /> {m.assets_add_first()}
							<input type="file" multiple
								onchange={(e) => { const t = e.target as HTMLInputElement; if (t.files) { openUploadModal(t.files); t.value = ''; } }}
								style="display:none" />
						</label>
					{/if}
				</div>

				{:else if viewMode === 'grid'}
					<!-- Inject @font-face for all visible font assets so card previews render the actual typeface -->
					<!-- eslint-disable-next-line svelte/no-at-html-tags -- fontFaceStyles() allowlists the family and URL-encodes the storage path. -->
					{@html fontFaceStyles(visibleAssets())}
					<div class="asset-grid">
					{#each visibleAssets() as a (a.id)}
						<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
						<div class="asset-card"
							class:sel={selected.has(a.id)}
							onclick={() => { if (selected.size > 0) { toggleSelect(a.id); } else { detailAsset = a; } }}>

							<!-- Checkbox -->
							<button class="card-check" class:visible={selected.has(a.id)} aria-label={m.assets_select_item()} aria-pressed={selected.has(a.id)}
								onclick={(e) => { e.stopPropagation(); toggleSelect(a.id); }}>
								{#if selected.has(a.id)}<IconCheck size={10} stroke={3} />{/if}
							</button>

							<!-- Thumbnail -->
							<div class="card-thumb">
								<AssetThumb
									mime={a.mime}
									thumbnailPath={a.thumbnailPath}
									assetId={a.id}
									filename={a.filename}
								/>
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
									<button class="card-action" title={m.typo_preview()} onclick={(e) => { e.stopPropagation(); detailAsset = a; }}>
										<IconEye size={13} stroke={2} />
									</button>
									<button class="card-action" title={m.assets_detail_download()} onclick={(e) => { e.stopPropagation(); download(a); }}>
										<IconDownload size={13} stroke={2} />
									</button>
									<button class="card-action del" title={m.assets_detail_delete()} onclick={(e) => { e.stopPropagation(); confirmDel = a; }}>
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
								{#each (a.tags ?? []).slice(0, 3) as tag (tag)}
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
						<span class="lh-name">{m.typo_col_name()}</span>
						<span class="lh-type">{m.assets_detail_type()}</span>
						<span class="lh-size">{m.assets_detail_size()}</span>
						<span class="lh-folder">{m.assets_detail_folder()}</span>
						<span class="lh-date">{m.assets_detail_uploaded()}</span>
						<span class="lh-tags">{m.assets_tags_title()}</span>
						<span class="lh-actions"></span>
					</div>
					{#each visibleAssets() as a (a.id)}
						{@const thumb = thumbUrl(a)}
						{@const MimeIcon = mimeIcon(a.mime)}
						<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
						<div class="list-row" class:sel={selected.has(a.id)} onclick={() => detailAsset = a}>
							<span class="lr-check">
								<button class="card-check sm" class:visible={selected.has(a.id)} aria-label={m.assets_select_item()} aria-pressed={selected.has(a.id)}
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
							{#each (a.tags ?? []).slice(0, 2) as tag (tag)}
									<span class="mini-tag">#{tag}</span>
								{/each}
							</span>
							<span class="lr-actions" onclick={(e) => e.stopPropagation()}>
								<button class="icon-btn xs" title={m.assets_detail_download()} onclick={() => download(a)}><IconDownload size={13} stroke={1.75} /></button>
								<button class="icon-btn xs" title={m.assets_detail_delete()} onclick={() => { confirmDel = a; }}><IconTrash size={13} stroke={1.75} /></button>
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
				<span class="drawer-title">{m.assets_details()}</span>
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
					{#each pageThumbs as pt, i (pt)}
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
					<span class="dmg-label">{m.assets_detail_type()}</span>   <span>{mimeLabel(a.mime)}</span>
					<span class="dmg-label">{m.assets_detail_size()}</span>   <span>{fmtSize(Number(a.size))}</span>
					{#if pageCount > 1}
					<span class="dmg-label">{m.assets_detail_pages()}</span>  <span>{pageCount}</span>
					{/if}
					<span class="dmg-label">{m.assets_detail_uploaded()}</span><span>{fmtDate(a.createdAt)}</span>
					<span class="dmg-label">{m.assets_detail_folder()}</span>
					<span>{getFolderById(a.folderId ?? null)?.name ?? m.assets_detail_no_folder()}</span>
					{#if meta.source === 'typography'}
					<span class="dmg-label">{m.assets_detail_source()}</span>
					<a class="link-btn" href="/admin/typography">Typography</a>
					{/if}
				</div>

				<!-- Tags -->
				<div class="drawer-section">
					<div class="drawer-section-head">
						<span>{m.assets_tags_title()}</span>
						<button class="link-btn" onclick={() => { editTagsAsset = a; tagInput = ''; }}>
							<IconEdit size={12} stroke={2} /> {m.assets_detail_edit()}
						</button>
					</div>
					{#if (a.tags ?? []).length > 0}
						<div class="drawer-tags">
							{#each (a.tags ?? []) as tag (tag)}
								<span class="mini-tag"># {tag}</span>
							{/each}
						</div>
					{:else}
						<p class="drawer-empty-note">{m.assets_no_tags()}</p>
					{/if}
				</div>

				<!-- Folder -->
				<div class="drawer-section">
					<div class="drawer-section-head">
						<span>{m.assets_detail_location()}</span>
						<button class="link-btn" onclick={() => (moveFolderAsset = a)}>
							<IconArrowRight size={12} stroke={2} /> {m.assets_detail_move()}
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
						<div class="drawer-section-head"><span>{m.assets_detail_convert()}</span></div>
						<div class="convert-row">
							{#each ['webp', 'avif'] as fmt (fmt)}
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
						<IconDownload size={14} stroke={1.75} /> {m.assets_detail_download()}
					</button>
					<button class="btn-full danger" onclick={() => { confirmDel = a; closeDetailDrawer(); }}>
						<IconTrash size={14} stroke={1.75} /> {m.assets_detail_delete()}
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
				<span>{m.assets_browse()}</span>
				<button class="icon-btn" aria-label="Close" onclick={() => (showMobileSidebar = false)}>
					<IconX size={16} stroke={1.75} />
				</button>
			</div>
			<div class="mobile-sheet-body">
				<button class="folder-row root-row" class:active={activeFolderId === null}
					onclick={() => { activeFolderId = null; activeTag = null; showMobileSidebar = false; }}>
					<IconFolder size={15} stroke={1.75} />
					<span>{m.assets_all_assets()}</span>
					<span class="folder-count">{data.total}</span>
				</button>
				{#each folderList as f (f.id)}
					<button class="folder-row" class:active={activeFolderId === f.id}
						style="padding-left:{16 + f.path.split('/').length * 12}px"
						onclick={() => { activeFolderId = f.id; activeTag = null; showMobileSidebar = false; }}>
						<span class="folder-dot" style="background:{f.color ?? '#a9a8a3'}"></span>
						<span class="folder-name">{f.name}</span>
						<span class="folder-count">{f.assetCount}</span>
					</button>
				{/each}
				{#if allTags.length > 0}
					<div class="sidebar-section-title" style="margin-top:8px">{m.assets_tags_title()}</div>
					<div class="tag-list">
						{#each allTags as t (t.tag)}
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
<Modal open={!!confirmDel} title={`${m.assets_delete_confirm_title()} ${confirmDel === 'bulk' ? `${selected.size} ${m.assets_stat_many()}` : m.assets_stat_one()}?`} size="md" onClose={() => (confirmDel = null)}>
		{#if confirmDel === 'bulk'}
			<p>{m.assets_delete_bulk_body({ count: String(selected.size) })}</p>
		{:else if confirmDel}
			<p>{m.assets_delete_one_body({ name: confirmDel.filename })}</p>
		{/if}
	{#snippet footer()}
			<button class="btn btn-secondary" onclick={() => (confirmDel = null)}>{m.users_btn_cancel()}</button>
			<button class="btn btn-danger" onclick={() => { if (confirmDel === 'bulk') deleteSelected(); else if (confirmDel) deleteAsset(confirmDel.id); }}>
				<IconTrash size={13} stroke={2} /> {m.assets_detail_delete()}
			</button>
	{/snippet}
</Modal>

<!-- Move to folder -->
<Modal open={!!moveFolderAsset} title={m.assets_move_title()} size="md" onClose={() => (moveFolderAsset = null)}>
<div class="folder-picker">
			<FolderPicker
				folders={folderList}
				selectedId={moveDialogSelectedFolder()}
				rootLabel={m.assets_root_no_folder()}
				showCounts={true}
				onPick={moveToFolder}
			/>
</div>
</Modal>

<!-- Edit tags modal -->
{#if editTagsAsset}
	{@const a = editTagsAsset}
	<Modal open={true} title={`${m.assets_edit_tags_title()} — ${a.filename}`} size="md" onClose={() => (editTagsAsset = null)}>
			<div class="tag-editor">
				{#each (a.tags ?? []) as tag (tag)}
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
			<p class="tag-hint">{m.assets_tags_hint()}</p>
	</Modal>
{/if}

<!-- Folder delete confirm -->
{#if confirmDelFolder}
	{@const fol = folderList.find(f => f.id === confirmDelFolder)}
	{@const childCount = directChildCount(confirmDelFolder)}
	<!-- sm -->
	<Modal open={true} title={m.assets_delete_folder_title()} size="sm" onClose={() => (confirmDelFolder = null)}>
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
			<p class="modal-warning">{m.common_irreversible()}</p>
			{#if folderActionError}
				<p class="modal-error">{folderActionError}</p>
			{/if}
		{#snippet footer()}
				<button class="btn btn-secondary" onclick={() => (confirmDelFolder = null)}>{m.users_btn_cancel()}</button>
				<button class="btn btn-danger" onclick={() => confirmDelFolder && deleteFolder(confirmDelFolder)}>
					<IconTrash size={13} stroke={2} /> {m.assets_detail_delete()}
				</button>
		{/snippet}
	</Modal>
{/if}

<!-- New folder modal -->
<!-- sm -->
<Modal open={showNewFolder} title={m.assets_new_folder_title()} size="sm" onClose={() => (showNewFolder = false)}>
		<label class="field-label" for="nf-name">{m.assets_folder_name_label()}</label>
		<input id="nf-name" class="field-input" placeholder={m.assets_folder_name_ph()} bind:value={newFolderName}
			onkeydown={(e) => e.key === 'Enter' && createFolder()} />
		<label class="field-label mt" for="nf-parent">{m.assets_folder_parent_label()}</label>
		<select id="nf-parent" class="field-input" bind:value={newFolderParent}>
			<option value={null}>{m.assets_folder_root_opt()}</option>
			{#each folderList as f (f.id)}
				<option value={f.id}>{f.path}</option>
			{/each}
		</select>
		<label class="field-label mt" for="nf-color">{m.assets_folder_color_label()}</label>
		<div id="nf-color" class="color-swatches">
			{#each FOLDER_COLORS as c (c)}
				<button class="swatch" class:active={newFolderColor === c}
					style="background:{c}" aria-label={c} onclick={() => (newFolderColor = c)}></button>
			{/each}
		</div>
	{#snippet footer()}
			<button class="btn btn-secondary" onclick={() => (showNewFolder = false)}>{m.users_btn_cancel()}</button>
			<button class="btn btn-primary" onclick={createFolder} disabled={!newFolderName.trim()}>
				<IconFolderPlus size={14} stroke={2} /> {m.assets_create_btn()}
			</button>
	{/snippet}
</Modal>

<!-- ── Upload modal ──────────────────────────────────────────────────────────── -->
<!-- upload-modal -->
<Modal open={showUploadModal} title={m.assets_upload_title()} size="md" onClose={cancelUpload}>
<div class="upload-modal-body">
			<!-- File list -->
			<div class="upload-file-list">
				{#each pendingFiles as f (`${f.name}-${f.size}-${f.lastModified}`)}
					<div class="upload-file-row">
						<span class="upload-file-name">{f.name}</span>
						<span class="upload-file-size">{(f.size / 1024).toFixed(0)} kB</span>
					</div>
				{/each}
			</div>

			<!-- Folder picker -->
			<div class="upload-section">
				<div class="upload-section-label">{m.assets_upload_folder()}</div>
				<button
					type="button"
					class="folder-select-btn"
					onclick={() => uploadFolderOpen = !uploadFolderOpen}
				>
					<IconFolder size={15} />
					<span>{uploadFolderId ? (folderList.find(f => f.id === uploadFolderId)?.name ?? uploadFolderId) : m.assets_root_folder()}</span>
					<IconChevronRight size={13} style="flex-shrink:0;color:var(--color-muted);transition:transform .15s;{uploadFolderOpen ? 'transform:rotate(90deg)' : ''}" />
				</button>
				{#if uploadFolderOpen}
					<div class="folder-picker-wrap">
						<FolderPicker
							folders={folderList}
							selectedId={uploadFolderId}
							includeRoot={true}
							rootLabel={m.assets_root_folder()}
							showCounts={true}
							onPick={(id) => { uploadFolderId = id; uploadFolderOpen = false; }}
						/>
					</div>
				{/if}
			</div>

			<!-- Tags -->
			<div class="upload-section">
				<label class="upload-section-label" for="upload-tags">{m.assets_upload_tags()} <span class="muted">{m.assets_upload_tags_hint()}</span></label>
				<input
					id="upload-tags"
					type="text"
					class="upload-tags-input"
					bind:value={uploadTagsInput}
					placeholder="logo, vector, print…"
					onkeydown={e => e.key === 'Enter' && confirmUpload()}
				/>
				{#if allTags.length > 0}
					<div class="tag-suggestions">
						{#each allTags.filter(t => !uploadTagsInput.split(',').map(x => x.trim()).includes(t.tag)).slice(0, 12) as t (t.tag)}
							<button type="button" class="tag-pill"
								onclick={() => {
									const existing = uploadTagsInput.split(',').map(x => x.trim()).filter(Boolean);
									uploadTagsInput = [...existing, t.tag].join(', ');
								}}
							>{t.tag}</button>
						{/each}
					</div>
				{/if}
			</div>
</div>
	{#snippet footer()}
			<button class="btn btn-secondary" onclick={cancelUpload}>{m.common_cancel()}</button>
			<button class="btn btn-primary" onclick={confirmUpload}>
				<IconUpload size={14} stroke={2} />
				{pendingFiles.length === 1 ? m.assets_upload_confirm_one() : m.assets_upload_confirm({ count: String(pendingFiles.length) })}
			</button>
	{/snippet}
</Modal>

<style>
/* ── Shell & Layout ──────────────────────────────────────────────────────── */
.shell  { min-height:100vh; position:relative; display:flex; flex-direction:column; }
.shell.resizing-sidebar { cursor:col-resize; user-select:none; }
.layout { display:flex; flex:1; min-height:0; overflow:hidden; position:relative; }

/* Drop overlay */
.drop-overlay {
	position:fixed; inset:0; z-index:200;
	background:color-mix(in srgb,var(--color-accent) 6%,transparent);
	border:1px dashed var(--color-accent); pointer-events:none;
	display:flex; flex-direction:column; align-items:center; justify-content:center;
	gap: 16px; font-size: var(--text-xl); font-weight: 500; letter-spacing: var(--tracking-tight); color:var(--color-accent);
}

/* ── Sidebar ─────────────────────────────────────────────────────────────── */
.asset-sidebar {
	width:var(--assets-sidebar-width, 240px); flex-shrink:0; border-right:1px solid var(--color-border);
	background:var(--color-bg); overflow-y:auto; padding: var(--space-5) 0 var(--space-8);
	display:flex; flex-direction:column; gap: 4px; position:relative;
}
.sidebar-resizer {
	position:absolute; top:0; right:0; bottom:0; z-index:12;
	width:8px; padding: 0; border:0; border-radius:0; background:transparent;
	cursor:col-resize;
}
.sidebar-resizer::after {
	content:''; position:absolute; top:0; right:0; bottom:0; width:1px;
	background:transparent; transition:background 0.12s, width 0.12s;
}
.sidebar-resizer:hover::after,
.sidebar-resizer:focus-visible::after {
	width:3px; background:color-mix(in srgb,var(--color-accent) 55%,transparent);
}
.sidebar-head {
	display:flex; align-items:center; justify-content:space-between;
	padding: 0 12px 8px 20px; font-size: var(--text-2xs); font-weight: 500;
	text-transform:uppercase; letter-spacing:var(--tracking-eyebrow); color:var(--color-muted);
}
.sidebar-section-title {
	padding: var(--space-6) 12px var(--space-2) 20px;
	font-size: var(--text-2xs); font-weight: 500; text-transform:uppercase;
	letter-spacing:var(--tracking-eyebrow); color:var(--color-muted);
}
.root-row { padding-left: 12px !important; }
.folder-row {
	display:flex; align-items:center; gap: 8px; width:100%;
	padding: 5px 12px 5px calc(12px + var(--depth, 0) * 14px);
	font-size: var(--text-sm); color:var(--color-text); background:none; border:none;
	cursor:pointer; border-radius:0; text-align:left; transition:background 0.1s;
}
.folder-row:hover  { background:var(--color-hover); }
.folder-row.active { background:var(--color-surface); color:var(--color-text); font-weight: 500; box-shadow: inset 2px 0 0 var(--color-accent); }
.folder-row-actionable {
	padding: 0 8px 0 calc(8px + min(var(--depth, 0), 6) * 14px);
	gap: 4px;
	cursor:default;
}
.folder-row-actionable:hover { background:var(--color-hover); }
.folder-main {
	display:flex; align-items:center; gap: 8px; flex:1; min-width:0;
	height:30px; padding: 0 4px; border:0; background:none;
	color:inherit; font:inherit; font-weight:inherit; text-align:left; cursor:pointer;
}
.folder-main:focus-visible,
.chevron-btn:focus-visible,
.folder-actions .icon-btn:focus-visible {
	outline:2px solid color-mix(in srgb,var(--color-accent) 45%,transparent);
	outline-offset:1px;
	border-radius: var(--radius);
}
/* ── Folder DnD ─────────────────────────────────────────────────────────── */
.folder-item {
	display:block; position:relative;
	/* Drop indicator lines rendered via box-shadow so they don't shift layout */
	transition:box-shadow 0.08s;
}
.dnd-dragging { opacity:0.4; pointer-events:none; }

/* Before = top border highlight */
.dnd-over-before { box-shadow:inset 0 2px 0 0 var(--color-accent); }
/* After = bottom border highlight */
.dnd-over-after  { box-shadow:inset 0 -2px 0 0 var(--color-accent); }
/* Inside = brand-tinted background */
.dnd-over-inside { background:color-mix(in srgb,var(--color-accent) 8%,transparent); border-radius: var(--radius-sm); }

/* Drag handle — hidden until hover, always visible on touch */
.drag-handle {
	display:flex; align-items:center; justify-content:center;
	width:16px; height:100%; flex-shrink:0;
	color:var(--color-muted); opacity:0; cursor:grab;
	transition:opacity 0.1s;
}
.folder-row-actionable:hover .drag-handle { opacity:1; }
@media (pointer:coarse) { .drag-handle { opacity:0.5; } }
.drag-handle:active { cursor:grabbing; }
.chevron-btn {
	display:flex; align-items:center; justify-content:center;
	width:20px; height:30px; border:none; background:none; padding: 0; cursor:pointer; flex-shrink:0;
	color:inherit;
}
.chevron-spacer { width:20px; flex-shrink:0; }
.folder-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.folder-dot.lg { width:11px; height:11px; }
.folder-name { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.folder-count {
	font-size: var(--text-xs); font-variant-numeric: tabular-nums; color:var(--color-muted); flex-shrink:0;
}

/* Folder actions (rename / delete) */
.folder-actions {
	position:relative;
	display:flex; align-items:center; gap: 4px; flex-shrink:0; margin-left: 4px;
	opacity:0.45; transition:opacity 0.12s;
}
.folder-row:hover .folder-actions,
.folder-row:focus-within .folder-actions { opacity:1; }
@media (pointer:coarse) { .folder-actions { opacity:1; } }
.folder-menu-trigger { background:var(--color-surface); }
.folder-menu {
	position:absolute; top:28px; right:0; z-index:30;
	min-width:132px; padding: 4px;
	border:1px solid var(--color-border); border-radius: var(--radius);
	background:var(--color-surface); box-shadow:var(--shadow-lg);
	display:flex; flex-direction:column; gap: 4px;
}
.folder-menu button {
	display:flex; align-items:center; gap: 8px; width:100%;
	height:30px; padding: 0 8px; border:0; border-radius: var(--radius);
	background:none; color:var(--color-text); font-size: var(--text-sm);
	text-align:left; cursor:pointer;
}
.folder-menu button:hover { background:var(--color-hover); }
.folder-menu button.danger { color:var(--color-danger); }

/* xs icon button variant */
.icon-btn.xs { width:20px; height:20px; padding: 0; }

/* Inline rename row */
.rename-row {
	display:flex; align-items:center; gap: 8px; width:100%;
	padding: 4px 8px 4px calc(12px + var(--depth, 0) * 14px);
	background:var(--color-surface-raised);
}
.rename-input {
	flex:1; min-width:0; font-size: var(--text-sm); padding: 4px 8px;
	border:1px solid var(--color-accent); border-radius: var(--radius-sm);
	background:var(--color-surface); color:var(--color-text); outline:none;
}

/* Tags in sidebar */
.tag-list { display:flex; flex-wrap:wrap; gap: 4px; padding: 4px 12px; }
.tag-chip {
	display:inline-flex; align-items:center; gap: 4px; height:24px; padding: 0 8px;
	font-size: var(--text-xs); border-radius: var(--radius-sm); background:var(--color-surface);
	border:1px solid var(--color-border); cursor:pointer; color:var(--color-text-secondary);
	transition:border-color var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease);
}
.tag-chip:hover { border-color:var(--color-border-strong); color:var(--color-text); }
.tag-chip.active { background:var(--color-accent-subtle); border-color:var(--color-accent); color:var(--color-accent); font-weight: 500; }
.tag-count { font-size: var(--text-2xs); color: var(--color-muted); font-variant-numeric: tabular-nums; }

/* ── Main area ───────────────────────────────────────────────────────────── */
.main { flex:1; min-width:0; display:flex; flex-direction:column; overflow:hidden; }

.topbar {
	display:flex; align-items:center; justify-content:space-between;
	padding: var(--space-8) var(--space-8) 0; gap: var(--space-4); flex-wrap:wrap; flex-shrink:0;
}
.topbar-left  { display:flex; align-items:center; gap: 8px; min-width:0; }
.topbar-right { display:flex; align-items:center; gap: 8px; flex-wrap:wrap; }
.page-context { display:flex; flex-direction:column; gap: 4px; min-width:0; }
.page-title {
	font-size: var(--text-2xl); font-weight: 600; letter-spacing: var(--tracking-tight); line-height: var(--leading-tight);
	display:flex; align-items:center; gap: 8px;
}
.context-meta {
	display:flex; align-items:center; gap: 8px; min-width:0;
	font-size: var(--text-xs); color:var(--color-muted);
	overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
.page-count { font-size: var(--text-sm); color:var(--color-muted); }
.sr-only {
	position:absolute; width:1px; height:1px; padding: 0; margin: -4px;
	overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0;
}

/* Buttons */



.btn-sm {
	display:inline-flex; align-items:center; gap: 4px; height:32px; padding: 0 12px;
	border-radius: var(--radius); font-size: var(--text-sm); font-weight: 500; cursor:pointer; border:1px solid var(--color-border); background:none; color:var(--color-text);
}
.btn-sm.ghost:hover { background:var(--color-hover); border-color: var(--color-border-strong); }
.btn-sm.danger { color:var(--color-danger); border-color:var(--color-danger-border); background:var(--color-danger-subtle); }
.btn-sm.danger:hover { background:var(--color-danger-border); }
.btn-sm.primary { background:var(--color-accent); color: var(--color-accent-contrast); border-color:var(--color-accent); }
.btn-sm.primary:hover { background:var(--color-accent-hover); }
.icon-btn {
	display:flex; align-items:center; justify-content:center; width:32px; height:32px;
	border-radius: var(--radius); border:1px solid var(--color-border); background:none;
	color:var(--color-muted); cursor:pointer; transition:all var(--dur-fast) var(--ease);
}
.icon-btn:hover { background:var(--color-surface); color:var(--color-text); border-color:var(--color-border-strong); }
.icon-btn.active { background:var(--color-surface); color:var(--color-text); border-color:var(--color-border-strong); box-shadow: var(--shadow-xs); }
.icon-btn.xs { width:26px; height:26px; border-radius: var(--radius); }

/* Filter bar */
.filter-bar {
	display:flex; align-items:center; justify-content:space-between; flex-shrink:0;
	padding: 0 var(--space-8); border-bottom:1px solid var(--color-border); margin-top: var(--space-6); gap: var(--space-4);
}
.type-tabs { display:flex; gap: 0; overflow-x:auto; scrollbar-width:none; }
.type-tabs::-webkit-scrollbar { display:none; }
.type-tab {
	display:inline-flex; align-items:center; gap: 8px; padding: 8px 0; margin-right: var(--space-5);
	font-size: var(--text-sm); font-weight: 400; color:var(--color-muted); white-space:nowrap;
	border:none; background:none; border-bottom:2px solid transparent; margin-bottom: -4px;
	cursor:pointer; transition:color 0.15s, border-color 0.15s;
}
.type-tab:hover { color:var(--color-text); }
.type-tab.active { color:var(--color-text); border-bottom-color:var(--color-accent); font-weight: 500; }
.tab-count { font-size: var(--text-xs); color: var(--color-placeholder); font-variant-numeric: tabular-nums; }
.type-tab.active .tab-count { color: var(--color-muted); }

.filter-right { display:flex; align-items:center; gap: 8px; flex-shrink:0; }
.sort-select {
	height:30px; padding: 0 8px; border-radius: var(--radius); border:1px solid var(--color-border);
	background:var(--color-surface); font-size: var(--text-sm); color:var(--color-text); cursor:pointer; outline:none; box-shadow: var(--shadow-xs);
}
.search-wrap { position:relative; display:flex; align-items:center; }
.search-wrap :global(svg) { position:absolute; left:8px; color:var(--color-muted); pointer-events:none; }
.search-input {
	height:30px; padding: 0 28px; border:1px solid var(--color-border); border-radius: var(--radius);
	font-size: var(--text-sm); background:var(--color-surface); color:var(--color-text); width:180px; outline:none;
}
.search-input:focus { border-color:var(--color-border-focus); box-shadow: var(--focus-ring); }
.search-clear { position:absolute; right:6px; display:flex; border:none; background:none; cursor:pointer; color:var(--color-muted); }

.active-filter-bar {
	display:flex; align-items:center; justify-content:space-between; flex-shrink:0;
	padding: 8px var(--space-8); background:var(--color-accent-subtle);
	border-bottom:1px solid var(--color-border);
	font-size: var(--text-sm); color:var(--color-muted);
}
.active-filter-bar button { display:flex; align-items:center; border:none; background:none; cursor:pointer; color:var(--color-muted); }

/* Upload toasts */
.upload-toasts {
	position:fixed; bottom:var(--space-5); left:calc(var(--sidebar-width) + var(--space-5)); z-index:90;
	display:flex; flex-direction:column; gap: var(--space-2); width:min(340px, calc(100vw - 2rem));
}
.upload-toast {
	display:flex; align-items:center; gap: 8px; padding: 8px 16px; border-radius:var(--radius-lg);
	font-size:var(--text-sm); background:#1c1c1b; color:#f4f4f2; box-shadow:var(--shadow-lg);
}
.upload-toast .spinner { border-color: rgba(255,255,255,.2); border-top-color: #fff; }
.upload-toast.ok :global(svg) { color:#7fd1a3; }
.upload-toast.err :global(svg) { color:#f2998f; }
.toast-name { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.toast-err  { font-size: var(--text-xs); color: rgba(244,244,242,.6); }

/* ── Content ─────────────────────────────────────────────────────────────── */
.content-area { flex:1; overflow-y:auto; padding: var(--space-6) var(--space-8) var(--space-12); }

/* Empty state */
.empty-state { display:flex; flex-direction:column; align-items:center; text-align:center; gap: 8px; padding: 80px 32px; }
.empty-icon  { margin-bottom: 8px; opacity:0.3; color:var(--color-muted); }
.empty-title { font-size: var(--text-lg); font-weight: 500; letter-spacing: var(--tracking-snug); }
.empty-sub   { font-size: var(--text-base); color:var(--color-muted); max-width:260px; line-height:1.5; }
.mt { margin-top: 8px; }

/* Grid */
.asset-grid {
	display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap: var(--space-5) var(--space-4);
}
.asset-card {
	border:1px solid var(--color-border); border-radius: var(--radius-lg); overflow:hidden;
	background:var(--color-surface); cursor:pointer; position:relative;
	box-shadow: var(--shadow-xs);
	transition:border-color var(--dur) var(--ease), box-shadow var(--dur) var(--ease);
}
.asset-card:hover { border-color:var(--color-border-strong); box-shadow: var(--shadow); }
.asset-card.sel  { border-color:var(--color-accent); box-shadow:0 0 0 1px var(--color-accent), var(--shadow); }

.card-check {
	position:absolute; top:8px; left:8px; z-index:5; width:24px; height:24px;
	border-radius: var(--radius); border:2px solid rgba(255,255,255,.65); background:rgba(255,255,255,.15);
	backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center;
	opacity:0; transition:opacity 0.1s; color:var(--color-accent); cursor:pointer;
}
.card-check.sm { width:17px; height:17px; border-radius: var(--radius-sm); position:static; opacity:1; }
.card-check.visible, .asset-card:hover .card-check { opacity:1; }
.asset-card.sel .card-check { background:var(--color-accent); border-color:var(--color-accent); color: var(--color-accent-contrast); }

.card-thumb {
	width:100%; aspect-ratio:4/3; overflow:hidden; background:var(--color-surface-raised);
	border-bottom: 1px solid var(--color-border);
	position:relative; display:flex; align-items:center; justify-content:center;
}
.format-badge {
	position:absolute; top:8px; right:8px; font-family: var(--font-mono); font-size: var(--text-2xs); font-weight: 500;
	text-transform:uppercase; letter-spacing: var(--tracking-eyebrow);
	background:rgba(255,255,255,.9); color:var(--color-text-secondary); border-radius: var(--radius-xs); padding: 4px 4px;
	box-shadow: 0 0 0 1px rgba(20,20,20,.06);
}
.format-badge.sm { position:static; font-size: var(--text-2xs); background:var(--color-surface-raised); color:var(--color-muted); border:1px solid var(--color-border); }

.card-actions {
	position:absolute; bottom:0; left:0; right:0; display:flex; justify-content:flex-end;
	gap: 4px; padding: 4px;
	background:linear-gradient(to top,rgba(0,0,0,.5) 0%,transparent 100%);
	opacity:0; transition:opacity 0.15s;
}
.asset-card:hover .card-actions { opacity:1; }
.card-action {
	display:flex; align-items:center; justify-content:center; width:26px; height:26px;
	border-radius: var(--radius); background:rgba(255,255,255,.88); backdrop-filter:blur(4px);
	color:#111; cursor:pointer; border:none; transition:background 0.1s;
}
.card-action:hover { background:#fff; }
.card-action.del:hover { color:var(--color-danger); }

.card-meta { padding: 8px 12px 12px; }
.card-name  { font-size: var(--text-sm); font-weight: 500; letter-spacing: var(--tracking-snug); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-bottom: 4px; }
.card-info  { font-size: var(--text-xs); color:var(--color-muted); font-variant-numeric: tabular-nums; }
.card-tags  { display:flex; flex-wrap:wrap; gap: 4px; margin-top: 4px; }

/* List view */
.asset-list { display:flex; flex-direction:column; gap: 0; }
.list-head {
	display:grid; grid-template-columns:28px 1fr 80px 70px 100px 90px 120px 60px;
	gap: 0; padding: 8px 8px; font-size: var(--text-2xs); font-weight: 500; color:var(--color-muted);
	text-transform:uppercase; letter-spacing:var(--tracking-eyebrow); border-bottom:1px solid var(--color-border-strong);
}
.list-row {
	display:grid; grid-template-columns:28px 1fr 80px 70px 100px 90px 120px 60px;
	gap: 0; padding: 8px 8px; font-size: var(--text-sm); cursor:pointer;
	border-bottom:1px solid var(--color-border); align-items:center;
	transition:background 0.1s;
}
.list-row:hover { background:var(--color-surface); }
.list-row.sel { background:var(--color-accent-subtle); }
.lr-check { display:flex; align-items:center; }
.lr-name  { display:flex; align-items:center; gap: 8px; overflow:hidden; }
.lr-thumb { width:28px; height:28px; border-radius: var(--radius-sm); overflow:hidden; background:var(--color-surface-raised); display:flex; align-items:center; justify-content:center; flex-shrink:0; color:var(--color-muted); }
.lr-img   { width:100%; height:100%; object-fit:cover; }
.lr-type, .lr-size, .lr-folder, .lr-date { color:var(--color-muted); font-size: var(--text-sm); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.lr-tags  { display:flex; flex-wrap:wrap; gap: 4px; }
.lr-actions { display:flex; align-items:center; gap: 4px; justify-content:flex-end; }
/* Tags */
.mini-tag {
	display:inline-block; font-size: var(--text-2xs); padding: 4px 8px; border-radius: var(--radius-xs);
	background:var(--color-surface-raised);
	color:var(--color-text-secondary); white-space:nowrap;
}

/* Spinner */
.spinner {
	width:12px; height:12px; border:2px solid var(--color-border);
	border-top-color:var(--color-accent); border-radius:50%;
	animation:spin 0.6s linear infinite; flex-shrink:0;
}
.spinner.xs { width:10px; height:10px; }
@keyframes spin { to { transform:rotate(360deg); } }

/* ── Detail Drawer ────────────────────────────────────────────────────────── */
.drawer-backdrop {
	position:fixed; inset:0; z-index:50; background:transparent; /* click to close */
}
.drawer {
	position:fixed; top:0; right:0; bottom:0; width:360px; z-index:60;
	background:var(--color-surface); border-left:1px solid var(--color-border);
	display:flex; flex-direction:column; box-shadow:var(--shadow-lg);
	overflow:hidden;
}
.drawer-head {
	display:flex; align-items:center; justify-content:space-between; padding: 16px 20px;
	border-bottom:1px solid var(--color-border); flex-shrink:0;
}
.drawer-title { font-size: var(--text-2xs); font-weight: 500; text-transform: uppercase; letter-spacing: var(--tracking-eyebrow); color: var(--color-muted); }
.drawer-preview {
	background:var(--color-surface-raised); border-bottom:1px solid var(--color-border);
	display:flex; align-items:center; justify-content:center; flex-shrink:0;
	min-height:180px; max-height:240px; overflow:hidden;
}
.drawer-img { max-width:100%; max-height:240px; object-fit:contain; display:block; }
.drawer-icon-preview { display:flex; flex-direction:column; align-items:center; gap: 8px; color:var(--color-muted); font-size: var(--text-sm); font-weight: 500; padding: 32px; }

/* Font file preview */
.drawer-font-preview {
	width:100%; padding: 20px 16px 16px;
	display:flex; flex-direction:column; gap: 8px; overflow:hidden;
}
.dfp-hero { font-size:4rem; line-height:1; letter-spacing: var(--tracking-tight); }
.dfp-alpha { font-size: var(--text-xs); color:var(--color-muted); letter-spacing: var(--tracking-eyebrow); word-break:break-all; line-height:1.6; }
.dfp-nums  { font-size: var(--text-base); color:var(--color-muted); letter-spacing:0.1em; }
.dfp-sample { font-size: var(--text-md); line-height:1.5; color:var(--color-text); margin-top: 4px; }
.drawer-body { flex:1; overflow-y:auto; padding: 16px 20px; display:flex; flex-direction:column; gap: 16px; }
.drawer-filename { font-size: var(--text-lg); font-weight: 500; letter-spacing: var(--tracking-snug); line-height: var(--leading-snug); word-break:break-all; }
.drawer-meta-grid { display:grid; grid-template-columns:88px 1fr; gap: 8px 12px; font-size: var(--text-sm); font-variant-numeric: tabular-nums; padding-block: var(--space-3); border-block: 1px solid var(--color-border); }
.dmg-label { color:var(--color-muted); font-weight: 400; }
.drawer-section { display:flex; flex-direction:column; gap: 8px; }
.drawer-section-head { display:flex; align-items:center; justify-content:space-between; font-size: var(--text-2xs); font-weight: 500; text-transform: uppercase; letter-spacing: var(--tracking-eyebrow); color: var(--color-muted); }
.drawer-tags { display:flex; flex-wrap:wrap; gap: 4px; }
.drawer-empty-note { font-size: var(--text-sm); color:var(--color-placeholder); }
.drawer-location { display:flex; align-items:center; gap: 4px; min-width:0; font-size: var(--text-sm); color:var(--color-muted); }
.drawer-location :global(.breadcrumbs) { flex:1; min-width:0; }
.link-btn {
	display:inline-flex; align-items:center; gap: 4px; font-size: var(--text-xs); font-weight: 500;
	color:var(--color-accent); background:none; border:none; cursor:pointer; padding: 4px 4px; border-radius: var(--radius-sm);
}
.link-btn:hover { background:var(--color-accent-subtle); }

/* Convert */
.convert-row { display:flex; gap: 8px; flex-wrap:wrap; }
.convert-btn {
	display:inline-flex; align-items:center; gap: 4px; height:30px; padding: 0 12px;
	border-radius: var(--radius); font-size: var(--text-sm); font-weight: 500; cursor:pointer;
	border:1px solid var(--color-border); background:none; color:var(--color-text);
	transition:all 0.15s; text-decoration:none;
}
.convert-btn:hover { border-color:var(--color-border-strong); color:var(--color-text); background: var(--color-surface); }
.convert-btn.done { background:var(--color-success-subtle); border-color:var(--color-success-border); color:var(--color-success); }
.convert-btn.queued { opacity:0.6; cursor:default; }

.drawer-actions { display:flex; gap: 8px; flex-direction:column; margin-top: auto; }
.btn-full {
	display:flex; align-items:center; justify-content:center; gap: 8px;
	height:var(--control-h); border-radius: var(--radius); font-size: var(--text-sm); font-weight: 500; cursor:pointer; border:none;
}
.btn-full.secondary { background:var(--color-surface); color:var(--color-text); border:1px solid var(--color-border); box-shadow: var(--shadow-xs); }
.btn-full.secondary:hover { border-color:var(--color-border-strong); }
.btn-full.danger { background:var(--color-danger-subtle); color:var(--color-danger); border:1px solid var(--color-danger-border); }
.btn-full.danger:hover { background:var(--color-danger-border); }

/* ── Modals ──────────────────────────────────────────────────────────────── */
.modal-error {
	margin: 8px 0 0; padding: 8px 8px; border-radius: var(--radius);
	background:var(--color-danger-subtle); border:1px solid var(--color-danger-border); color:var(--color-danger);
	font-size: var(--text-sm);
}
.modal-warning { margin-top: 8px; font-size: var(--text-sm); color:var(--color-danger); }
.delete-impact {
	display:grid; grid-template-columns:1fr 1fr; gap: 8px; margin-top: 12px;
}
.delete-impact div {
	display:flex; flex-direction:column; gap: 4px; padding: 8px;
	border:1px solid var(--color-border); border-radius: var(--radius-lg);
	background:var(--color-surface-raised);
}
.delete-impact strong { font-size: var(--text-xl); color:var(--color-text); line-height:1; }
.delete-impact span { font-size: var(--text-xs); color:var(--color-muted); line-height:1.3; }





/* Folder picker modal */

/* Tag editor */
.tag-editor { display:flex; flex-wrap:wrap; gap: 8px; margin-bottom: 12px; min-height:32px; }
.tag-pill {
	display:inline-flex; align-items:center; gap: 4px; padding: 4px 8px;
	background:color-mix(in srgb,var(--color-accent) 8%,transparent);
	border:1px solid color-mix(in srgb,var(--color-accent) 20%,transparent);
	border-radius: var(--radius-sm); font-size: var(--text-sm); color:var(--color-accent);
}
.tag-pill button { display:flex; align-items:center; background:none; border:none; cursor:pointer; color:inherit; padding: 0; }
.tag-input-row {
	display:flex; align-items:center; gap: 8px; padding: 8px 8px;
	border:1px solid var(--color-border); border-radius: var(--radius); margin-bottom: 8px;
}
.tag-input-row :global(svg) { flex-shrink:0; color:var(--color-muted); }
.tag-text-input { flex:1; border:none; background:none; outline:none; font-size: var(--text-base); color:var(--color-text); }
.tag-hint { font-size: var(--text-xs); color:var(--color-muted); }

/* Form fields */
.field-label { display:block; font-size: var(--text-sm); font-weight: 500; margin-bottom: 4px; color:var(--color-text); }
.field-label.mt { margin-top: 12px; }
.field-input {
	width:100%; height:36px; padding: 0 8px; border:1px solid var(--color-border);
	border-radius: var(--radius); font-size: var(--text-base); background:var(--color-surface); color:var(--color-text); outline:none;
}
.field-input:focus { border-color:var(--color-border-focus); box-shadow: var(--focus-ring); }

.color-swatches { display:flex; gap: 8px; flex-wrap:wrap; margin-top: 4px; }
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
.page-count-warn { font-size: var(--text-xs); color:var(--color-muted); opacity:0.7; }

/* Mobile sidebar sheet */
.mobile-sidebar-backdrop {
	position:fixed; inset:0; background:rgba(20,20,20,.32); z-index:70;
	backdrop-filter:blur(2px);
}
.mobile-sidebar-sheet {
	position:fixed; left:0; top:0; bottom:0; width:min(80vw, 300px); z-index:80;
	background:var(--color-surface); border-right:1px solid var(--color-border);
	display:flex; flex-direction:column; box-shadow:4px 0 24px rgba(0,0,0,.12);
}
.mobile-sheet-head {
	display:flex; align-items:center; justify-content:space-between;
	padding: 16px 16px 12px; border-bottom:1px solid var(--color-border);
	font-size: var(--text-base); font-weight: 600;
}
.mobile-sheet-body { flex:1; overflow-y:auto; padding: 8px 0 32px; }

@media (max-width:768px) {
	.asset-sidebar { display:none; }
	.mobile-nav-btn { display:flex; }
	.topbar, .content-area { padding-left: 16px; padding-right: 16px; }
	.filter-bar { padding: 0 16px; }
	.asset-grid { grid-template-columns:repeat(auto-fill,minmax(130px,1fr)); gap: 8px; }
	.list-head, .list-row { grid-template-columns:28px 1fr 70px 60px 60px; }
	.lh-folder,.lr-folder,.lh-date,.lr-date,.lh-tags,.lr-tags { display:none; }
	.drawer { width:100%; }
	/* Touch-friendly cards: always show check + actions (no hover required) */
	.card-check { opacity:0.6; }
	.card-actions { opacity:1; background:none; padding: 4px; }
	.card-action { background:rgba(255,255,255,.75); }
}

/* ── Multi-page PDF ──────────────────────────────────────────────────────── */
.page-count-badge {
	position:absolute; bottom:6px; right:6px; font-size: var(--text-2xs); font-weight: 600;
	background:rgba(0,0,0,.55); color:#fff; border-radius: var(--radius-sm); padding: 4px 4px;
	backdrop-filter:blur(4px); letter-spacing: var(--tracking-eyebrow);
}

.page-strip {
	display:flex; gap: 4px; padding: 8px 12px; overflow-x:auto; scrollbar-width:thin;
	border-bottom:1px solid var(--color-border); background:var(--color-surface-raised);
	flex-shrink:0;
}
.page-strip::-webkit-scrollbar { height:4px; }
.page-strip::-webkit-scrollbar-thumb { background:var(--color-border); border-radius: var(--radius-xs); }

.page-thumb {
	position:relative; flex-shrink:0; width:52px; border-radius: var(--radius-sm); overflow:hidden;
	border:2px solid transparent; cursor:pointer; transition:border-color 0.12s;
	background:var(--color-surface);
}
.page-thumb img { width:100%; display:block; aspect-ratio:3/4; object-fit:cover; }
.page-thumb.active { border-color:var(--color-accent); }
.page-thumb:hover:not(.active) { border-color:color-mix(in srgb,var(--color-accent) 50%,transparent); }
.page-num {
	position:absolute; bottom:0; left:0; right:0; text-align:center;
	font-size: var(--text-2xs); font-weight: 500; background:rgba(20,20,20,.55); color:#fff; font-variant-numeric: tabular-nums;
	padding: 4px 0;
}

/* ── Upload modal ────────────────────────────────────────────────────────── */
.upload-modal-body { display:flex; flex-direction:column; gap: var(--space-5); color:var(--color-text); }
.folder-picker { margin: calc(-1 * var(--space-2)) calc(-1 * var(--space-6)); }
.upload-file-list {
	display:flex; flex-direction:column; gap: 4px;
	max-height:140px; overflow-y:auto;
	border:1px solid var(--color-border); border-radius: var(--radius); background:var(--color-surface-raised);
	padding: 4px 0;
}
.upload-file-row {
	display:flex; align-items:center; justify-content:space-between;
	padding: 4px 12px; font-size: var(--text-sm);
}
.upload-file-name { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.upload-file-size { flex-shrink:0; color:var(--color-muted); font-size: var(--text-xs); margin-left: 12px; }
.upload-section { display:flex; flex-direction:column; gap: 8px; }
.upload-section-label { font-size: var(--text-sm); font-weight: 500; color:var(--color-text); }
.upload-section-label .muted { font-weight: 400; color:var(--color-muted); }
.folder-select-btn {
	display:flex; align-items:center; gap: 8px;
	padding: 8px 12px; border:1px solid var(--color-border); border-radius: var(--radius);
	background:var(--color-surface); color:var(--color-text); font-size: var(--text-base);
	cursor:pointer; text-align:left; width:100%;
}
.folder-select-btn:hover { border-color:var(--color-border-strong); }
.folder-select-btn span { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.folder-select-btn :global(.folder-chevron) { flex-shrink:0; color:var(--color-muted); transition:transform .15s; }
.folder-select-btn :global(.folder-chevron.open) { transform:rotate(90deg); }
.folder-picker-wrap { border:1px solid var(--color-border); border-radius: var(--radius); overflow:hidden; background:var(--color-surface); padding: 4px 0; }
.upload-tags-input {
	height:38px; padding: 0 12px; border:1px solid var(--color-border); border-radius: var(--radius);
	font-size: var(--text-base); background:var(--color-surface); color:var(--color-text); outline:none; width:100%; box-sizing:border-box;
}
.upload-tags-input:focus { border-color:var(--color-border-focus); box-shadow: var(--focus-ring); }
.tag-suggestions { display:flex; flex-wrap:wrap; gap: 4px; margin-top: 4px; }
.tag-suggestions .tag-pill {
	background:var(--color-surface-raised); border:1px solid var(--color-border);
	border-radius: var(--radius-sm); padding: 4px 8px; font-size: var(--text-xs); color:var(--color-muted);
	cursor:pointer;
}
.tag-suggestions .tag-pill:hover { border-color:var(--color-border-strong); color:var(--color-text); }


</style>
