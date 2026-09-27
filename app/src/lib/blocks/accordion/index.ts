import { defineBlock } from '../define';
import { IconLayoutList } from '$lib/icons';
import Editor from './Editor.svelte';
import Render from './Render.svelte';

export default defineBlock({
	type: 'accordion',
	group: 'text',
	order: 50,
	icon: IconLayoutList,
	Render,
	Editor,
});
