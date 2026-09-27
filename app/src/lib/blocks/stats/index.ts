import { defineBlock } from '../define';
import { IconNumbers } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'stats',
	group: 'structure',
	order: 20,
	icon: IconNumbers,
	Render,
	Editor,
});
