<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import type { BlockEditorProps } from '../types';
	import { configArray } from '../_shared/editor';

	const { cfg, onUpdate }: BlockEditorProps = $props();

	type ProcessStep = { title: string; description: string };

	// svelte-ignore state_referenced_locally
	let processSteps = $state<ProcessStep[]>(configArray<ProcessStep>(cfg, 'steps'));
	function updateProcess(newSteps: ProcessStep[]) {
		processSteps = newSteps;
		onUpdate({ ...cfg, steps: newSteps });
	}
</script>

<div class="list-editor">
{#each processSteps as step, i (i)}
		<div class="process-row">
			<div class="step-num">{i + 1}</div>
			<div class="step-fields">
				<input type="text" value={step.title} placeholder={m.be_step_title()}
					oninput={e => updateProcess(processSteps.map((x, j) => j === i ? { ...x, title: (e.target as HTMLInputElement).value } : x))} />
				<textarea rows={2} value={step.description} placeholder={m.be_desc_placeholder()}
					oninput={e => updateProcess(processSteps.map((x, j) => j === i ? { ...x, description: (e.target as HTMLTextAreaElement).value } : x))}></textarea>
			</div>
			<button class="btn-ghost sm danger" onclick={() => updateProcess(processSteps.filter((_, j) => j !== i))}>✕</button>
		</div>
	{/each}
	<button class="btn-add" onclick={() => updateProcess([...processSteps, { title: '', description: '' }])}>{m.be_add_step()}</button>
</div>
