<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { PageData } from './$types';
	import { tick } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import Modal from '$lib/components/ui/Modal.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import { toast } from '$lib/ui/toast.svelte';
	import {
		IconPlus, IconPencil, IconTrash, IconChevronRight, IconChevronDown,
		IconBook2, IconEye, IconEyeOff, IconListCheck
	} from '$lib/icons';

	const { data }: { data: PageData } = $props();

	// ── Types ──────────────────────────────────────────────────────────────────
	type Page = {
		id: string; parentId: string | null; title: string; slug: string;
		description: string | null; sortOrder: number; enabled: boolean;
		isLanding: boolean;
	};

	// ── State ──────────────────────────────────────────────────────────────────
	let pages = $derived(data.pages as Page[]);
	let expanded = $derived(new SvelteSet(['landing', ...(data.pages as Page[]).map((p) => p.id)]));
	let saving = $state(false);
	let errMsg = $state('');

	// Create modal
	let showCreate = $state(false);
	let createParentId = $state<string | null>(null);
	let createTitle = $state('');
	let createSlug = $state('');
	let createDescription = $state('');
	let createTitleEl = $state<HTMLInputElement | null>(null);

	// Rename inline
	let renamingId = $state<string | null>(null);
	let renameValue = $state('');
	let renameInputEl = $state<HTMLInputElement | null>(null);

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
		const s = new SvelteSet(expanded);
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
	type FetchOptions = NonNullable<Parameters<typeof fetch>[1]>;
	async function apiFetch(url: string, opts: FetchOptions) {
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
			if (createParentId) expanded = new SvelteSet([...expanded, createParentId]);
			closeCreate();
			toast.success(m.manual_page_created());
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
			toast.error(e instanceof Error ? e.message : String(e));
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
			toast.error(e instanceof Error ? e.message : String(e));
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
			toast.success(m.manual_page_deleted());
		} catch (e: unknown) {
			toast.error(e instanceof Error ? e.message : String(e));
		} finally {
			saving = false;
		}
	}

	async function openCreate(parentId: string | null) {
		createParentId = parentId;
		createTitle = '';
		createSlug = '';
		createDescription = '';
		showCreate = true;
		await tick();
		createTitleEl?.focus();
	}

	async function startRename(page: Page) {
		renamingId = page.id;
		renameValue = page.title;
		await tick();
		renameInputEl?.focus();
		renameInputEl?.select();
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

<svelte:head><title>{m.admin_manual()} · Brandywine</title></svelte:head>

<div class="page ap">
	<!-- Header -->
	<div class="page-header ap-topbar">
		<div class="ap-left">
			<h1 class="ap-title">{m.admin_manual()}</h1>
		</div>
		<div class="ap-actions header-actions">
			<a class="btn btn-secondary audit-link" href="/admin/manual/audit">
				<IconListCheck size={16} stroke={1.5} /> {m.manual_audit_link()}
				{#if !data.auditCounts}
					<span class="audit-badge warning">{m.manual_audit_unavailable()}</span>
				{:else if data.auditCounts.error}
					<span class="audit-badge error">{data.auditCounts.error}</span>
				{:else if data.auditCounts.warning}
					<span class="audit-badge warning">{data.auditCounts.warning}</span>
				{/if}
			</a>
			<button class="btn btn-secondary" onclick={() => openCreate(null)}>
				<IconPlus size={16} stroke={1.5} /> {m.manual_add_page()}
			</button>
		</div>
	</div>


	<!-- Tree -->
	<div class="tree-card">
		<!-- Landing (root) -->
		{#if landing}
			<div class="tree-root">
				<div class="tree-row root-row">
					<button class="expand-btn" onclick={() => toggleExpand('landing')} aria-label={m.common_expand()}>
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
					<a href="/admin/manual/{landing.id}" class="btn-ghost sm" title={m.manual_edit_content()}>
						<IconPencil size={14} /> {m.common_editor()}
					</a>
					<button class="btn-ghost sm" onclick={() => openCreate(null)} title={m.manual_add_subpage()} aria-label={m.manual_add_subpage()}>
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
					<button class="expand-btn" onclick={() => toggleExpand(p.id)} aria-label={m.common_expand()}>
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
						bind:this={renameInputEl}
						class="rename-input"
						bind:value={renameValue}
						onkeydown={e => { if (e.key === 'Enter') renamePage(p.id); if (e.key === 'Escape') renamingId = null; }}
						onblur={() => renamePage(p.id)}
					/>
				{:else}
					<a href="/admin/manual/{p.id}" class="page-title-link">{p.title}</a>
					<span class="page-slug muted">{pageFullSlug(p)}</span>
				{/if}

				<span class="spacer"></span>

				<button class="btn-ghost sm" onclick={() => toggleEnabled(p)} title={p.enabled ? m.common_hide() : m.common_show()} aria-label={p.enabled ? m.common_hide() : m.common_show()}>
					{#if p.enabled}<IconEye size={14} />{:else}<IconEyeOff size={14} />{/if}
				</button>
				<a href="/admin/manual/{p.id}" class="btn-ghost sm" title={m.manual_edit_blocks()} aria-label={m.manual_edit_blocks()}>
					<IconPencil size={14} />
				</a>
				<button class="btn-ghost sm" onclick={() => startRename(p)} title={m.common_rename()} aria-label={m.common_rename()}>
					Aa
				</button>
				<button class="btn-ghost sm" onclick={() => openCreate(p.id)} title={m.manual_add_subpage()} aria-label={m.manual_add_subpage()}>
					<IconPlus size={14} />
				</button>
				<button class="btn-ghost sm danger" onclick={() => confirmDeleteId = p.id} title={m.common_delete()} aria-label={m.common_delete()}>
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
<Modal open={showCreate} title={m.manual_new_page()} onClose={closeCreate} initialFocus='input[type="text"]'>
	<div class="form-stack">
		<label class="field">
			<span>{m.manual_field_title()}</span>
			<input class="input" bind:this={createTitleEl} type="text" bind:value={createTitle} placeholder={m.manual_field_title_placeholder()}
				onkeydown={(e) => { if (e.key === 'Enter') createPage(); }} />
		</label>
		<label class="field">
			<span>Slug <span class="muted">{m.manual_field_slug_hint()}</span></span>
			<input class="input mono-input" type="text" bind:value={createSlug} placeholder={m.manual_field_slug_placeholder()} />
		</label>
		<label class="field">
			<span>{m.manual_field_desc()} <span class="muted">{m.common_optional()}</span></span>
			<textarea class="input" bind:value={createDescription} rows={2} placeholder={m.manual_field_desc_placeholder()}></textarea>
		</label>
		{#if errMsg}<p class="field-error">{errMsg}</p>{/if}
	</div>
	{#snippet footer()}
		<button class="btn btn-secondary" onclick={closeCreate} disabled={saving}>{m.common_cancel()}</button>
		<button class="btn btn-primary" onclick={createPage} disabled={saving || !createTitle || !createSlug}>
			{#if saving}<span class="ui-spinner" aria-hidden="true"></span>{/if}
			{saving ? m.common_saving() : m.common_create()}
		</button>
	{/snippet}
</Modal>

<!-- Delete confirm -->
<ConfirmDialog
	open={!!confirmDeleteId}
	title={m.manual_delete_title()}
	busy={saving}
	onCancel={() => (confirmDeleteId = null)}
	onConfirm={() => deletePage(confirmDeleteId!)}
>
	<p>{m.manual_delete_body({ title: pages.find((p) => p.id === confirmDeleteId)?.title ?? '' })}</p>
</ConfirmDialog>

<style>
.page { max-width: 860px; }
.header-actions { display: flex; align-items: center; gap: 8px; }

.tree-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-xs); }
.tree-row { display: flex; align-items: center; gap: 8px; padding: 0 var(--space-3); min-height: 44px; border-bottom: 1px solid var(--color-border); }
.tree-row:last-child { border-bottom: none; }
.tree-row:hover { background: var(--color-hover); }
.tree-row.disabled { opacity: 0.5; }
.root-row { background: var(--color-bg); font-weight: 500; }
.subtree { border-top: 1px solid var(--color-border); }
.expand-btn { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border: none; background: none; cursor: pointer; color: var(--color-muted); border-radius: var(--radius-sm); flex-shrink: 0; padding: 0; }
.expand-btn:hover { background: var(--color-hover); color: var(--color-text); }
.expand-placeholder { width: 20px; flex-shrink: 0; }
.page-icon { display: flex; align-items: center; color: var(--color-muted); flex-shrink: 0; }
.root-icon { color: var(--color-accent); }
.page-title-text { font-size: var(--text-base); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px; }
.page-title-link { display: inline-flex; align-items: center; min-height: 24px; font-size: var(--text-base); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px; color: var(--color-text); text-decoration: none; }
.page-title-link:hover { text-decoration: underline; text-decoration-color: var(--color-border-strong); text-underline-offset: 3px; }
.page-slug { font-size: var(--text-xs); color: var(--color-placeholder); font-family: var(--font-mono); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }
.indent { flex-shrink: 0; }
.spacer { flex: 1; }
.muted { color: var(--color-muted); }
.rename-input { flex: 1; border: 1px solid var(--color-accent); border-radius: var(--radius-sm); padding: .2rem 8px; font-size: var(--text-base); outline: none; background: var(--color-surface); color: var(--color-text); }

/* Buttons */
.audit-link { text-decoration: none; gap: 8px; }
.audit-badge { display: inline-grid; place-items: center; min-width: 18px; height: 18px; padding: 0 4px; border-radius: var(--radius-xs); font-size: var(--text-2xs); font-weight: 500; font-variant-numeric: tabular-nums; }
.audit-badge.error { background: var(--color-danger-subtle); color: var(--color-danger); }
.audit-badge.warning { background: var(--color-warning-subtle); color: var(--color-warning); }
.btn-ghost { display: flex; align-items: center; gap: 4px; padding: 4px 8px; background: none; border: none; border-radius: var(--radius-sm); font-size: var(--text-sm); cursor: pointer; color: var(--color-muted); }
.btn-ghost:hover { background: var(--color-hover); color: var(--color-text); }
.btn-ghost.sm { min-width: 24px; min-height: 24px; padding: 4px 8px; }
.btn-ghost.danger:hover { color: var(--color-danger); }
a.btn-ghost { text-decoration: none; }

.form-stack { display: flex; flex-direction: column; gap: var(--space-4); }
.field span { font-weight: 500; }
.mono-input { font-family: var(--font-mono); font-size: var(--text-sm); }
.field-error { color: var(--color-danger); font-size: var(--text-sm); margin: 0; }
</style>
