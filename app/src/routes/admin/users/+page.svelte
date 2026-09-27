<script lang="ts">
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';
	import { getLocale } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { toast } from '$lib/ui/toast.svelte';
	import { ask } from '$lib/ui/dialog.svelte';
	import {
		IconPlus, IconPencil, IconTrash, IconCheck, IconUsers, IconLink, IconCopy, IconAlertTriangle, IconSearch
	} from '$lib/icons';

	const { data }: { data: PageData } = $props();

	type User = {
		id: string;
		email: string;
		name: string | null;
		role: 'admin' | 'editor' | 'member';
		createdAt: string | Date;
		updatedAt: string | Date;
	};

	let users       = $derived(data.users as User[]);
	let currentId   = $derived(data.currentUserId);
	let saving      = $state(false);
	let error       = $state('');

	// ── Filters ───────────────────────────────────────────────────────────────
	let roleFilter  = $state<'all' | 'admin' | 'editor' | 'member'>('all');
	let search      = $state('');

	const filtered = $derived(users.filter(u => {
		if (roleFilter !== 'all' && u.role !== roleFilter) return false;
		if (search) {
			const q = search.toLowerCase();
			if (!u.email.toLowerCase().includes(q) && !(u.name ?? '').toLowerCase().includes(q)) return false;
		}
		return true;
	}));

	// ── Add / Edit modal ──────────────────────────────────────────────────────
	let showUserModal = $state(false);
	let editingUser   = $state<User | null>(null);
	let userForm      = $state({ name: '', email: '', role: 'editor' as 'admin' | 'editor' | 'member', password: '', showPassword: false });

	function openAdd() {
		editingUser = null;
		userForm = { name: '', email: '', role: 'member', password: '', showPassword: false };
		error = '';
		showUserModal = true;
	}
	function openEdit(u: User) {
		editingUser = u;
		userForm = { name: u.name ?? '', email: u.email, role: u.role as 'admin' | 'editor' | 'member', password: '', showPassword: false };
		error = '';
		showUserModal = true;
	}

	async function saveUser() {
		saving = true; error = '';
		try {
			if (editingUser) {
				const body: Record<string, unknown> = { name: userForm.name || null, role: userForm.role };
				if (userForm.password) body.password = userForm.password;
				const res = await fetch(`/api/users/${editingUser.id}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(body),
				});
				if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.message ?? 'Update failed'); }
			} else {
				const body: Record<string, unknown> = { email: userForm.email, name: userForm.name || null, role: userForm.role };
				if (userForm.password) body.password = userForm.password;
				const res = await fetch('/api/users', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(body),
				});
				if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.message ?? 'Create failed'); }
			}
			showUserModal = false;
			await refresh();
			toast.success(m.common_saved());
		} catch (e) { error = e instanceof Error ? e.message : 'Error'; }
		finally { saving = false; }
	}

	// ── Delete ────────────────────────────────────────────────────────────────
	async function confirmDelete(u: User) {
		const ok = await ask({
			title: m.users_confirm_delete(),
			description: m.users_confirm_delete_msg({ name: u.name ?? u.email }),
			confirmLabel: m.users_btn_delete()
		});
		if (!ok) return;
		const res = await fetch(`/api/users/${u.id}`, { method: 'DELETE' });
		if (!res.ok) { const j = await res.json().catch(() => ({})); toast.error(j.message ?? m.users_err_delete()); return; }
		await refresh();
		toast.success(m.common_deleted());
	}

	// ── Magic link ────────────────────────────────────────────────────────────
	let magicModal = $state<{ link: string; email: string; expiresAt: string } | null>(null);
	let copied = $state(false);

	async function generateMagicLink(u: User) {
		const res = await fetch(`/api/users/${u.id}/magic-link`, { method: 'POST' });
		if (!res.ok) { toast.error(m.users_err_magic()); return; }
		const j = await res.json();
		magicModal = { link: j.link, email: j.email, expiresAt: j.expiresAt };
		copied = false;
	}

	async function copyLink() {
		if (!magicModal) return;
		await navigator.clipboard.writeText(magicModal.link);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	// ── Helpers ───────────────────────────────────────────────────────────────
	async function refresh() {
		await invalidateAll();
		users = data.users as User[];
		currentId = data.currentUserId;
	}

	function initials(u: User): string {
		if (u.name) {
			const parts = u.name.trim().split(/\s+/);
			if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
			return parts[0].slice(0, 2).toUpperCase();
		}
		return u.email.slice(0, 2).toUpperCase();
	}

	const AVATAR_COLORS = ['#141414','#6f6a62','#8a6f55','#9a5b4b','#5f6f5a','#4f6470','#6b5f7a','#a08a5c'];
	function avatarColor(email: string): string {
		let h = 0;
		for (const c of email) h = (h * 31 + c.charCodeAt(0)) | 0;
		return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
	}

	function formatDate(d: string | Date): string {
		const locale = getLocale() === 'cs' ? 'cs-CZ' : 'en-GB';
		return new Date(d).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
	}

	const adminCount  = $derived(users.filter(u => u.role === 'admin').length);
	const editorCount = $derived(users.filter(u => u.role === 'editor').length);
	const memberCount = $derived(users.filter(u => u.role === 'member').length);

	const roleTabs = $derived([
		{ id: 'all' as const, label: m.users_filter_all(), count: users.length },
		{ id: 'admin' as const, label: 'Admin', count: adminCount },
		{ id: 'editor' as const, label: 'Editor', count: editorCount },
		{ id: 'member' as const, label: m.users_stat_one(), count: memberCount },
	]);

	function userCountLabel(n: number): string {
		return n === 1 ? m.users_stat_one() : m.users_stat_many();
	}
</script>

<svelte:head><title>{m.admin_users()} · Brandywine</title></svelte:head>

<div class="ap">
	<div class="ap-topbar">
		<div>
			<h1 class="ap-title">{m.admin_users()}</h1>
			<p class="ap-sub">{users.length} {userCountLabel(users.length)}</p>
		</div>
		<div class="ap-actions">
			<button class="btn btn-primary" onclick={openAdd}>
				<IconPlus size={15} stroke={1.75} /> {m.users_add()}
			</button>
		</div>
	</div>

	{#if users.length === 0}
		<EmptyState icon={IconUsers} title={m.users_empty_title()} description={m.users_empty_sub()}>
			{#snippet action()}<button class="btn btn-primary" onclick={openAdd}>{m.users_add_first()}</button>{/snippet}
		</EmptyState>
	{:else}
		<div class="toolbar">
			<Tabs items={roleTabs} bind:value={roleFilter} label={m.users_field_role()} />
			<label class="search">
				<IconSearch size={15} stroke={1.5} />
				<input type="search" bind:value={search} placeholder={m.users_search_placeholder()} />
			</label>
		</div>

		{#if filtered.length === 0}
			<EmptyState compact icon={IconSearch} title={m.users_none_match()} />
		{:else}
			<div class="user-list" role="list">
				{#each filtered as u (u.id)}
					<div class="user-row" role="listitem">
						<div class="avatar" style="--av:{avatarColor(u.email)}">{initials(u)}</div>
						<div class="user-identity">
							<div class="user-name-row">
								<span class="user-name">{u.name ?? u.email}</span>
								{#if u.id === currentId}<span class="badge">{m.users_you()}</span>{/if}
							</div>
							{#if u.name}<span class="user-email">{u.email}</span>{/if}
						</div>
						<div class="user-role">
							<span class="role role-{u.role}">
								{#if u.role === 'admin'}Admin{:else if u.role === 'editor'}Editor{:else}{m.users_stat_one()}{/if}
							</span>
						</div>
						<span class="user-date">{formatDate(u.createdAt)}</span>
						<div class="user-actions">
							<button class="row-btn" title={m.users_tooltip_magic()} aria-label={m.users_tooltip_magic()} onclick={() => generateMagicLink(u)}>
								<IconLink size={15} stroke={1.5} />
							</button>
							<button class="row-btn" title={m.users_tooltip_edit()} aria-label={m.users_tooltip_edit()} onclick={() => openEdit(u)}>
								<IconPencil size={15} stroke={1.5} />
							</button>
							{#if u.id !== currentId}
								<button class="row-btn danger" title={m.users_tooltip_delete()} aria-label={m.users_tooltip_delete()} onclick={() => confirmDelete(u)}>
									<IconTrash size={15} stroke={1.5} />
								</button>
							{:else}
								<span class="row-btn-placeholder"></span>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<!-- Add / edit -->
<Modal open={showUserModal} title={editingUser ? m.users_modal_edit() : m.users_modal_add()} onClose={() => (showUserModal = false)} initialFocus="#u-name">
	<div class="form-stack">
		<div class="field">
			<label for="u-name">{m.users_field_name()}</label>
			<input id="u-name" class="input" type="text" bind:value={userForm.name} placeholder={m.auth_name_placeholder()} />
		</div>
		<div class="field">
			<label for="u-email">{m.users_field_email()}</label>
			{#if editingUser}
				<input id="u-email" class="input" type="email" value={editingUser.email} disabled />
				<small>{m.users_email_locked()}</small>
			{:else}
				<input id="u-email" class="input" type="email" bind:value={userForm.email} placeholder={m.auth_email_placeholder()} />
			{/if}
		</div>
		<div class="field">
			<label for="u-role">{m.users_field_role()}</label>
			<select id="u-role" class="input" bind:value={userForm.role} disabled={editingUser?.id === currentId}>
				<option value="member">{m.users_role_member_desc()}</option>
				<option value="editor">{m.users_role_editor_desc()}</option>
				<option value="admin">{m.users_role_admin_desc()}</option>
			</select>
			{#if editingUser?.id === currentId}<small>{m.users_own_role()}</small>{/if}
		</div>
		<div class="field">
			<label for="u-password">
				{editingUser ? m.users_field_new_password() : m.users_field_password()}
				{#if editingUser}<span class="muted">{m.users_password_keep()}</span>{/if}
			</label>
			<div class="password-wrap">
				<input
					id="u-password"
					class="input"
					type={userForm.showPassword ? 'text' : 'password'}
					bind:value={userForm.password}
					placeholder={editingUser ? '••••••••' : m.users_password_min()}
					autocomplete="new-password"
				/>
				<button type="button" class="password-toggle" onclick={() => (userForm.showPassword = !userForm.showPassword)}>
					{userForm.showPassword ? m.users_password_hide() : m.users_password_show()}
				</button>
			</div>
		</div>
		{#if error}
			<div class="alert alert-error"><IconAlertTriangle size={15} stroke={1.75} /> {error}</div>
		{/if}
	</div>
	{#snippet footer()}
		<button class="btn btn-secondary" onclick={() => (showUserModal = false)}>{m.users_btn_cancel()}</button>
		<button class="btn btn-primary" onclick={saveUser} disabled={saving || (!editingUser && !userForm.email.trim())}>
			{#if saving}<span class="ui-spinner" aria-hidden="true"></span>{/if}
			{editingUser ? m.users_btn_save() : m.users_modal_add()}
		</button>
	{/snippet}
</Modal>

<!-- Magic link -->
<Modal open={!!magicModal} title={m.users_magic_title()} size="md" onClose={() => (magicModal = null)}>
	{#if magicModal}
		<p class="magic-desc">
			{m.users_magic_send_prefix()} <strong>{magicModal.email}</strong>. {m.users_magic_no_password()} {m.users_magic_valid_prefix()} <strong>{m.users_magic_duration()}</strong>.
		</p>
		<div class="magic-link-box">
			<span class="magic-link-text">{magicModal.link}</span>
			<button class="btn btn-secondary btn-sm" onclick={copyLink}>
				{#if copied}<IconCheck size={14} stroke={2} /> {m.users_magic_copied()}{:else}<IconCopy size={14} stroke={1.5} /> {m.users_magic_copy()}{/if}
			</button>
		</div>
		<p class="magic-warning"><IconAlertTriangle size={14} stroke={1.75} /> {m.users_magic_warning()}</p>
	{/if}
	{#snippet footer()}
		<button class="btn btn-secondary" onclick={() => (magicModal = null)}>{m.users_btn_close()}</button>
	{/snippet}
</Modal>

<style>
.toolbar {
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	gap: var(--space-4);
	margin-bottom: var(--space-5);
	border-bottom: 1px solid var(--color-border);
}
.toolbar :global(.ui-tabs.underline) { border-bottom: 0; }
.search {
	display: flex; align-items: center; gap: 8px;
	width: min(280px, 100%); height: 32px; margin-bottom: 8px; padding: 0 8px;
	border: 1px solid var(--color-border); border-radius: var(--radius);
	background: var(--color-surface); color: var(--color-muted); box-shadow: var(--shadow-xs);
	transition: border-color var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease);
}
.search:focus-within { border-color: var(--color-border-focus); box-shadow: var(--focus-ring); }
.search input { flex: 1; min-width: 0; border: 0; outline: none; background: transparent; font-size: var(--text-sm); }
.search input::-webkit-search-cancel-button { display: none; }

.user-list {
	border: 1px solid var(--color-border);
	border-radius: var(--radius-lg);
	background: var(--color-surface);
	box-shadow: var(--shadow-xs);
	overflow: hidden;
}
.user-row {
	display: grid;
	grid-template-columns: 36px minmax(0, 1fr) 110px 120px 100px;
	align-items: center;
	gap: var(--space-4);
	padding: var(--space-3) var(--space-4);
	border-top: 1px solid var(--color-border);
	transition: background var(--dur-fast) var(--ease);
}
.user-row:first-child { border-top: 0; }
.user-row:hover { background: #fcfcfb; }
.avatar {
	display: grid; place-items: center;
	width: 34px; height: 34px; border-radius: 50%;
	background: color-mix(in srgb, var(--av) 12%, var(--color-surface));
	box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--av) 22%, transparent);
	/* the hue identifies, the ink keeps initials readable (≥ 4.5:1) */
	color: color-mix(in srgb, var(--av) 45%, var(--color-text));
	font-size: var(--text-xs); font-weight: 500; letter-spacing: 0.02em;
}
.user-identity { min-width: 0; line-height: var(--leading-snug); }
.user-name-row { display: flex; align-items: center; gap: 8px; min-width: 0; }
.user-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: var(--text-sm); font-weight: 500; color: var(--color-text); }
.user-email { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: var(--text-xs); color: var(--color-muted); }
.role { font-size: var(--text-xs); color: var(--color-text-secondary); }
.role::before { content: ''; display: inline-block; width: 6px; height: 6px; margin-right: 8px; border-radius: 50%; vertical-align: 1px; background: var(--color-border-strong); }
.role-admin::before { background: var(--color-accent); }
.role-editor::before { background: var(--color-text-secondary); }
.user-date { font-size: var(--text-xs); color: var(--color-muted); white-space: nowrap; font-variant-numeric: tabular-nums; }
.user-actions { display: flex; justify-content: flex-end; gap: 2px; opacity: 0.55; transition: opacity var(--dur-fast) var(--ease); }
.user-row:hover .user-actions, .user-row:focus-within .user-actions { opacity: 1; }
@media (pointer: coarse) { .user-actions { opacity: 1; } }
.row-btn {
	display: grid; place-items: center; width: 30px; height: 30px;
	border: 0; border-radius: var(--radius); background: none; color: var(--color-text-secondary);
	transition: background var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease);
}
.row-btn:hover { background: var(--color-hover); color: var(--color-text); }
.row-btn.danger:hover { color: var(--color-danger); background: var(--color-danger-subtle); }
.row-btn-placeholder { width: 30px; }

.form-stack { display: flex; flex-direction: column; gap: var(--space-4); }
.password-wrap { position: relative; }
.password-wrap .input { padding-right: 72px; }
.password-toggle {
	position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
	height: 24px; padding: 0 8px; border: 0; border-radius: var(--radius-sm);
	background: none; color: var(--color-muted); font-size: var(--text-xs);
}
.password-toggle:hover { background: var(--color-hover); color: var(--color-text); }

.magic-desc { margin-bottom: var(--space-4); }
.magic-desc strong { color: var(--color-text); font-weight: 500; }
.magic-link-box {
	display: flex; align-items: center; gap: var(--space-2);
	padding: 8px 8px 8px 12px; border: 1px solid var(--color-border); border-radius: var(--radius);
	background: var(--color-bg);
}
.magic-link-text { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-text); }
.magic-warning { display: flex; gap: 8px; align-items: flex-start; margin-top: var(--space-4); font-size: var(--text-xs); color: var(--color-warning); }
.magic-warning :global(svg) { flex-shrink: 0; margin-top: 1px; }

@media (max-width: 760px) {
	.toolbar { flex-direction: column; align-items: stretch; gap: var(--space-3); border-bottom: 0; }
	.toolbar :global(.ui-tabs.underline) { border-bottom: 1px solid var(--color-border); }
	.search { width: 100%; margin: 0; }
	.user-row { grid-template-columns: 36px minmax(0, 1fr) auto; }
	.user-role, .user-date { display: none; }
}
</style>
