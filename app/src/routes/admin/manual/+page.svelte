<script lang="ts">
	import type { PageData } from './$types';
	import { invalidateAll, goto } from '$app/navigation';
	import {
		IconPlus, IconPencil, IconTrash, IconChevronRight, IconChevronDown,
		IconBook2, IconGripVertical, IconX, IconCheck, IconEye, IconEyeOff
	} from '@tabler/icons-svelte';

	const { data }: { data: PageData } = $props();

	// ── Types ──────────────────────────────────────────────────────────────────
	type Page = {
		id: string; parentId: string | null; title: string; slug: string;
		description: string | null; sortOrder: number; enabled: boolean;
		isLanding: boolean;
	};

	// ── State ──────────────────────────────────────────────────────────────────
	let pages = $state<Page[]>(data.pages as Page[]);
	let expanded = $state<Set<string>>(new Set(['landing']));
	let saving = $state(false);
	let errMsg = $state('');

	// Create modal
	let showCreate = $state(false);
	let createParentId = $state<string | null>(null);
	let createTitle = $state('');
	let createSlug = $state('');
	let createDescription = $state('');

	// Rename inline
	let renamingId = $state<string | null>(null);
	let renameValue = $state('');

	// Delete confirm
	let confirmDeleteId = $state<string | null>(null);

	// Landing page (root)
	let landing = $derived(pages.find(p => p.isLanding));

	// ── Tree helpers ───────────────────────────────────────────────────────────
	function children(parentId: string | null): Page[] {
		return pages
			.filter(p => p.parentId === parentId && !p.isLanding)
			.sort((a, b) => a.sortOrder - b.sortOrder);
	}

	function toggleExpand(id: string) {
		const s = new Set(expanded);
		if (s.has(id)) s.delete(id); else s.add(id);
		expanded = s;
	}

	// Auto-slug from title
	$effect(() => {
		if (showCreate) {
			createSlug = createTitle
				.toLowerCase()
				.normalize('NFD').replace(/[̀-ͯ]/g, '')
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-|-$/g, '');
		}
	});

	// ── API helpers ───────────────────────────────────────────────────────────
	async function apiFetch(url: string, opts: RequestInit) {
		const r = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
		if (!r.ok) {
			const txt = await r.text().catch(() => r.statusText);
			throw new Error(txt);
		}
		return r.status === 204 ? null : r.json();
	}

	async function createPage() {
		if (!createTitle.trim() || !createSlug.trim()) return;
		saving = true; errMsg = '';
		try {
			const p = await apiFetch('/api/manual/pages', {
				method: 'POST',
				body: JSON.stringify({ parentId: createParentId, title: createTitle.trim(), slug: createSlug.trim(), description: createDescription.trim() || null }),
			}) as Page;
			pages = [...pages, p];
			if (createParentId) expanded = new Set([...expanded, createParentId]);
			closeCreate();
		} catch (e: unknown) {
			errMsg = e instanceof Error ? e.message : String(e);
		} finally {
			saving = false;
		}
	}

	async function renamePage(id: string) {
		if (!renameValue.trim()) { renamingId = null; return; }
		saving = true; errMsg = '';
		try {
			const p = await apiFetch(`/api/manual/pages/${id}`, {
				method: 'PATCH',
				body: JSON.stringify({ title: renameValue.trim() }),
			}) as Page;
			pages = pages.map(x => x.id === id ? p : x);
			renamingId = null;
		} catch (e: unknown) {
			errMsg = e instanceof Error ? e.message : String(e);
		} finally {
			saving = false;
		}
	}

	async function toggleEnabled(page: Page) {
		saving = true; errMsg = '';
		try {
			const p = await apiFetch(`/api/manual/pages/${page.id}`, {
				method: 'PATCH',
				body: JSON.stringify({ enabled: !page.enabled }),
			}) as Page;
			pages = pages.map(x => x.id === page.id ? p : x);
		} catch (e: unknown) {
			errMsg = e instanceof Error ? e.message : String(e);
		} finally {
			saving = false;
		}
	}

	async function deletePage(id: string) {
		saving = true; errMsg = '';
		try {
			await apiFetch(`/api/manual/pages/${id}`, { method: 'DELETE' });
			pages = pages.filter(p => p.id !== id);
			confirmDeleteId = null;
		} catch (e: unknown) {
			errMsg = e instanceof Error ? e.message : String(e);
		} finally {
			saving = false;
		}
	}

	function openCreate(parentId: string | null) {
		createParentId = parentId;
		createTitle = '';
		createSlug = '';
		createDescription = '';
		showCreate = true;
	}

	function closeCreate() {
		showCreate = false;
	}

	// ── Full path for display ─────────────────────────────────────────────────
	function pageFullSlug(p: Page): string {
		const parts: string[] = [];
		let cur: Page | undefined = p;
		while (cur && !cur.isLanding) {
			parts.unshift(cur.slug);
			cur = pages.find(x => x.id === cur!.parentId);
		}
		return '/manual/' + parts.join('/');
	}
</script>

<div class="page ap">
	<!-- Header -->
	<div class="page-header ap-topbar">
		<div class="ap-left">
			<h1 class="ap-title">Brand Manual</h1>
		</div>
		<div class="ap-actions header-actions">
			<button class="btn-secondary" onclick={() => openCreate(null)}>
				<IconPlus size={16} /> Přidat stránku
			</button>
		</div>
	</div>

	{#if errMsg}
		<div class="error-bar">{errMsg}</div>
	{/if}

	<!-- Tree -->
	<div class="tree-card">
		<!-- Landing (root) -->
		{#if landing}
			<div class="tree-root">
				<div class="tree-row root-row">
					<button class="expand-btn" onclick={() => toggleExpand('landing')} aria-label="Expand">
						{#if expanded.has('landing')}
							<IconChevronDown size={14} />
						{:else}
							<IconChevronRight size={14} />
						{/if}
					</button>
					<span class="page-icon root-icon"><IconBook2 size={15} /></span>
					<span class="page-title-text">{landing.title}</span>
					<span class="page-slug muted">/manual</span>
					<span class="spacer"></span>
					<a href="/admin/manual/{landing.id}" class="btn-ghost sm" title="Upravit obsah">
						<IconPencil size={14} /> Editor
					</a>
					<button class="btn-ghost sm" onclick={() => openCreate(null)} title="Přidat podstránku">
						<IconPlus size={14} />
					</button>
				</div>

				{#if expanded.has('landing')}
					<div class="subtree">
						{@render pageList(null, 0)}
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>

<!-- Recursive page list snippet -->
{#snippet pageList(parentId: string | null, depth: number)}
	{#each children(parentId) as p (p.id)}
		{@const hasChildren = children(p.id).length > 0}
		<div class="tree-item" style="--depth: {depth}">
			<div class="tree-row" class:disabled={!p.enabled}>
				<div class="indent" style="width: {depth * 20}px"></div>
				{#if hasChildren}
					<button class="expand-btn" onclick={() => toggleExpand(p.id)} aria-label="Expand">
						{#if expanded.has(p.id)}
							<IconChevronDown size={14} />
						{:else}
							<IconChevronRight size={14} />
						{/if}
					</button>
				{:else}
					<span class="expand-placeholder"></span>
				{/if}

				{#if renamingId === p.id}
					<input
						class="rename-input"
						bind:value={renameValue}
						onkeydown={e => { if (e.key === 'Enter') renamePage(p.id); if (e.key === 'Escape') renamingId = null; }}
						onblur={() => renamePage(p.id)}
						autofocus
					/>
				{:else}
					<span class="page-title-text">{p.title}</span>
					<span class="page-slug muted">{pageFullSlug(p)}</span>
				{/if}

				<span class="spacer"></span>

				<button class="btn-ghost sm" onclick={() => toggleEnabled(p)} title={p.enabled ? 'Skrýt' : 'Zobrazit'}>
					{#if p.enabled}<IconEye size={14} />{:else}<IconEyeOff size={14} />{/if}
				</button>
				<a href="/admin/manual/{p.id}" class="btn-ghost sm" title="Upravit bloky">
					<IconPencil size={14} />
				</a>
				<button class="btn-ghost sm" onclick={() => { renamingId = p.id; renameValue = p.title; }} title="Přejmenovat">
					Aa
				</button>
				<button class="btn-ghost sm" onclick={() => openCreate(p.id)} title="Přidat podstránku">
					<IconPlus size={14} />
				</button>
				<button class="btn-ghost sm danger" onclick={() => confirmDeleteId = p.id} title="Smazat">
					<IconTrash size={14} />
				</button>
			</div>

			{#if hasChildren && expanded.has(p.id)}
				<div class="subtree">
					{@render pageList(p.id, depth + 1)}
				</div>
			{/if}
		</div>
	{/each}
{/snippet}

<!-- Create modal -->
{#if showCreate}
	<div class="modal-backdrop" role="presentation" onclick={closeCreate}>
		<div class="modal" role="dialog" onclick={e => e.stopPropagation()}>
			<div class="modal-header">
				<h2>Nová stránka</h2>
				<button class="btn-ghost" onclick={closeCreate}><IconX size={18} /></button>
			</div>
			<div class="modal-body">
				<label class="field">
					<span>Název</span>
					<input type="text" bind:value={createTitle} placeholder="Např. Loga" autofocus />
				</label>
				<label class="field">
					<span>Slug <span class="muted">(URL segment)</span></span>
					<input type="text" bind:value={createSlug} placeholder="loga" />
				</label>
				<label class="field">
					<span>Popis <span class="muted">(volitelný)</span></span>
					<textarea bind:value={createDescription} rows={2} placeholder="Krátký popis stránky…"></textarea>
				</label>
				{#if errMsg}<p class="field-error">{errMsg}</p>{/if}
			</div>
			<div class="modal-footer">
				<button class="btn-secondary" onclick={closeCreate} disabled={saving}>Zrušit</button>
				<button class="btn-primary" onclick={createPage} disabled={saving || !createTitle || !createSlug}>
					{saving ? 'Ukládám…' : 'Vytvořit'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Delete confirm modal -->
{#if confirmDeleteId}
	{@const target = pages.find(p => p.id === confirmDeleteId)}
	<div class="modal-backdrop" role="presentation" onclick={() => confirmDeleteId = null}>
		<div class="modal modal-sm" role="dialog" onclick={e => e.stopPropagation()}>
			<div class="modal-header">
				<h2>Smazat stránku?</h2>
				<button class="btn-ghost" onclick={() => confirmDeleteId = null}><IconX size={18} /></button>
			</div>
			<div class="modal-body">
				<p>Opravdu smazat stránku <strong>{target?.title}</strong>? Smaže se i veškerý obsah (bloky) a podstránky.</p>
			</div>
			<div class="modal-footer">
				<button class="btn-secondary" onclick={() => confirmDeleteId = null} disabled={saving}>Zrušit</button>
				<button class="btn-danger" onclick={() => deletePage(confirmDeleteId!)} disabled={saving}>
					{saving ? 'Mažu…' : 'Smazat'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
.page { max-width: 860px; }
.header-actions { display: flex; align-items: center; gap: .5rem; }
.btn-ghost.external { display: flex; align-items: center; gap: .35rem; padding: .45rem .75rem; border: 1px solid var(--color-border); border-radius: 6px; color: var(--color-muted); text-decoration: none; font-size: .875rem; }
.btn-ghost.external:hover { color: var(--color-text); border-color: var(--color-text); }
.error-bar { background: #fef2f2; color: #b91c1c; border: 1px solid #fca5a5; border-radius: 6px; padding: .6rem 1rem; margin-bottom: 1rem; font-size: .875rem; }

.tree-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 10px; overflow: hidden; }
.tree-root { }
.tree-row { display: flex; align-items: center; gap: .35rem; padding: .55rem .75rem; min-height: 38px; border-bottom: 1px solid var(--color-border); }
.tree-row:last-child { border-bottom: none; }
.tree-row:hover { background: var(--color-surface-raised); }
.tree-row.disabled { opacity: 0.5; }
.root-row { background: var(--color-surface-raised); font-weight: 600; }
.tree-item { }
.subtree { border-top: 1px solid var(--color-border); }
.expand-btn { width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; border: none; background: none; cursor: pointer; color: var(--color-muted); border-radius: 4px; flex-shrink: 0; padding: 0; }
.expand-btn:hover { background: var(--color-border); }
.expand-placeholder { width: 20px; flex-shrink: 0; }
.page-icon { display: flex; align-items: center; color: var(--brand); flex-shrink: 0; }
.root-icon { color: var(--brand); }
.page-title-text { font-size: .875rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px; }
.page-slug { font-size: .75rem; color: var(--color-muted); font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }
.indent { flex-shrink: 0; }
.spacer { flex: 1; }
.muted { color: var(--color-muted); }
.rename-input { flex: 1; border: 1px solid var(--brand); border-radius: 4px; padding: .2rem .5rem; font-size: .875rem; outline: none; background: var(--color-surface); color: var(--color-text); }

/* Buttons */
.btn-primary { display: flex; align-items: center; gap: .4rem; padding: .5rem 1rem; background: var(--brand); color: #fff; border: none; border-radius: 6px; font-size: .875rem; cursor: pointer; }
.btn-primary:hover:not(:disabled) { filter: brightness(1.1); }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-secondary { display: flex; align-items: center; gap: .4rem; padding: .5rem 1rem; background: var(--color-surface-raised); color: var(--color-text); border: 1px solid var(--color-border); border-radius: 6px; font-size: .875rem; cursor: pointer; }
.btn-secondary:hover:not(:disabled) { background: var(--color-border); }
.btn-secondary:disabled { opacity: .5; cursor: not-allowed; }
.btn-danger { display: flex; align-items: center; gap: .4rem; padding: .5rem 1rem; background: #ef4444; color: #fff; border: none; border-radius: 6px; font-size: .875rem; cursor: pointer; }
.btn-danger:hover:not(:disabled) { background: #dc2626; }
.btn-danger:disabled { opacity: .5; cursor: not-allowed; }
.btn-ghost { display: flex; align-items: center; gap: .3rem; padding: .3rem .5rem; background: none; border: none; border-radius: 5px; font-size: .8rem; cursor: pointer; color: var(--color-muted); }
.btn-ghost:hover { background: var(--color-surface-raised); color: var(--color-text); }
.btn-ghost.sm { padding: .2rem .4rem; }
.btn-ghost.danger:hover { color: #ef4444; }
a.btn-ghost { text-decoration: none; }

/* Modal */
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: var(--color-surface); border-radius: 12px; width: 420px; max-width: 95vw; box-shadow: 0 20px 60px rgba(0,0,0,.25); }
.modal-sm { width: 360px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 1.2rem 1.4rem .8rem; border-bottom: 1px solid var(--color-border); }
.modal-header h2 { margin: 0; font-size: 1rem; font-weight: 600; }
.modal-body { padding: 1.2rem 1.4rem; display: flex; flex-direction: column; gap: .9rem; }
.modal-footer { padding: .8rem 1.4rem 1.2rem; display: flex; justify-content: flex-end; gap: .5rem; border-top: 1px solid var(--color-border); }
.field { display: flex; flex-direction: column; gap: .35rem; font-size: .875rem; }
.field span { font-weight: 500; color: var(--color-text); }
.field input, .field textarea { padding: .5rem .7rem; border: 1px solid var(--color-border); border-radius: 6px; font-size: .875rem; background: var(--color-surface-raised); color: var(--color-text); outline: none; resize: vertical; }
.field input:focus, .field textarea:focus { border-color: var(--brand); }
.field-error { color: #ef4444; font-size: .8rem; margin: 0; }
</style>
