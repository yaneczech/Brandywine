<!--
  Webhooks: outgoing HTTP notifications of Brandywine events. Changes are
  saved immediately through /api/webhooks, independent of the settings form.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import * as m from '$lib/paraglide/messages';
	import { EVENT_NAMES } from '$lib/events';
	import { ask } from '$lib/ui/dialog.svelte';
	import { toast } from '$lib/ui/toast.svelte';
	import { IconCopy, IconPlus, IconTrash } from '$lib/icons';

	type Webhook = {
		id: string; url: string; secret: string; events: string[]; enabled: boolean;
		lastStatus: number | null; lastError: string | null; lastDeliveredAt: string | null;
	};

	let hooks = $state<Webhook[]>([]);
	let loaded = $state(false);
	let newUrl = $state('');
	let newEvents = $state<string[]>([]);
	let busy = $state(false);
	let revealed = $state<string | null>(null);

	async function api(url: string, init?: Parameters<typeof fetch>[1]) {
		const r = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init });
		if (!r.ok) throw new Error((await r.text().catch(() => '')) || r.statusText);
		return r.status === 204 ? null : r.json();
	}

	onMount(async () => {
		try {
			hooks = await api('/api/webhooks');
		} catch (e) {
			toast.error(e instanceof Error ? e.message : String(e));
		} finally {
			loaded = true;
		}
	});

	async function add() {
		busy = true;
		try {
			const row = await api('/api/webhooks', { method: 'POST', body: JSON.stringify({ url: newUrl.trim(), events: newEvents }) });
			hooks = [...hooks, row];
			newUrl = '';
			newEvents = [];
			revealed = row.id;
			toast.success(m.webhooks_added());
		} catch (e) {
			toast.error(e instanceof Error ? e.message : String(e));
		} finally {
			busy = false;
		}
	}

	async function update(hook: Webhook, patch: Partial<Pick<Webhook, 'enabled' | 'events'>>) {
		try {
			const row = await api(`/api/webhooks/${hook.id}`, { method: 'PATCH', body: JSON.stringify(patch) });
			hooks = hooks.map((h) => (h.id === row.id ? row : h));
		} catch (e) {
			toast.error(e instanceof Error ? e.message : String(e));
		}
	}

	async function remove(hook: Webhook) {
		if (!(await ask({ title: m.webhooks_delete_title(), description: hook.url, confirmLabel: m.common_delete(), tone: 'danger' }))) return;
		try {
			await api(`/api/webhooks/${hook.id}`, { method: 'DELETE' });
			hooks = hooks.filter((h) => h.id !== hook.id);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : String(e));
		}
	}

	async function test(hook: Webhook) {
		try {
			const result: { status: number; error: string | null } = await api(`/api/webhooks/${hook.id}/test`, { method: 'POST' });
			if (result.error) toast.error(m.webhooks_test_failed({ error: result.error }));
			else toast.success(m.webhooks_test_ok({ status: String(result.status) }));
			hooks = await api('/api/webhooks');
		} catch (e) {
			toast.error(e instanceof Error ? e.message : String(e));
		}
	}

	function toggleEvent(list: string[], event: string, on: boolean): string[] {
		return on ? [...new Set([...list, event])] : list.filter((e) => e !== event);
	}

	async function copySecret(hook: Webhook) {
		await navigator.clipboard.writeText(hook.secret).catch(() => {});
		toast.success(m.webhooks_secret_copied());
	}

	function status(hook: Webhook): string {
		if (!hook.lastDeliveredAt) return m.webhooks_never_sent();
		const when = new Date(hook.lastDeliveredAt).toLocaleString();
		return hook.lastError ? `${hook.lastError} · ${when}` : `HTTP ${hook.lastStatus} · ${when}`;
	}
</script>

<div class="webhooks">
	{#if loaded && hooks.length}
		<ul class="hook-list">
			{#each hooks as hook (hook.id)}
				<li class="hook">
					<div class="hook-head">
						<code class="hook-url">{hook.url}</code>
						<label class="hook-enabled">
							<input type="checkbox" checked={hook.enabled} onchange={(e) => update(hook, { enabled: (e.currentTarget as HTMLInputElement).checked })} />
							{m.webhooks_enabled()}
						</label>
					</div>
					<p class="hook-meta">
						{hook.events.length ? hook.events.join(', ') : m.webhooks_all_events()}
						<span class:fail={Boolean(hook.lastError)}>{status(hook)}</span>
					</p>
					<div class="hook-secret">
						<span>{m.webhooks_secret()}</span>
						<code>{revealed === hook.id ? hook.secret : '••••••••••••'}</code>
						<button type="button" class="btn btn-ghost btn-sm" onclick={() => (revealed = revealed === hook.id ? null : hook.id)}>
							{revealed === hook.id ? m.webhooks_hide() : m.webhooks_show()}
						</button>
						<button type="button" class="btn btn-ghost btn-sm" onclick={() => copySecret(hook)} aria-label={m.webhooks_copy_secret()}>
							<IconCopy size={14} />
						</button>
					</div>
					<details class="hook-events">
						<summary>{m.webhooks_events()}</summary>
						<div class="event-grid">
							{#each EVENT_NAMES as event (event)}
								<label>
									<input type="checkbox" checked={hook.events.includes(event)}
										onchange={(e) => update(hook, { events: toggleEvent(hook.events, event, (e.currentTarget as HTMLInputElement).checked) })} />
									<code>{event}</code>
								</label>
							{/each}
						</div>
					</details>
					<div class="hook-actions">
						<button type="button" class="btn btn-secondary btn-sm" onclick={() => test(hook)}>{m.webhooks_test()}</button>
						<button type="button" class="btn btn-ghost btn-sm" onclick={() => remove(hook)}>
							<IconTrash size={14} /> {m.common_delete()}
						</button>
					</div>
				</li>
			{/each}
		</ul>
	{:else if loaded}
		<p class="empty">{m.webhooks_empty()}</p>
	{/if}

	<form class="hook-new" onsubmit={(e) => { e.preventDefault(); add(); }}>
		<label class="field">
			<span>{m.webhooks_url()}</span>
			<input class="input" type="url" required placeholder="https://example.com/brandywine" bind:value={newUrl} />
		</label>
		<fieldset class="event-grid">
			<legend>{m.webhooks_events_hint()}</legend>
			{#each EVENT_NAMES as event (event)}
				<label>
					<input type="checkbox" checked={newEvents.includes(event)} onchange={(e) => (newEvents = toggleEvent(newEvents, event, (e.currentTarget as HTMLInputElement).checked))} />
					<code>{event}</code>
				</label>
			{/each}
		</fieldset>
		<div>
			<button type="submit" class="btn btn-primary btn-sm" disabled={busy || !newUrl.trim()}>
				<IconPlus size={14} /> {m.webhooks_add()}
			</button>
		</div>
	</form>
</div>

<style>
	.webhooks { display: flex; flex-direction: column; gap: var(--space-5); }
	.hook-list { margin: 0; padding: 0; list-style: none; border-top: 1px solid var(--color-border); }
	.hook { display: flex; flex-direction: column; gap: var(--space-2); padding: var(--space-4) 0; border-bottom: 1px solid var(--color-border); }
	.hook-head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); }
	.hook-url { overflow-wrap: anywhere; font-size: var(--text-sm); }
	.hook-enabled, .event-grid label { display: inline-flex; align-items: center; gap: var(--space-2); font-size: var(--text-sm); white-space: nowrap; }
	.hook-meta { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-4); margin: 0; color: var(--color-muted); font-size: var(--text-xs); }
	.hook-meta .fail { color: var(--color-danger); }
	.hook-secret { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-xs); color: var(--color-muted); }
	.hook-secret code { color: var(--color-text); overflow-wrap: anywhere; }
	.hook-events summary { cursor: pointer; font-size: var(--text-sm); color: var(--color-muted); }
	.hook-actions { display: flex; gap: var(--space-2); }
	.event-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: var(--space-2) var(--space-4); margin: var(--space-2) 0 0; padding: 0; border: none; }
	.event-grid legend { margin-bottom: var(--space-2); padding: 0; color: var(--color-muted); font-size: var(--text-sm); }
	.hook-new { display: flex; flex-direction: column; gap: var(--space-4); }
	.field { display: flex; flex-direction: column; gap: var(--space-1); font-size: var(--text-sm); font-weight: 500; }
	.empty { margin: 0; color: var(--color-muted); font-size: var(--text-sm); }
</style>
