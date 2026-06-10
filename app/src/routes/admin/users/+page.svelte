<script lang="ts">
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';
	import { languageTag } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages';
	import {
		IconPlus, IconPencil, IconTrash, IconX, IconCheck,
		IconUsers, IconLink, IconCopy, IconShieldFilled,
		IconUserCircle, IconAlertTriangle
	} from '@tabler/icons-svelte';

	const { data }: { data: PageData } = $props();

	type User = {
		id: string;
		email: string;
		name: string | null;
		role: 'admin' | 'editor' | 'member';
		createdAt: string | Date;
		updatedAt: string | Date;
	};

	let users       = $state<User[]>(data.users as User[]);
	let currentId   = $state(data.currentUserId);
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
		} catch (e) { error = e instanceof Error ? e.message : 'Error'; }
		finally { saving = false; }
	}

	// ── Delete ────────────────────────────────────────────────────────────────
	let confirmModal = $state<{ title: string; message: string; onConfirm: () => void } | null>(null);

	function confirmDelete(u: User) {
		confirmModal = {
			title: m.users_confirm_delete(),
			message: m.users_confirm_delete_msg({ name: u.name ?? u.email }),
			onConfirm: async () => {
				const res = await fetch(`/api/users/${u.id}`, { method: 'DELETE' });
				if (!res.ok) { const j = await res.json().catch(() => ({})); alert(j.message ?? 'Delete failed'); return; }
				await refresh();
			}
		};
	}

	// ── Magic link ────────────────────────────────────────────────────────────
	let magicModal = $state<{ link: string; email: string; expiresAt: string } | null>(null);
	let copied = $state(false);

	async function generateMagicLink(u: User) {
		const res = await fetch(`/api/users/${u.id}/magic-link`, { method: 'POST' });
		if (!res.ok) { alert('Failed to generate link'); return; }
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

	const AVATAR_COLORS = ['#6366f1','#8b5cf6','#ec4899','#10b981','#f59e0b','#3b82f6','#14b8a6','#f97316'];
	function avatarColor(email: string): string {
		let h = 0;
		for (const c of email) h = (h * 31 + c.charCodeAt(0)) | 0;
		return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
	}

	function formatDate(d: string | Date): string {
		const locale = languageTag() === 'cs' ? 'cs-CZ' : 'en-GB';
		return new Date(d).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
	}

	const adminCount  = $derived(users.filter(u => u.role === 'admin').length);
	const editorCount = $derived(users.filter(u => u.role === 'editor').length);
	const memberCount = $derived(users.filter(u => u.role === 'member').length);

	function userCountLabel(n: number): string {
		return n === 1 ? m.users_stat_one() : m.users_stat_many();
	}
</script>

<svelte:window onkeydown={(e) => {
	if (e.key !== 'Escape') return;
	if (magicModal)   { magicModal = null; return; }
	if (confirmModal) { confirmModal = null; return; }
	if (showUserModal){ showUserModal = false; return; }
}} />

<svelte:head><title>{m.admin_users()} · Brandywine</title></svelte:head>

<div class="page">

	<!-- ── Topbar ──────────────────────────────────────────────────────────── -->
	<div class="topbar">
		<div class="topbar-left">
			<h1 class="page-title">{m.admin_users()}</h1>
			<p class="page-sub">{users.length} {userCountLabel(users.length)}</p>
		</div>
		<div class="topbar-actions">
			<button class="btn-primary" onclick={openAdd}>
				<IconPlus size={13} stroke={2} /> {m.users_add()}
			</button>
		</div>
	</div>

	<!-- ── Role filter tabs ─────────────────────────────────────────────────── -->
	{#if users.length > 0}
	<div class="role-tabs">
		<button class="rtab" class:active={roleFilter === 'all'} onclick={() => roleFilter = 'all'}>
			{m.users_filter_all()} <span class="rtab-count">{users.length}</span>
		</button>
		<button class="rtab" class:active={roleFilter === 'admin'} onclick={() => roleFilter = 'admin'}>
			Admin <span class="rtab-count">{adminCount}</span>
		</button>
		<button class="rtab" class:active={roleFilter === 'editor'} onclick={() => roleFilter = 'editor'}>
			Editor <span class="rtab-count">{editorCount}</span>
		</button>
		<button class="rtab" class:active={roleFilter === 'member'} onclick={() => roleFilter = 'member'}>
			{m.users_stat_one()} <span class="rtab-count">{memberCount}</span>
		</button>
	</div>
	{/if}

	{#if users.length === 0}
		<!-- ── Empty state ─────────────────────────────────────────────────── -->
		<div class="empty-state">
			<div class="empty-icon"><IconUsers size={48} stroke={1} color="var(--color-border)" /></div>
			<p class="empty-title">{m.users_empty_title()}</p>
			<p class="empty-sub">{m.users_empty_sub()}</p>
			<button class="btn-primary" onclick={openAdd}>{m.users_add_first()}</button>
		</div>
	{:else}
		<!-- ── Search ──────────────────────────────────────────────────────── -->
		<div class="search-bar">
			<input
				type="search"
				bind:value={search}
				placeholder={m.users_search_placeholder()}
				class="search-input"
			/>
		</div>

		<!-- ── User list ───────────────────────────────────────────────────── -->
		<div class="user-list">
			{#if filtered.length === 0}
				<div class="list-empty">{m.users_none_match()}</div>
			{:else}
				{#each filtered as u (u.id)}
					<div class="user-row">
						<!-- Avatar -->
						<div class="avatar" style="background:{avatarColor(u.email)}">
							{initials(u)}
						</div>

						<!-- Identity -->
						<div class="user-identity">
							<div class="user-name-row">
								<span class="user-name">{u.name ?? u.email}</span>
								{#if u.id === currentId}
									<span class="you-badge">{m.users_you()}</span>
								{/if}
							</div>
							{#if u.name}
								<span class="user-email">{u.email}</span>
							{/if}
						</div>

						<!-- Role -->
						<div class="user-role">
							{#if u.role === 'admin'}
								<span class="role-badge role-admin">
									<IconShieldFilled size={11} /> Admin
								</span>
							{:else if u.role === 'editor'}
								<span class="role-badge role-editor">
									<IconPencil size={11} /> Editor
								</span>
							{:else}
								<span class="role-badge role-member">
									<IconUserCircle size={11} /> {m.users_stat_one()}
								</span>
							{/if}
						</div>

						<!-- Date -->
						<span class="user-date">{formatDate(u.createdAt)}</span>

						<!-- Actions -->
						<div class="user-actions">
							<button class="icon-btn" title={m.users_tooltip_magic()} onclick={() => generateMagicLink(u)}>
								<IconLink size={14} stroke={1.75} />
							</button>
							<button class="icon-btn" title={m.users_tooltip_edit()} onclick={() => openEdit(u)}>
								<IconPencil size={14} stroke={1.75} />
							</button>
							{#if u.id !== currentId}
								<button class="icon-btn icon-btn-danger" title={m.users_tooltip_delete()} onclick={() => confirmDelete(u)}>
									<IconTrash size={14} stroke={1.75} />
								</button>
							{:else}
								<span class="icon-btn-placeholder"></span>
							{/if}
						</div>
					</div>
				{/each}
			{/if}
		</div>
	{/if}
</div>

<!-- ── Add / Edit modal ────────────────────────────────────────────────────── -->
{#if showUserModal}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={() => (showUserModal = false)}>
		<div class="modal" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h2>{editingUser ? m.users_modal_edit() : m.users_modal_add()}</h2>
				<button class="modal-close" aria-label={m.users_btn_close()} onclick={() => (showUserModal = false)}>
					<IconX size={16} stroke={1.75} />
				</button>
			</div>
			<div class="modal-body">
				<div class="modal-fields">
					<div class="field">
						<label for="u-name">{m.users_field_name()}</label>
						<input id="u-name" type="text" bind:value={userForm.name} placeholder={m.auth_name_placeholder()} autofocus />
					</div>
					<div class="field">
						<label for="u-email">{m.users_field_email()} {#if !editingUser}<span class="req">*</span>{/if}</label>
						{#if editingUser}
							<input id="u-email" type="email" value={editingUser.email} disabled class="disabled" />
							<p class="field-hint">{m.users_email_locked()}</p>
						{:else}
							<input id="u-email" type="email" bind:value={userForm.email} placeholder={m.auth_email_placeholder()} />
						{/if}
					</div>
					<div class="field">
						<label for="u-role">{m.users_field_role()}</label>
						<select id="u-role" bind:value={userForm.role} disabled={editingUser?.id === currentId}>
							<option value="member">{m.users_role_member_desc()}</option>
							<option value="editor">{m.users_role_editor_desc()}</option>
							<option value="admin">{m.users_role_admin_desc()}</option>
						</select>
						{#if editingUser?.id === currentId}
							<p class="field-hint">{m.users_own_role()}</p>
						{/if}
					</div>
					<div class="field">
						<label for="u-password">
							{editingUser ? m.users_field_new_password() : m.users_field_password()}
							{#if editingUser}<span class="field-optional">{m.users_password_keep()}</span>{/if}
						</label>
						<div class="password-wrap">
							<input
								id="u-password"
								type={userForm.showPassword ? 'text' : 'password'}
								bind:value={userForm.password}
								placeholder={editingUser ? '••••••••' : m.users_password_min()}
								autocomplete="new-password"
							/>
							<button
								type="button"
								class="password-toggle"
								onclick={() => (userForm.showPassword = !userForm.showPassword)}
								tabindex="-1"
							>
								{userForm.showPassword ? m.users_password_hide() : m.users_password_show()}
							</button>
						</div>
					</div>
				</div>
				{#if error}
					<div class="modal-error">
						<IconAlertTriangle size={14} stroke={2} /> {error}
					</div>
				{/if}
			</div>
			<div class="modal-footer">
				<button class="btn-secondary" onclick={() => (showUserModal = false)}>{m.users_btn_cancel()}</button>
				<button
					class="btn-primary"
					onclick={saveUser}
					disabled={saving || (!editingUser && !userForm.email.trim())}
				>
					{saving ? '…' : editingUser ? m.users_btn_save() : m.users_modal_add()}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- ── Magic link modal ────────────────────────────────────────────────────── -->
{#if magicModal}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={() => (magicModal = null)}>
		<div class="modal modal-sm" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h2>{m.users_magic_title()}</h2>
				<button class="modal-close" aria-label={m.users_btn_close()} onclick={() => (magicModal = null)}>
					<IconX size={16} stroke={1.75} />
				</button>
			</div>
			<div class="modal-body">
				<p class="magic-desc">
					{m.users_magic_send_prefix()} <strong>{magicModal.email}</strong>. {m.users_magic_no_password()} {m.users_magic_valid_prefix()} <strong>{m.users_magic_duration()}</strong>.
				</p>
				<div class="magic-link-box">
					<span class="magic-link-text">{magicModal.link}</span>
					<button class="magic-copy-btn" class:copied onclick={copyLink}>
						{#if copied}
							<IconCheck size={14} stroke={2.2} /> {m.users_magic_copied()}
						{:else}
							<IconCopy size={14} stroke={1.75} /> {m.users_magic_copy()}
						{/if}
					</button>
				</div>
				<p class="magic-warning">
					<IconAlertTriangle size={13} stroke={2} />
					{m.users_magic_warning()}
				</p>
			</div>
			<div class="modal-footer">
				<button class="btn-secondary" onclick={() => (magicModal = null)}>{m.users_btn_close()}</button>
			</div>
		</div>
	</div>
{/if}

<!-- ── Confirm modal ───────────────────────────────────────────────────────── -->
{#if confirmModal}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={() => (confirmModal = null)}>
		<div class="modal modal-sm" role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h2>{confirmModal.title}</h2>
				<button class="modal-close" aria-label={m.users_btn_close()} onclick={() => (confirmModal = null)}>
					<IconX size={16} stroke={1.75} />
				</button>
			</div>
			<div class="modal-body">
				<p class="confirm-msg">{confirmModal.message}</p>
			</div>
			<div class="modal-footer">
				<button class="btn-secondary" onclick={() => (confirmModal = null)}>{m.users_btn_cancel()}</button>
				<button class="btn-danger" onclick={() => { confirmModal!.onConfirm(); confirmModal = null; }}>{m.users_btn_delete()}</button>
			</div>
		</div>
	</div>
{/if}

<style>
/* ── Page ─────────────────────────────────────────────────────────────────── */
.page {
	width: 100%; max-width: 860px; min-height: 100vh;
	padding-bottom: 4rem;
}

/* ── Topbar ───────────────────────────────────────────────────────────────── */
.topbar {
	display: flex; align-items: flex-start; justify-content: space-between;
	padding: 2rem 2rem 0; margin-bottom: 1.75rem; gap: 1rem;
}
.page-title { font-size: 1.5rem; font-weight: 650; letter-spacing: -0.025em; }
.page-sub { margin-top: 4px; font-size: 0.875rem; color: var(--color-muted); }
.topbar-actions { display: flex; gap: 8px; flex-shrink: 0; }

/* ── Role tabs ────────────────────────────────────────────────────────────── */
.role-tabs {
	display: flex; align-items: center; gap: 2px;
	padding: 0 2rem;
	border-bottom: 1px solid var(--color-border);
	margin-bottom: 1.5rem; overflow-x: auto;
}
.rtab {
	display: flex; align-items: center; gap: 6px;
	padding: 8px 12px; border: none; background: none;
	color: var(--color-muted); cursor: pointer; font-size: 0.8125rem; font-weight: 500;
	border-bottom: 2px solid transparent; margin-bottom: -1px; white-space: nowrap;
	transition: color 0.1s, border-color 0.1s;
}
.rtab:hover { color: var(--color-text); }
.rtab.active { color: var(--brand); border-bottom-color: var(--brand); }
.rtab-count {
	font-size: 0.6875rem; background: var(--color-surface-raised);
	border: 1px solid var(--color-border);
	border-radius: 20px; padding: 0 5px; line-height: 17px;
	color: var(--color-muted); font-weight: 500;
}
.rtab.active .rtab-count {
	background: color-mix(in srgb, var(--brand) 10%, transparent);
	border-color: color-mix(in srgb, var(--brand) 25%, transparent);
	color: var(--brand);
}

/* ── Search ───────────────────────────────────────────────────────────────── */
.search-bar { padding: 0 2rem; margin-bottom: 1rem; }
.search-input {
	width: 100%; max-width: 340px;
	height: 34px; padding: 0 .75rem;
	border: 1.5px solid var(--color-border);
	border-radius: 8px; background: var(--color-surface);
	color: var(--color-text); font-size: .875rem; font-family: inherit;
	outline: none; transition: border-color 0.12s;
}
.search-input:focus { border-color: var(--brand); }

/* ── User list ────────────────────────────────────────────────────────────── */
.user-list {
	padding: 0 2rem; display: flex; flex-direction: column; gap: 0;
}
.list-empty {
	padding: 2.5rem; text-align: center;
	font-size: .875rem; color: var(--color-muted);
}
.user-row {
	display: grid;
	grid-template-columns: 40px minmax(0, 1fr) 100px 110px 96px;
	align-items: center; gap: 12px;
	padding: .75rem 1rem;
	border: 1px solid var(--color-border);
	border-radius: 10px;
	background: var(--color-surface);
	margin-bottom: .5rem;
	transition: border-color 0.12s, box-shadow 0.12s;
}
.user-row:hover {
	border-color: color-mix(in srgb, var(--brand) 30%, var(--color-border));
	box-shadow: 0 2px 8px rgba(0,0,0,.04);
}

/* Avatar */
.avatar {
	width: 38px; height: 38px; border-radius: 50%;
	display: flex; align-items: center; justify-content: center;
	font-size: .8125rem; font-weight: 700; color: #fff;
	flex-shrink: 0; letter-spacing: 0.02em;
}

/* Identity */
.user-identity { min-width: 0; }
.user-name-row { display: flex; align-items: center; gap: 6px; min-width: 0; }
.user-name {
	font-size: .875rem; font-weight: 600; color: var(--color-text);
	overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.you-badge {
	font-size: .6rem; font-weight: 700; letter-spacing: .07em; text-transform: uppercase;
	background: color-mix(in srgb, var(--brand) 12%, transparent);
	color: var(--brand);
	border: 1px solid color-mix(in srgb, var(--brand) 25%, transparent);
	padding: 1px 5px; border-radius: 5px; flex-shrink: 0;
}
.user-email { font-size: .8125rem; color: var(--color-muted); display: block; margin-top: 1px; }

/* Role badge */
.user-role { display: flex; }
.role-badge {
	display: inline-flex; align-items: center; gap: 4px;
	font-size: .7rem; font-weight: 700; letter-spacing: .05em; text-transform: uppercase;
	padding: 3px 8px; border-radius: 99px; white-space: nowrap;
}
.role-admin  { color: #7c3aed; background: #ede9fe; border: 1px solid #c4b5fd; }
.role-editor { color: #0369a1; background: #e0f2fe; border: 1px solid #7dd3fc; }
.role-member { color: var(--color-muted); background: var(--color-surface-raised); border: 1px solid var(--color-border); }

/* Date */
.user-date { font-size: .8125rem; color: var(--color-muted); white-space: nowrap; }

/* Actions */
.user-actions { display: flex; gap: 4px; justify-content: flex-end; }

/* ── Buttons ──────────────────────────────────────────────────────────────── */
.btn-primary {
	display: inline-flex; align-items: center; justify-content: center; gap: .4rem;
	min-height: 36px; padding: 0 .9rem; border-radius: 8px;
	font-weight: 650; font-size: .875rem; cursor: pointer;
	background: var(--brand); color: #fff; border: 1px solid transparent;
}
.btn-primary:disabled { opacity: .45; cursor: default; }
.btn-secondary {
	display: inline-flex; align-items: center; justify-content: center; gap: .4rem;
	min-height: 36px; padding: 0 .9rem; border-radius: 8px;
	font-weight: 600; font-size: .875rem; cursor: pointer;
	background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border);
}
.btn-secondary:hover { background: var(--color-surface-raised); }
.btn-danger {
	display: inline-flex; align-items: center; justify-content: center;
	min-height: 36px; padding: 0 .9rem; border-radius: 8px;
	font-weight: 650; font-size: .875rem; cursor: pointer;
	background: #dc2626; color: #fff; border: 1px solid transparent;
}
.btn-danger:hover { background: #b91c1c; }

.icon-btn {
	display: flex; align-items: center; justify-content: center;
	width: 28px; height: 28px; border: 0; border-radius: 7px;
	background: transparent; color: var(--color-muted); cursor: pointer;
	transition: background 0.1s, color 0.1s;
}
.icon-btn:hover { background: var(--color-surface-raised); color: var(--color-text); }
.icon-btn-danger:hover { background: #fef2f2; color: #dc2626; }
.icon-btn-placeholder { width: 28px; height: 28px; flex-shrink: 0; }

/* ── Empty state ──────────────────────────────────────────────────────────── */
.empty-state {
	display: flex; flex-direction: column; align-items: center;
	gap: 12px; padding: 5rem 2rem; text-align: center;
}
.empty-icon { margin-bottom: 4px; }
.empty-title { font-size: .9375rem; font-weight: 600; color: var(--color-text); }
.empty-sub { font-size: .875rem; color: var(--color-muted); max-width: 300px; line-height: 1.5; }

/* ── Modals ───────────────────────────────────────────────────────────────── */
.modal-backdrop {
	position: fixed; inset: 0; z-index: 800;
	display: flex; align-items: center; justify-content: center;
	background: rgba(0,0,0,.42); backdrop-filter: blur(2px);
}
.modal {
	display: flex; flex-direction: column;
	width: min(480px, 96vw); max-height: min(640px, 92vh);
	border-radius: 14px; border: 1px solid var(--color-border);
	background: var(--color-surface);
	box-shadow: 0 24px 64px rgba(0,0,0,.2); overflow: hidden;
}
.modal.modal-sm { width: min(420px, 96vw); }
.modal-header {
	display: flex; align-items: center; justify-content: space-between;
	padding: .9rem 1.1rem .7rem;
	border-bottom: 1px solid var(--color-border); flex-shrink: 0;
}
.modal-header h2 { font-size: .95rem; font-weight: 650; }
.modal-close {
	display: flex; align-items: center; justify-content: center;
	width: 28px; height: 28px; border: 0; border-radius: 7px;
	background: transparent; color: var(--color-muted); cursor: pointer;
}
.modal-close:hover { background: var(--color-surface-raised); color: var(--color-text); }
.modal-body { padding: 1.1rem; overflow-y: auto; flex: 1; }
.modal-footer {
	display: flex; align-items: center; justify-content: flex-end; gap: .5rem;
	padding: .75rem 1.1rem; border-top: 1px solid var(--color-border); flex-shrink: 0;
}
.modal-error {
	display: flex; align-items: center; gap: .4rem;
	margin-top: .75rem; padding: .55rem .75rem;
	background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;
	color: #dc2626; font-size: .8125rem; font-weight: 500;
}

/* ── Form fields ──────────────────────────────────────────────────────────── */
.modal-fields { display: flex; flex-direction: column; gap: .85rem; }
.field { display: flex; flex-direction: column; gap: .3rem; }
.field label, .field .field-label-text {
	font-size: .8125rem; font-weight: 600; color: var(--color-text);
}
.field-optional { font-weight: 400; color: var(--color-muted); margin-left: .25rem; }
.req { color: #dc2626; margin-left: 2px; }
.field input, .field select {
	height: 36px; padding: 0 .7rem;
	border: 1.5px solid var(--color-border); border-radius: 8px;
	background: var(--color-surface); color: var(--color-text);
	font-size: .875rem; font-family: inherit; outline: none;
	transition: border-color 0.12s;
}
.field input:focus, .field select:focus { border-color: var(--brand); }
.field input.disabled { background: var(--color-surface-raised); color: var(--color-muted); cursor: not-allowed; }
.field-hint { font-size: .775rem; color: var(--color-muted); line-height: 1.4; }

/* Password field */
.password-wrap { position: relative; display: flex; }
.password-wrap input { flex: 1; padding-right: 3.5rem; }
.password-toggle {
	position: absolute; right: 0; top: 0; height: 36px; padding: 0 .65rem;
	border: none; background: none; cursor: pointer;
	color: var(--color-muted); font-size: .75rem; font-weight: 600;
	border-left: 1px solid var(--color-border);
}
.password-toggle:hover { color: var(--color-text); }

/* ── Magic link ───────────────────────────────────────────────────────────── */
.magic-desc { font-size: .875rem; color: var(--color-muted); line-height: 1.5; margin-bottom: .85rem; }
.magic-link-box {
	display: flex; align-items: center;
	border: 1.5px solid var(--color-border); border-radius: 9px;
	overflow: hidden; background: var(--color-surface-raised);
	margin-bottom: .7rem;
}
.magic-link-text {
	flex: 1; padding: .5rem .75rem; font-size: .72rem;
	font-family: var(--font-mono); color: var(--color-text);
	overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0;
}
.magic-copy-btn {
	display: inline-flex; align-items: center; gap: .3rem;
	padding: .45rem .75rem; flex-shrink: 0;
	border: none; border-left: 1px solid var(--color-border);
	background: transparent; cursor: pointer;
	font-size: .8125rem; font-weight: 600; color: var(--color-muted);
	transition: background 0.12s, color 0.12s; white-space: nowrap;
}
.magic-copy-btn:hover { background: var(--color-surface); color: var(--color-text); }
.magic-copy-btn.copied { color: #15803d; }
.magic-warning {
	display: flex; align-items: flex-start; gap: .4rem;
	font-size: .775rem; color: #92400e; line-height: 1.4;
	padding: .5rem .65rem; background: #fffbeb;
	border: 1px solid #fde68a; border-radius: 8px;
}

/* ── Confirm ──────────────────────────────────────────────────────────────── */
.confirm-msg { font-size: .9rem; color: var(--color-muted); line-height: 1.5; }

/* ── Responsive ───────────────────────────────────────────────────────────── */
@media (max-width: 640px) {
	.topbar { padding: 1.25rem 1rem 0; }
	.role-tabs { padding: 0 1rem; }
	.search-bar { padding: 0 1rem; }
	.user-list { padding: 0 1rem; }
	.user-row {
		grid-template-columns: 36px minmax(0,1fr) auto;
		grid-template-rows: auto auto;
		gap: 8px;
	}
	.user-role { grid-column: 3; grid-row: 1; }
	.user-date { display: none; }
	.user-actions { grid-column: 3; grid-row: 2; }
}
</style>
