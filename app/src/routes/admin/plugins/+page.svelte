<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { invalidateAll } from '$app/navigation';
	import { ask } from '$lib/ui/dialog.svelte';
	import { toast } from '$lib/ui/toast.svelte';
	import { IconUpload, IconTrash, IconAlertTriangle } from '$lib/icons';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();

	let busy = $state(false);
	let fileInput = $state<HTMLInputElement | null>(null);

	async function request(url: string, init: Parameters<typeof fetch>[1]) {
		const r = await fetch(url, init);
		if (!r.ok) {
			const text = await r.text().catch(() => '');
			let message = text || r.statusText;
			try { message = JSON.parse(text).message ?? message; } catch { /* plain text */ }
			throw new Error(message);
		}
	}

	async function upload(file: File) {
		busy = true;
		try {
			const form = new FormData();
			form.set('package', file);
			await request('/api/plugins', { method: 'POST', body: form });
			toast.success(m.plugins_installed({ name: file.name }));
			await invalidateAll();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : String(e));
		} finally {
			busy = false;
			if (fileInput) fileInput.value = '';
		}
	}

	async function toggle(id: string, enabled: boolean) {
		try {
			await request(`/api/plugins/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled }) });
			await invalidateAll();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : String(e));
		}
	}

	async function remove(id: string, name: string) {
		if (!(await ask({ title: m.plugins_remove_title({ name }), description: m.plugins_remove_desc(), confirmLabel: m.plugins_remove(), tone: 'danger' }))) return;
		try {
			await request(`/api/plugins/${id}`, { method: 'DELETE' });
			await invalidateAll();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : String(e));
		}
	}

	const count = (n: number | undefined) => n ?? 0;
</script>

<svelte:head><title>{m.admin_plugins()} · Brandywine</title></svelte:head>

<div class="ap">
	<div class="ap-topbar">
		<div>
			<h1 class="ap-title">{m.admin_plugins()}</h1>
			<p class="ap-sub">{m.plugins_sub()}</p>
		</div>
		{#if data.installsAllowed}
			<div class="ap-actions">
				<input bind:this={fileInput} type="file" accept=".zip,application/zip" hidden
					onchange={(e) => { const f = (e.currentTarget as HTMLInputElement).files?.[0]; if (f) upload(f); }} />
				<button class="btn btn-primary" disabled={busy} onclick={() => fileInput?.click()}>
					<IconUpload size={15} /> {busy ? m.plugins_uploading() : m.plugins_upload()}
				</button>
			</div>
		{/if}
	</div>

	<div class="ap-content">
		<p class="notice"><IconAlertTriangle size={16} /> {m.plugins_trust()}</p>
		{#if !data.installsAllowed}
			<p class="muted">{m.plugins_installs_disabled()}</p>
		{/if}

		{#if data.installed.length}
			<ul class="plugin-list">
				{#each data.installed as plugin (plugin.id)}
					<li class="plugin">
						<div class="plugin-main">
							<strong>{plugin.manifest.name}</strong>
							<span class="muted">{plugin.id} · {plugin.version}</span>
							{#if plugin.manifest.description}<p>{plugin.manifest.description}</p>{/if}
							<p class="muted small">
								{m.plugins_contents({ blocks: String(count(plugin.manifest.blocks?.length)), pages: String(count(plugin.manifest.modules?.length)) })}
							</p>
						</div>
						<div class="plugin-actions">
							<label class="toggle">
								<input type="checkbox" checked={plugin.enabled} onchange={(e) => toggle(plugin.id, (e.currentTarget as HTMLInputElement).checked)} />
								{m.plugins_enabled()}
							</label>
							<button class="btn btn-ghost btn-sm" onclick={() => remove(plugin.id, plugin.manifest.name)}>
								<IconTrash size={14} /> {m.plugins_remove()}
							</button>
						</div>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="muted">{m.plugins_none()}</p>
		{/if}

		{#if data.compiled.length}
			<h2 class="section-title">{m.plugins_compiled()}</h2>
			<p class="muted small">{m.plugins_compiled_hint()}</p>
			<ul class="plugin-list">
				{#each data.compiled as plugin (plugin.id)}
					<li class="plugin">
						<div class="plugin-main">
							<strong>{plugin.name}</strong>
							<span class="muted">{plugin.id}{plugin.version ? ` · ${plugin.version}` : ''}</span>
							{#if plugin.description}<p>{plugin.description}</p>{/if}
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>

<style>
	.notice { display: flex; align-items: flex-start; gap: var(--space-2); margin: 0 0 var(--space-6); padding-left: var(--space-3); border-left: 1px solid var(--color-warning); color: var(--color-text-secondary); font-size: var(--text-sm); line-height: 1.5; }
	.plugin-list { margin: 0 0 var(--space-8); padding: 0; list-style: none; border-top: 1px solid var(--color-border); }
	.plugin { display: flex; justify-content: space-between; gap: var(--space-6); padding: var(--space-4) 0; border-bottom: 1px solid var(--color-border); }
	.plugin-main { display: flex; flex-direction: column; gap: var(--space-1); min-width: 0; }
	.plugin-main p { margin: 0; font-size: var(--text-sm); }
	.plugin-actions { display: flex; align-items: center; gap: var(--space-4); flex-shrink: 0; }
	.toggle { display: inline-flex; align-items: center; gap: var(--space-2); font-size: var(--text-sm); }
	.section-title { margin: var(--space-8) 0 var(--space-2); font-size: var(--text-md); font-weight: 600; }
	.muted { color: var(--color-muted); }
	.small { font-size: var(--text-xs); }
	@media (max-width: 640px) {
		.plugin { flex-direction: column; gap: var(--space-3); }
	}
</style>
