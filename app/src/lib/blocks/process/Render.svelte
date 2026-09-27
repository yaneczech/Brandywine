<script lang="ts">
	import type { BlockRenderProps } from '../types';

	const { block }: BlockRenderProps = $props();
</script>

{#if Array.isArray(block.config.steps)}
	<ol class="process-list">
		{#each block.config.steps as step, i (i)}
			<li class="process-step">
				<div class="step-num">{String(i + 1).padStart(2, '0')}</div>
				<div>
					<div class="step-title">{step.title}</div>
					{#if step.description}<p class="step-desc">{step.description}</p>{/if}
				</div>
			</li>
		{/each}
	</ol>
{/if}

<style>
	.process-list { list-style: none; display: flex; flex-direction: column; margin: 0; padding: 0; border-top: 1px solid var(--manual-border); }
	.process-step { display: flex; gap: 20px; align-items: flex-start; padding: 16px 0; border-bottom: 1px solid var(--manual-border); }
	.step-num { min-width: 2.25rem; padding-top: .2rem; color: var(--manual-muted); font-family: var(--manual-mono); font-size: var(--text-sm); font-variant-numeric: tabular-nums; flex-shrink: 0; }
	.step-title { margin-bottom: .2rem; color: var(--manual-ink); font-weight: 500; font-size: var(--text-lg); letter-spacing: var(--tracking-snug); }
	.step-desc { margin: 0; color: var(--manual-muted); font-size: var(--text-base); line-height: 1.65; }
</style>
