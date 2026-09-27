import { defineBlock } from '../define';
import { IconTextSpellcheck } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'typo_rules',
	group: 'brand',
	order: 120,
	icon: IconTextSpellcheck,
	Render,
	Editor,
});
