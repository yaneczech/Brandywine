<script lang="ts">
	type Entry = { event: string; at: string; summary: string };
	const { data }: { data: Record<string, unknown> } = $props();
	const entries = $derived((data.entries ?? []) as Entry[]);
</script>

<div class="ap">
	<div class="ap-topbar">
		<div>
			<h1 class="ap-title">Activity</h1>
			<p class="ap-sub">Recent events since the server started — from the example plugin.</p>
		</div>
	</div>
	<div class="ap-content">
		{#if entries.length}
			<table class="activity">
				<thead><tr><th>Event</th><th>Detail</th><th>Time</th></tr></thead>
				<tbody>
					{#each entries as e, i (i)}
						<tr><td><code>{e.event}</code></td><td>{e.summary}</td><td>{new Date(e.at).toLocaleTimeString()}</td></tr>
					{/each}
				</tbody>
			</table>
		{:else}
			<p class="empty">Nothing yet. Upload an asset or save a page.</p>
		{/if}
	</div>
</div>

<style>
	.activity { width: 100%; border-collapse: collapse; font-size: var(--text-sm); }
	.activity th { text-align: left; padding: 8px 12px 8px 0; border-bottom: 1px solid var(--color-border-strong); color: var(--color-muted); font-weight: 500; }
	.activity td { padding: 8px 12px 8px 0; border-bottom: 1px solid var(--color-border); }
	.empty { color: var(--color-muted); }
</style>
