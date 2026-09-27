<script lang="ts">
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import * as m from '$lib/paraglide/messages';
	import { blockLabel } from '$lib/manual/blockLabels';
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';
	import {
		IconArrowLeft, IconRefresh, IconCircleX, IconAlertTriangle, IconInfoCircle,
		IconCircleCheck, IconChevronRight
	} from '$lib/icons';

	const { data }: { data: PageData } = $props();

	type Filter = 'all' | 'error' | 'warning' | 'info';
	let filter = $state<Filter>('all');
	let refreshing = $state(false);

	const counts = $derived({
		error: data.issues.filter((i) => i.severity === 'error').length,
		warning: data.issues.filter((i) => i.severity === 'warning').length,
		info: data.issues.filter((i) => i.severity === 'info').length,
	});
	// Hidden blocks and informational suggestions do not indicate a quality failure.
	const score = $derived(Math.max(0, 100 - counts.error * 8 - counts.warning * 3));
	const visible = $derived(filter === 'all' ? data.issues : data.issues.filter((i) => i.severity === filter));

	type Group = { key: string; title: string; items: typeof visible };
	const groups = $derived(
		visible.reduce<Group[]>((out, issue) => {
			const key = issue.pageId ?? '__brand';
			const group = out.find((g) => g.key === key);
			if (group) group.items.push(issue);
			else out.push({ key, title: issue.pageTitle ?? m.audit_group_brand(), items: [issue] });
			return out;
		}, [])
	);


	function fixHref(issue: PageData['issues'][number]): string {
		if (issue.code === 'no_landing') return '/admin/manual';
		if (!issue.pageId) return '/admin/brand';
		if (issue.blockId) return `/admin/manual/${issue.pageId}?block=${issue.blockId}`;
		return `/admin/manual/${issue.pageId}?settings=1`;
	}

	async function refresh() {
		refreshing = true;
		try { await invalidateAll(); } finally { refreshing = false; }
	}
</script>

<svelte:head><title>{m.audit_title()} · Brandywine</title></svelte:head>

<div class="audit">
	<header class="audit-head">
		<a href="/admin/manual" class="back"><IconArrowLeft size={16} stroke={1.5} /> {m.audit_back()}</a>
		<div class="audit-title-row">
			<div>
				<h1>{m.audit_title()}</h1>
				<p class="muted">{m.audit_sub()}</p>
			</div>
			<button class="btn btn-secondary" onclick={refresh} disabled={refreshing}>
				<IconRefresh size={15} class={refreshing ? 'spin' : ''} /> {m.audit_recheck()}
			</button>
		</div>
	</header>

	<section class="summary">
		<div class="score" title={m.audit_score_hint()} style="--score:{score}" class:good={score >= 85} class:mid={score >= 60 && score < 85}>
			<svg viewBox="0 0 36 36" aria-hidden="true">
				<circle cx="18" cy="18" r="15.9" class="track" />
				<circle cx="18" cy="18" r="15.9" class="bar" stroke-dasharray="{score} 100" />
			</svg>
			<div class="score-text"><strong>{Math.round(score)}</strong><span>/ 100</span></div>
		</div>
		<Tabs
			variant="segmented"
			label={m.audit_filter_label()}
			bind:value={filter}
			items={[
				{ id: 'all', label: m.common_all(), count: data.issues.length },
				{ id: 'error', label: m.audit_errors(), count: counts.error, icon: IconCircleX },
				{ id: 'warning', label: m.audit_warnings(), count: counts.warning, icon: IconAlertTriangle },
				{ id: 'info', label: m.audit_tips(), count: counts.info, icon: IconInfoCircle },
			]}
		/>
	</section>

	{#if !data.issues.length}
		<EmptyState icon={IconCircleCheck} title={m.audit_all_good_title()} description={m.audit_all_good_sub()} />
	{:else if !visible.length}
		<EmptyState compact title={m.audit_filter_empty()} />
	{:else}
		<div class="groups">
			{#each groups as group (group.key)}
				<section class="group">
					<h2 class="group-title">
						{group.title}
						<span class="count">{group.items.length}</span>
					</h2>
					<ul>
						{#each group.items as issue, i (`${issue.code}-${issue.blockId ?? ''}-${i}`)}
							<li>
								<a href={fixHref(issue)} class="issue sev-{issue.severity}">
									<span class="sev-icon">
										{#if issue.severity === 'error'}<IconCircleX size={17} />
										{:else if issue.severity === 'warning'}<IconAlertTriangle size={17} />
										{:else}<IconInfoCircle size={17} />{/if}
									</span>
									<span class="issue-body">
										<span class="issue-msg">{issue.message}</span>
										{#if issue.blockType}
											<span class="issue-where">
												{blockLabel(issue.blockType)}{#if issue.blockHeading} · {issue.blockHeading}{/if}
											</span>
										{/if}
									</span>
									<IconChevronRight size={16} class="issue-arrow" />
								</a>
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		</div>
	{/if}
</div>

<style>
.audit { max-width: 920px; padding: 24px 32px 64px; }
.back { display: inline-flex; align-items: center; gap: 4px; min-height: 24px; color: var(--color-muted); font-size: var(--text-base); }
.back:hover { color: var(--color-text); }
.audit-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-top: 12px; }
h1 { margin: 0; font-size: 1.5rem; font-weight: 600; letter-spacing: var(--tracking-snug); }
.muted { color: var(--color-muted); }
.audit-title-row p { margin: 4px 0 0; font-size: var(--text-base); }


:global(.spin) { animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.summary { display: flex; align-items: center; gap: 24px; margin: 24px 0; padding: 16px 20px; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); flex-wrap: wrap; }
.score { position: relative; width: 72px; height: 72px; flex: 0 0 auto; --c: var(--color-danger); }
.score.mid { --c: var(--color-warning); }
.score.good { --c: var(--color-success); }
.score svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.score circle { fill: none; stroke-width: 3.2; }
.score .track { stroke: var(--color-border); }
.score .bar { stroke: var(--c); stroke-linecap: round; transition: stroke-dasharray .4s ease; }
.score-text { position: absolute; inset: 0; display: flex; align-items: baseline; justify-content: center; padding-top: 24px; gap: 4px; }
.score-text strong { font-size: var(--text-xl); font-weight: 600; }
.score-text span { font-size: var(--text-2xs); color: var(--color-muted); }

.count { display: inline-grid; place-items: center; min-width: 20px; height: 20px; padding: 0 8px; border-radius: var(--radius-sm); background: color-mix(in srgb, currentColor 12%, transparent); font-size: var(--text-xs); font-weight: 600; }

.groups { display: flex; flex-direction: column; gap: 24px; }
.group-title { display: flex; align-items: center; gap: 8px; margin: 0 0 8px; font-size: var(--text-md); font-weight: 600; }
.group ul { margin: 0; padding: 0; list-style: none; border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); overflow: hidden; }
.group li + li { border-top: 1px solid var(--color-border); }
.issue { display: flex; align-items: center; gap: 12px; padding: 12px 16px; color: var(--color-text); transition: background .12s ease; }
.issue:hover { background: var(--color-hover); }
.sev-icon { display: grid; place-items: center; flex: 0 0 auto; }
.issue.sev-error .sev-icon { color: var(--color-danger); }
.issue.sev-warning .sev-icon { color: var(--color-warning); }
.issue.sev-info .sev-icon { color: var(--color-info); }
.issue-body { display: flex; flex: 1; min-width: 0; flex-direction: column; gap: 4px; }
.issue-msg { font-size: var(--text-base); line-height: 1.45; }
.issue-where { color: var(--color-muted); font-size: var(--text-xs); }
:global(.issue-arrow) { flex: 0 0 auto; color: var(--color-muted); }


@media (max-width: 640px) {
	.audit { padding: 16px 16px 48px; }
	.audit-title-row { flex-direction: column; }
}
</style>
